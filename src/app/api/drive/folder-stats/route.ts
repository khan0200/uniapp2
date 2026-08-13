import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { folderId } = await req.json()

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, size, modifiedTime, mimeType)',
    })

    const files = res.data.files || []
    const fileCount = files.length
    const totalSize = files.reduce((sum, f) => sum + (f.size ? Number(f.size) : 0), 0)
    const lastModifiedTime = files
      .map(f => f.modifiedTime || '')
      .filter(Boolean)
      .sort()
      .reverse()[0] || null

    return NextResponse.json({ success: true, fileCount, totalSize, lastModifiedTime })
  } catch (err: any) {
    console.error('Error fetching folder stats:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch folder stats' },
      { status: 500 }
    )
  }
}
