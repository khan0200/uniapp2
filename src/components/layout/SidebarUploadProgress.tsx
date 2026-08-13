'use client'

import { useUpload } from '@/contexts/UploadContext'
import { cn } from '@/lib/utils'

export function SidebarUploadProgress() {
  const { isUploading, totalFiles, completedFiles } = useUpload()

  if (!isUploading && totalFiles === 0) return null

  const percentage = totalFiles === 0 ? 0 : Math.round((completedFiles / totalFiles) * 100)
  
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-1.5 w-full py-2 transition-all duration-300",
      isUploading || totalFiles > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden"
    )}>
      {/* Circular Progress Ring */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
          {/* Background Ring */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-[var(--border-subtle)]"
            strokeWidth="4"
          />
          {/* Progress Ring */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-sky-500 transition-all duration-300 ease-out"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center Text (1/5) */}
        <span className="absolute text-[9px] font-bold text-[var(--foreground)]">
          {completedFiles}/{totalFiles}
        </span>
      </div>

      {/* Label Text */}
      <span className="text-[9px] font-semibold text-sky-500 animate-pulse">
        {completedFiles === totalFiles && totalFiles > 0 ? 'Done' : 'Uploading...'}
      </span>
    </div>
  )
}
