/**
 * imageQuality.js
 * Analyses a card image and returns pass/fail checks for:
 *  - brightness (too dark / too bright)
 *  - blur (Laplacian variance)
 *  - orientation (landscape preferred)
 *  - minimum resolution
 */

export async function analyseImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const canvas = document.createElement('canvas');
      const scale  = Math.min(1, 400 / w);
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels    = imageData.data;
      const px        = pixels.length / 4;

      // ── 1. Brightness ──────────────────────────
      let totalLum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        totalLum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      }
      const avgLum    = totalLum / px;
      const brightPass = avgLum >= 60 && avgLum <= 220;
      const brightDetail = avgLum < 60  ? 'Too dark — find better lighting'
                         : avgLum > 220 ? 'Too bright / overexposed'
                         : `OK (avg ${Math.round(avgLum)})`;

      // ── 2. Blur (Laplacian variance) ───────────
      const grey = new Float32Array(canvas.width * canvas.height);
      for (let i = 0; i < px; i++) {
        grey[i] = 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2];
      }
      const cw = canvas.width;
      const ch = canvas.height;
      let lapVar = 0, lapCount = 0;
      for (let y = 1; y < ch - 1; y++) {
        for (let x = 1; x < cw - 1; x++) {
          const lap = (
            -grey[(y - 1) * cw + x] - grey[(y + 1) * cw + x] -
            grey[y * cw + (x - 1)] - grey[y * cw + (x + 1)] +
            4 * grey[y * cw + x]
          );
          lapVar += lap * lap;
          lapCount++;
        }
      }
      const blurScore  = lapCount ? lapVar / lapCount : 0;
      const blurPass   = blurScore >= 20;
      const blurDetail = blurScore < 20 ? 'Too blurry — hold camera steady'
                       : blurScore < 60 ? 'Slightly soft — should be fine'
                       : 'Sharp ✓';

      // ── 3. Orientation ─────────────────────────
      const orientPass   = w >= h;
      const orientDetail = orientPass ? 'Landscape ✓' : 'Portrait — rotate card horizontal';

      // ── 4. Resolution ──────────────────────────
      const resPass   = w >= 400 && h >= 400;
      const resDetail = resPass ? `${w}×${h}px ✓` : `Too small (${w}×${h}) — use higher quality`;

      const checks = {
        brightness:  { pass: brightPass,  icon: '☀️', label: 'Good Lighting',   detail: brightDetail },
        blur:        { pass: blurPass,    icon: '🔍', label: 'Image is Sharp',   detail: blurDetail   },
        orientation: { pass: orientPass,  icon: '📐', label: 'Landscape / Flat', detail: orientDetail },
        resolution:  { pass: resPass,     icon: '🖼️', label: 'Sufficient Size',  detail: resDetail    },
      };

      const passCount = Object.values(checks).filter(r => r.pass).length;
      const score     = Math.round((passCount / 4) * 100);
      const passed    = checks.brightness.pass && checks.blur.pass;

      resolve({ passed, score, checks });
    };
    img.onerror = () => resolve({ passed: false, score: 0, checks: {} });
    img.src = dataUrl;
  });
}
