// AI Ad Generator: /api/ads/* and /api/stripe/webhook.
//
// What it does
//   - Claude writes the ad (headline, body, CTA, overlay text, colours and an
//     image brief). Workers AI (FLUX) paints the image from that brief. The
//     page then lays both out as a finished creative the visitor can download.
//   - Anyone gets 2 free ads (counted per browser AND per network, so clearing
//     cookies doesn't reset it). After that: sign in with an email link, then
//     subscribe through Stripe Checkout. Subscribers get ADS_MONTHLY_QUOTA ads
//     per calendar month.
//
// Setup (see README → "Ad generator"):
//   D1 binding DB, Workers AI binding AI, secrets ANTHROPIC_API_KEY,
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, and optionally
//   TURNSTILE_SECRET. Tables are created automatically on first use.
//
// Cost protection: every generation reserves a slot in the usage table BEFORE
// any paid API call, atomically, and gives it back if generation fails.
// Still add a WAF rate-limiting rule on /api/ads/generate and a monthly spend
// limit in the Anthropic console before going live.
import { stripe, verifyWebhook } from './stripe';
import { createRateLimiter } from './rate-limit';

export interface AdsEnv {
  DB?: D1Database;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  ANTHROPIC_API_KEY?: string;
  AD_MODEL?: string;
  IMAGE_MODEL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  TURNSTILE_SECRET?: string;
  SITE_URL?: string;
  ADS_FREE_LIMIT?: string;
  ADS_MONTHLY_QUOTA?: string;
  MOCK_AI?: string;          // "1" for local tests only: no paid calls
}

// Minimal D1 types so the Worker compiles without @cloudflare/workers-types.
interface D1Result<T> { results: T[] }
interface D1Statement {
  bind(...v: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
interface D1Database { prepare(sql: string): D1Statement; batch(s: D1Statement[]): Promise<unknown>; }

type User = { id: string; email: string; plan: string; stripe_customer: string | null; sub_status: string | null };

const FORMATS = { square: '1:1 feed post', story: '9:16 story or reel', landscape: '1.91:1 link or display ad' } as const;
type Format = keyof typeof FORMATS;
const TONES = ['Bold', 'Friendly', 'Premium', 'Playful', 'Urgent', 'Professional'] as const;
const CTAS = ['Shop now', 'Learn more', 'Sign up', 'Book now', 'Get offer', 'Get started', 'Contact us', 'Download', 'Order now', 'Try it free'];
const MAX_PROMPT = 600;
const SESSION_DAYS = 30;
const TOKEN_MINUTES = 15;

const json = (body: unknown, status = 200, extra: HeadersInit = {}) => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  new Headers(extra).forEach((v, k) => headers.append(k, v));
  return new Response(JSON.stringify(body), { status, headers });
};

/* ---------- small helpers ---------- */
const enc = new TextEncoder();
const randomId = (bytes = 24) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]!));
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const month = (d = new Date()) => d.toISOString().slice(0, 7);
const now = () => Date.now();

function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const setCookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

async function readJson(req: Request, max = 4096): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  const text = await req.text();
  if (text.length > max) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

/* ---------- database ---------- */
let schemaReady = false;
async function db(env: AdsEnv): Promise<D1Database> {
  if (!env.DB) throw new Error('not-configured');
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS ad_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, plan TEXT NOT NULL DEFAULT 'free', stripe_customer TEXT, subscription_id TEXT, sub_status TEXT, created_at INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS ad_sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS ad_login_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS ad_usage (subject TEXT NOT NULL, period TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (subject, period))`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS ad_users_customer ON ad_users (stripe_customer)`),
    ]);
    schemaReady = true;
  }
  return env.DB;
}

async function currentUser(req: Request, env: AdsEnv): Promise<User | null> {
  const sid = cookies(req).kads_s;
  if (!sid || sid.length > 100) return null;
  const d = await db(env);
  return d.prepare(`SELECT u.id, u.email, u.plan, u.stripe_customer, u.sub_status FROM ad_sessions s JOIN ad_users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?`)
    .bind(await sha256(sid), now()).first<User>();
}

