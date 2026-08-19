import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }))

    const drive = getGoogleDriveClient()
    const supabase = await createClient()

    // 1. Fetch all active students from Supabase
    const { data: students, error: sbError } = await (supabase
      .from('students') as any)
      .select('id, full_name, passport, google_drive_url, google_drive_folder_id')
      .eq('is_deleted', false)

    if (sbError) throw sbError
    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No active students found in database' }, { status: 404 })
    }

    // 2. Fetch all folders from Google Drive
    let allDriveFolders: any[] = []
    let pageToken: string | undefined = undefined

    do {
      const res: any = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        pageSize: 200,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        fields: 'nextPageToken, files(id, name, webViewLink)',
      })
      if (res.data.files) {
        allDriveFolders.push(...res.data.files)
      }
      pageToken = res.data.nextPageToken
    } while (pageToken)

    // Helper to clean and normalize strings for fuzzy matching
    const cleanStr = (s: string) =>
      (s || '')
        .toUpperCase()
        .replace(/[Q]/g, 'K')
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()

    const renames: Array<{ folderId: string; oldName: string; newName: string; studentId: string }> = []
    const links: Array<{ studentId: string; folderId: string; folderName: string }> = []

    for (const folder of allDriveFolders) {
      if (!folder.name) continue

      const folderNameUpper = folder.name.toUpperCase()
      const folderClean = cleanStr(folder.name)

      // Try matching student
      let matchedStudent: any = null

      // Match A: Match by Student ID (e.g. "D1", "F54", "D92", "C81")
      const idMatch = students.find((s: any) => {
        if (!s.id) return false
        const sIdClean = cleanStr(s.id)
        return (
          folderClean.startsWith(sIdClean + ' ') ||
          folderClean === sIdClean ||
          folderNameUpper.includes(`(${s.id.toUpperCase()})`) ||
          folderNameUpper.includes(`[${s.id.toUpperCase()}]`)
        )
      })

      if (idMatch) {
        matchedStudent = idMatch
      } else {
        // Match B: Match by Full Name / Primary Name Parts
        const nameMatch = students.find((s: any) => {
          if (!s.full_name) return false
          const sNameClean = cleanStr(s.full_name)
          const parts = sNameClean.split(/\s+/).filter(p => p.length > 2)

          if (parts.length >= 2) {
            const lastName = parts[0]
            const firstName = parts[1]
            if (folderClean.includes(lastName) && folderClean.includes(firstName)) {
              return true
            }
          }


          return false
        })

        if (nameMatch) {
          matchedStudent = nameMatch
        }
      }

      if (!matchedStudent) continue

      // Target standardized format: "[ID] [FULL_NAME]"
      const expectedName = `${matchedStudent.id} ${matchedStudent.full_name.toUpperCase()}`

      const needsRename = folder.name.trim() !== expectedName
      const needsLink = !matchedStudent.google_drive_folder_id || matchedStudent.google_drive_folder_id !== folder.id

      if (needsRename) {
        renames.push({
          folderId: folder.id,
          oldName: folder.name,
          newName: expectedName,
          studentId: matchedStudent.id,
        })
      }

      if (needsLink) {
        links.push({
          studentId: matchedStudent.id,
          folderId: folder.id,
          folderName: expectedName,
        })
      }

      // Execute renames and database links if dryRun is false
      if (!dryRun) {
        if (needsRename) {
          await drive.files.update({
            fileId: folder.id,
            requestBody: { name: expectedName },
            supportsAllDrives: true,
          })
        }

        if (needsLink || needsRename) {
          await (supabase
            .from('students') as any)
            .update({
              google_drive_folder_id: folder.id,
              google_drive_url: folder.webViewLink,
            })
            .eq('id', matchedStudent.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scannedFolders: allDriveFolders.length,
      totalStudents: students.length,
      renamesCount: renames.length,
      linksCount: links.length,
      renames,
      links,
    })
  } catch (error: any) {
    console.error('Drive Sync & Rename API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync and rename Drive folders' },
      { status: 500 }
    )
  }
}
