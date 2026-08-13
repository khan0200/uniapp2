'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Folder, ExternalLink, X, RefreshCw, Loader2, LayoutGrid, List,
  Maximize2, Minimize2, MoreVertical, Download, Pencil, Trash2,
  FileText, Image as ImageIcon, FileSpreadsheet, File,
  Upload, AlertTriangle, Search, Eye, ChevronRight, ArrowLeft, FolderOpen,
  CheckSquare, Square, MoveRight, CheckCheck, SortAsc, SortDesc,
  Filter, CloudUpload,
} from 'lucide-react'
import JSZip from 'jszip'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'
import { GoogleDriveUploadModal } from './GoogleDriveUploadModal'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string | null
  webContentLink?: string | null
  thumbnailLink?: string | null
  size?: number | null
  createdTime?: string | null
  modifiedTime?: string | null
  iconLink?: string | null
}

interface GoogleDriveViewerModalProps {
  isOpen: boolean
  onClose: () => void
  studentName: string
  studentId: string
  folderId?: string | null
  folderUrl?: string | null
}

function getFileIcon(mimeType: string, className = 'h-5 w-5') {
  if (mimeType.includes('folder')) return <Folder className={cn(className, 'text-blue-900 dark:text-blue-400 fill-blue-900/20 dark:fill-blue-400/20')} />
  if (mimeType.includes('image')) return <ImageIcon className={cn(className, 'text-sky-500')} />
  if (mimeType.includes('pdf')) return <FileText className={cn(className, 'text-rose-500')} />
  if (mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('excel'))
    return <FileSpreadsheet className={cn(className, 'text-emerald-500')} />
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className={cn(className, 'text-blue-500')} />
  return <File className={cn(className, 'text-violet-400')} />
}

