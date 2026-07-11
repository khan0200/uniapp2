'use client'

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student } from '@/types/database'

export interface CustomTag {
  name: string
  icon: string
}

export interface Folder {
  id: string
  name: string
}

interface StudentDetailPageActions {
  onFillByDocument: () => void
  onReload: () => void
  onDelete: () => void
  onPermanentDelete?: () => void
  isDeleted: boolean
  isDeleting: boolean
}

interface StudentDashboardContextValue {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isAddStudentModalOpen: boolean
  setIsAddStudentModalOpen: (open: boolean) => void
  isFilterPanelOpen: boolean
  setIsFilterPanelOpen: (open: boolean) => void
  isExcelModalOpen: boolean
  setIsExcelModalOpen: (open: boolean) => void

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

  // Filter option arrays fetched from DB
  tariffOptions: string[]
  setTariffOptions: React.Dispatch<React.SetStateAction<string[]>>
  levelOptions: string[]
  setLevelOptions: React.Dispatch<React.SetStateAction<string[]>>
  groupOptions: string[]
  setGroupOptions: React.Dispatch<React.SetStateAction<string[]>>
  leadByOptions: string[]
  setLeadByOptions: React.Dispatch<React.SetStateAction<string[]>>
  customTagsRegistry: CustomTag[]
  setCustomTagsRegistry: React.Dispatch<React.SetStateAction<CustomTag[]>>
  foldersOptions: Folder[]
  setFoldersOptions: React.Dispatch<React.SetStateAction<Folder[]>>
  activeFolder: string
  setActiveFolder: (folder: string) => void
  fetchFilterOptions: () => Promise<void>
}

const StudentDashboardContext = createContext<StudentDashboardContextValue | undefined>(undefined)

// Helper to safely load JSON state from sessionStorage
const getSessionValue = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue
  const saved = sessionStorage.getItem(key)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error(`Failed to parse sessionStorage for ${key}`, e)
    }
  }
  return defaultValue
}

export function StudentDashboardProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  
  // Student list states
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [detailPageActions, setDetailPageActions] = useState<StudentDetailPageActions | null>(null)

  // Hoisted filter state values with sessionStorage loading
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>(() => getSessionValue('selectedTariffs', []))
  const [selectedLevels, setSelectedLevels] = useState<string[]>(() => getSessionValue('selectedLevels', []))
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => getSessionValue('selectedGroups', []))
  const [selectedCerts, setSelectedCerts] = useState<string[]>(() => getSessionValue('selectedCerts', []))
  const [selectedScores, setSelectedScores] = useState<string[]>(() => getSessionValue('selectedScores', []))
  const [selectedTags, setSelectedTags] = useState<string[]>(() => getSessionValue('selectedTags', []))
  const [selectedLeads, setSelectedLeads] = useState<string[]>(() => getSessionValue('selectedLeads', []))
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter option arrays fetched from DB
  const [tariffOptions, setTariffOptions] = useState<string[]>(['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'])
  const [levelOptions, setLevelOptions] = useState<string[]>(['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'])
  const [groupOptions, setGroupOptions] = useState<string[]>([])
  const [leadByOptions, setLeadByOptions] = useState<string[]>([])
  const [customTagsRegistry, setCustomTagsRegistry] = useState<CustomTag[]>([])
  const [foldersOptions, setFoldersOptions] = useState<Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string>(() => getSessionValue('activeFolder', 'all'))

  const scrollPositionRef = useRef(0)
  const setScrollPosition = (pos: number) => {
    scrollPositionRef.current = pos
  }
  const getScrollPosition = () => scrollPositionRef.current

  // Save selected filters to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedTariffs', JSON.stringify(selectedTariffs))
      sessionStorage.setItem('selectedLevels', JSON.stringify(selectedLevels))
      sessionStorage.setItem('selectedGroups', JSON.stringify(selectedGroups))
      sessionStorage.setItem('selectedCerts', JSON.stringify(selectedCerts))
      sessionStorage.setItem('selectedScores', JSON.stringify(selectedScores))
      sessionStorage.setItem('selectedTags', JSON.stringify(selectedTags))
      sessionStorage.setItem('selectedLeads', JSON.stringify(selectedLeads))
      sessionStorage.setItem('activeFolder', JSON.stringify(activeFolder))
    }
  }, [selectedTariffs, selectedLevels, selectedGroups, selectedCerts, selectedScores, selectedTags, selectedLeads, activeFolder])

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

  const fetchFilterOptions = async () => {
    try {
      const [tariffsRes, levelsRes, groupsRes, leadsRes, foldersRes] = await Promise.all([
        supabase.from('tariff_options').select('name'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name'),
        supabase.from('lead_sources').select('name'),
        supabase.from('folders').select('id, name')
      ])
 
      if (tariffsRes.data && tariffsRes.data.length > 0) setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
      if (leadsRes.data && leadsRes.data.length > 0) setLeadByOptions((leadsRes.data as any[]).map(l => l.name))
      if (foldersRes.data && foldersRes.data.length > 0) {
        setFoldersOptions(foldersRes.data as Folder[])
      } else {
        setFoldersOptions([])
      }
    } catch (err) {
      console.error('Error fetching filter options in context:', err)
    }
  }

  const fetchStudents = async (force = false) => {
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

  // Pre-fetch students and options once on mount of the dashboard provider
  useEffect(() => {
    fetchStudents()
    fetchFilterOptions()
  }, [])

  return (
    <StudentDashboardContext.Provider value={{
      searchQuery,
      setSearchQuery,
      isAddStudentModalOpen,
      setIsAddStudentModalOpen,
      isFilterPanelOpen,
      setIsFilterPanelOpen,
      isExcelModalOpen,
      setIsExcelModalOpen,
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
      resetAllFilters,
      tariffOptions,
      setTariffOptions,
      levelOptions,
      setLevelOptions,
      groupOptions,
      setGroupOptions,
      leadByOptions,
      setLeadByOptions,
      customTagsRegistry,
      setCustomTagsRegistry,
      foldersOptions,
      setFoldersOptions,
      activeFolder,
      setActiveFolder,
      fetchFilterOptions
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
