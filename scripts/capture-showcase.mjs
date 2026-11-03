// Captures full-page screenshots for the Live work showcase.
// The URL list lives in scripts/showcase.local.json (gitignored), so client
// URLs never reach the public repo. Run locally:
//   npx playwright install chromium   (first time only)
//   npm run capture
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';

const urls = JSON.parse(await readFile(new URL('./showcase.local.json', import.meta.url), 'utf8'));
await mkdir(new URL('../public/showcase/', import.meta.url), { recursive: true });

// Blur logos and brand marks so the client is not named on the screen.
const HIDE_BRAND = `
  header img, nav img, [class*="logo" i], [id*="logo" i], .site-branding, .navbar-brand, footer img {
    filter: blur(10px) !important;
  }
  [class*="cookie" i], [id*="cookie" i], [class*="popup" i], [class*="modal" i] { display: none !important; }
`;

const browser = await chromium.launch();
for (const [id, url] of Object.entries(urls)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.addStyleTag({ content: HIDE_BRAND });
    // Trigger lazy-loaded images, then return to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const height = Math.min(await page.evaluate(() => document.body.scrollHeight), 4200);
    await page.screenshot({ path: `public/showcase/${id}.jpg`, type: 'jpeg', quality: 62, clip: { x: 0, y: 0, width: 1280, height } });
    console.log('✓', id);
  } catch (e) {
    console.log('✗', id, e.message);
  }
  await page.close();
}
await browser.close();
