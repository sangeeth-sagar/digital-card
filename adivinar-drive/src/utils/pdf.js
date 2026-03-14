import COMPANY from './company';

export function downloadPDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = 210;
  const H = 148;

  // ── Header ──
  doc.setFillColor(20, 23, 23);
  doc.rect(0, 0, W, 44, 'F');
  doc.setFillColor(117, 192, 67);
  doc.rect(0, 43.5, W, 1.5, 'F');

  // CEO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY.person, 12, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.title, 12, 19);

  // Divider
  doc.setDrawColor(60, 70, 60);
  doc.setLineWidth(0.3);
  doc.line(12, 23, 120, 23);

  // CMO
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY.cmo, 12, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(117, 192, 67);
  doc.text(COMPANY.cmoTitle, 12, 37);

  // Brand top-right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(COMPANY.brand.toUpperCase(), W - 12, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  const nameLines = doc.splitTextToSize(COMPANY.name, 65);
  doc.text(nameLines, W - 12, 20, { align: 'right' });

  // ── Body ──
  let y = 54;

  // Tagline
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 124, 100);
  doc.text(COMPANY.tagline, 12, y);
  y += 10;

  // Contact rows — phone1 and phone2 as separate entries
  const contacts = [
    { label: 'Email',   value: COMPANY.email   },
    { label: 'Phone',   value: COMPANY.phone1  },
    { label: 'Phone',   value: COMPANY.phone2  },
    { label: 'Website', value: COMPANY.website },
    { label: 'Address', value: COMPANY.address },
  ];

  contacts.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 150);
    doc.text(label.toUpperCase(), 12, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(9, 103, 15);
    const lines = doc.splitTextToSize(value, W - 24);
    doc.text(lines, 12, y);
    y += lines.length * 5 + 4;
  });

  // ── Footer ──
  doc.setFillColor(224, 243, 227);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(9, 103, 15);
  doc.text(`"${COMPANY.tagline}"`, W / 2, H - 3, { align: 'center' });

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
    `TEL;TYPE=CELL:${COMPANY.phone1}`,
    `TEL;TYPE=CELL:${COMPANY.phone2}`,
    `URL:${COMPANY.website}`,
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
  const text = `${COMPANY.person} — ${COMPANY.title}\n${COMPANY.cmo} — ${COMPANY.cmoTitle}\n${COMPANY.name}\n📧 ${COMPANY.email}\n📞 ${COMPANY.phone1}\n📞 ${COMPANY.phone2}\n🌐 ${COMPANY.website}`;
  if (navigator.share) {
    await navigator.share({ title: COMPANY.brand, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}