// api/upload-drive.js
const { google } = require('googleapis');
const { Readable } = require('stream');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { imageBase64, side = 'card' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ message: 'imageBase64 is required.' });
  }

  const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
  if (!FOLDER_ID) {
    return res.status(500).json({ message: 'DRIVE_FOLDER_ID not set in .env' });
  }

  try {
    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer     = Buffer.from(base64Data, 'base64');
    const mimeType   = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const ext        = mimeType.split('/')[1] || 'jpg';
    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
    const filename   = `${side}_${timestamp}.${ext}`;

    console.log('Uploading:', filename);

    const file = await drive.files.create({
      requestBody: {
        name:    filename,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, name, webViewLink',
    });

    console.log('✅ Uploaded:', file.data.name);
    return res.status(200).json({
      success:  true,
      fileId:   file.data.id,
      fileName: file.data.name,
      url:      file.data.webViewLink,
    });

  } catch (err) {
    console.error('❌  error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};