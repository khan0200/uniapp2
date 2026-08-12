import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive']

export function getGoogleDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error('Google Drive credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) are missing in environment variables.')
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
