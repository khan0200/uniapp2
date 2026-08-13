import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient, deleteOrUnlinkFile } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { fileId, newName, folderId, conflictResolution } = await req.json()

    if (!fileId || !newName || !newName.trim()) {
      return NextResponse.json({ error: 'File ID and new file name are required' }, { status: 400 })
    }

    const trimmedName = newName.trim()
    const drive = getGoogleDriveClient()

    // If folderId is provided and no conflict resolution chosen yet, check for existing duplicates (case-insensitive)
    if (folderId && !conflictResolution) {
      const targetChildrenRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      })
      const existingFiles = targetChildrenRes.data.files || []
      const duplicate = existingFiles.find(
        f => f.id !== fileId && (f.name || '').toLowerCase() === trimmedName.toLowerCase()
      )

      if (duplicate) {
        return NextResponse.json({
          hasConflict: true,
          existingFile: { id: duplicate.id, name: duplicate.name },
          newName: trimmedName,
        })
      }
    }

    let finalName = trimmedName

    if (conflictResolution === 'replace' && folderId) {
      // Find existing duplicate file in folder and trash/unlink it
      const targetChildrenRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      })
      const existingFiles = targetChildrenRes.data.files || []
      const duplicates = existingFiles.filter(
        f => f.id !== fileId && (f.name || '').toLowerCase() === trimmedName.toLowerCase()
      )
      for (const dup of duplicates) {
        if (dup.id) {
          await deleteOrUnlinkFile(drive, dup.id).catch(() => null)
        }
      }
    } else if (conflictResolution === 'auto_rename' && folderId) {
      // Auto-rename e.g., PHOTO (1).jpg
      const targetChildrenRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      })
      const existingFiles = targetChildrenRes.data.files || []
      const parts = trimmedName.split('.')
      const ext = parts.length > 1 ? `.${parts.pop()}` : ''
      const baseName = parts.join('.')

      let counter = 1
      finalName = `${baseName} (${counter})${ext}`
      while (existingFiles.some(f => f.id !== fileId && (f.name || '').toLowerCase() === finalName.toLowerCase())) {
        counter++
        finalName = `${baseName} (${counter})${ext}`
      }
    }

    await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        name: finalName,
      },
    })

    return NextResponse.json({ success: true, newName: finalName })
  } catch (err: any) {
    console.error('Error renaming file in Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to rename file in Google Drive' },
      { status: 500 }
    )
  }
}
