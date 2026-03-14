import COMPANY from './company';

export function downloadPDF() {
  const { jsPDF } = window.jspdf;

  // Use A5 landscape — enough space for all content
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = 210; // A5 landscape width
  const H = 148; // A5 landscape height

  // ── Header strip ──
  doc.setFillColor(20, 23, 23);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(117, 192, 67);
  doc.rect(0, 35.5, W, 1.5, 'F');

  // CEO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.person, 12, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.title, 12, 21);

  // Divider between CEO and CMO
  doc.setDrawColor(117, 192, 67);
  doc.setLineWidth(0.3);
  doc.line(12, 24, 100, 24);

  // CMO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.cmo, 12, 31);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.cmoTitle, 12, 38);

  // Brand top-right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(COMPANY.brand.toUpperCase(), W - 12, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 220, 180);
  const nameLines = doc.splitTextToSize(COMPANY.name, 70);
  doc.text(nameLines, W - 12, 22, { align: 'right' });

  // ── Body ──
  let y = 52;

  // Tagline
  doc.setFontSize(11);
  doc.setTextColor(100, 124, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(COMPANY.tagline, 12, y);
  y += 12;

  // Contact rows
  const contacts = [
    { label: 'Email',   value: COMPANY.email   },
    { label: 'Phone',   value: COMPANY.phone   },
    { label: 'Website', value: COMPANY.website },
    { label: 'Address', value: COMPANY.address },
  ];

  contacts.forEach(({ label, value }) => {
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 160, 150);
    doc.text(label.toUpperCase(), 12, y);

    // Value — wrapped to full width
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(9, 103, 15);
    const lines = doc.splitTextToSize(value, W - 24);
    doc.text(lines, 12, y + 6);
    y += 6 + lines.length * 6 + 5;
  });

  // ── Footer ──
  doc.setFillColor(224, 243, 227);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(9, 103, 15);
  doc.text(`"${COMPANY.tagline}"`, W / 2, H - 4, { align: 'center' });

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