import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { renderAd, SIZES, type AdFormat } from '../lib/ad-render';
import { AD_TOOL } from '../data/tools';

type Ad = {
  brand: string; headline: string; primaryText: string; description: string; overlayText: string; cta: string;
  imagePrompt: string; palette: { bg: string; text: string; accent: string }; layout: 'bottom' | 'top' | 'center';
  format: AdFormat; image: string | null;
};
type Status = { signedIn: boolean; email: string | null; plan: 'free' | 'pro'; subStatus: string | null; remaining: number; limit: number; billing: boolean };
type Made = Ad & { id: number; png: string };

const FORMATS: { id: AdFormat; label: string; hint: string }[] = [
  { id: 'square', label: 'Feed 1:1', hint: 'Instagram / Facebook' },
  { id: 'story', label: 'Story 9:16', hint: 'Stories / Reels / TikTok' },
  { id: 'landscape', label: 'Link 1.91:1', hint: 'LinkedIn / Google Display' },
];
const TONES = ['Bold', 'Friendly', 'Premium', 'Playful', 'Urgent', 'Professional'];
const EXAMPLES = [
  'Neighbourhood coffee roaster in Chicago. New single-origin Ethiopian beans, delivered every Friday. Target: remote workers.',
  'Family-owned roofing company. Free roof inspections after storm season. Serving the North Shore.',
  'Online Pilates studio, 20-minute classes you can do at home before work. 7-day free trial.',
];
const ERRORS: Record<string, string> = {
  'prompt-too-short': 'Add a bit more detail: what you sell, who it\'s for, and the offer.',
  'prompt-too-long': 'Keep the brief under 600 characters.',
  'rate-limited': 'Too many requests. Give it a minute and try again.',
  'verification-failed': 'Quick check failed. Refresh the page and try again.',
  'not-configured': 'The generator is being set up. Check back shortly.',
  'generation-failed': 'That one didn\'t come out. Try again (it didn\'t count against your ads).',
  'quota-reached': 'You\'ve used this month\'s ads. They reset on the 1st.',
  'email-not-configured': 'Sign-in email isn\'t set up yet.',
  'email-failed': 'Couldn\'t send the email. Check the address and try again.',
  'bad-email': 'That email doesn\'t look right.',
  'link-expired': 'That sign-in link has expired or was already used. Ask for a new one.',
  'billing-not-configured': 'Subscriptions open soon. You\'re signed in and we\'ll let you know.',
};
const say = (code?: string) => (code && ERRORS[code]) || 'Something went wrong. Please try again.';

async function api<T>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(path, body === undefined ? { credentials: 'same-origin' } : {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  return { ok: res.ok, status: res.status, data };
}

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void } } }
const TURNSTILE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;

