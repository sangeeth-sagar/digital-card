// api/upload-drive.js
// Combines front + back card images into a single PDF and uploads to Google Drive

const { google } = require('googleapis');
const { Readable } = require('stream');
const { jsPDF }   = require('jspdf');

function getAuth() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      `Missing env vars — CLIENT_ID:${!!clientId} SECRET:${!!clientSecret} REFRESH:${!!refreshToken}`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

// Build a PDF buffer with front on page 1, back on page 2
function buildPDF(frontBase64, backBase64) {
  // Business card size: 85.6mm x 54mm (landscape)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });

  if (frontBase64) {
    const mime = frontBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const fmt  = mime.includes('png') ? 'PNG' : 'JPEG';
    doc.addImage(frontBase64, fmt, 0, 0, 85.6, 54);
  }

  if (backBase64) {
    doc.addPage();
    const mime = backBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const fmt  = mime.includes('png') ? 'PNG' : 'JPEG';
    doc.addImage(backBase64, fmt, 0, 0, 85.6, 54);
  }

  // Return as Buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { front, back } = req.body;

  if (!front && !back) {
    return res.status(400).json({ message: 'At least one of front or back image is required.' });
  }

  const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
  if (!FOLDER_ID) {
    return res.status(500).json({ message: 'DRIVE_FOLDER_ID not set in .env' });
  }

  try {
    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Build PDF
    const pdfBuffer = buildPDF(front, back);

    // Filename: card_2024-01-01T10-30-00.pdf
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `card_${timestamp}.pdf`;

    console.log('Uploading PDF:', filename);

    const file = await drive.files.create({
      requestBody: {
        name:    filename,
        parents: [FOLDER_ID],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body:     Readable.from(pdfBuffer),
      },
      fields: 'id, name, webViewLink',
    });

    console.log('✅ Uploaded PDF:', file.data.name);
    return res.status(200).json({
      success:  true,
      fileId:   file.data.id,
      fileName: file.data.name,
      url:      file.data.webViewLink,
    });

  } catch (err) {
    console.error('❌ Drive error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};