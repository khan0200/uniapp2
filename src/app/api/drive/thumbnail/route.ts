import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    const size = searchParams.get('size') || '400'

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const drive = getGoogleDriveClient()
    const fileRes = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, thumbnailLink',
      supportsAllDrives: true,
    })

    let thumbnailUrl = fileRes.data.thumbnailLink

    // If it's an image and has no thumbnailLink, stream media directly
    if (!thumbnailUrl && fileRes.data.mimeType?.startsWith('image/')) {
      const mediaRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      )
      return new NextResponse(mediaRes.data as ArrayBuffer, {
        headers: {
          'Content-Type': fileRes.data.mimeType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'public, s-maxage=604800',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=604800',
        },
      })
    }

    if (!thumbnailUrl) {
      return NextResponse.json({ error: 'No thumbnail available for this file' }, { status: 404 })
    }

    // Adjust size in Google Drive thumbnail URL if possible
    if (thumbnailUrl.includes('=s')) {
      thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`)
    }

    const imgRes = await fetch(thumbnailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!imgRes.ok) {
      // Fallback: try fetching original thumbnail link without size modification
      if (fileRes.data.thumbnailLink && thumbnailUrl !== fileRes.data.thumbnailLink) {
        const fallbackRes = await fetch(fileRes.data.thumbnailLink)
        if (fallbackRes.ok) {
          const contentType = fallbackRes.headers.get('content-type') || 'image/jpeg'
          const buffer = await fallbackRes.arrayBuffer()
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
              'CDN-Cache-Control': 'public, s-maxage=604800',
              'Vercel-CDN-Cache-Control': 'public, s-maxage=604800',
            },
          })
        }
      }
      return NextResponse.json({ error: 'Failed to fetch thumbnail image' }, { status: imgRes.status })
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await imgRes.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, s-maxage=604800',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=604800',
      },
    })
  } catch (err: any) {
    console.error('Thumbnail API error:', err)
    return NextResponse.json({ error: err.message || 'Failed to serve thumbnail' }, { status: 500 })
  }
}
