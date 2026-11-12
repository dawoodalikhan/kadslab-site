# KADS Lab

The portfolio of **Dawood Ali Khan**, a digital solutions consultant and engineer in Chicago.
**K**nowledge · **A**rchitecture · **D**evelopment · **S**ystems.

Live: https://kadslab.com

## Stack

- **Astro** (static output): every page ships as plain HTML.
- **React + TypeScript** islands, only where something is interactive: the hero desk, the Lab demos, the work filter, code tabs and the contact form.
- **Cloudflare Workers with Static Assets** for hosting, deployed by **Workers Builds** on every push to `main`.

## Structure

```
src/
  components/   React islands + Astro layout pieces (DeviceScroller, LabDemos, WorkGrid…)
  data/site.ts  All site content: work tiles, experience, toolbox
  lib/          Plain TypeScript logic (route-lead.ts powers the lead routing demo)
  layouts/      Base layout: SEO meta, JSON-LD, header, footer
  pages/        Home, Work, Lab, Engineering, About, Contact, 404
  styles/       Design tokens and global CSS
public/         favicon, resume.pdf
```

## Run locally

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs ./dist
```

## Deploy (Cloudflare)

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick `kadslab-site`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy` (reads `wrangler.jsonc`).
3. After the first deploy: **Settings → Domains & Routes → Add custom domain** → `kadslab.com`.

## A note on client work

Client projects are covered by NDA. Every screen on the Work page is an original concept in that industry,
with made-up names and synthetic data. No client names, designs or code are published.

## Ad generator (`/tools/ad-generator/`)

A public tool: 2 free ads per visitor, then email sign-in and a Stripe subscription.
Claude writes the copy and the image brief, Workers AI (FLUX) paints the image, and
the page lays both out as a downloadable creative (1080×1080, 1080×1920 or 1200×628).

Code: `worker/ads.ts` (API), `worker/stripe.ts`, `src/components/AdGenerator.tsx`,
`src/lib/ad-render.ts`, `src/data/tools.ts` (price shown on the page).

### One-time setup

1. **D1 database**: Cloudflare → Storage & databases → D1 → Create → `kadslab-ads`.
   Paste its ID into `wrangler.jsonc` (`d1_databases[0].database_id`). Tables are
   created automatically on first request.
2. **Secrets** (Workers & Pages → kadslab-site → Settings → Variables and secrets):
   - `ANTHROPIC_API_KEY` (also powers Digital Dawood)
   - `STRIPE_SECRET_KEY`: use the `sk_test_…` key on staging first
   - `STRIPE_WEBHOOK_SECRET`: from the webhook in step 3
   - `RESEND_API_KEY`: production sign-in emails (staging shows the link on screen instead)
   - `TURNSTILE_SECRET` (optional bot check; also set `PUBLIC_TURNSTILE_SITE_KEY` as a build variable)
3. **Stripe**: create a Product "KADS Ad Generator Pro" with a recurring monthly price,
   put the `price_…` ID in `STRIPE_PRICE_ID` in `wrangler.jsonc` (both blocks), and add a
   webhook to `https://<site>/api/stripe/webhook` for `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Turn on the customer billing portal.
4. **Email**: verify `kadslab.com` in Resend so `MAIL_FROM` can send.
5. **Before production**: add a WAF rate-limiting rule on `/api/ads/generate`
   (e.g. 10 requests/minute/IP) and set a monthly spend limit in the Anthropic console.

Keep `src/data/tools.ts` (price on the page), the Stripe price, and
`ADS_MONTHLY_QUOTA` in step.
