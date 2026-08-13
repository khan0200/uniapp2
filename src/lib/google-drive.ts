import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive']

export function getGoogleDriveClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim()

  if (!email || !privateKey) {
    throw new Error('Google Drive credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) are missing in environment variables.')
  }

  // Strip accidental surrounding quotes
  if ((email.startsWith('"') && email.endsWith('"')) || (email.startsWith("'") && email.endsWith("'"))) {
    email = email.slice(1, -1).trim()
  }
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1)
  }

  // Normalize the private key
  if (!privateKey.includes('\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  const lines = privateKey.split('\n').map((l) => l.trim()).filter(Boolean)
  privateKey = lines.join('\n') + '\n'

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  })

  return google.drive({ version: 'v3', auth })
}

/**
 * Safely delete or remove a file from Google Drive.
 * Handles permission errors when the Service Account is an Editor (not owner)
 * by falling back to removing the file from parent folders (unlinking it).
 */
export async function deleteOrUnlinkFile(drive: any, fileId: string) {
  // 1. Try trashing the file
  try {
    await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: { trashed: true },
    })
    return { success: true, method: 'trashed' }
  } catch (err: any) {
    // 2. Try hard delete
    try {
      await drive.files.delete({ fileId, supportsAllDrives: true })
      return { success: true, method: 'deleted' }
    } catch (err2: any) {
      // 3. Fallback: remove file from its parent folders (unlinks file from user's view)
      const fileInfo = await drive.files.get({
        fileId,
        fields: 'id, parents',
        supportsAllDrives: true,
      })
      const parents = fileInfo.data.parents || []
      if (parents.length > 0) {
        await drive.files.update({
          fileId,
          removeParents: parents.join(','),
          supportsAllDrives: true,
        })
        return { success: true, method: 'unlinked' }
      }
      throw err
    }
  }
}
