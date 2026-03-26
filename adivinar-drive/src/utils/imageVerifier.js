/**
 * imageVerifier.js
 *
 * Thresholds tuned against real card images:
 *   - White marble card (bright):  lum=219, sharp=1002, edge=43%
 *   - Dark red card (dark):        lum=43,  sharp=507,  edge=20%
 *   - Real photo card (normal):    lum=129, sharp=970,  edge=41%
 *
 * Two modes:
 *   1. verifyCardImage(dataUrl) — for uploaded files (async)
 *   2. analyseFrame(canvas)    — for live camera frames (sync, fast)
 *
 * Checks:
 *   BRIGHTNESS — not pitch black / not severely overexposed
 *   SHARPNESS  — enough detail for OCR to read text
 *   COVERAGE   — card has content, not just empty background
 *   PERSPECTIVE — only for live camera (disabled for gallery uploads)
 */

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED PIXEL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function longestBrightRun(pixels, rowOffset, w, threshold) {
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let x = 0; x < w; x++) {
    const i = rowOffset + x * 4;
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
    if (lum > threshold) {
      if (curLen === 0) curStart = x;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curLen = 0;
    }
  }
  return bestLen > 0 ? { left: bestStart, right: bestStart + bestLen - 1, span: bestLen } : null;
}

function lineFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return [0, ys[0] || 0];
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  return [slope, my - slope * mx];
}

// ─────────────────────────────────────────────────────────────────────────────
//  INDIVIDUAL CHECKS
// ─────────────────────────────────────────────────────────────────────────────

function checkBrightness(pixels, w, h) {
  const n = w * h;
  let sum = 0, blown = 0;
  for (let i = 0; i < n; i++) {
    const lum = 0.299*pixels[i*4] + 0.587*pixels[i*4+1] + 0.114*pixels[i*4+2];
    sum += lum;
    if (pixels[i*4] > 240 && pixels[i*4+1] > 240 && pixels[i*4+2] > 240) blown++;
  }
  const avg      = sum / n;
  const blownPct = blown / n;

  // min=25 → allows dark cards like the red card (lum=43) with margin
  // blown >70% → truly washed out / overexposed flash
  const tooDark   = avg < 25;
  const tooBright = blownPct > 0.70;

  return {
    pass:   !tooDark && !tooBright,
    label:  'Lighting',
    icon:   '☀️',
    reason: tooDark   ? 'Too dark — move to better light'
          : tooBright ? 'Too much glare — reduce flash or tilt card'
          : 'Good lighting ✓',
  };
}

function checkSharpness(pixels, w, h) {
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w*h; i++)
    grey[i] = 0.299*pixels[i*4] + 0.587*pixels[i*4+1] + 0.114*pixels[i*4+2];

  let variance = 0, count = 0;
  for (let y = 2; y < h-2; y += 2) {
    for (let x = 2; x < w-2; x += 2) {
      const lap = -grey[(y-1)*w+x] - grey[(y+1)*w+x]
                  -grey[y*w+(x-1)] - grey[y*w+(x+1)]
                  + 4*grey[y*w+x];
      variance += lap * lap;
      count++;
    }
  }
  const score = count ? variance / count : 0;

  // Threshold=8: real blurry phone photos score 3-8, clear photos score 50+
  // Your sample cards scored 507-1002 — well above this
  return {
    pass:   score >= 8,
    label:  'Focus',
    icon:   '🔍',
    reason: score < 8 ? 'Too blurry — hold steady and tap to focus'
                      : 'In focus ✓',
    score,
  };
}

function checkPerspective(pixels, w, h) {
  const BRIGHT   = 105;
  const minSpan  = w * 0.15;
  const rowYs = [], rowLefts = [], rowRights = [];

  for (let y = 0; y < h; y++) {
    const run = longestBrightRun(pixels, y * w * 4, w, BRIGHT);
    if (run && run.span > minSpan) {
      rowYs.push(y);
      rowLefts.push(run.left);
      rowRights.push(run.right);
    }
  }

  if (rowYs.length < 12) {
    return { pass: true, label: 'Angle', icon: '📐', reason: 'Angle OK ✓' };
  }

  const [leftSlope]  = lineFit(rowYs, rowLefts);
  const [rightSlope] = lineFit(rowYs, rowRights);

  const topY    = rowYs[0], botY = rowYs[rowYs.length - 1];
  const topLeft  = leftSlope  * topY + rowLefts[0];
  const botLeft  = leftSlope  * botY + rowLefts[0];
  const topRight = rightSlope * topY + rowRights[0];
  const botRight = rightSlope * botY + rowRights[0];

  const topWidth     = topRight - topLeft;
  const botWidth     = botRight - botLeft;
  const widthDiffPct = Math.abs(topWidth - botWidth) / w * 100;
  const maxSlope     = Math.max(Math.abs(leftSlope), Math.abs(rightSlope));
  const minSlope     = Math.min(Math.abs(leftSlope), Math.abs(rightSlope));
  const slopeRatio   = maxSlope > 0.01 ? minSlope / maxSlope : 1.0;

  const pass = widthDiffPct < 20 && slopeRatio > 0.30;
  return {
    pass,
    label:  'Angle',
    icon:   '📐',
    reason: pass ? 'Perpendicular ✓'
                 : 'Tilt detected — hold camera directly above card',
    widthDiffPct: Math.round(widthDiffPct),
  };
}

