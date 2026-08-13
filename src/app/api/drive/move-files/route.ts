import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveClient, deleteOrUnlinkFile } from '@/lib/google-drive'

export async function POST(req: NextRequest) {
  try {
    const { fileIds, targetFolderId, sourceFolderId, conflictResolution } = await req.json()

    if (!fileIds?.length || !targetFolderId) {
      return NextResponse.json(
        { error: 'fileIds (array) and targetFolderId are required' },
        { status: 400 }
      )
    }

    const drive = getGoogleDriveClient()

    // 1. Get info on files being moved
    const filesToMoveRes = await Promise.all(
      (fileIds as string[]).map(id =>
        drive.files.get({
          fileId: id,
          fields: 'id, name, mimeType',
          supportsAllDrives: true,
        }).catch(() => null)
      )
    )
    const filesToMove = filesToMoveRes.map(r => r?.data).filter(Boolean) as { id: string; name: string }[]

    // 2. Get target folder info & existing files in target folder
    const targetFolderRes = await drive.files.get({
      fileId: targetFolderId,
      fields: 'id, name',
      supportsAllDrives: true,
    }).catch(() => null)
    const targetFolderName = targetFolderRes?.data?.name || 'Subfolder'

    const targetChildrenRes = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      pageSize: 500,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
    })
    const existingTargetFiles = (targetChildrenRes.data.files || []).filter(
      (f): f is { id: string; name: string } => Boolean(f.id && f.name)
    )

    // 3. Detect file name conflicts
    const conflicts: { fileId: string; fileName: string; existingTargetFileId: string }[] = []
    const nonConflictingFileIds: string[] = []

    for (const file of filesToMove) {
      if (!file.name || !file.id) continue
      const match = existingTargetFiles.find(
        ef => ef.name.toLowerCase() === file.name.toLowerCase() && ef.id !== file.id
      )
      if (match) {
        conflicts.push({
          fileId: file.id,
          fileName: file.name,
          existingTargetFileId: match.id,
        })
      } else {
        nonConflictingFileIds.push(file.id)
      }
    }

    // If conflicts exist and no conflictResolution was specified yet, return conflicts info for modal popup
    if (conflicts.length > 0 && !conflictResolution) {
      return NextResponse.json({
        hasConflicts: true,
        conflicts,
        targetFolderName,
        targetFolderId,
        nonConflictingCount: nonConflictingFileIds.length,
      })
    }

    let movedCount = 0

    // Move non-conflicting files
    if (nonConflictingFileIds.length > 0) {
      await Promise.all(
        nonConflictingFileIds.map(fileId =>
          drive.files.update({
            fileId,
            addParents: targetFolderId,
            removeParents: sourceFolderId || undefined,
            supportsAllDrives: true,
            requestBody: {},
          })
        )
      )
      movedCount += nonConflictingFileIds.length
    }

    // Handle conflicting files based on user selection in modal
    if (conflicts.length > 0) {
      if (conflictResolution === 'rename') {
        // Auto-rename conflicting file e.g., document (1).pdf
        for (const c of conflicts) {
          const parts = c.fileName.split('.')
          const ext = parts.length > 1 ? `.${parts.pop()}` : ''
          const baseName = parts.join('.')

          let counter = 1
          let newName = `${baseName} (${counter})${ext}`
          while (existingTargetFiles.some(f => (f.name || '').toLowerCase() === newName.toLowerCase())) {
            counter++
            newName = `${baseName} (${counter})${ext}`
          }

          await drive.files.update({
            fileId: c.fileId,
            addParents: targetFolderId,
            removeParents: sourceFolderId || undefined,
            supportsAllDrives: true,
            requestBody: { name: newName },
          })
          movedCount++
        }
      } else if (conflictResolution === 'replace') {
        // Replace: Trash/unlink target file and move new file in
        for (const c of conflicts) {
          await deleteOrUnlinkFile(drive, c.existingTargetFileId).catch(() => null)

          await drive.files.update({
            fileId: c.fileId,
            addParents: targetFolderId,
            removeParents: sourceFolderId || undefined,
            supportsAllDrives: true,
            requestBody: {},
          })
          movedCount++
        }
      } else if (conflictResolution === 'skip' || conflictResolution === 'do_nothing') {
        // Do Nothing: Leave conflicting files in source folder untouched
      }
    }

    return NextResponse.json({
      success: true,
      hasConflicts: false,
      moved: movedCount,
      conflictsResolved: conflicts.length,
    })
  } catch (err: any) {
    console.error('Error moving files in Google Drive:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to move files' },
      { status: 500 }
    )
  }
}
