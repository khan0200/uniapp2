import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'
import { Readable } from 'stream'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folderId = formData.get('folderId') as string | null

    if (!file || !folderId) {
      return NextResponse.json({ error: 'File and folder ID are required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    const res = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      supportsAllDrives: true,
      supportsTeamDrives: true,
      fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink',
    })

    return NextResponse.json({ success: true, file: res.data })
  } catch (err: any) {
    console.error('Error uploading file to Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to upload file to Google Drive' },
      { status: 500 }
    )
  }
}
