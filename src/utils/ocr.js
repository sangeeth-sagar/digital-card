// ─────────────────────────────────────────────
//  SMART PARSER — extracts fields from raw OCR text
// ─────────────────────────────────────────────
export function parseCardText(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(Boolean);
  const emailRx = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const phoneRx = /(\+?\d[\d\s\-().]{7,15}\d)/;
  const webRx   = /(?:www\.|https?:\/\/)[^\s]+/i;
  const titleRx = /\b(CEO|CTO|CFO|COO|Director|Manager|Engineer|Developer|Designer|Founder|President|VP|Head|Lead|Senior|Principal|Consultant|Analyst|Officer|Executive|Partner|Specialist)\b/i;

  let name = '', title = '', company = '', email = '', phone = '', website = '';

  lines.forEach(line => {
    if (!email)   { const m = line.match(emailRx); if (m) { email = m[0]; return; } }
    if (!phone && !emailRx.test(line)) { const m = line.match(phoneRx); if (m) { phone = m[0].trim(); return; } }
    if (!website && !emailRx.test(line)) { const m = line.match(webRx); if (m) { website = m[0].trim(); return; } }
  });

  lines.forEach(line => {
    if (!title && titleRx.test(line) && line.length < 60) title = line;
  });

  lines.forEach(line => {
    if (!name && !emailRx.test(line) && !phoneRx.test(line) && !webRx.test(line)
        && line !== title && line.length < 50 && /^[A-Za-z\s.']+$/.test(line)) {
      name = line;
    }
  });

  lines.forEach(line => {
    if (!company && !emailRx.test(line) && !phoneRx.test(line) && !webRx.test(line)
        && line !== name && line !== title && line.length < 80 && /[A-Za-z]{3,}/.test(line)) {
      company = line;
    }
  });

  return { name, title, company, email, phone, website };
}