/** Atomically adds one to a usage bucket if it is under `limit`. Returns false when full. */
async function reserve(d: D1Database, subject: string, period: string, limit: number): Promise<boolean> {
  const row = await d.prepare(`INSERT INTO ad_usage (subject, period, count) VALUES (?, ?, 1)
    ON CONFLICT (subject, period) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count`)
    .bind(subject, period, limit).first<{ count: number }>();
  return !!row && limit > 0;
}
const release = (d: D1Database, subject: string, period: string) =>
  d.prepare(`UPDATE ad_usage SET count = count - 1 WHERE subject = ? AND period = ? AND count > 0`).bind(subject, period).run();
const used = async (d: D1Database, subject: string, period: string) =>
  (await d.prepare(`SELECT count FROM ad_usage WHERE subject = ? AND period = ?`).bind(subject, period).first<{ count: number }>())?.count ?? 0;

const isPro = (u: User | null) => !!u && u.plan === 'pro' && (u.sub_status === 'active' || u.sub_status === 'trialing');
const freeLimit = (env: AdsEnv) => Math.max(0, Number(env.ADS_FREE_LIMIT) || 2);
const monthlyQuota = (env: AdsEnv) => Math.max(1, Number(env.ADS_MONTHLY_QUOTA) || 100);

/** The buckets a request draws from. Free use counts against every bucket; pro against the monthly one. */
async function buckets(req: Request, env: AdsEnv, user: User | null, anon: string) {
  if (isPro(user)) return [{ subject: `pro:${user!.id}`, period: month(), limit: monthlyQuota(env) }];
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const list = [
    { subject: `anon:${anon}`, period: 'all', limit: freeLimit(env) },
    // A shared office or home network gets two visitors' worth per month.
    { subject: `net:${await sha256(`kads-ads|${ip}`)}`, period: month(), limit: freeLimit(env) * 2 },
  ];
  if (user) list.push({ subject: `user:${user.id}`, period: 'all', limit: freeLimit(env) });
  return list;
}

/* ---------- account status ---------- */
async function status(req: Request, env: AdsEnv, user: User | null, anon: string) {
  const d = await db(env);
  const list = await buckets(req, env, user, anon);
  let remaining = Infinity;
  for (const b of list) remaining = Math.min(remaining, b.limit - (await used(d, b.subject, b.period)));
  return {
    signedIn: !!user,
    email: user?.email ?? null,
    plan: isPro(user) ? 'pro' : 'free',
    subStatus: user?.sub_status ?? null,
    remaining: Math.max(0, remaining),
    limit: isPro(user) ? monthlyQuota(env) : freeLimit(env),
    billing: !!env.STRIPE_SECRET_KEY && !!env.STRIPE_PRICE_ID,
  };
}

/* ---------- generation ---------- */
const SYSTEM = `You are a senior performance-marketing copywriter and art director.
From the advertiser's brief, write ONE ad and an image brief for it.

Rules:
- Only use facts in the brief. Never invent prices, discounts, statistics, awards, reviews or guarantees.
- No health, financial or legal promises; no before/after claims; no fake urgency the brief doesn't support.
- Don't name or imitate brands other than the advertiser's own.
- If the brief asks for something illegal, adult, hateful, deceptive, or for weapons, drugs, gambling or tobacco, reply {"refused": "<one short reason>"} instead.
- image_prompt describes a photo or illustration with NO text, letters, logos or words in it. Leave clean space for the overlay.
- Colours must be readable: text on bg needs strong contrast.

Reply with compact JSON only:
{"brand":"<advertiser or product name, max 24 chars>","headline":"<max 40 chars>","primary_text":"<max 125 chars>","description":"<max 30 chars>","overlay_text":"<2 to 6 punchy words for on the image>","cta":"<one of: ${CTAS.join(', ')}>","image_prompt":"<max 60 words>","palette":{"bg":"#RRGGBB","text":"#RRGGBB","accent":"#RRGGBB"},"layout":"<bottom|top|center>"}`;

export type Ad = {
  brand: string; headline: string; primaryText: string; description: string; overlayText: string; cta: string;
  imagePrompt: string; palette: { bg: string; text: string; accent: string }; layout: 'bottom' | 'top' | 'center';
  format: Format; image: string | null;
};

const hexColor = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