export default function AdGenerator() {
  const [status, setStatus] = useState<Status | null>(null);
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<AdFormat>('square');
  const [tone, setTone] = useState('Bold');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ads, setAds] = useState<Made[]>([]);
  const [email, setEmail] = useState('');
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent'>('idle');
  const tsBox = useRef<HTMLDivElement>(null);
  const tsToken = useRef('');
  const tsId = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const r = await api<Status>('/api/ads/me');
    if (r.ok) setStatus(r.data);
    else setStatus({ signedIn: false, email: null, plan: 'free', subStatus: null, remaining: 0, limit: AD_TOOL.freeAds, billing: false });
    return r.ok ? r.data : null;
  }, []);

  const startCheckout = useCallback(async () => {
    setError('');
    const r = await api<{ url: string }>('/api/ads/checkout', {});
    if (r.ok && r.data.url) location.href = r.data.url;
    else setError(say(r.data.error));
  }, []);

  // Sign-in link and Stripe return handling.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const token = q.get('token');
    const next = q.get('next');
    const subscribed = q.get('subscribed');
    if (token || subscribed) history.replaceState(null, '', location.pathname);
    (async () => {
      if (token) {
        const r = await api('/api/ads/verify', { token });
        if (!r.ok) setError(say(r.data.error));
        else setNotice('You\'re signed in.');
      }
      const s = await refresh();
      if (token && next === 'checkout' && s && s.plan !== 'pro' && s.billing) startCheckout();
      if (subscribed) {
        setNotice('Payment received. Activating your plan…');
        // The Stripe webhook can take a few seconds.
        for (let i = 0; i < 6; i++) {
          const st = await refresh();
          if (st?.plan === 'pro') { setNotice(`You're on Pro: ${st.remaining} ads this month.`); break; }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
  }, [refresh, startCheckout]);

  // Optional Cloudflare Turnstile for free generations.
  useEffect(() => {
    if (!TURNSTILE_KEY || status?.plan === 'pro' || !tsBox.current) return;
    const mount = () => {
      if (!window.turnstile || !tsBox.current || tsId.current) return;
      tsId.current = window.turnstile.render(tsBox.current, { sitekey: TURNSTILE_KEY, size: 'flexible', callback: (t: string) => { tsToken.current = t; } });
    };
    if (window.turnstile) mount();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.onload = mount;
      document.head.appendChild(s);
    }
  }, [status?.plan]);

  const outOfAds = !!status && status.remaining <= 0;
  const showPaywall = !!status && status.plan !== 'pro' && outOfAds;

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || outOfAds) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      const r = await api<{ ad: Ad; status: Status; reason?: string }>('/api/ads/generate', { prompt, format, tone, turnstile: tsToken.current });
      if (r.data.status) setStatus(r.data.status);
      if (r.ok && r.data.ad) {
        const png = await renderAd(r.data.ad);
        setAds((list) => [{ ...r.data.ad, id: Date.now(), png }, ...list]);
      } else if (r.data.error === 'refused') setError(`Can't make this one: ${r.data.reason}`);
      else if (r.data.error !== 'free-limit-reached') {
        const previous = ads.length && r.data.error === 'generation-failed'
          ? ' The preview still shows your previous ad.'
          : '';
        setError(say(r.data.error) + previous);
      }
    } catch { setError(say()); }
    finally {
      setBusy(false);
      tsToken.current = '';
      if (tsId.current) window.turnstile?.reset(tsId.current);
    }
  };

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setMail('sending');
    const r = await api<{ sent: boolean }>('/api/ads/login', { email, next: 'checkout' });
    if (r.ok) setMail('sent');
    else { setMail('idle'); setError(say(r.data.error)); }
  };

  const signOut = async () => { await api('/api/ads/logout', {}); setAds([]); setNotice(''); refresh(); };
  const manage = async () => {
    const r = await api<{ url: string }>('/api/ads/portal', {});
    if (r.ok) location.href = r.data.url; else setError(say(r.data.error));
  };

  return (
    <div className="adg">
      <div className="adg-bar mono">
        {!status ? <span>Loading…</span> : status.plan === 'pro'
          ? <span><b>Pro</b> · {status.remaining} of {status.limit} ads left this month</span>
          : <span><b>Free demo</b> · {status.remaining} of {status.limit} free ads left</span>}
        <span className="adg-bar-right">
          {status?.signedIn ? <>
            <span className="adg-email">{status.email}</span>
            {status.plan === 'pro' && <button type="button" className="adg-link" onClick={manage}>Billing</button>}
            <button type="button" className="adg-link" onClick={signOut}>Sign out</button>
          </> : <a className="adg-link" href="#adg-plans">Plans</a>}
        </span>
      </div>

      {notice && <p className="adg-note" role="status">{notice}</p>}

      <div className="adg-grid">
        <form className="adg-form" onSubmit={generate}>
          <label className="adg-label" htmlFor="adg-prompt">1 · Describe the business and the offer</label>
          <textarea id="adg-prompt" rows={5} maxLength={600} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="What you sell, who it's for, the offer, and where you are." disabled={outOfAds} />
          <div className="adg-examples">
            {EXAMPLES.map((x, i) => <button key={i} type="button" className="chip" onClick={() => setPrompt(x)} disabled={outOfAds}>Example {i + 1}</button>)}
            <span className="mono adg-count">{prompt.length}/600</span>
          </div>

          <span className="adg-label">2 · Placement</span>
          <div className="adg-opts" role="radiogroup" aria-label="Placement">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={format === f.id} className="adg-opt" onClick={() => setFormat(f.id)}>
                <span className={`adg-shape adg-shape-${f.id}`} aria-hidden="true" />
                <b>{f.label}</b><small>{f.hint}</small>
              </button>
            ))}
          </div>

          <span className="adg-label">3 · Tone</span>
          <div className="adg-tones" role="radiogroup" aria-label="Tone">
            {TONES.map((t) => <button key={t} type="button" role="radio" aria-checked={tone === t} className="pill" aria-pressed={tone === t} onClick={() => setTone(t)}>{t}</button>)}
          </div>

          {TURNSTILE_KEY && status?.plan !== 'pro' && <div ref={tsBox} className="adg-ts" />}

          <button className="btn btn-accent adg-go" type="submit" disabled={busy || outOfAds || prompt.trim().length < 10}>
            {busy ? 'Writing copy and painting the image…' : outOfAds ? (status?.plan === 'pro' ? 'Monthly ads used' : 'Free ads used') : 'Generate ad →'}
          </button>
          {error && <p className="adg-error" role="alert">{error}</p>}
          <p className="adg-fine">Copy by Claude, image by FLUX on Cloudflare Workers AI. AI output: check every claim before you run an ad.</p>
        </form>

        <div className="adg-out" aria-live="polite">
          {busy && <div className={`adg-skeleton adg-ratio-${format}`}><span className="mono">Generating…</span></div>}
          {!busy && !ads.length && (
            <div className="adg-empty">
              <span className="mono">Your ads appear here</span>
              <p>Each ad comes with feed copy, an AI image and a finished creative at the platform's real size, ready to download.</p>
            </div>
          )}
          {ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
        </div>
      </div>

      <section id="adg-plans" className={`adg-plans${showPaywall ? ' is-wall' : ''}`}>
        {showPaywall && <h2 className="adg-wall-title">You've used your {status!.limit} free ads.</h2>}
        <div className="adg-plan-grid">
          <div className="adg-plan">
            <span className="eyebrow">Free demo</span>
            <p className="adg-price">$0</p>
            <ul><li>{AD_TOOL.freeAds} ads, no sign-up</li><li>All placements and tones</li><li>PNG download</li></ul>
          </div>
          <div className="adg-plan adg-plan-pro">
            <span className="eyebrow">Pro</span>
            <p className="adg-price">{AD_TOOL.price}<small>/{AD_TOOL.period}</small></p>
            <ul><li>{AD_TOOL.monthlyAds} ads every month</li><li>Copy, image and creative for every placement</li><li>Cancel anytime from Billing</li></ul>
            {status?.plan === 'pro' ? <p className="mono adg-on">✓ Your plan</p>
              : status?.signedIn ? <button type="button" className="btn btn-dark" onClick={startCheckout}>Subscribe · {AD_TOOL.price}/{AD_TOOL.period}</button>
              : mail === 'sent' ? (
                <div className="adg-sent" role="status">
                  <p>Check <b>{email}</b> for a sign-in link. It takes you straight to checkout.</p>
                </div>
              ) : (
                <form className="adg-signup" onSubmit={sendLink}>
                  <label className="sr-only" htmlFor="adg-email">Email</label>
                  <input id="adg-email" type="email" required autoComplete="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button className="btn btn-dark" type="submit" disabled={mail === 'sending'}>{mail === 'sending' ? 'Sending…' : 'Sign up & subscribe'}</button>
                  <small>We email you a sign-in link, no password. Payment is handled by Stripe.</small>
                </form>
              )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdCard({ ad }: { ad: Made }) {
  const [copied, setCopied] = useState('');
  const copy = async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked */ }
  };
  const [w, h] = SIZES[ad.format];
  const file = `${ad.brand || 'ad'}-${ad.format}-${w}x${h}.png`.replace(/[^\w.-]+/g, '-').toLowerCase();
  const all = `Primary text: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}\nCTA: ${ad.cta}`;

  return (
    <article className="adg-card">
      <div className={`adg-post adg-post-${ad.format}`}>
        <header><span className="adg-avatar" style={{ background: ad.palette.accent }}>{ad.brand.slice(0, 1)}</span><span><b>{ad.brand}</b><small>Sponsored</small></span></header>
        <p className="adg-primary">{ad.primaryText}</p>
        <img src={ad.png} alt={`Ad creative: ${ad.overlayText}`} width={w} height={h} />
        <footer><span><small>{ad.description}</small><b>{ad.headline}</b></span><span className="adg-cta">{ad.cta}</span></footer>
      </div>
      <dl className="adg-copy">
        {([['Primary text', ad.primaryText], ['Headline', ad.headline], ['Description', ad.description], ['On-image text', ad.overlayText], ['CTA', ad.cta]] as const).map(([k, v]) => (
          <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd><button type="button" className="adg-link" onClick={() => copy(k, v)}>{copied === k ? 'Copied' : 'Copy'}</button></div>
        ))}
      </dl>
      <div className="adg-actions">
        <a className="btn btn-dark" href={ad.png} download={file}>Download PNG · {w}×{h}</a>
        <button type="button" className="btn btn-ghost" onClick={() => copy('all', all)}>{copied === 'all' ? 'Copied' : 'Copy all text'}</button>
      </div>
    </article>
  );
}
