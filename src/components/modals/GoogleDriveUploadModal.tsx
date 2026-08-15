'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload, X, CheckCircle2, AlertCircle, Loader2,
  Image as ImageIcon, FileText, Clipboard, Plus, Trash2, Tag, Pencil
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'
import { useUpload, UploadTask } from '@/contexts/UploadContext'

export interface UploadQueueItem {
  id: string
  file: File
  relativePath?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  errorMsg?: string
  
  // New properties for per-file renaming
  isRenaming?: boolean
  customName?: string
  selectedTag?: string | null
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
  const [isDragging, setIsDragging] = useState(false)
  
  const { addUploadTasks, isUploading } = useUpload()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { shouldRender, isVisible } = useCssTransition(isOpen, 220)

  // Allow multiple file selection
  const addFilesToQueue = (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    
    const newItems: UploadQueueItem[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: file,
      relativePath: file.name,
      status: 'pending',
      progress: 0,
      isRenaming: false,
      customName: file.name,
      selectedTag: null
    }))
    
    setQueue(prev => [...prev, ...newItems])
  }

  // Handle Ctrl+V Clipboard Paste (multiple files supported)
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const filesToPaste: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            let name = file.name
            if (name === 'image.png' || name === 'blob') {
              const now = new Date()
              const timeStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
              name = `Pasted_Image_${timeStr}_${i}.png`
            }
            const renamedFile = new File([file], name, { type: file.type })
            filesToPaste.push(renamedFile)
          }
        }
      }
      
      if (filesToPaste.length > 0) {
        e.preventDefault()
        addFilesToQueue(filesToPaste)
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

  // Handle manual name input edit per file
  const handleCustomNameChange = (id: string, newName: string) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        const trimmed = newName.trim()
        const renamedFile = new File([item.file], trimmed || item.file.name, { type: item.file.type })
        return {
          ...item,
          customName: newName,
          selectedTag: null,
          file: renamedFile,
          relativePath: trimmed || item.file.name
        }
      }
      return item
    }))
  }

  // Handle picker click suggestion per file
  const handleApplySuggestion = (id: string, suggestion: string) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        const origName = item.file.name
        const extMatch = origName.match(/\.([a-zA-Z0-9]+)$/)
        const ext = extMatch ? `.${extMatch[1]}` : ''
        const newNameWithExt = `${suggestion}${ext}`
        
        const renamedFile = new File([item.file], newNameWithExt, { type: item.file.type })
        return {
          ...item,
          customName: newNameWithExt,
          selectedTag: suggestion,
          file: renamedFile,
          relativePath: newNameWithExt
        }
      }
      return item
    }))
  }
  
  const toggleRenaming = (id: string) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isRenaming: !item.isRenaming }
      }
      return item
    }))
  }
  
  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }

  // Execute Background Upload for all pending files
  const startUpload = () => {
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error')
    if (pendingItems.length === 0 || !folderId) return

    const tasks: UploadTask[] = pendingItems.map(item => ({
      file: item.file,
      folderId: folderId,
      folderName: folderName
    }))

    // Delegate to global context
    addUploadTasks(tasks, onUploadSuccess)

    // Close modal immediately so user can continue working
    onClose()
    
    // Reset queue state for next open
    setTimeout(() => {
      setQueue([])
    }, 500)
  }

  if (!shouldRender) return null

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
                multiple
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

          {/* Selected File Cards */}
          {queue.length > 0 && (
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="border border-[var(--border)] rounded-2xl p-3.5 bg-[var(--surface)] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.file.type.includes('image') ? (
                        <ImageIcon className="h-5 w-5 text-sky-500 shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-[var(--accent)] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--foreground)] truncate break-all">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)] font-mono">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'uploading' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Uploaded
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500" title={item.errorMsg}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Failed
                        </span>
                      )}

                      {!isUploading && item.status !== 'uploading' && (
                        <>
                          <button
                            onClick={() => toggleRenaming(item.id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors cursor-pointer",
                              item.isRenaming 
                                ? "bg-[var(--accent)] text-white" 
                                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                            )}
                            title="Rename file"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-[var(--foreground-subtle)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── NAME SUGGESTION PICKER (Right below the file we are uploading) ── */}
                  {item.isRenaming && (
                    <div className="p-3.5 ml-8 border border-blue-100 dark:border-blue-900/50 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-blue-800/70 dark:text-blue-300/70 flex items-center gap-1.5 uppercase tracking-wider">
                          <Tag className="h-3.5 w-3.5 text-blue-500" />
                          Name Suggestions (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRenaming(item.id)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </button>
                      </div>

                      {/* Manual Editable Name Input */}
                      <div className="relative">
                        <Pencil className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[var(--foreground-subtle)]" />
                        <input
                          type="text"
                          value={item.customName || ''}
                          onChange={(e) => handleCustomNameChange(item.id, e.target.value)}
                          placeholder="Enter custom file name..."
                          className="w-full pl-8 pr-3 py-1.5 border border-[var(--border)] rounded-xl bg-[var(--surface-elevated)] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                        />
                      </div>

                      {/* Suggestion Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-[25vh] sm:max-h-[35vh] overflow-y-auto pr-1">
                        {NAME_SUGGESTIONS.map((suggestion) => {
                          const isSelected = item.selectedTag === suggestion
                          return (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleApplySuggestion(item.id, suggestion)}
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
                  )}
                </div>
              ))}
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
            disabled={isUploading || queue.length === 0}
            onClick={startUpload}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isUploading ? 'Uploading in background...' : `Upload ${queue.length} File${queue.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
