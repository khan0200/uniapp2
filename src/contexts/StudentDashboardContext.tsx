'use client'

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
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

  // Hoisted filter, sorting, pagination, and scroll states
  selectedTariffs: string[]
  setSelectedTariffs: React.Dispatch<React.SetStateAction<string[]>>
  selectedLevels: string[]
  setSelectedLevels: React.Dispatch<React.SetStateAction<string[]>>
  selectedGroups: string[]
  setSelectedGroups: React.Dispatch<React.SetStateAction<string[]>>
  selectedCerts: string[]
  setSelectedCerts: React.Dispatch<React.SetStateAction<string[]>>
  selectedScores: string[]
  setSelectedScores: React.Dispatch<React.SetStateAction<string[]>>
  selectedTags: string[]
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>
  selectedLeads: string[]
  setSelectedLeads: React.Dispatch<React.SetStateAction<string[]>>
  sortOrder: 'asc' | 'desc'
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  setScrollPosition: (pos: number) => void
  getScrollPosition: () => number
  resetAllFilters: () => void
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

  // Hoisted state values
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])
  const [selectedScores, setSelectedScores] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const scrollPositionRef = useRef(0)
  const setScrollPosition = (pos: number) => {
    scrollPositionRef.current = pos
  }
  const getScrollPosition = () => scrollPositionRef.current

  const resetAllFilters = () => {
    setSearchQuery('')
    setSelectedTariffs([])
    setSelectedLevels([])
    setSelectedGroups([])
    setSelectedCerts([])
    setSelectedScores([])
    setSelectedTags([])
    setSelectedLeads([])
    setSortOrder('asc')
    setCurrentPage(1)
    scrollPositionRef.current = 0
  }

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
      setDetailPageActions,
      selectedTariffs,
      setSelectedTariffs,
      selectedLevels,
      setSelectedLevels,
      selectedGroups,
      setSelectedGroups,
      selectedCerts,
      setSelectedCerts,
      selectedScores,
      setSelectedScores,
      selectedTags,
      setSelectedTags,
      selectedLeads,
      setSelectedLeads,
      sortOrder,
      setSortOrder,
      currentPage,
      setCurrentPage,
      setScrollPosition,
      getScrollPosition,
      resetAllFilters
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
