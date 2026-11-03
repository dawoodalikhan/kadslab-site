// Cloudflare Worker: serves the static site and the /api/ask endpoint for
// Digital Dawood. The Anthropic API key lives only in Worker secrets
// (wrangler secret put ANTHROPIC_API_KEY) and never reaches the browser.
import { FACTS, search } from '../src/data/knowledge';

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  ANTHROPIC_API_KEY?: string;
  MODEL?: string;
  ALLOWED_ORIGINS?: string; // comma-separated
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// Best-effort per-isolate rate limit; pair with a Cloudflare WAF rate-limit rule on /api/ask.
const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n += 1;
  return h.n > 12;
}

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

async function ask(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || 'https://kadslab.com,https://www.kadslab.com').split(',').map((s) => s.trim());
  if (origin && !allowed.includes(origin) && !origin.endsWith('.workers.dev')) return json({ error: 'forbidden' }, 403);

  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  if (limited(ip)) return json({ error: 'rate-limited' }, 429);

  let body: { q?: unknown; page?: unknown; section?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const q = typeof body.q === 'string' ? body.q.trim().slice(0, 500) : '';
  const page = typeof body.page === 'string' ? body.page.slice(0, 80) : '/';
  const section = typeof body.section === 'string' ? body.section.slice(0, 200) : '';
  if (!q) return json({ error: 'empty' }, 400);

  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ai-unavailable' }, 503);

  const picked = search(q + ' ' + section, 6);
  const facts = (picked.length ? picked : FACTS.slice(0, 6))
    .map((f) => `[${f.id}] ${f.topic}: ${f.text}${f.show ? ` (show: ${f.show.label})` : ''}`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.MODEL || 'claude-haiku-5-5',
      max_tokens: 350,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Visitor is on page ${page}. Section in view: ${section || 'unknown'}.\n\nFacts:\n${facts}\n\nVisitor question: ${q}` }],
    }),
  });
  if (!res.ok) return json({ error: 'ai-error' }, 502);

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === 'text')?.text?.trim() || '';
  let answer = raw, showId: string | null = null;
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    answer = String(parsed.answer || '').slice(0, 800);
    showId = typeof parsed.show === 'string' ? parsed.show : null;
  } catch { /* model returned plain text; use it as the answer */ }
  const show = FACTS.find((f) => f.id === showId)?.show ?? null;
  return json({ answer, show, source: 'ai' });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/ask') {
      if (req.method !== 'POST') return json({ error: 'method' }, 405);
      return ask(req, env);
    }
    return env.ASSETS.fetch(req);
  },
};
