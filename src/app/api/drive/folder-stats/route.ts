import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { folderId } = await req.json()

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()

    // FIX #3: Use a small pageSize (50) and minimal fields.
    // We only need file count, total size, and last modified time —
    // fetching up to 1000 items per subfolder was extremely wasteful.
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, size, modifiedTime)',
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