function getFileColor(mimeType: string): string {
  if (mimeType.includes('folder')) return 'from-blue-950/20 to-blue-900/5 border-blue-900/30'
  if (mimeType.includes('image')) return 'from-sky-500/20 to-sky-500/5 border-sky-500/20'
  if (mimeType.includes('pdf')) return 'from-rose-500/20 to-rose-500/5 border-rose-500/20'
  if (mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('excel'))
    return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20'
  if (mimeType.includes('word') || mimeType.includes('document'))
    return 'from-blue-500/20 to-blue-500/5 border-blue-500/20'
  return 'from-violet-500/20 to-violet-500/5 border-violet-500/20'
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(name: string, mimeType: string): string {
  if (mimeType.includes('folder')) return 'FOLDER'
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : ''
}

export function GoogleDriveViewerModal({
  isOpen,
  onClose,
  studentName,
  studentId,
  folderId,
  folderUrl,
}: GoogleDriveViewerModalProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [isExpanded, setIsExpanded] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Folder navigation history stack
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([])

  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({})
  const [fileToRename, setFileToRename] = useState<DriveFile | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [createFolderName, setCreateFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // ── Sort & Filter ──
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterType, setFilterType] = useState<'all' | 'folders' | 'images' | 'pdfs' | 'docs' | 'sheets' | 'other'>('all')

  // ── Folder Statistics ──
  const [folderStats, setFolderStats] = useState<Record<string, { fileCount: number; totalSize: number; lastModifiedTime: string | null }>>({})

  // ── Drag & Drop Upload (external OS files) ──
  const [isDragOverWindow, setIsDragOverWindow] = useState(false)
  const dragCounter = useRef(0)

  // ── Bulk ZIP Download ──
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)

  // ── Right-Click Context Menu ──
  const [contextMenuFile, setContextMenuFile] = useState<DriveFile | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  // ── Bulk Selection ──
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkMoving, setIsBulkMoving] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveConflictData, setMoveConflictData] = useState<{
    fileIds: string[]
    targetFolderId: string
    targetFolderName: string
    conflicts: { fileId: string; fileName: string; existingTargetFileId: string }[]
  } | null>(null)
  const [renameConflictData, setRenameConflictData] = useState<{
    file: DriveFile
    newName: string
    existingFile: { id: string; name: string }
  } | null>(null)

  // ── Drag & Drop ──
  // dragOverFolderId = which folder card is currently being hovered
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  // dragSourceIds = IDs being dragged (selected items, or just the single item if not selected)
  const dragSourceIds = useRef<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { shouldRender, isVisible } = useCssTransition(isOpen, 250)

  let rootFolderId = folderId
  if (!rootFolderId && folderUrl) {
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    if (match) rootFolderId = match[1]
  }

  // Active folder ID is the top of history stack or rootFolderId
  const activeFolderId = folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].id : rootFolderId

  const directUrl = activeFolderId
    ? `https://drive.google.com/drive/folders/${activeFolderId}`
    : folderUrl || ''

  // Fetch files for a specific folder ID
  const fetchFolderFiles = async (targetId?: string | null) => {
    const idToFetch = targetId || activeFolderId
    if (!idToFetch) return
    setLoading(true)
    setError(null)
    setFolderStats({}) // reset folder stats on navigation
    try {
      const res = await fetch('/api/drive/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: idToFetch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load folder contents')
      const fetchedFiles: DriveFile[] = data.files || []
      setFiles(fetchedFiles)

      // Fire parallel folder-stats requests for each subfolder
      const subfolders = fetchedFiles.filter(f => f.mimeType.includes('folder'))
      if (subfolders.length > 0) {
        const statsResults = await Promise.allSettled(
          subfolders.map(sf =>
            fetch('/api/drive/folder-stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderId: sf.id }),
            }).then(r => r.json()).then(d => ({ id: sf.id, ...d }))
          )
        )
        const statsMap: Record<string, { fileCount: number; totalSize: number; lastModifiedTime: string | null }> = {}
        for (const r of statsResults) {
          if (r.status === 'fulfilled' && r.value?.success) {
            const { id, fileCount, totalSize, lastModifiedTime } = r.value
            statsMap[id] = { fileCount, totalSize, lastModifiedTime }
          }
        }
        setFolderStats(statsMap)
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching drive files.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && (rootFolderId || folderUrl)) {
      setFolderHistory([])
      fetchFolderFiles(rootFolderId)
    }
  }, [isOpen, rootFolderId])

  // Clear selection when navigating
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }, [])

  // Navigate into subfolder
  const handleOpenFolder = (subfolder: DriveFile) => {
    clearSelection()
    const nextStack = [...folderHistory, { id: subfolder.id, name: subfolder.name }]
    setFolderHistory(nextStack)
    fetchFolderFiles(subfolder.id)
  }

  // Jump to specific breadcrumb level
  const handleBreadcrumbClick = (index: number) => {
    clearSelection()
    if (index === -1) {
      setFolderHistory([])
      fetchFolderFiles(rootFolderId)
    } else {
      const nextStack = folderHistory.slice(0, index + 1)
      setFolderHistory(nextStack)
      fetchFolderFiles(nextStack[nextStack.length - 1].id)
    }
  }

  // Go back 1 level
  const handleGoBack = () => {
    if (folderHistory.length === 0) return
    handleBreadcrumbClick(folderHistory.length - 2)
  }

  // ── Selection helpers ──
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredFiles.map(f => f.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // ── Bulk Delete ──
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} item(s)? They will be moved to Google Drive trash.`)) return
    setIsBulkDeleting(true)
    try {
      await Promise.all(
        [...selectedIds].map(fileId =>
          fetch('/api/drive/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId }),
          })
        )
      )
      setFiles(prev => prev.filter(f => !selectedIds.has(f.id)))
      clearSelection()
    } catch (err: any) {
      alert(`Bulk Delete Error: ${err.message}`)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // ── Move (bulk or drag) ──
  const handleMoveFiles = async (
    idsToMove: string[],
    targetFolderId: string,
    conflictResolution?: 'rename' | 'replace' | 'do_nothing'
  ) => {
    setIsBulkMoving(true)
    try {
      const res = await fetch('/api/drive/move-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: idsToMove,
          targetFolderId,
          sourceFolderId: activeFolderId,
          conflictResolution,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to move files')

      if (data.hasConflicts) {
        setMoveConflictData({
          fileIds: idsToMove,
          targetFolderId,
          targetFolderName: data.targetFolderName,
          conflicts: data.conflicts,
        })
        return
      }

      setFiles(prev => prev.filter(f => !idsToMove.includes(f.id)))
      clearSelection()
    } catch (err: any) {
      alert(`Move Error: ${err.message}`)
    } finally {
      setIsBulkMoving(false)
    }
  }

  // ── Drag Handlers ──
  const handleDragStart = (e: React.DragEvent, file: DriveFile) => {
    e.stopPropagation()
    // If the dragged item is selected, move all selected; otherwise just this one
    if (selectedIds.has(file.id)) {
      dragSourceIds.current = Array.from(selectedIds)
    } else {
      dragSourceIds.current = [file.id]
    }

    try {
      e.dataTransfer.setData('application/json', JSON.stringify(dragSourceIds.current))
      e.dataTransfer.effectAllowed = 'move'
    } catch (_) {}
  }

  const handleDragOver = (e: React.DragEvent, targetFolder: DriveFile) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragSourceIds.current.length === 0) return
    // Don't allow dropping into itself
    if (dragSourceIds.current.includes(targetFolder.id)) return
    setDragOverFolderId(targetFolder.id)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolder: DriveFile) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)
    setIsDragOverWindow(false)
    dragCounter.current = 0

    const ids = dragSourceIds.current.filter(id => id !== targetFolder.id)
    dragSourceIds.current = []

    if (ids.length === 0) return
    await handleMoveFiles(ids, targetFolder.id)
  }

  const handleRename = async (conflictResolution?: 'replace' | 'auto_rename') => {
    if (!fileToRename || !newFileName.trim()) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch('/api/drive/rename-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileToRename.id,
          newName: newFileName,
          folderId: activeFolderId,
          conflictResolution,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.hasConflict) {
        setRenameConflictData({
          file: fileToRename,
          newName: data.newName,
          existingFile: data.existingFile,
        })
        return
      }

      const updatedName = data.newName || newFileName.trim()
      setFiles(prev => {
        let next = prev.map(f => f.id === fileToRename.id ? { ...f, name: updatedName } : f)
        if (conflictResolution === 'replace' && data.existingFile?.id) {
          next = next.filter(f => f.id !== data.existingFile.id)
        }
        return next
      })

      setFileToRename(null)
      setRenameConflictData(null)
    } catch (err: any) {
      alert(`Rename Error: ${err.message}`)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleDelete = async () => {
    if (!fileToDelete) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch('/api/drive/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileToDelete.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id))
      setFileToDelete(null)
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!createFolderName.trim() || !activeFolderId) return
    setIsCreatingFolder(true)
    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: createFolderName.trim(),
          parentFolderId: activeFolderId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create folder')

      // Refresh files list
      await fetchFolderFiles()
      setIsCreateFolderOpen(false)
      setCreateFolderName('')
    } catch (err: any) {
      alert(`Create Folder Error: ${err.message}`)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile || !activeFolderId) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('folderId', activeFolderId)
      const res = await fetch('/api/drive/upload-file', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchFolderFiles()
    } catch (err: any) {
      alert(`Upload Error: ${err.message}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Sort & Filter logic ──
  const filteredFiles = files
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .filter(f => {
      if (filterType === 'all') return true
      if (filterType === 'folders') return f.mimeType.includes('folder')
      if (filterType === 'images') return f.mimeType.includes('image')
      if (filterType === 'pdfs') return f.mimeType.includes('pdf')
      if (filterType === 'docs') return f.mimeType.includes('document') || f.mimeType.includes('word') || f.name.match(/\.(doc|docx)$/i)
      if (filterType === 'sheets') return f.mimeType.includes('sheet') || f.mimeType.includes('excel') || f.mimeType.includes('csv') || f.name.match(/\.(xls|xlsx|csv)$/i)
      if (filterType === 'other') return !f.mimeType.includes('folder') && !f.mimeType.includes('image') && !f.mimeType.includes('pdf') && !f.mimeType.includes('document') && !f.mimeType.includes('word') && !f.mimeType.includes('sheet') && !f.mimeType.includes('excel')
      return true
    })
    .sort((a, b) => {
      const isAFolder = a.mimeType.includes('folder')
      const isBFolder = b.mimeType.includes('folder')
      if (isAFolder && !isBFolder) return -1
      if (!isAFolder && isBFolder) return 1

      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'date') cmp = (a.modifiedTime || '').localeCompare(b.modifiedTime || '')
      else if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0)
      else if (sortBy === 'type') cmp = a.mimeType.localeCompare(b.mimeType)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const folders = filteredFiles.filter(f => f.mimeType.includes('folder'))
  const allSelected = filteredFiles.length > 0 && selectedIds.size === filteredFiles.length
  const someSelected = selectedIds.size > 0

  // ── Bulk ZIP Download handler ──
  const handleBulkDownload = async () => {
    const selectedFiles = filteredFiles.filter(f => selectedIds.has(f.id) && !f.mimeType.includes('folder'))
    if (selectedFiles.length === 0) return
    setIsDownloadingZip(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        selectedFiles.map(async file => {
          const res = await fetch(`/api/drive/download-file?fileId=${file.id}`)
          if (!res.ok) return
          const blob = await res.blob()
          zip.file(file.name, blob)
        })
      )
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${studentName.replace(/\s+/g, '_')}_files.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(`Download Error: ${err.message}`)
    } finally {
      setIsDownloadingZip(false)
    }
  }

  // ── OS Drag & Drop Upload handlers ──
  const handleWindowDragEnter = (e: React.DragEvent) => {
    if (dragSourceIds.current.length > 0) return
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      dragCounter.current += 1
      setIsDragOverWindow(true)
    }
  }
  const handleWindowDragOver = (e: React.DragEvent) => {
    if (dragSourceIds.current.length > 0) return
    if (e.dataTransfer.types.includes('Files')) e.preventDefault()
  }
  const handleWindowDragLeave = (e: React.DragEvent) => {
    if (dragSourceIds.current.length > 0) return
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragOverWindow(false)
    }
  }
  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOverWindow(false)

    if (dragSourceIds.current.length > 0) {
      dragSourceIds.current = []
      return
    }

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0 || !activeFolderId) return
    setIsUploading(true)
    try {
      await Promise.all(droppedFiles.map(async file => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folderId', activeFolderId)
        await fetch('/api/drive/upload-file', { method: 'POST', body: formData })
      }))
      await fetchFolderFiles()
    } catch (err: any) {
      alert(`Upload Error: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  if (!shouldRender) return null

  return (
    <>
      <div
        onClick={() => { setActiveMenuFileId(null); setContextMenuFile(null); setContextMenuPos(null) }}
        onDragEnter={handleWindowDragEnter}
        onDragOver={handleWindowDragOver}
        onDragLeave={handleWindowDragLeave}
        onDrop={handleWindowDrop}
        className={cn(
          'fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-250',
          isExpanded ? 'p-0' : 'p-0 sm:p-4 md:p-8'
        )}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={cn(
            'fixed inset-0 bg-black/70 transition-opacity duration-250',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Main Modal */}
        <div
          className={cn(
            'relative flex flex-col z-10 overflow-hidden',
            'bg-[var(--surface-elevated)] border border-[var(--border)]',
            'transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
            isExpanded
              ? 'w-screen h-screen rounded-none'
              : 'w-full max-w-6xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.4)]',
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-4'
          )}
        >
          {/* ── DRAG & DROP UPLOAD OVERLAY ── */}
          {isDragOverWindow && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/80 backdrop-blur-md rounded-2xl border-2 border-dashed border-emerald-400 pointer-events-none">
              <div className="h-20 w-20 rounded-3xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mb-4 animate-bounce">
                <CloudUpload className="h-10 w-10 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-300">Drop to Upload</p>
              <p className="text-sm text-emerald-400 mt-1">
                Files will be uploaded to: <span className="font-semibold">{folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : 'Root Folder'}</span>
              </p>
            </div>
          )}
          {/* ── TOP HEADER (Enterprise Business UI) ── */}
          <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            {/* Left: Student Identity & Breadcrumb */}
            <div className="flex items-center gap-3.5 min-w-0">
              {folderHistory.length > 0 ? (
                <button
                  onClick={handleGoBack}
                  className="h-10 w-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--border-subtle)] flex items-center justify-center text-[var(--foreground)] shrink-0 transition-all cursor-pointer shadow-xs"
                  title="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0 border border-slate-700/50">
                  <Folder className="h-5 w-5 text-slate-200 fill-slate-200/20" />
                </div>
              )}

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--foreground)] truncate tracking-tight">
                    {studentName}
                  </h2>
                  <span className="text-[11px] font-mono font-semibold text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-md shrink-0">
                    {studentId}
                  </span>
                </div>

                {/* Breadcrumb Trail */}
                <div className="flex items-center gap-1 text-[11px] text-[var(--foreground-muted)] mt-0.5 overflow-x-auto scrollbar-none max-w-lg">
                  <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={cn(
                      "hover:text-[var(--foreground)] transition-colors shrink-0 cursor-pointer font-medium",
                      folderHistory.length === 0 ? "text-[var(--foreground)] font-semibold" : ""
                    )}
                  >
                    Root Folder
                  </button>
                  {folderHistory.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-1 shrink-0">
                      <ChevronRight className="h-3 w-3 opacity-40" />
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={cn(
                          "hover:text-[var(--foreground)] transition-colors truncate max-w-[140px] cursor-pointer",
                          idx === folderHistory.length - 1 ? "text-[var(--foreground)] font-semibold" : "font-medium"
                        )}
                        title={item.name}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                  {!loading && (
                    <>
                      <span className="opacity-30">•</span>
                      <span className="font-medium text-[var(--foreground-subtle)] shrink-0">
                        {files.length} item{files.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Primary Action Buttons & Window Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Select Mode */}
              <button
                onClick={() => {
                  if (selectionMode) { clearSelection() } else { setSelectionMode(true) }
                }}
                title={selectionMode ? 'Exit selection mode' : 'Select items'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-2xs',
                  selectionMode
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                )}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{selectionMode ? 'Done' : 'Select'}</span>
              </button>

              {/* New Folder */}
              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border-subtle)] shadow-2xs"
                title="Create new subfolder"
              >
                <FolderOpen className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              {/* Upload Button */}
              <button
                disabled={isUploading}
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-2xs disabled:opacity-60"
                title="Upload documents"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span>{isUploading ? 'Uploading…' : 'Upload'}</span>
              </button>

              <div className="w-px h-5 bg-[var(--border)] mx-1" />

              {/* Window controls */}
              <div className="flex items-center gap-1">
                {[
                  { icon: <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />, action: () => fetchFolderFiles(), title: 'Refresh' },
                  {
                    icon: isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />,
                    action: () => setIsExpanded(v => !v),
                    title: isExpanded ? 'Restore' : 'Full screen'
                  },
                ].map(({ icon, action, title }, i) => (
                  <button
                    key={i}
                    onClick={action}
                    title={title}
                    className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                  >
                    {icon}
                  </button>
                ))}

                {directUrl && (
                  <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                    title="Open in Google Drive"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer ml-1"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── SECONDARY CONTROL BAR (Search, Filters, View Mode) ── */}
          {!selectionMode && (
            <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
              {/* Left: Search & Filter Tabs */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Search Bar */}
                <div className="relative flex items-center shrink-0">
                  <Search className="h-3.5 w-3.5 absolute left-3 text-[var(--foreground-subtle)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-44 sm:w-56 pl-8 pr-7 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] text-xs placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--foreground-muted)] transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="w-px h-4 bg-[var(--border)] shrink-0 hidden sm:block" />

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {(['all', 'folders', 'images', 'pdfs', 'docs', 'sheets', 'other'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all cursor-pointer shrink-0',
                        filterType === type
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Sort & View Mode Switcher */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                  <span className="text-[11px] font-medium text-[var(--foreground-subtle)]">Sort:</span>
                  <div className="flex items-center gap-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md px-2 py-1">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="text-[11px] font-semibold bg-transparent text-[var(--foreground)] border-none outline-none cursor-pointer pr-1"
                    >
                      <option value="name">Name</option>
                      <option value="date">Date</option>
                      <option value="size">Size</option>
                      <option value="type">Type</option>
                    </select>
                    <button
                      onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title={sortDir === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                    >
                      {sortDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="w-px h-4 bg-[var(--border)] shrink-0" />

                {/* View Mode Segmented Switcher */}
                <div className="flex bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg p-0.5">
                  {(['grid', 'table'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                        viewMode === mode
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                      )}
                      title={mode === 'grid' ? 'Grid view' : 'Table view'}
                    >
                      {mode === 'grid' ? <LayoutGrid className="h-3 w-3" /> : <List className="h-3 w-3" />}
                      <span className="capitalize">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BULK ACTION TOOLBAR (When Selection Mode is Active) ── */}
          {selectionMode && (
            <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-2.5 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={allSelected ? deselectAll : selectAll}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  {allSelected ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4 text-slate-400" />}
                  <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </button>
                <span className="text-[11px] font-semibold text-slate-400">
                  {selectedIds.size} of {filteredFiles.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                {someSelected && (
                  <>
                    {/* Bulk Move */}
                    <button
                      onClick={() => setShowMoveModal(true)}
                      disabled={isBulkMoving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {isBulkMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoveRight className="h-3.5 w-3.5" />}
                      <span>Move ({selectedIds.size})</span>
                    </button>

                    {/* Bulk ZIP Download */}
                    <button
                      onClick={handleBulkDownload}
                      disabled={isDownloadingZip}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Download selected files as ZIP"
                    >
                      {isDownloadingZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span>{isDownloadingZip ? 'Zipping…' : `ZIP (${selectedIds.size})`}</span>
                    </button>

                    {/* Bulk Delete */}
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {isBulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      <span>Delete ({selectedIds.size})</span>
                    </button>
                  </>
                )}

                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer ml-1"
                  title="Exit selection mode"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── CONTENT AREA ── */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Folder className="h-7 w-7 text-amber-500" />
                  </div>
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)] absolute -bottom-1 -right-1 bg-[var(--surface-elevated)] rounded-full p-0.5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Loading folder items…</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Fetching from Google Drive</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Couldn&apos;t load documents</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">{error}</p>
                </div>
                <button
                  onClick={() => fetchFolderFiles()}
                  className="mt-1 px-4 py-1.5 bg-[var(--accent)] text-white text-xs font-bold rounded-xl"
                >
                  Try Again
                </button>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                  <FolderOpen className="h-7 w-7 text-[var(--foreground-subtle)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    {searchQuery ? 'No matching items' : 'This folder is empty'}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    {searchQuery ? 'Try a different search term.' : 'Click "Upload" to add files to this folder.'}
                  </p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── GRID VIEW ── */
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {filteredFiles.map((file) => {
                  const isFolder = file.mimeType.includes('folder')
                  const ext = getFileExtension(file.name, file.mimeType)
                  const isSelected = selectedIds.has(file.id)
                  const isDragTarget = dragOverFolderId === file.id

                  return (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, file)}
                      onDragEnd={() => { setDragOverFolderId(null); dragSourceIds.current = [] }}
                      onDragOver={isFolder ? (e) => handleDragOver(e, file) : undefined}
                      onDragLeave={isFolder ? handleDragLeave : undefined}
                      onDrop={isFolder ? (e) => handleDrop(e, file) : undefined}
                      className={cn(
                        "group relative flex flex-col bg-[var(--surface-elevated)] border rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer select-none z-0 hover:z-20",
                        isFolder
                          ? cn(
                              "border-blue-900/30 hover:border-blue-800 bg-blue-950/5 dark:bg-blue-950/20 dark:border-blue-800/40",
                              isDragTarget && "border-blue-600 bg-blue-900/30 scale-[1.03] shadow-xl ring-2 ring-blue-500/50"
                            )
                          : "border-[var(--border)] hover:border-[var(--accent)]/50",
                        isSelected && "ring-2 ring-violet-500 border-violet-500/50"
                      )}
                      onClick={(e) => {
                        if (selectionMode) {
                          toggleSelect(file.id, e)
                          return
                        }
                        if (isFolder) {
                          handleOpenFolder(file)
                        } else {
                          setPreviewFile(file)
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setContextMenuFile(file)
                        setContextMenuPos({ x: e.clientX, y: e.clientY })
                      }}
                    >
                      {/* Selection checkbox overlay */}
                      {(selectionMode || isSelected) && (
                        <div
                          className="absolute top-2 left-2 z-20"
                          onClick={(e) => toggleSelect(file.id, e)}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-violet-600 border-violet-600"
                              : "bg-black/40 border-white/60 backdrop-blur-sm"
                          )}>
                            {isSelected && <CheckSquare className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      )}

                      {/* Drag-over hint for folders */}
                      {isDragTarget && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-500/30 backdrop-blur-sm rounded-2xl pointer-events-none">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-400/60 px-3 py-1.5 rounded-full">
                            Drop to move here
                          </span>
                        </div>
                      )}

                      {/* Thumbnail / Header Area */}
                      <div className="relative h-36 w-full overflow-hidden rounded-t-2xl bg-[var(--surface)] flex items-center justify-center">
                        {isFolder ? (
                          <div className="flex flex-col items-center gap-1.5 w-full h-full justify-center bg-gradient-to-b from-blue-950/25 via-slate-900/10 to-blue-950/5 px-3">
                            <Folder className="h-12 w-12 text-blue-900 dark:text-blue-400 fill-blue-950/30 transition-transform group-hover:scale-110" />
                            {folderStats[file.id] ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] font-bold text-blue-950 dark:text-blue-300">
                                  {folderStats[file.id].fileCount} file{folderStats[file.id].fileCount !== 1 ? 's' : ''}
                                  {folderStats[file.id].totalSize > 0 && ` • ${formatFileSize(folderStats[file.id].totalSize)}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-950 dark:text-blue-300 bg-blue-950/10 dark:bg-blue-900/20 px-2.5 py-0.5 rounded-md border border-blue-900/20">Subfolder</span>
                            )}
                          </div>
                        ) : (
                          <DocumentThumbnailCard
                            file={file}
                            failedThumbnails={failedThumbnails}
                            setFailedThumbnails={setFailedThumbnails}
                          />
                        )}

                        {/* Hover overlay (hidden in selection mode) — no pill label */}
                        {!selectionMode && isFolder && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-3">
                            <span className="flex items-center gap-1.5 text-white text-[11px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                              <FolderOpen className="h-3 w-3" />
                              Open Folder
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Info Row */}
                      <div className="p-3 flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          {getFileIcon(file.mimeType, 'h-4 w-4')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[var(--foreground)] break-words leading-snug">
                            {file.name}
                          </p>
                          {isFolder && folderStats[file.id] && (
                            <p className="text-[9px] text-[var(--foreground-muted)] font-semibold mt-0.5">
                              {folderStats[file.id].fileCount} items
                              {folderStats[file.id].totalSize > 0 && ` • ${formatFileSize(folderStats[file.id].totalSize)}`}
                            </p>
                          )}
                          {!isFolder && file.size != null && (
                            <p className="text-[10px] text-[var(--foreground-muted)] font-mono mt-1">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </div>

                        {/* 3-dots menu (hidden in selection mode) */}
                        {!selectionMode && (
                          <div className="shrink-0 -mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id)}
                              className="p-1 rounded-lg text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {activeMenuFileId === file.id && (
                              <FileActionMenu
                                file={file}
                                onOpenFolder={isFolder ? () => { setActiveMenuFileId(null); handleOpenFolder(file) } : undefined}
                                onRename={() => { setActiveMenuFileId(null); setFileToRename(file); setNewFileName(file.name) }}
                                onDelete={() => { setActiveMenuFileId(null); setFileToDelete(file) }}
                                onSelect={() => {
                                  setActiveMenuFileId(null)
                                  setSelectionMode(true)
                                  setSelectedIds(new Set([file.id]))
                                }}
                                onMove={!isFolder ? () => {
                                  setActiveMenuFileId(null)
                                  setSelectedIds(new Set([file.id]))
                                  setShowMoveModal(true)
                                } : undefined}
                                onClose={() => setActiveMenuFileId(null)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── TABLE VIEW ── */
              <div className="p-5">
                <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface-elevated)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] text-[11px] uppercase tracking-widest font-semibold">
                        {selectionMode && (
                          <th className="py-3 px-4 w-10">
                            <button onClick={allSelected ? deselectAll : selectAll} className="cursor-pointer">
                              {allSelected
                                ? <CheckCheck className="h-4 w-4 text-violet-500" />
                                : <Square className="h-4 w-4" />
                              }
                            </button>
                          </th>
                        )}
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4 hidden md:table-cell">Type</th>
                        <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredFiles.map((file) => {
                        const isFolder = file.mimeType.includes('folder')
                        const isSelected = selectedIds.has(file.id)
                        const isDragTarget = dragOverFolderId === file.id
                        return (
                          <tr
                            key={file.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, file)}
                            onDragEnd={() => { setDragOverFolderId(null); dragSourceIds.current = [] }}
                            onDragOver={isFolder ? (e) => handleDragOver(e, file) : undefined}
                            onDragLeave={isFolder ? handleDragLeave : undefined}
                            onDrop={isFolder ? (e) => handleDrop(e, file) : undefined}
                            onClick={() => {
                              if (selectionMode) {
                                setSelectedIds(prev => {
                                  const next = new Set(prev)
                                  next.has(file.id) ? next.delete(file.id) : next.add(file.id)
                                  return next
                                })
                                return
                              }
                              if (isFolder) {
                                handleOpenFolder(file)
                              } else {
                                setPreviewFile(file)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setContextMenuFile(file)
                              setContextMenuPos({ x: e.clientX, y: e.clientY })
                            }}
                            className={cn(
                              "transition-colors cursor-pointer group select-none",
                              isDragTarget
                                ? "bg-amber-500/20 ring-1 ring-amber-400"
                                : isSelected
                                ? "bg-violet-500/10"
                                : "hover:bg-[var(--border-subtle)]"
                            )}
                          >
                            {selectionMode && (
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <div
                                  onClick={() => setSelectedIds(prev => {
                                    const next = new Set(prev)
                                    next.has(file.id) ? next.delete(file.id) : next.add(file.id)
                                    return next
                                  })}
                                  className={cn(
                                    "h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all",
                                    isSelected ? "bg-violet-600 border-violet-600" : "border-[var(--border)]"
                                  )}
                                >
                                  {isSelected && <CheckSquare className="h-2.5 w-2.5 text-white" />}
                                </div>
                              </td>
                            )}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {getFileIcon(file.mimeType, 'h-4.5 w-4.5 shrink-0')}
                                <span className="font-semibold text-[var(--foreground)] text-[12px] break-words leading-snug">
                                  {file.name}
                                </span>
                                {isDragTarget && (
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full ml-2">
                                    Drop to move here
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[var(--foreground-muted)] hidden md:table-cell">
                              <span className={cn(
                                "font-mono text-[10px] border px-2 py-0.5 rounded-md uppercase tracking-wider",
                                isFolder
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold"
                                  : "bg-[var(--surface)] border-[var(--border)]"
                              )}>
                                {getFileExtension(file.name, file.mimeType)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[var(--foreground-muted)] hidden sm:table-cell">
                              {isFolder ? '—' : formatFileSize(file.size)}
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {isFolder && (
                                  <button
                                    type="button"
                                    title="Open Folder"
                                    onClick={() => handleOpenFolder(file)}
                                    className="p-1.5 rounded-lg text-amber-600 hover:text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer font-semibold flex items-center gap-1 text-[11px]"
                                  >
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    <span>Open</span>
                                  </button>
                                )}



                                {/* Move */}
                                {!isFolder && (
                                  <button
                                    type="button"
                                    title="Move"
                                    onClick={() => {
                                      setSelectedIds(new Set([file.id]))
                                      setShowMoveModal(true)
                                    }}
                                    className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all cursor-pointer"
                                  >
                                    <MoveRight className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* Rename */}
                                <button
                                  type="button"
                                  title="Rename"
                                  onClick={() => { setFileToRename(file); setNewFileName(file.name) }}
                                  className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>

                                {/* Download */}
                                {!isFolder && file.webContentLink ? (
                                  <a
                                    href={file.webContentLink}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Download"
                                    className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                ) : !isFolder ? (
                                  <span className="p-1.5 opacity-30 cursor-not-allowed">
                                    <Download className="h-3.5 w-3.5" />
                                  </span>
                                ) : null}

                                {/* Delete */}
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={() => setFileToDelete(file)}
                                  className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FULL-SCREEN DOCUMENT PREVIEW ── */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Preview Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700">
                {getFileIcon(previewFile.mimeType, 'h-5 w-5 shrink-0')}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white break-words line-clamp-1">
                  {previewFile.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {previewFile.size && (
                    <span className="text-[11px] text-zinc-400 font-mono">{formatFileSize(previewFile.size)}</span>
                  )}
                  <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700">
                    {getFileExtension(previewFile.name, previewFile.mimeType)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {previewFile.webContentLink && (
                <a
                  href={previewFile.webContentLink}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                  title="Download file"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}
              {(previewFile.webViewLink || directUrl) && (
                <a
                  href={previewFile.webViewLink || `https://drive.google.com/file/d/${previewFile.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Open in Google Drive
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="w-px h-6 bg-zinc-800 mx-1" />
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                title="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
            {previewFile.mimeType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewFile.name) ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={`/api/drive/thumbnail?fileId=${previewFile.id}&size=2000`}
                  alt={previewFile.name}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (previewFile.thumbnailLink && target.src !== previewFile.thumbnailLink) {
                      target.src = previewFile.thumbnailLink
                    }
                  }}
                />
              </div>
            ) : (() => {
              // Determine preview iframe URL based on file type
              const isGoogleNative = previewFile.mimeType.includes('google-apps')
              const isOfficeFile = /\.(docx?|xlsx?|pptx?|odt|ods|odp|csv)$/i.test(previewFile.name)
              let iframeSrc: string

              if (isGoogleNative) {
                // Google Docs/Sheets/Slides: use /preview suffix
                iframeSrc = (previewFile.webViewLink || `https://drive.google.com/file/d/${previewFile.id}/view`)
                  .replace('/edit', '/preview').replace('/view', '/preview')
              } else if (isOfficeFile && previewFile.webContentLink) {
                // Office files uploaded as raw: use Google Docs Viewer
                iframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.webContentLink)}&embedded=true`
              } else {
                // Default: Drive file preview
                iframeSrc = `https://drive.google.com/file/d/${previewFile.id}/preview`
              }

              return (
                <div className="w-full h-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
                  {isOfficeFile && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                      <Eye className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[11px] text-zinc-400 font-semibold">
                        Previewing via Google Docs Viewer
                      </span>
                    </div>
                  )}
                  <iframe
                    src={iframeSrc}
                    className="w-full flex-1 border-none bg-white dark:bg-zinc-950"
                    title={previewFile.name}
                    allow="autoplay"
                  />
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── RENAME DIALOG ── */}
      {fileToRename && (
        <ModalDialog onClose={() => !isSubmittingAction && setFileToRename(null)} zIndex="z-[70]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Pencil className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Rename Document</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Update the name in Google Drive</p>
            </div>
          </div>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 mb-5 transition-all"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFileToRename(null)}
              disabled={isSubmittingAction}
              className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRename()}
              disabled={isSubmittingAction || !newFileName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmittingAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Name
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── RENAME CONFLICT WARNING MODAL ── */}
      {renameConflictData && (
        <ModalDialog onClose={() => !isSubmittingAction && setRenameConflictData(null)} zIndex="z-[80]">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--foreground)] leading-tight">
                Duplicate File Name Detected
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                A file named <span className="font-semibold text-amber-600 dark:text-amber-400">&quot;{renameConflictData.existingFile.name}&quot;</span> already exists in this folder.
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold text-[var(--foreground-muted)] mb-4">
            How would you like to handle this rename?
          </p>

          <div className="flex flex-col gap-2">
            {/* REPLACE */}
            <button
              disabled={isSubmittingAction}
              onClick={() => handleRename('replace')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Replace Existing File</span>
            </button>

            {/* AUTO RENAME */}
            <button
              disabled={isSubmittingAction}
              onClick={() => handleRename('auto_rename')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              <span>Keep Both (Auto-Rename with number)</span>
            </button>

            {/* CANCEL */}
            <button
              disabled={isSubmittingAction}
              onClick={() => setRenameConflictData(null)}
              className="w-full py-2 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-semibold text-xs transition-all cursor-pointer mt-1"
            >
              Cancel
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── DELETE CONFIRM DIALOG ── */}
      {fileToDelete && (
        <ModalDialog onClose={() => !isSubmittingAction && setFileToDelete(null)} zIndex="z-[70]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Delete Item?</h3>
              <p className="text-xs text-[var(--foreground-muted)]">This will move the item to Google Drive trash</p>
            </div>
          </div>
          <div className="p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl mb-5">
            <p className="text-xs font-semibold text-[var(--foreground)] break-words">{fileToDelete.name}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFileToDelete(null)}
              disabled={isSubmittingAction}
              className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmittingAction}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmittingAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, Delete
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── CREATE FOLDER DIALOG ── */}
      {isCreateFolderOpen && (
        <ModalDialog onClose={() => !isCreatingFolder && setIsCreateFolderOpen(false)} zIndex="z-[70]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">New Folder</h3>
              <p className="text-xs text-[var(--foreground-muted)]">Create a new subfolder in Google Drive</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Folder name"
            value={createFolderName}
            onChange={(e) => setCreateFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 mb-5 transition-all"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreateFolderOpen(false)}
              disabled={isCreatingFolder}
              className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !createFolderName.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isCreatingFolder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Folder
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── BULK MOVE — FOLDER PICKER MODAL ── */}
      {showMoveModal && (() => {
        // Define available destinations
        const destinations: { id: string; name: string; type: 'root' | 'parent' | 'subfolder' }[] = []

        // 1. Move to Root Folder
        if (folderHistory.length > 0 && rootFolderId) {
          destinations.push({
            id: rootFolderId,
            name: 'Root Folder',
            type: 'root',
          })
        }

        // 2. Move to Parent folders in path
        for (let i = 0; i < folderHistory.length - 1; i++) {
          destinations.push({
            id: folderHistory[i].id,
            name: folderHistory[i].name,
            type: 'parent',
          })
        }

        // 3. Move to Subfolders in current folder
        folders
          .filter(f => !selectedIds.has(f.id))
          .forEach(folder => {
            destinations.push({
              id: folder.id,
              name: folder.name,
              type: 'subfolder',
            })
          })

        return (
          <ModalDialog onClose={() => !isBulkMoving && setShowMoveModal(false)} zIndex="z-[70]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <MoveRight className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">Move {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}</h3>
                <p className="text-xs text-[var(--foreground-muted)]">Select a destination folder</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {destinations.map(dest => {
                let icon = <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20 shrink-0" />
                let styleClass = "hover:bg-amber-500/10 border-transparent hover:border-amber-500/30"
                let labelClass = "group-hover:text-amber-700 dark:group-hover:text-amber-400"
                let typeLabel = "Subfolder"

                if (dest.type === 'root') {
                  icon = <ArrowLeft className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  styleClass = "hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/30 bg-emerald-500/5"
                  labelClass = "text-emerald-800 dark:text-emerald-300 font-bold"
                  typeLabel = "Root Folder"
                } else if (dest.type === 'parent') {
                  icon = <ArrowLeft className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  styleClass = "hover:bg-blue-500/10 border-transparent hover:border-blue-500/30 bg-blue-500/5"
                  labelClass = "text-blue-800 dark:text-blue-300 font-semibold"
                  typeLabel = "Parent Folder"
                }

                return (
                  <button
                    key={dest.id}
                    disabled={isBulkMoving}
                    onClick={async () => {
                      setShowMoveModal(false)
                      await handleMoveFiles([...selectedIds], dest.id)
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left cursor-pointer group disabled:opacity-50",
                      styleClass
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {icon}
                      <span className={cn("text-sm truncate", labelClass)}>
                        {dest.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] shrink-0">
                      {typeLabel}
                    </span>
                  </button>
                )
              })}

              {destinations.length === 0 && (
                <p className="text-xs text-[var(--foreground-muted)] text-center py-6">
                  No available destination folders.
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </ModalDialog>
        )
      })()}

      {/* ── CONFLICT WARNING MENU MODAL ── */}
      {moveConflictData && (
        <ModalDialog onClose={() => !isBulkMoving && setMoveConflictData(null)} zIndex="z-[70]">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--foreground)] leading-tight">
                File Name Conflict Detected
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                Target folder: <span className="font-semibold text-amber-600 dark:text-amber-400">&quot;{moveConflictData.targetFolderName}&quot;</span>
              </p>
            </div>
          </div>

          <div className="mb-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
            <p className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
              {moveConflictData.conflicts.length} duplicate file{moveConflictData.conflicts.length !== 1 ? 's' : ''} found:
            </p>
            {moveConflictData.conflicts.map(c => (
              <div key={c.fileId} className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] bg-[var(--surface-elevated)] p-2 rounded-lg border border-[var(--border)] min-w-0">
                <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="truncate">{c.fileName}</span>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold text-[var(--foreground-muted)] mb-4">
            How would you like to proceed?
          </p>

          <div className="grid grid-cols-3 gap-2">
            {/* RENAME */}
            <button
              disabled={isBulkMoving}
              onClick={() => {
                const { fileIds, targetFolderId } = moveConflictData
                setMoveConflictData(null)
                handleMoveFiles(fileIds, targetFolderId, 'rename')
              }}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Automatically rename moving file (e.g. document (1).pdf)"
            >
              {isBulkMoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              <span className="text-xs font-bold">Rename</span>
            </button>

            {/* REPLACE */}
            <button
              disabled={isBulkMoving}
              onClick={() => {
                const { fileIds, targetFolderId } = moveConflictData
                setMoveConflictData(null)
                handleMoveFiles(fileIds, targetFolderId, 'replace')
              }}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Replace existing file in destination subfolder"
            >
              {isBulkMoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="text-xs font-bold">Replace</span>
            </button>

            {/* DO NOTHING */}
            <button
              disabled={isBulkMoving}
              onClick={() => {
                const { fileIds, targetFolderId } = moveConflictData
                setMoveConflictData(null)
                handleMoveFiles(fileIds, targetFolderId, 'do_nothing')
              }}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Do not move conflicting files"
            >
              <X className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span className="text-xs font-bold">Do Nothing</span>
            </button>
          </div>
        </ModalDialog>
      )}

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {contextMenuFile && contextMenuPos && (
        <div
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          className="fixed z-[100] transform -translate-x-2 -translate-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <FileActionMenu
            file={contextMenuFile}
            onOpenFolder={contextMenuFile.mimeType.includes('folder') ? () => {
              const file = contextMenuFile
              setContextMenuFile(null)
              setContextMenuPos(null)
              handleOpenFolder(file)
            } : undefined}
            onRename={() => {
              const file = contextMenuFile
              setContextMenuFile(null)
              setContextMenuPos(null)
              setFileToRename(file)
              setNewFileName(file.name)
            }}
            onDelete={() => {
              const file = contextMenuFile
              setContextMenuFile(null)
              setContextMenuPos(null)
              setFileToDelete(file)
            }}
            onSelect={() => {
              const file = contextMenuFile
              setContextMenuFile(null)
              setContextMenuPos(null)
              setSelectionMode(true)
              setSelectedIds(new Set([file.id]))
            }}
            onMove={!contextMenuFile.mimeType.includes('folder') ? () => {
              const file = contextMenuFile
              setContextMenuFile(null)
              setContextMenuPos(null)
              setSelectedIds(new Set([file.id]))
              setShowMoveModal(true)
            } : undefined}
            onClose={() => {
              setContextMenuFile(null)
              setContextMenuPos(null)
            }}
          />
        </div>
      )}

      {/* ── DEDICATED UPLOAD MENU MODAL ── */}
      <GoogleDriveUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folderId={activeFolderId || ''}
        folderName={folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : studentName}
        onUploadSuccess={() => fetchFolderFiles()}
      />
    </>
  )
}

// ── Helper sub-components ──

function FileActionMenu({
  file,
  onOpenFolder,
  onRename,
  onDelete,
  onSelect,
  onMove,
  onClose,
}: {
  file: DriveFile
  onOpenFolder?: () => void
  onRename: () => void
  onDelete: () => void
  onSelect?: () => void
  onMove?: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-8 w-44 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-100 overflow-hidden">
      {onOpenFolder && (
        <button
          onClick={onOpenFolder}
          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-left cursor-pointer transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="font-semibold">Open Folder</span>
        </button>
      )}
      {onSelect && (
        <button
          onClick={onSelect}
          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-[var(--foreground)] hover:bg-[var(--border-subtle)] text-left cursor-pointer transition-colors"
        >
          <CheckSquare className="h-3.5 w-3.5 text-violet-500" />
          <span className="font-semibold">Select</span>
        </button>
      )}
      {onMove && (
        <button
          onClick={onMove}
          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-[var(--foreground)] hover:bg-[var(--border-subtle)] text-left cursor-pointer transition-colors"
        >
          <MoveRight className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold">Move</span>
        </button>
      )}
      <button
        onClick={onRename}
        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-[var(--foreground)] hover:bg-[var(--border-subtle)] text-left cursor-pointer transition-colors"
      >
        <Pencil className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-semibold">Rename</span>
      </button>
      {file.webContentLink && (
        <a
          href={file.webContentLink}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-[var(--foreground)] hover:bg-[var(--border-subtle)] text-left cursor-pointer transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-semibold">Download</span>
        </a>
      )}
      <div className="h-px bg-[var(--border)] mx-3 my-1" />
      <button
        onClick={onDelete}
        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left cursor-pointer transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="font-semibold">Delete</span>
      </button>
    </div>
  )
}

function ModalDialog({
  children,
  onClose,
  zIndex = 'z-[60]',
}: {
  children: React.ReactNode
  onClose: () => void
  zIndex?: string
}) {
  return (
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', zIndex)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--surface-elevated)] border border-[var(--border)] p-6 rounded-2xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        {children}
      </div>
    </div>
  )
}

function DocumentThumbnailCard({
  file,
  failedThumbnails,
  setFailedThumbnails,
}: {
  file: DriveFile
  failedThumbnails: Record<string, boolean>
  setFailedThumbnails: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  const ext = getFileExtension(file.name, file.mimeType)
  const isFailed = failedThumbnails[file.id]
  const hasThumbnailLink = Boolean(file.thumbnailLink)

  if (hasThumbnailLink && !isFailed) {
    const proxyUrl = `/api/drive/thumbnail?fileId=${file.id}&size=400`
    return (
      <div className="relative w-full h-full bg-[var(--surface-elevated)] overflow-hidden flex items-center justify-center p-1.5">
        <img
          src={proxyUrl}
          referrerPolicy="no-referrer"
          alt=""
          onError={() => setFailedThumbnails(prev => ({ ...prev, [file.id]: true }))}
          className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        />
        {ext && (
          <span className="absolute bottom-2 left-2 text-[9px] font-black bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-md tracking-wider border border-white/10 shadow-sm">
            {ext}
          </span>
        )}
      </div>
    )
  }

  return <DocumentFallbackCard file={file} ext={ext} />
}

function DocumentFallbackCard({ file, ext }: { file: DriveFile; ext: string }) {
  const mime = file.mimeType.toLowerCase()
  const nameLower = file.name.toLowerCase()

  if (mime.includes('pdf') || nameLower.endsWith('.pdf')) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-rose-950/80 via-rose-900/40 to-zinc-900 flex flex-col items-center justify-center p-3 overflow-hidden group-hover:from-rose-900/90 transition-all">
        {/* Document Page Graphic Mockup */}
        <div className="w-14 h-18 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 flex flex-col gap-1.5 shadow-inner relative group-hover:scale-105 transition-transform">
          {/* Folded corner */}
          <div className="absolute top-0 right-0 border-t-[8px] border-r-[8px] border-t-zinc-900 border-r-rose-500/30 rounded-bl" />
          <FileText className="h-6 w-6 text-rose-400 self-center mt-1" />
          <div className="w-full h-1 bg-rose-400/30 rounded-full" />
          <div className="w-3/4 h-1 bg-rose-400/20 rounded-full" />
          <div className="w-5/6 h-1 bg-rose-400/20 rounded-full" />
        </div>
        <span className="absolute bottom-2 left-2 text-[9px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md tracking-widest shadow-md">
          PDF
        </span>
      </div>
    )
  }

  if (mime.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(nameLower)) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-sky-950/80 via-sky-900/40 to-zinc-900 flex flex-col items-center justify-center p-3 overflow-hidden group-hover:from-sky-900/90 transition-all">
        <div className="w-14 h-18 bg-sky-500/10 border border-sky-500/30 rounded-lg flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
          <ImageIcon className="h-8 w-8 text-sky-400" />
        </div>
        <span className="absolute bottom-2 left-2 text-[9px] font-black bg-sky-600 text-white px-2 py-0.5 rounded-md tracking-widest shadow-md">
          {ext || 'IMG'}
        </span>
      </div>
    )
  }

  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv') || /\.(xlsx|xls|csv)$/.test(nameLower)) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-zinc-900 flex flex-col items-center justify-center p-3 overflow-hidden group-hover:from-emerald-900/90 transition-all">
        <div className="w-14 h-18 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex flex-col gap-1 shadow-inner group-hover:scale-105 transition-transform">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400 self-center mt-1" />
          <div className="grid grid-cols-2 gap-1 mt-1">
            <div className="h-1.5 bg-emerald-500/20 rounded-xs" />
            <div className="h-1.5 bg-emerald-500/20 rounded-xs" />
            <div className="h-1.5 bg-emerald-500/20 rounded-xs" />
            <div className="h-1.5 bg-emerald-500/20 rounded-xs" />
          </div>
        </div>
        <span className="absolute bottom-2 left-2 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md tracking-widest shadow-md">
          {ext || 'XLS'}
        </span>
      </div>
    )
  }

  if (mime.includes('word') || mime.includes('document') || /\.(doc|docx|txt)$/.test(nameLower)) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-blue-950/80 via-blue-900/40 to-zinc-900 flex flex-col items-center justify-center p-3 overflow-hidden group-hover:from-blue-900/90 transition-all">
        <div className="w-14 h-18 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex flex-col gap-1.5 shadow-inner group-hover:scale-105 transition-transform">
          <FileText className="h-6 w-6 text-blue-400 self-center mt-1" />
          <div className="w-full h-1 bg-blue-400/30 rounded-full" />
          <div className="w-full h-1 bg-blue-400/20 rounded-full" />
          <div className="w-2/3 h-1 bg-blue-400/20 rounded-full" />
        </div>
        <span className="absolute bottom-2 left-2 text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md tracking-widest shadow-md">
          {ext || 'DOC'}
        </span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-violet-950/80 via-violet-900/40 to-zinc-900 flex flex-col items-center justify-center p-3 overflow-hidden group-hover:from-violet-900/90 transition-all">
      <div className="w-14 h-18 bg-violet-500/10 border border-violet-500/30 rounded-lg flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
        {getFileIcon(file.mimeType, 'h-7 w-7')}
      </div>
      {ext && (
        <span className="absolute bottom-2 left-2 text-[9px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-md tracking-widest shadow-md">
          {ext}
        </span>
      )}
    </div>
  )
}
