import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()
    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    )

    return new NextResponse(res.data as ArrayBuffer, {
      headers: {
        'Content-Type': (res.headers['content-type'] as string) || 'application/octet-stream',
      },
    })
  } catch (err: any) {
    console.error('Error proxying Google Drive download:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to download file from Google Drive' },
      { status: 500 }
    )
  }
}
