'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student } from '@/types/database'

interface StudentDetailPageActions {
  onFillByDocument: () => void
  onReload: () => void
  onDelete: () => void
  isDeleted: boolean
  isDeleting: boolean
}

interface StudentDashboardContextValue {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isAddStudentModalOpen: boolean
  setIsAddStudentModalOpen: (open: boolean) => void

  // Hoisted state
  students: Student[]
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
  loading: boolean
  error: string | null
  fetchStudents: (force?: boolean) => Promise<void>

  // Student detail page header action buttons (Fill By Document / Reload / Delete)
  detailPageActions: StudentDetailPageActions | null
  setDetailPageActions: (actions: StudentDetailPageActions | null) => void
}

const StudentDashboardContext = createContext<StudentDashboardContextValue | undefined>(undefined)

export function StudentDashboardProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  
  // Student list states
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [detailPageActions, setDetailPageActions] = useState<StudentDetailPageActions | null>(null)

  const fetchStudents = async (force = false) => {
    // If not forced and we already have data, fetch in the background to update the state silently
    const isBackground = hasFetched && !force
    
    try {
      if (!isBackground) {
        setLoading(true)
        setError(null)
      }
      
      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setStudents(data || [])
      setHasFetched(true)
    } catch (err: any) {
      console.error('Error fetching students:', err)
      if (!isBackground) {
        setError(err.message || 'Failed to load students. Please try again.')
      }
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }

  // Pre-fetch students once on mount of the dashboard layout
  useEffect(() => {
    fetchStudents()
  }, [])

  return (
    <StudentDashboardContext.Provider value={{
      searchQuery,
      setSearchQuery,
      isAddStudentModalOpen,
      setIsAddStudentModalOpen,
      students,
      setStudents,
      loading,
      error,
      fetchStudents,
      detailPageActions,
      setDetailPageActions
    }}>
      {children}
    </StudentDashboardContext.Provider>
  )
}

export function useStudentDashboard() {
  const context = useContext(StudentDashboardContext)
  if (!context) {
    throw new Error('useStudentDashboard must be used within a StudentDashboardProvider')
  }
  return context
}
