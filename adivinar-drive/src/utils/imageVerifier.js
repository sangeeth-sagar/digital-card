/**
 * imageVerifier.js
 *
 * Two modes:
 *   1. verifyCardImage(dataUrl)   — for uploaded files (async, full check)
 *   2. analyseFrame(canvas)       — for live camera frames (sync, fast, no async)
 *
 * Checks:
 *   BRIGHTNESS  — not too dark / overexposed
 *   SHARPNESS   — image in focus
 *   PERSPECTIVE — card shot straight-on (perpendicular), not at angle
 *   COVERAGE    — card fills enough of the frame
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
//  INDIVIDUAL CHECKS  (work on raw pixel Uint8ClampedArray)
// ─────────────────────────────────────────────────────────────────────────────

function checkBrightness(pixels, w, h) {
  const n = w * h;
  let sum = 0, blown = 0;
  for (let i = 0; i < n; i++) {
    const lum = 0.299*pixels[i*4] + 0.587*pixels[i*4+1] + 0.114*pixels[i*4+2];
    sum += lum;
    if (pixels[i*4] > 240 && pixels[i*4+1] > 240 && pixels[i*4+2] > 240) blown++;
  }
  const avg = sum / n;
  const blownPct = blown / n;
  const tooDark   = avg < 60;
  const tooBright = avg > 215 || blownPct > 0.35;
  return {
    pass:   !tooDark && !tooBright,
    label:  'Lighting',
    icon:   '☀️',
    reason: tooDark   ? 'Too dark — add more light'
          : tooBright ? 'Overexposed — reduce glare'
          : 'Good lighting ✓',
  };
}

function checkSharpness(pixels, w, h) {
  // Sample every 2nd pixel for speed on live frames
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
  return {
    pass:   score >= 20,
    label:  'Focus',
    icon:   '🔍',
    reason: score < 20 ? 'Blurry — tap to focus or hold steady'
                       : 'In focus ✓',
    score,
  };
}

function checkPerspective(pixels, w, h) {
  const BRIGHT = 155;
  const minSpan = w * 0.22;
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

  const topY = rowYs[0], botY = rowYs[rowYs.length - 1];
  const topLeft  = leftSlope  * topY + rowLefts[0];
  const botLeft  = leftSlope  * botY + rowLefts[0];
  const topRight = rightSlope * topY + rowRights[0];
  const botRight = rightSlope * botY + rowRights[0];

  const topWidth = topRight - topLeft;
  const botWidth = botRight - botLeft;
  const widthDiffPct = Math.abs(topWidth - botWidth) / w * 100;

  const maxSlope  = Math.max(Math.abs(leftSlope), Math.abs(rightSlope));
  const minSlope  = Math.min(Math.abs(leftSlope), Math.abs(rightSlope));
  const slopeRatio = maxSlope > 0.01 ? minSlope / maxSlope : 1.0;

  const pass = widthDiffPct < 15 && slopeRatio > 0.40;

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
  return {
    pass:   density >= 0.025,
    label:  'Card in Frame',
    icon:   '🃏',
    reason: density < 0.025 ? 'Move closer — card too small'
                             : 'Card fills frame ✓',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  analyseFrame — SYNC, called every animation frame from live camera
//  Takes a canvas element, returns result immediately (no await needed)
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

  // Find the first failing reason
  const failReason = !brightness.pass  ? brightness.reason
                   : !sharpness.pass   ? sharpness.reason
                   : !perspective.pass ? perspective.reason
                   : !coverage.pass    ? coverage.reason
                   : null;

  return { passed, checks, failReason };
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyCardImage — ASYNC, for uploaded files
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
      const perspective = checkPerspective(pixels, w, h);
      const coverage    = checkCoverage(pixels, w, h);

      const checks = { brightness, sharpness, perspective, coverage };
      const passed  = brightness.pass && sharpness.pass && perspective.pass && coverage.pass;

      let advice = !brightness.pass  ? brightness.reason
                 : !sharpness.pass   ? sharpness.reason
                 : !perspective.pass ? perspective.reason
                 : !coverage.pass    ? coverage.reason
                 : '✓ Photo looks great — ready to save';

      resolve({ passed, checks, advice });
    };
    img.onerror = () => resolve({ passed: false, checks: {}, advice: 'Could not load image.' });
    img.src = dataUrl;
  });
}