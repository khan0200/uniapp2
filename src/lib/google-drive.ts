import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive']

export function getGoogleDriveClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim()

  if (!email || !privateKey) {
    throw new Error('Google Drive credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) are missing in environment variables.')
  }

  // Strip accidental surrounding quotes and whitespace/newlines
  if ((email.startsWith('"') && email.endsWith('"')) || (email.startsWith("'") && email.endsWith("'"))) {
    email = email.slice(1, -1).trim()
  }

  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1).trim()
  }

  // Handle unescaped newlines in private key string
  privateKey = privateKey.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  })

  return google.drive({ version: 'v3', auth })
}
