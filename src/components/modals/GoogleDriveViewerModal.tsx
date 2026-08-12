'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Folder, ExternalLink, X, RefreshCw, Loader2, LayoutGrid, List,
  Maximize2, Minimize2, MoreVertical, Download, Pencil, Trash2,
  FileText, Image as ImageIcon, FileSpreadsheet, File,
  Upload, AlertTriangle, Search, Eye, ChevronRight, ArrowLeft, FolderOpen
} from 'lucide-react'
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
  if (mimeType.includes('folder')) return <Folder className={cn(className, 'text-amber-500 fill-amber-500/20')} />
  if (mimeType.includes('image')) return <ImageIcon className={cn(className, 'text-sky-500')} />
  if (mimeType.includes('pdf')) return <FileText className={cn(className, 'text-rose-500')} />
  if (mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('excel'))
    return <FileSpreadsheet className={cn(className, 'text-emerald-500')} />
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className={cn(className, 'text-blue-500')} />
  return <File className={cn(className, 'text-violet-400')} />
}

function getFileColor(mimeType: string): string {
  if (mimeType.includes('folder')) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30'
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
  const [fileToRename, setFileToRename] = useState<DriveFile | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

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
    try {
      const res = await fetch('/api/drive/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: idToFetch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load folder contents')
      setFiles(data.files || [])
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

  // Navigate into subfolder
  const handleOpenFolder = (subfolder: DriveFile) => {
    const nextStack = [...folderHistory, { id: subfolder.id, name: subfolder.name }]
    setFolderHistory(nextStack)
    fetchFolderFiles(subfolder.id)
  }

  // Jump to specific breadcrumb level
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root level
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

  const handleRename = async () => {
    if (!fileToRename || !newFileName.trim()) return
    setIsSubmittingAction(true)
    try {
      const res = await fetch('/api/drive/rename-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileToRename.id, newName: newFileName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFiles(prev => prev.map(f => f.id === fileToRename.id ? { ...f, name: newFileName.trim() } : f))
      setFileToRename(null)
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

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  if (!shouldRender) return null

  return (
    <>
      <div
        onClick={() => setActiveMenuFileId(null)}
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
              : 'w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.4)]',
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-4'
          )}
        >
          {/* ── TOP HEADER ── */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
            {/* Left: Student info & Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              {folderHistory.length > 0 ? (
                <button
                  onClick={handleGoBack}
                  className="h-9 w-9 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] hover:bg-[var(--border-subtle)] flex items-center justify-center text-[var(--foreground)] shrink-0 transition-all cursor-pointer"
                  title="Go back to parent folder"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                  <Folder className="h-4.5 w-4.5 text-white" style={{ height: '1.125rem', width: '1.125rem' }} />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[13px] font-bold text-[var(--foreground)] truncate uppercase tracking-wide leading-tight">
                    {studentName}
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono shrink-0">
                    {studentId}
                  </span>
                </div>

                {/* BREADCRUMB TRAIL */}
                <div className="flex items-center gap-1 text-[11px] text-[var(--foreground-muted)] mt-0.5 overflow-x-auto scrollbar-none max-w-md">
                  <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={cn(
                      "hover:text-[var(--foreground)] transition-colors shrink-0 cursor-pointer font-semibold",
                      folderHistory.length === 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""
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
                          "hover:text-[var(--foreground)] transition-colors truncate max-w-[120px] cursor-pointer",
                          idx === folderHistory.length - 1 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "font-medium"
                        )}
                        title={item.name}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                  {!loading && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {files.length} item{files.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Toolbar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Search */}
              <div className="relative hidden sm:flex items-center">
                <Search className="h-3.5 w-3.5 absolute left-2.5 text-[var(--foreground-subtle)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 pl-8 pr-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] text-xs placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-[var(--border)] mx-1" />

              {/* Upload */}
              <button
                disabled={isUploading}
                onClick={() => setIsUploadModalOpen(true)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer',
                  'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-60'
                )}
                title="Upload documents to current folder"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">{isUploading ? 'Uploading…' : 'Upload'}</span>
              </button>

              {/* View Mode Switcher */}
              <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-xl p-0.5 gap-0.5">
                {(['grid', 'table'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      viewMode === mode
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                    )}
                    title={mode === 'grid' ? 'Grid view' : 'Table view'}
                  >
                    {mode === 'grid' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline capitalize">{mode}</span>
                  </button>
                ))}
              </div>

              {/* Icon buttons */}
              {[
                { icon: <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />, action: () => fetchFolderFiles(), title: 'Refresh' },
                {
                  icon: isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />,
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

              {/* Open in Drive */}
              {directUrl && (
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                  title="Open current folder in Google Drive"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <div className="w-px h-6 bg-[var(--border)] mx-0.5" />

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Close"
              >
                <X className="h-4.5 w-4.5" style={{ height: '1.125rem', width: '1.125rem' }} />
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="sm:hidden px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="relative flex items-center">
              <Search className="h-3.5 w-3.5 absolute left-2.5 text-[var(--foreground-subtle)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] text-xs placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>
          </div>

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
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredFiles.map((file) => {
                  const isFolder = file.mimeType.includes('folder')
                  const ext = getFileExtension(file.name, file.mimeType)

                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "group relative flex flex-col bg-[var(--surface-elevated)] border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer",
                        isFolder
                          ? "border-amber-500/30 hover:border-amber-500 bg-amber-500/5"
                          : "border-[var(--border)] hover:border-[var(--accent)]/50"
                      )}
                      onClick={() => {
                        if (isFolder) {
                          handleOpenFolder(file)
                        } else {
                          setPreviewFile(file)
                        }
                      }}
                    >
                      {/* Thumbnail / Header Area */}
                      <div className="relative h-36 w-full overflow-hidden bg-[var(--surface)] flex items-center justify-center">
                        {isFolder ? (
                          <div className="flex flex-col items-center gap-2 w-full h-full justify-center bg-gradient-to-b from-amber-500/20 to-amber-500/5">
                            <Folder className="h-12 w-12 text-amber-500 fill-amber-500/30 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Subfolder
                            </span>
                          </div>
                        ) : file.thumbnailLink ? (
                          <>
                            <img
                              src={file.thumbnailLink.replace('=s220', '=s400')}
                              alt={file.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {ext && (
                              <span className="absolute bottom-2 left-2 text-[9px] font-black bg-black/70 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm tracking-widest">
                                {ext}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className={cn(
                            'flex flex-col items-center gap-2 w-full h-full justify-center bg-gradient-to-b',
                            getFileColor(file.mimeType)
                          )}>
                            {getFileIcon(file.mimeType, 'h-10 w-10')}
                            {ext && (
                              <span className="text-[9px] font-black text-[var(--foreground-muted)] tracking-widest">
                                {ext}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center pb-3">
                          <span className="flex items-center gap-1.5 text-white text-[11px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                            {isFolder ? <FolderOpen className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {isFolder ? 'Open Folder' : 'Preview'}
                          </span>
                        </div>
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
                          {!isFolder && file.size != null && (
                            <p className="text-[10px] text-[var(--foreground-muted)] font-mono mt-1">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </div>

                        {/* 3-dots menu */}
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
                              onClose={() => setActiveMenuFileId(null)}
                            />
                          )}
                        </div>
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
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4 hidden md:table-cell">Type</th>
                        <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredFiles.map((file) => {
                        const isFolder = file.mimeType.includes('folder')
                        return (
                          <tr
                            key={file.id}
                            onClick={() => {
                              if (isFolder) {
                                handleOpenFolder(file)
                              } else {
                                setPreviewFile(file)
                              }
                            }}
                            className="hover:bg-[var(--border-subtle)] transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {getFileIcon(file.mimeType, 'h-4.5 w-4.5 shrink-0')}
                                <span className="font-semibold text-[var(--foreground)] text-[12px] break-words leading-snug">
                                  {file.name}
                                </span>
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
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 animate-in fade-in duration-200">
          {/* Preview Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(previewFile.mimeType, 'h-5 w-5 shrink-0')}
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white break-words line-clamp-1">
                  {previewFile.name}
                </p>
                {previewFile.size && (
                  <p className="text-[11px] text-zinc-400 font-mono">{formatFileSize(previewFile.size)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {previewFile.webContentLink && (
                <a
                  href={previewFile.webContentLink}
                  download target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
              {previewFile.webViewLink && (
                <a
                  href={previewFile.webViewLink}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Open External
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                title="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview Content – auto-fitted to screen */}
          <div className="flex-1 overflow-hidden relative">
            {previewFile.mimeType.includes('image') ? (
              <div className="flex items-center justify-center w-full h-full p-6">
                <img
                  src={`https://drive.google.com/thumbnail?id=${previewFile.id}&sz=w2000`}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  src={`https://drive.google.com/file/d/${previewFile.id}/preview`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'scale(0.75) translateX(-50%)',
                    transformOrigin: 'top left',
                    width: `${(1 / 0.75) * 100}%`,
                    height: `${(1 / 0.75) * 100}%`,
                    border: 'none',
                  }}
                  title={previewFile.name}
                  allow="autoplay"
                />
              </div>
            )}
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
              onClick={handleRename}
              disabled={isSubmittingAction || !newFileName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmittingAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Name
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
  onClose,
}: {
  file: DriveFile
  onOpenFolder?: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-8 w-40 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl z-30 text-xs animate-in fade-in slide-in-from-top-1 duration-100 overflow-hidden">
      {onOpenFolder && (
        <button
          onClick={onOpenFolder}
          className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-left cursor-pointer transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="font-semibold">Open Folder</span>
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
