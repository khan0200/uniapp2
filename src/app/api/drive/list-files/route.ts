import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { folderId, folderUrl } = await req.json()

    let targetFolderId = folderId
    if (!targetFolderId && folderUrl) {
      const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
      if (match) targetFolderId = match[1]
    }

    if (!targetFolderId) {
      return NextResponse.json({ error: 'Folder ID or URL is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    const res = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, iconLink)',
      orderBy: 'folder, name',
    })

    const files = (res.data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      thumbnailLink: file.thumbnailLink,
      size: file.size ? Number(file.size) : null,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      iconLink: file.iconLink,
    }))

    return NextResponse.json({ success: true, files })
  } catch (err: any) {
    console.error('Error listing Google Drive files:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to list files from Google Drive' },
      { status: 500 }
    )
  }
}
