'use client'

import { useUpload } from '@/contexts/UploadContext'
import { cn } from '@/lib/utils'

export function GlobalUploadProgress() {
  const { isUploading, totalFiles, completedFiles } = useUpload()

  const progressPercentage = totalFiles === 0 ? 0 : Math.round((completedFiles / totalFiles) * 100)

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-transform duration-300 ease-out',
        isUploading ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="bg-[var(--surface-elevated)] border border-[var(--border)] border-t-0 rounded-b-xl shadow-lg px-4 py-2 flex flex-col items-center gap-1.5 w-[300px] pointer-events-auto">
        <span className="text-[11px] font-bold text-sky-500">
          Uploading {completedFiles}/{totalFiles} file{totalFiles !== 1 ? 's' : ''}
        </span>
        <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
