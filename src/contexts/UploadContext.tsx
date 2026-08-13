'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface UploadTask {
  file: File
  folderId: string
  folderName?: string
}

interface UploadContextType {
  isUploading: boolean
  totalFiles: number
  completedFiles: number
  addUploadTasks: (tasks: UploadTask[], onSuccess?: () => void) => void
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [isUploading, setIsUploading] = useState(false)
  const [totalFiles, setTotalFiles] = useState(0)
  const [completedFiles, setCompletedFiles] = useState(0)

  const addUploadTasks = useCallback(async (tasks: UploadTask[], onSuccess?: () => void) => {
    if (tasks.length === 0) return

    setIsUploading(true)
    // If an upload is already running, we just add to the total
    setTotalFiles((prev) => prev + tasks.length)
    
    // We don't reset completedFiles if it's already uploading, so the bar just extends

    let hasErrors = false

    const promises = tasks.map(async (task) => {
      try {
        const formData = new FormData()
        formData.append('file', task.file)
        formData.append('folderId', task.folderId)

        const res = await fetch('/api/drive/upload-file', {
          method: 'POST',
          body: formData,
        })
        
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Failed to upload file')
      } catch (err: any) {
        console.error(`Upload failed for ${task.file.name}:`, err)
        hasErrors = true
        alert(`Failed to upload ${task.file.name}:\n${err.message || 'Unknown error'}`)
      } finally {
        setCompletedFiles((prev) => prev + 1)
      }
    })

    await Promise.all(promises)

    if (onSuccess) {
      onSuccess()
    }

    // Small delay before hiding the progress bar to let the user see it reach 100%
    setTimeout(() => {
      setIsUploading((currentIsUploading) => {
        // Only reset if another batch hasn't started
        setTotalFiles((currentTotal) => {
          setCompletedFiles((currentCompleted) => {
            if (currentCompleted >= currentTotal) {
              setIsUploading(false)
              setTimeout(() => {
                setTotalFiles(0)
                setCompletedFiles(0)
              }, 300) // wait for css transition to finish
              return currentCompleted
            }
            return currentCompleted
          })
          return currentTotal
        })
        return currentIsUploading
      })
    }, 1500)

  }, [])

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        totalFiles,
        completedFiles,
        addUploadTasks,
      }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}
