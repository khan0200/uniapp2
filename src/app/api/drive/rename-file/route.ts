import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { fileId, newName } = await req.json()

    if (!fileId || !newName || !newName.trim()) {
      return NextResponse.json({ error: 'File ID and new file name are required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        name: newName.trim(),
      },
    })

    return NextResponse.json({ success: true, newName: newName.trim() })
  } catch (err: any) {
    console.error('Error renaming file in Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to rename file in Google Drive' },
      { status: 500 }
    )
  }
}
