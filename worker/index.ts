// Cloudflare Worker: serves the static site and the /api/ask endpoint for
// Digital Dawood.
//
// The endpoint works with or without an AI service:
//   - No ANTHROPIC_API_KEY secret (the default): answers are assembled from
//     the approved facts in src/data/knowledge.ts. Free, instant, no network.
//   - With the secret set (wrangler secret put ANTHROPIC_API_KEY): Claude
//     phrases the answer from the same facts. If the AI call fails or times
//     out, the visitor still gets the knowledge-based answer.
// Every response says which one it is ("source": "knowledge" | "ai").
//
// Security notes:
//   - Only origins listed in ALLOWED_ORIGINS (wrangler.jsonc) may call the
//     endpoint. Production and staging each have their own explicit list.
//   - The origin check stops other websites from using a visitor's browser to
//     call this endpoint. It does NOT stop scripts (curl etc.), which can send
//     any Origin header. The in-memory rate limit below is best-effort only:
//     each Cloudflare isolate keeps its own count. BEFORE ENABLING THE PAID AI
//     KEY, add a Cloudflare WAF rate-limiting rule on /api/ask (dashboard →
//     Security → WAF → Rate limiting rules, e.g. 10 requests / minute / IP),
//     and set a monthly spend limit in the Anthropic console.
//   - Nothing about visitors is logged. The visitor's IP is only held in
//     memory for the one-minute rate-limit window.
import { FACTS, search } from '../src/data/knowledge';
import { answerFromKnowledge, MAX_QUESTION, type Answer } from '../src/lib/twin-answer';
import { createRateLimiter } from './rate-limit';
import { handleAds, type AdsEnv } from './ads';

interface Env extends AdsEnv {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  ANTHROPIC_API_KEY?: string;
  MODEL?: string;
  ALLOWED_ORIGINS?: string; // comma-separated, exact origins (scheme + host)
}

const PRODUCTION_ORIGINS = 'https://kadslab.com,https://www.kadslab.com';
const MAX_BODY_BYTES = 4096;        // a 500-character question fits easily, even in emoji
const MAX_PAGE = 200;
const MAX_SECTION = 300;
const AI_TIMEOUT_MS = 10_000;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });

// Best-effort, per isolate: 12 questions per minute per IP. See the WAF note above.
const limited = createRateLimiter({ windowMs: 60_000, maxHits: 12, maxKeys: 5_000 });

/* ---------- Request checks ---------- */
const allowedOrigins = (env: Env) =>
  (env.ALLOWED_ORIGINS || PRODUCTION_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);

/** Reads at most `max` bytes of UTF-8. Returns null if the body is larger or not valid UTF-8. */
async function readBody(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(all); } catch { return null; }
}

type Question = { q: string; page: string; section: string };

/** Parses and validates the body. Returns an error code instead of throwing. */
function parseQuestion(raw: string): Question | { error: string; status: number } {
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return { error: 'bad-json', status: 400 }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'bad-json', status: 400 };
  const b = body as Record<string, unknown>;
  if (typeof b.q !== 'string') return { error: 'empty', status: 400 };
  const q = b.q.trim();
  if (!q) return { error: 'empty', status: 400 };
  if (q.length > MAX_QUESTION) return { error: 'too-long', status: 413 };
  const page = typeof b.page === 'string' && b.page.startsWith('/') ? b.page.slice(0, MAX_PAGE) : '/';
  const section = typeof b.section === 'string' ? b.section.slice(0, MAX_SECTION) : '';
  return { q, page, section };
}

/* ---------- Optional AI phrasing ---------- */
const SYSTEM = `You are "Digital Dawood", the animated guide on Dawood Ali Khan's portfolio (KADS Lab).
Speak in first person as Dawood's digital twin: curious, friendly, a little witty, professional on technical topics.
Match the visitor: playful when casual, detailed when technical, concise for hiring questions.

Rules:
- Use ONLY the facts provided. If the facts don't cover the question, say you don't know and suggest the Contact page.
- Never invent clients, employers, metrics, dates, technologies or results.
- Never name clients. Client work is private; industries and roles are fine.
- Keep answers under 90 words. No markdown headings or lists unless asked.
- If one fact has a "show" link that demonstrates the answer, set "show" to that fact id.
Reply as compact JSON: {"answer": "...", "show": "<fact id or null>"}`;

async function askAI({ q, page, section }: Question, env: Env, key: string): Promise<Answer | null> {
  const picked = search(q + ' ' + section, 6);
  const facts = (picked.length ? picked : FACTS.slice(0, 6))
    .map((f) => `[${f.id}] ${f.topic}: ${f.text}${f.show ? ` (show: ${f.show.label})` : ''}`).join('\n');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.MODEL || 'claude-haiku-5-5',
        max_tokens: 350,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Visitor is on page ${page}. Section in view: ${section || 'unknown'}.\n\nFacts:\n${facts}\n\nVisitor question: ${q}` }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = data.content?.find((c) => c.type === 'text')?.text?.trim() || '';
    let answer = raw, showId: string | null = null;
    try {
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      answer = String(parsed.answer || '');
      showId = typeof parsed.show === 'string' ? parsed.show : null;
    } catch { /* model returned plain text; use it as the answer */ }
    answer = answer.trim().slice(0, 800);
    if (!answer) return null;
    return { answer, show: FACTS.find((f) => f.id === showId)?.show ?? null, source: 'ai' };
  } catch {
    return null; // network error, timeout or malformed response: fall back to the knowledge base
  }
}

/* ---------- /api/ask ---------- */
async function ask(req: Request, env: Env): Promise<Response> {
  // 1. Only our own pages. Browsers always send Origin on a POST, so a
  //    missing or unlisted Origin is refused. No CORS headers are ever sent,
  //    so other sites can't read responses either.
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return json({ error: 'forbidden' }, 403);
  if (req.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden' }, 403);

  // 2. JSON only. This also forces a CORS preflight for any cross-origin
  //    attempt, which this endpoint never approves.
  const type = (req.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
  if (type !== 'application/json') return json({ error: 'unsupported-media-type' }, 415);

  // 3. Rate limit before doing any work. The IP is never logged or stored beyond the window.
  if (limited(req.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'rate-limited' }, 429, { 'retry-after': '60' });

  // 4. Small, well-formed body.
  const raw = await readBody(req, MAX_BODY_BYTES);
  if (raw === null) return json({ error: 'too-large' }, 413);
  const parsed = parseQuestion(raw);
  if ('error' in parsed) return json({ error: parsed.error }, parsed.status);

  // 5. AI if configured, otherwise (or on any AI failure) the knowledge base.
  const key = env.ANTHROPIC_API_KEY?.trim();
  const ai = key ? await askAI(parsed, env, key) : null;
  return json(ai ?? answerFromKnowledge(parsed.q, parsed.page));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/ask') {
      if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405, { allow: 'POST' });
      try {
        return await ask(req, env);
      } catch {
        return json({ error: 'server-error' }, 500); // fail closed, without details
      }
    }
    if (url.pathname.startsWith('/api/ads/') || url.pathname === '/api/stripe/webhook') {
      try {
        return await handleAds(req, env, url.pathname, allowedOrigins(env));
      } catch {
        return json({ error: 'server-error' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not-found' }, 404);
    return env.ASSETS.fetch(req);
  },
};
