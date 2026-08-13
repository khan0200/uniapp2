'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload, X, File as FileIcon, CheckCircle2, AlertCircle, Loader2,
  Image as ImageIcon, FileText, Clipboard, Plus, Trash2, Tag, Pencil
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'

export interface UploadQueueItem {
  id: string
  file: File
  relativePath?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  errorMsg?: string
}

interface GoogleDriveUploadModalProps {
  isOpen: boolean
  onClose: () => void
  folderId: string
  folderName: string
  onUploadSuccess: () => void
}

const NAME_SUGGESTIONS = [
  'INTERNATIONAL PASSPORT',
  'STUDENT ID',
  'MOTHER PASSPORT',
  'FATHER PASSPORT',
  'BIRTH CERTIFICATE',
  'BIRTH CERTIFICATE TRANSLATION',
  'MARRIAGE CERTIFICATE',
  'MARRIAGE CERTIFICATE TRANSLATION',
  'DIVORCE CERTIFICATE',
  'DIPLOMA',
  'APOSTILLE',
  'DEATH CERTIFICATE',
  'TOPIK',
  'IELTS',
  'SKA',
  'SAT',
  'PHOTO',
  'CERTIFICATE',
  'APPLICATION FORM',
  'LETTER OF CONSENT',
  'ADDRESS',
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function GoogleDriveUploadModal({
  isOpen,
  onClose,
  folderId,
  folderName,
  onUploadSuccess,
}: GoogleDriveUploadModalProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [customName, setCustomName] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { shouldRender, isVisible } = useCssTransition(isOpen, 220)

  // Enforce single file selection: take only the 1st file and replace queue
  const addFilesToQueue = (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    const firstFile = files[0]
    const newItem: UploadQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      file: firstFile,
      relativePath: firstFile.name,
      status: 'pending',
      progress: 0,
    }
    setQueue([newItem])
    setCustomName(firstFile.name)
    setSelectedTag(null)
  }

  // Handle Ctrl+V Clipboard Paste (single file)
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            let name = file.name
            if (name === 'image.png' || name === 'blob') {
              const now = new Date()
              const timeStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
              name = `Pasted_Image_${timeStr}.png`
            }
            const renamedFile = new File([file], name, { type: file.type })
            e.preventDefault()
            addFilesToQueue([renamedFile])
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen])

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files)
    }
  }

  // Handle picker click suggestion
  const handleApplySuggestion = (suggestion: string) => {
    const item = queue[0]
    if (!item) return

    const origName = item.file.name
    const extMatch = origName.match(/\.([a-zA-Z0-9]+)$/)
    const ext = extMatch ? `.${extMatch[1]}` : ''
    const newNameWithExt = `${suggestion}${ext}`

    setCustomName(newNameWithExt)
    setSelectedTag(suggestion)

    // Update File object in queue
    const renamedFile = new File([item.file], newNameWithExt, { type: item.file.type })
    setQueue([{ ...item, file: renamedFile, relativePath: newNameWithExt }])
  }

  // Handle manual name input edit
  const handleCustomNameChange = (newName: string) => {
    setCustomName(newName)
    setSelectedTag(null)
    const item = queue[0]
    if (item && newName.trim()) {
      const renamedFile = new File([item.file], newName.trim(), { type: item.file.type })
      setQueue([{ ...item, file: renamedFile, relativePath: newName.trim() }])
    }
  }

  const clearQueue = () => {
    setQueue([])
    setCustomName('')
    setSelectedTag(null)
  }

  // Execute Upload for the selected file
  const startUpload = async () => {
    const item = queue[0]
    if (!item || item.status === 'uploading' || !folderId) return

    setIsUploading(true)
    setQueue([{ ...item, status: 'uploading', progress: 50 }])

    try {
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('folderId', folderId)

      const res = await fetch('/api/drive/upload-file', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to upload file')

      setQueue([{ ...item, status: 'success', progress: 100 }])
      onUploadSuccess()
      setTimeout(() => {
        onClose()
        setQueue([])
        setCustomName('')
        setSelectedTag(null)
      }, 600)
    } catch (err: any) {
      console.error('Upload item failed:', err)
      setQueue([{ ...item, status: 'error', progress: 0, errorMsg: err.message || 'Upload error' }])
    } finally {
      setIsUploading(false)
    }
  }

  if (!shouldRender) return null

  const selectedFile = queue[0]

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={() => !isUploading && onClose()}
        className={cn(
          'fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-220 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative w-full max-w-3xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden',
          'transition-all duration-220 ease-out',
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        )}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Upload Document</h3>
              <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-1 mt-0.5">
                <span>Folder:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{folderName}</span>
              </p>
            </div>
          </div>

          <button
            disabled={isUploading}
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer',
              isDragging
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]'
                : 'border-[var(--border)] hover:border-[var(--accent)]/50 bg-[var(--surface)]'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-xs flex items-center justify-center text-[var(--accent)]">
              <Upload className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">
                Drag & Drop a file here
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] mt-1 flex items-center justify-center gap-1.5">
                <Clipboard className="h-3 w-3 text-blue-500" />
                <span>You can also press <strong>Ctrl + V</strong> to paste</span>
              </p>
            </div>

            {/* Select File button inside dropzone */}
            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files && addFilesToQueue(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Select File
              </button>
            </div>
          </div>

          {/* Selected File Card */}
          {selectedFile && (
            <div className="space-y-3">
              <div className="border border-[var(--border)] rounded-2xl p-3.5 bg-[var(--surface)] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectedFile.file.type.includes('image') ? (
                    <ImageIcon className="h-5 w-5 text-sky-500 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-[var(--accent)] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--foreground)] truncate break-all">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)] font-mono">
                      {formatFileSize(selectedFile.file.size)}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedFile.status === 'uploading' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </span>
                  )}
                  {selectedFile.status === 'success' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Uploaded
                    </span>
                  )}
                  {selectedFile.status === 'error' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500" title={selectedFile.errorMsg}>
                      <AlertCircle className="h-3.5 w-3.5" />
                      Failed
                    </span>
                  )}

                  {!isUploading && selectedFile.status !== 'uploading' && (
                    <button
                      onClick={clearQueue}
                      className="p-1 text-[var(--foreground-subtle)] hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── NAME SUGGESTION PICKER (Right below the file we are uploading) ── */}
              <div className="p-3.5 border border-blue-100 dark:border-blue-900/50 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800/70 dark:text-blue-300/70 flex items-center gap-1.5 uppercase tracking-wider">
                    <Tag className="h-3.5 w-3.5 text-blue-500" />
                    Name Suggestions (Optional)
                  </span>
                </div>

                {/* Manual Editable Name Input */}
                <div className="relative">
                  <Pencil className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[var(--foreground-subtle)]" />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => handleCustomNameChange(e.target.value)}
                    placeholder="Enter custom file name..."
                    className="w-full pl-8 pr-3 py-1.5 border border-[var(--border)] rounded-xl bg-[var(--surface-elevated)] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                {/* Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-[25vh] sm:max-h-[35vh] overflow-y-auto pr-1">
                  {NAME_SUGGESTIONS.map((suggestion) => {
                    const isSelected = selectedTag === suggestion
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleApplySuggestion(suggestion)}
                        className={cn(
                          'px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer select-none border',
                          isSelected
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-bold'
                            : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/60 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/25 dark:text-indigo-300 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-400/50'
                        )}
                      >
                        {suggestion}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-2 shrink-0">
          <button
            disabled={isUploading}
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={isUploading || !selectedFile || selectedFile.status === 'success'}
            onClick={startUpload}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  )
}