function checkCoverage(pixels, w, h) {
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w*h; i++)
    grey[i] = 0.299*pixels[i*4] + 0.587*pixels[i*4+1] + 0.114*pixels[i*4+2];

  const x0 = Math.round(w*0.15), x1 = Math.round(w*0.85);
  const y0 = Math.round(h*0.15), y1 = Math.round(h*0.85);
  let edge = 0, total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const gx = grey[y*w+Math.min(x+1,w-1)] - grey[y*w+Math.max(x-1,0)];
      const gy = grey[Math.min(y+1,h-1)*w+x] - grey[Math.max(y-1,0)*w+x];
      if (Math.sqrt(gx*gx + gy*gy) > 12) edge++;
      total++;
    }
  }
  const density = total ? edge / total : 0;

  // 1.5% threshold: blank/empty image ~0.2-0.5%, your cards scored 20-43%
  return {
    pass:   density >= 0.015,
    label:  'Card in Frame',
    icon:   '🃏',
    reason: density < 0.015 ? 'No card detected — point camera at the card'
                             : 'Card detected ✓',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  analyseFrame — SYNC, live camera (includes perspective check)
// ─────────────────────────────────────────────────────────────────────────────
export function analyseFrame(canvas) {
  if (!canvas || !canvas.width) return null;
  const w = canvas.width, h = canvas.height;

  // Downscale to max 320px wide for speed
  const scale = Math.min(1, 320 / w);
  const sw = Math.round(w * scale), sh = Math.round(h * scale);

  const tmp = document.createElement('canvas');
  tmp.width = sw; tmp.height = sh;
  tmp.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
  const pixels = tmp.getContext('2d').getImageData(0, 0, sw, sh).data;

  const brightness  = checkBrightness(pixels, sw, sh);
  const sharpness   = checkSharpness(pixels, sw, sh);
  const perspective = checkPerspective(pixels, sw, sh);
  const coverage    = checkCoverage(pixels, sw, sh);

  const checks = { brightness, sharpness, perspective, coverage };
  const passed  = brightness.pass && sharpness.pass && perspective.pass && coverage.pass;

  const failReason = !brightness.pass  ? brightness.reason
                   : !sharpness.pass   ? sharpness.reason
                   : !perspective.pass ? perspective.reason
                   : !coverage.pass    ? coverage.reason
                   : null;

  return { passed, checks, failReason };
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyCardImage — ASYNC, gallery uploads (perspective check disabled)
//  Perspective is skipped because uploaded images are already flat/cropped
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyCardImage(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 640 / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width  = Math.round(img.naturalWidth  * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);

      const w = c.width, h = c.height;
      const pixels = c.getContext('2d').getImageData(0, 0, w, h).data;

      const brightness  = checkBrightness(pixels, w, h);
      const sharpness   = checkSharpness(pixels, w, h);
      const coverage    = checkCoverage(pixels, w, h);

      // Perspective disabled for uploads — images are already flat
      const perspective = { pass: true, label: 'Angle', icon: '📐', reason: 'Angle check skipped ✓' };

      const checks = { brightness, sharpness, perspective, coverage };
      const passed  = brightness.pass && sharpness.pass && coverage.pass;

      const advice = !brightness.pass ? brightness.reason
                   : !sharpness.pass  ? sharpness.reason
                   : !coverage.pass   ? coverage.reason
                   : '✓ Photo looks great — ready to save';

      resolve({ passed, checks, advice });
    };
    img.onerror = () => resolve({ passed: false, checks: {}, advice: 'Could not load image.' });
    img.src = dataUrl;
  });
}