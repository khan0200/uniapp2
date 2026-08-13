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

    let message = err.message || 'Failed to upload file to Google Drive'
    if (message.includes('Service Accounts do not have storage quota') || message.includes('quota')) {
      message = `Google Drive Quota Error: Service accounts cannot upload files to personal Google Drive folders. Please move this folder into a Google Shared Drive and add uniapp@salom-504014.iam.gserviceaccount.com as Content Manager.`
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
