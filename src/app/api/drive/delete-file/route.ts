import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient, deleteOrUnlinkFile } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json()

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()
    const result = await deleteOrUnlinkFile(drive, fileId)

    return NextResponse.json({
      success: true,
      message: `File deleted successfully (${result.method})`,
    })
  } catch (err: any) {
    console.error('Error deleting file in Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to delete file in Google Drive' },
      { status: 500 }
    )
  }
}
