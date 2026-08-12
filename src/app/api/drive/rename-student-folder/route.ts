import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { folderId, studentId, studentName } = await req.json()

    if (!folderId || !studentId || !studentName) {
      return NextResponse.json({ error: 'Folder ID, student ID, and name are required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()
    const newFolderName = `${studentId.trim().toUpperCase()} ${studentName.trim().toUpperCase()}`

    await drive.files.update({
      fileId: folderId,
      requestBody: {
        name: newFolderName,
      },
    })

    return NextResponse.json({ success: true, newFolderName })
  } catch (err: any) {
    console.error('Error renaming Google Drive folder:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to rename Google Drive folder' },
      { status: 500 }
    )
  }
}