async function writeAd(brief: string, tone: string, format: Format, env: AdsEnv): Promise<Omit<Ad, 'image' | 'format'> | { refused: string }> {
  if (env.MOCK_AI === '1') {
    return { brand: 'Demo Co', headline: 'Fresh roast, delivered weekly', primaryText: `Mock ad for: ${brief.slice(0, 80)}`, description: 'Free first bag', overlayText: 'Wake up better', cta: 'Shop now', imagePrompt: 'coffee beans on a warm wooden table, morning light', palette: { bg: '#1E2A22', text: '#FFFFFF', accent: '#F2B134' }, layout: 'bottom' };
  }
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('not-configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(25_000),
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.AD_MODEL || 'claude-haiku-5-5',
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Format: ${FORMATS[format]}\nTone: ${tone}\n\nAdvertiser brief:\n"""${brief}"""` }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = data.content?.find((c) => c.type === 'text')?.text || '';
  const p = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as Record<string, any>;
  if (typeof p.refused === 'string') return { refused: clip(p.refused, 160) };
  const ad = {
    brand: clip(p.brand, 24),
    headline: clip(p.headline, 60),
    primaryText: clip(p.primary_text, 200),
    description: clip(p.description, 40),
    overlayText: clip(p.overlay_text, 60),
    cta: CTAS.includes(p.cta) ? p.cta : 'Learn more',
    imagePrompt: clip(p.image_prompt, 500),
    palette: { bg: hexColor(p.palette?.bg, '#15161A'), text: hexColor(p.palette?.text, '#FFFFFF'), accent: hexColor(p.palette?.accent, '#E5480D') },
    layout: (['bottom', 'top', 'center'].includes(p.layout) ? p.layout : 'bottom') as Ad['layout'],
  };
  if (!ad.headline || !ad.overlayText) throw new Error('bad-ad');
  return ad;
}

async function paint(prompt: string, env: AdsEnv): Promise<string | null> {
  if (env.MOCK_AI === '1' || !env.AI || !prompt) return null;
  try {
    const out = (await env.AI.run(env.IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell', {
      prompt: `${prompt}. Advertising photography, high quality, no text, no letters, no logos, no watermark.`,
      steps: 6,
    })) as { image?: string };
    return out?.image ? `data:image/jpeg;base64,${out.image}` : null;
  } catch {
    return null; // the creative still renders on a colour background
  }
}

async function turnstileOk(token: unknown, req: Request, env: AdsEnv): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: req.headers.get('cf-connecting-ip') || '' }),
  });
  return ((await res.json()) as { success?: boolean }).success === true;
}

const genLimiter = createRateLimiter({ windowMs: 60_000, maxHits: 6, maxKeys: 5_000 });

async function generate(req: Request, env: AdsEnv, user: User | null, anon: string): Promise<Response> {
  if (genLimiter(req.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'rate-limited' }, 429, { 'retry-after': '60' });
  const body = await readJson(req);
  if (!body) return json({ error: 'bad-json' }, 400);
  const brief = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (brief.length < 10) return json({ error: 'prompt-too-short' }, 400);
  if (brief.length > MAX_PROMPT) return json({ error: 'prompt-too-long' }, 413);
  const format: Format = typeof body.format === 'string' && body.format in FORMATS ? (body.format as Format) : 'square';
  const tone = TONES.includes(body.tone as any) ? (body.tone as string) : 'Bold';
  if (!isPro(user) && !(await turnstileOk(body.turnstile, req, env))) return json({ error: 'verification-failed' }, 403);
  if (!env.MOCK_AI && !env.ANTHROPIC_API_KEY) return json({ error: 'not-configured' }, 503);

  // Reserve first, so parallel requests can't overspend; undo on any failure.
  const d = await db(env);
  const list = await buckets(req, env, user, anon);
  const taken: typeof list = [];
  for (const b of list) {
    if (!(await reserve(d, b.subject, b.period, b.limit))) {
      await Promise.all(taken.map((t) => release(d, t.subject, t.period)));
      return json({ error: isPro(user) ? 'quota-reached' : 'free-limit-reached', status: await status(req, env, user, anon) }, 402);
    }
    taken.push(b);
  }
  const undo = () => Promise.all(taken.map((t) => release(d, t.subject, t.period)));

  try {
    const copy = await writeAd(brief, tone, format, env);
    if ('refused' in copy) { await undo(); return json({ error: 'refused', reason: copy.refused }, 422); }
    const image = await paint(copy.imagePrompt, env);
    const ad: Ad = { ...copy, format, image };
    return json({ ad, status: await status(req, env, user, anon) });
  } catch (e) {
    await undo();
    return json({ error: (e as Error).message === 'not-configured' ? 'not-configured' : 'generation-failed' }, 502);
  }
}

/* ---------- sign-in by email link ---------- */
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const loginLimiter = createRateLimiter({ windowMs: 10 * 60_000, maxHits: 5, maxKeys: 5_000 });

async function login(req: Request, env: AdsEnv): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return json({ error: 'email-not-configured' }, 503);
  const body = await readJson(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return json({ error: 'bad-email' }, 400);
  if (loginLimiter(`${req.headers.get('cf-connecting-ip')}|${email}`)) return json({ error: 'rate-limited' }, 429);
  const next = body?.next === 'checkout' ? 'checkout' : '';
  const d = await db(env);
  const token = randomId(32);
  await d.prepare(`DELETE FROM ad_login_tokens WHERE expires_at < ?`).bind(now()).run();
  await d.prepare(`INSERT INTO ad_login_tokens (token_hash, email, expires_at) VALUES (?, ?, ?)`).bind(await sha256(token), email, now() + TOKEN_MINUTES * 60_000).run();
  const base = (env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const link = `${base}/tools/ad-generator/?token=${token}${next ? `&next=${next}` : ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: email,
      subject: 'Your KADS Lab sign-in link',
      text: `Sign in to the KADS Lab ad generator:\n\n${link}\n\nThe link works once and expires in ${TOKEN_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
      html: `<p>Sign in to the KADS Lab ad generator:</p><p><a href="${link}" style="display:inline-block;background:#E5480D;color:#15161A;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none">Sign in</a></p><p style="color:#5A5B62;font-size:13px">The link works once and expires in ${TOKEN_MINUTES} minutes. If you didn't ask for it, ignore this email.</p>`,
    }),
  });
  if (!res.ok) return json({ error: 'email-failed' }, 502);
  return json({ sent: true });
}

