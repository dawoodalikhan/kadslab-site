// Lays out a generated ad (image + overlay text + brand + CTA) on a canvas,
// at the real platform size, so the visitor can download a ready-to-post PNG.

export type AdFormat = 'square' | 'story' | 'landscape';
export type RenderAd = {
  brand: string; overlayText: string; cta: string; image: string | null; format: AdFormat;
  palette: { bg: string; text: string; accent: string }; layout: 'bottom' | 'top' | 'center';
};

export const SIZES: Record<AdFormat, [number, number]> = { square: [1080, 1080], story: [1080, 1920], landscape: [1200, 628] };

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = fail;
  img.src = src;
});

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const onColor = (hex: string) => (luminance(hex) > 0.4 ? '#15161A' : '#FFFFFF');

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderAd(ad: RenderAd): Promise<string> {
  const [W, H] = SIZES[ad.format];
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try { await document.fonts.load('800 40px Montserrat'); await document.fonts.load('600 20px Montserrat'); } catch { /* system font fallback */ }
  const { bg, text, accent } = ad.palette;

  // Background: the AI image, cropped to cover, or a soft colour gradient.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (ad.image) {
    try {
      const img = await loadImage(ad.image);
      const s = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    } catch { /* keep the flat background */ }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, bg); g.addColorStop(1, rgba(accent, 0.55));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // Scrim so text stays readable on any photo.
  const scrim = ad.layout === 'center' ? null : ctx.createLinearGradient(0, ad.layout === 'bottom' ? H * 0.35 : H * 0.65, 0, ad.layout === 'bottom' ? H : 0);
  if (scrim) { scrim.addColorStop(0, rgba(bg, 0)); scrim.addColorStop(1, rgba(bg, 0.92)); ctx.fillStyle = scrim; }
  else ctx.fillStyle = rgba(bg, 0.5);
  ctx.fillRect(0, 0, W, H);

  const short = Math.min(W, H);
  const pad = Math.round(short * 0.07);
  const maxW = ad.format === 'landscape' ? W * 0.62 : W - pad * 2;

  // Overlay headline.
  let size = Math.round(ad.format === 'landscape' ? H * 0.12 : W * 0.092);
  ctx.font = `800 ${size}px Montserrat, Helvetica, Arial, sans-serif`;
  let lines = wrap(ctx, ad.overlayText, maxW);
  while (lines.length > 3 && size > 30) {
    size -= 4;
    ctx.font = `800 ${size}px Montserrat, Helvetica, Arial, sans-serif`;
    lines = wrap(ctx, ad.overlayText, maxW);
  }
  const lineH = size * 1.04;
  const blockH = lines.length * lineH;

  // CTA pill.
  const ctaSize = Math.round(short * 0.036);
  ctx.font = `700 ${ctaSize}px Montserrat, Helvetica, Arial, sans-serif`;
  const ctaW = ctx.measureText(ad.cta).width + ctaSize * 2.2;
  const ctaH = ctaSize * 2.3;

  const gap = size * 0.5;
  let textTop: number;
  const center = ad.layout === 'center';
  if (ad.layout === 'top') textTop = pad * 1.6;
  else if (center) textTop = (H - blockH - gap - ctaH) / 2;
  else textTop = H - pad - ctaH - gap - blockH;

  const x = center ? W / 2 : pad;
  ctx.textAlign = center ? 'center' : 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = text;
  ctx.font = `800 ${size}px Montserrat, Helvetica, Arial, sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, x, textTop + i * lineH));

  const ctaX = center ? (W - ctaW) / 2 : pad;
  const ctaY = textTop + blockH + gap;
  ctx.fillStyle = accent;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.fillStyle = onColor(accent);
  ctx.font = `700 ${ctaSize}px Montserrat, Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ad.cta, ctaX + ctaW / 2, ctaY + ctaH / 2 + 1);

  // Brand mark, on the opposite edge from the headline.
  const bSize = Math.round(short * 0.034);
  ctx.font = `700 ${bSize}px Montserrat, Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const bY = ad.layout === 'top' ? H - pad : pad;
  ctx.fillStyle = accent;
  ctx.fillRect(pad, bY - bSize * 0.6, bSize * 0.32, bSize * 1.2);
  ctx.fillStyle = ad.layout === 'top' ? text : (ad.image ? '#FFFFFF' : text);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = ad.image ? 12 : 0;
  ctx.fillText(ad.brand, pad + bSize * 0.6, bY);
  ctx.shadowBlur = 0;

  return canvas.toDataURL('image/png');
}
