import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName, passport, forceCreate } = await req.json()

    if (!studentId || !studentName) {
      return NextResponse.json({ error: 'Student ID and name are required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID

    // 1. Search Google Drive for existing folders matching studentId or studentName (unless forceCreate is true)
    let existingFolderId: string | null = null
    let existingFolderUrl: string | null = null

    if (!forceCreate) {
      try {
        // List all folders accessible by the service account
        const listRes = await drive.files.list({
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          pageSize: 300,
          fields: 'files(id, name, webViewLink)',
        })

      const allFolders = listRes.data.files || []

      // Normalization helpers for fuzzy matching (e.g. ISAKJONOV vs ISAQJONOV)
      const cleanStr = (s: string) =>
        s
          .toUpperCase()
          .replace(/[Q]/g, 'K')
          .replace(/[^A-Z0-9\s]/g, '')
          .trim()

      const targetId = cleanStr(studentId)
      const nameParts = cleanStr(studentName)
        .split(/\s+/)
        .filter(p => p.length > 2)

      // Find matching folder
      const matchedFolder = allFolders.find(folder => {
        if (!folder.name) return false
        const folderUpper = folder.name.toUpperCase()
        const folderClean = cleanStr(folder.name)

        // Exact or boundary match on student ID (e.g. "F54", "D1", "D92")
        if (targetId && (folderClean.startsWith(targetId + ' ') || folderClean === targetId || folderUpper.includes(`(${targetId})`))) {
          return true
        }

        // Match on primary last name & first name
        if (nameParts.length >= 2) {
          const lastName = nameParts[0]
          const firstName = nameParts[1]
          if (folderClean.includes(lastName) && folderClean.includes(firstName)) {
            return true
          }
        }


        return false
      })

        if (matchedFolder) {
          existingFolderId = matchedFolder.id || null
          existingFolderUrl = matchedFolder.webViewLink || null
        }
      } catch (searchErr) {
        console.warn('Google Drive search failed, proceeding with folder creation:', searchErr)
      }
    }

    let folderId = existingFolderId
    let folderUrl = existingFolderUrl
    let isExisting = true

    // 2. If no existing folder found, create a new folder
    if (!folderId || !folderUrl) {
      isExisting = false
      const folderName = `${studentId.trim().toUpperCase()} ${studentName.trim().toUpperCase()}${passport ? ` (${passport})` : ''}`
      const driveResponse = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentFolderId ? [parentFolderId] : [],
        },
        fields: 'id, webViewLink',
      })

      folderId = driveResponse.data.id || null
      folderUrl = driveResponse.data.webViewLink || null

      if (folderId) {
        try {
          await drive.permissions.create({
            fileId: folderId,
            requestBody: { role: 'writer', type: 'anyone' },
          })
        } catch (permErr) {
          console.warn('Warning: Failed to set folder permissions:', permErr)
        }
      }
    }

    if (!folderId || !folderUrl) {
      throw new Error('Failed to obtain folder ID or URL from Google Drive API')
    }

    // 3. Update Supabase database with Google Drive folder info
    const supabase = await createClient()
    const { error: dbError } = await (supabase
      .from('students') as any)
      .update({
        google_drive_folder_id: folderId,
        google_drive_url: folderUrl,
      })
      .eq('id', studentId)

    if (dbError) {
      console.error('Supabase DB Update Error:', dbError)
      throw new Error(`Database update failed: ${dbError.message}`)
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderUrl,
      isExisting,
    })
  } catch (error: any) {
    console.error('Google Drive Folder Error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while linking Google Drive folder' },
      { status: 500 }
    )
  }
}
