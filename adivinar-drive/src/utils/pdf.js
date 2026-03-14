import COMPANY from './company';

export function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] });

  // ── Dark header strip ──
  doc.setFillColor(20, 23, 23);
  doc.rect(0, 0, 85, 15, 'F');
  doc.setFillColor(117, 192, 67);
  doc.rect(0, 14.5, 85, 1, 'F');

  // Person name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(COMPANY.person, 6, 7);

  // Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 220, 180);
  doc.text(COMPANY.title, 6, 12);

  // Brand top-right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text(COMPANY.brand.toUpperCase(), 79, 5, { align: 'right' });

  // Company name top-right — split into two lines if too long
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(180, 220, 180);
  const nameLines = doc.splitTextToSize(COMPANY.name, 28);
  doc.text(nameLines, 79, 9, { align: 'right' });

  // ── Body ──
  // Company name large — wrapped
  doc.setTextColor(20, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const bodyNameLines = doc.splitTextToSize(COMPANY.name, 73);
  doc.text(bodyNameLines, 6, 22);

  // Tagline
  const nameBlockHeight = bodyNameLines.length * 4;
  doc.setFontSize(6.5);
  doc.setTextColor(100, 124, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.tagline, 6, 22 + nameBlockHeight);

  // ── Contact details — each wrapped ──
  let y = 22 + nameBlockHeight + 6;
  const contacts = [
    { icon: '✉', value: COMPANY.email   },
    { icon: '✆', value: COMPANY.phone   },
    { icon: '⊕', value: COMPANY.website },
    { icon: '⊙', value: COMPANY.address },
  ];

  contacts.forEach(({ value }) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(9, 103, 15);
    const lines = doc.splitTextToSize(value, 73);
    doc.text(lines, 6, y);
    y += lines.length * 3.8;
  });

  // ── Footer strip ──
  doc.setFillColor(224, 243, 227);
  doc.rect(0, 50, 85, 6, 'F');
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
  const text = `${COMPANY.person}\n${COMPANY.title}\n${COMPANY.name}\n📧 ${COMPANY.email}\n📞 ${COMPANY.phone}\n🌐 ${COMPANY.website}`;
  if (navigator.share) {
    await navigator.share({ title: COMPANY.brand, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}