/** The emailed link opens the page, which POSTs the token here. Link scanners that only GET can't use it up. */
async function verify(req: Request, env: AdsEnv): Promise<Response> {
  const body = await readJson(req);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token || token.length > 100) return json({ error: 'bad-token' }, 400);
  const d = await db(env);
  const row = await d.prepare(`DELETE FROM ad_login_tokens WHERE token_hash = ? AND expires_at > ? RETURNING email`).bind(await sha256(token), now()).first<{ email: string }>();
  if (!row) return json({ error: 'link-expired' }, 400);
  await d.prepare(`INSERT INTO ad_users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING`).bind(randomId(12), row.email, now()).run();
  const user = await d.prepare(`SELECT id FROM ad_users WHERE email = ?`).bind(row.email).first<{ id: string }>();
  const sid = randomId(32);
  await d.prepare(`INSERT INTO ad_sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)`).bind(await sha256(sid), user!.id, now() + SESSION_DAYS * 86_400_000).run();
  return json({ ok: true }, 200, { 'set-cookie': setCookie('kads_s', sid, SESSION_DAYS * 86_400) });
}

async function logout(req: Request, env: AdsEnv): Promise<Response> {
  const sid = cookies(req).kads_s;
  if (sid) await (await db(env)).prepare(`DELETE FROM ad_sessions WHERE id_hash = ?`).bind(await sha256(sid)).run();
  return json({ ok: true }, 200, { 'set-cookie': setCookie('kads_s', '', 0) });
}

