import { jsPDF } from "jspdf"; // <--- Add this import!
import COMPANY from './company';

export function downloadPDF() {
  // Remove the `const { jsPDF } = window.jspdf;` line
  
  // Create your landscape 85x55mm card
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] });

  doc.setFillColor(20, 23, 23);
  doc.rect(0, 0, 85, 14, 'F');
  doc.setFillColor(117, 192, 67);
  doc.rect(0, 13.5, 85, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(COMPANY.person, 6, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 220, 180);
  doc.text(COMPANY.title, 6, 12.5);

  doc.setFillColor(9, 103, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text(COMPANY.brand.toUpperCase(), 72, 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(180, 220, 180);
  doc.text(COMPANY.name, 72, 9);

  doc.setTextColor(20, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(COMPANY.name, 6, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 124, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.tagline, 6, 27);

  let y = 33;
  [COMPANY.email, COMPANY.phone, COMPANY.website, COMPANY.address].forEach(val => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(9, 103, 15);
    doc.text(val, 6, y);
    y += 4.5;
  });

  doc.setFillColor(224, 243, 227);
  doc.rect(0, 50, 85, 6, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
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