import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { folderName, parentFolderId } = await req.json()

    if (!folderName || !folderName.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    if (!parentFolderId) {
      return NextResponse.json({ error: 'Parent Folder ID is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    // Create a folder in Google Drive
    const fileMetadata = {
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }

    const folderRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, webViewLink, createdTime',
      supportsAllDrives: true,
    })

    const folder = {
      id: folderRes.data.id,
      name: folderRes.data.name,
      mimeType: folderRes.data.mimeType,
      webViewLink: folderRes.data.webViewLink,
      createdTime: folderRes.data.createdTime,
    }

    return NextResponse.json({ success: true, folder })
  } catch (err: any) {
    console.error('Error creating folder in Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create folder in Google Drive' },
      { status: 500 }
    )
  }
}