/* ---------- billing ---------- */
async function checkout(req: Request, env: AdsEnv, user: User | null): Promise<Response> {
  if (!user) return json({ error: 'sign-in-required' }, 401);
  if (isPro(user)) return json({ error: 'already-subscribed' }, 409);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return json({ error: 'billing-not-configured' }, 503);
  const base = (env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const session = await stripe<{ url: string }>(env.STRIPE_SECRET_KEY, '/checkout/sessions', {
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: user.id,
    ...(user.stripe_customer ? { customer: user.stripe_customer } : { customer_email: user.email }),
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${base}/tools/ad-generator/?subscribed=1`,
    cancel_url: `${base}/tools/ad-generator/`,
  });
  return json({ url: session.url });
}

async function portal(req: Request, env: AdsEnv, user: User | null): Promise<Response> {
  if (!user?.stripe_customer) return json({ error: 'no-billing-account' }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'billing-not-configured' }, 503);
  const base = (env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const session = await stripe<{ url: string }>(env.STRIPE_SECRET_KEY, '/billing_portal/sessions', { customer: user.stripe_customer, return_url: `${base}/tools/ad-generator/` });
  return json({ url: session.url });
}

type StripeEvent = { type: string; data: { object: Record<string, any> } };

async function webhook(req: Request, env: AdsEnv): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'not-configured' }, 503);
  const raw = await req.text();
  if (raw.length > 256_000) return json({ error: 'too-large' }, 413);
  if (!(await verifyWebhook(raw, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))) return json({ error: 'bad-signature' }, 400);
  const event = JSON.parse(raw) as StripeEvent;
  const o = event.data.object;
  const d = await db(env);

  if (event.type === 'checkout.session.completed' && o.mode === 'subscription' && o.client_reference_id) {
    await d.prepare(`UPDATE ad_users SET stripe_customer = ?, subscription_id = ?, plan = 'pro', sub_status = 'active' WHERE id = ?`)
      .bind(String(o.customer), String(o.subscription), String(o.client_reference_id)).run();
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const active = event.type !== 'customer.subscription.deleted' && (o.status === 'active' || o.status === 'trialing');
    const userId = o.metadata?.user_id;
    const sql = `UPDATE ad_users SET plan = ?, sub_status = ?, subscription_id = ?, stripe_customer = COALESCE(stripe_customer, ?) WHERE ${userId ? 'id = ?' : 'stripe_customer = ?'}`;
    await d.prepare(sql).bind(active ? 'pro' : 'free', event.type === 'customer.subscription.deleted' ? 'canceled' : String(o.status), String(o.id), String(o.customer), userId ? String(userId) : String(o.customer)).run();
  }
  return json({ received: true });
}

/* ---------- router ---------- */
export async function handleAds(req: Request, env: AdsEnv, path: string, allowedOrigins: string[]): Promise<Response> {
  if (path === '/api/stripe/webhook') {
    if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
    return webhook(req, env);
  }

  // Same-origin only, like /api/ask.
  const origin = req.headers.get('origin');
  if (req.method !== 'GET' && (!origin || !allowedOrigins.includes(origin))) return json({ error: 'forbidden' }, 403);
  if (req.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden' }, 403);
  if (req.method === 'POST' && (req.headers.get('content-type') || '').split(';')[0]!.trim() !== 'application/json') return json({ error: 'unsupported-media-type' }, 415);
  if (!env.DB) return json({ error: 'not-configured' }, 503);

  // Anonymous visitor id for the free tier.
  const jar = cookies(req);
  let anon = jar.kads_a && /^[\w-]{16,64}$/.test(jar.kads_a) ? jar.kads_a : '';
  const newAnon = !anon;
  if (newAnon) anon = randomId(18);
  const user = await currentUser(req, env);

  let res: Response;
  const route = `${req.method} ${path}`;
  if (route === 'GET /api/ads/me') res = json(await status(req, env, user, anon));
  else if (route === 'POST /api/ads/generate') res = await generate(req, env, user, anon);
  else if (route === 'POST /api/ads/login') res = await login(req, env);
  else if (route === 'POST /api/ads/verify') res = await verify(req, env);
  else if (route === 'POST /api/ads/logout') res = await logout(req, env);
  else if (route === 'POST /api/ads/checkout') res = await checkout(req, env, user);
  else if (route === 'POST /api/ads/portal') res = await portal(req, env, user);
  else res = json({ error: 'not-found' }, 404);

  if (newAnon) {
    res = new Response(res.body, res);
    res.headers.append('set-cookie', setCookie('kads_a', anon, 365 * 86_400));
  }
  return res;
}
