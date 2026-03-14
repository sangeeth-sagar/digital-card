import COMPANY from './company';

// Convert an SVG URL to a base64 image via canvas
async function svgToBase64(svgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  || 672;  // 2x for quality
      canvas.height = img.naturalHeight || 384;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load ${svgUrl}`));
    img.src = svgUrl;
  });
}

export async function downloadPDF() {
  const { jsPDF } = window.jspdf;

  // Card size: 85.6mm x 54mm landscape
  const W = 85.6;
  const H = 54;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });

  // ── Page 1: Front card SVG ──
  try {
    const frontImg = await svgToBase64('Front.svg');
    doc.addImage(frontImg, 'PNG', 0, 0, W, H);
  } catch {
    // Fallback: plain green background with text
    doc.setFillColor(9, 103, 15);
    doc.rect(0, 0, W, H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(COMPANY.brand, W / 2, H / 2, { align: 'center' });
  }

  // ── Page 2: Back card SVG ──
  doc.addPage();
  try {
    const backImg = await svgToBase64('Back.svg');
    doc.addImage(backImg, 'PNG', 0, 0, W, H);
  } catch {
    doc.setFillColor(20, 23, 23);
    doc.rect(0, 0, W, H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(COMPANY.name, W / 2, H / 2, { align: 'center' });
  }

  // ── Page 3: Contact details ──
  doc.addPage();

  // Dark header
  doc.setFillColor(20, 23, 23);
  doc.rect(0, 0, W, 19, 'F');
  doc.setFillColor(117, 192, 67);
  doc.rect(0, 18.5, W, 1, 'F');

  // CEO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(COMPANY.person, 6, 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.title, 6, 11);

  // CMO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(COMPANY.cmo, 6, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.cmoTitle, 6, 20);

  // Brand top-right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(COMPANY.brand.toUpperCase(), 79, 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(180, 220, 180);
  const nameLines = doc.splitTextToSize(COMPANY.name, 28);
  doc.text(nameLines, 79, 10, { align: 'right' });

  // Company name body
  doc.setTextColor(20, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const bodyNameLines = doc.splitTextToSize(COMPANY.name, 73);
  doc.text(bodyNameLines, 6, 26);

  const nameBlockH = bodyNameLines.length * 4;
  doc.setFontSize(6.5);
  doc.setTextColor(100, 124, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.tagline, 6, 26 + nameBlockH);

  // Contact details
  let y = 26 + nameBlockH + 6;
  [COMPANY.email, COMPANY.phone, COMPANY.website, COMPANY.address].forEach(val => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(9, 103, 15);
    const lines = doc.splitTextToSize(val, 73);
    doc.text(lines, 6, y);
    y += lines.length * 3.8;
  });

  // Footer
  doc.setFillColor(224, 243, 227);
  doc.rect(0, 50, W, 6, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(9, 103, 15);
  doc.text(`"${COMPANY.tagline}"`, 6, 54);

  doc.save(`${COMPANY.brand}_Card.pdf`);
}

export function saveVCard() {
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${COMPANY.person}`,
    `ORG:${COMPANY.name}`,
    `TITLE:${COMPANY.title}`,
    `EMAIL:${COMPANY.email}`,
    `TEL:${COMPANY.phone}`,
    `URL:https://${COMPANY.website}`,
    `ADR:;;${COMPANY.address}`,
    `NOTE:${COMPANY.tagline}`,
    'END:VCARD',
  ].join('\n');

  const blob = new Blob([vcf], { type: 'text/vcard' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${COMPANY.brand}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareCard() {
  const text = `${COMPANY.person} — ${COMPANY.title}\n${COMPANY.cmo} — ${COMPANY.cmoTitle}\n${COMPANY.name}\n📧 ${COMPANY.email}\n📞 ${COMPANY.phone}\n🌐 ${COMPANY.website}`;
  if (navigator.share) {
    await navigator.share({ title: COMPANY.brand, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}