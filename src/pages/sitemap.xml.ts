// sitemap.xml, generated at build time from the pages folder, so a new page
// is listed automatically. No dependency needed for a site this size.
import type { APIRoute } from 'astro';

const pages = Object.keys(import.meta.glob('./**/*.astro'));

export const GET: APIRoute = ({ site }) => {
  const urls = pages
    .map((p) => p.replace(/^\.\//, '/').replace(/\.astro$/, '').replace(/(^|\/)index$/, '/'))
    .filter((p) => !p.includes('[') && p !== '/404')
    .map((p) => (p.endsWith('/') ? p : `${p}/`))
    .sort();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `  <url><loc>${new URL(p, site).toString()}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
