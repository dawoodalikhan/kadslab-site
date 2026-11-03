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
