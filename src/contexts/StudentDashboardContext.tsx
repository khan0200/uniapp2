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
  tariffPrices: Record<string, number>
  setTariffPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>
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
  officeOptions: string[]
  setOfficeOptions: React.Dispatch<React.SetStateAction<string[]>>
  paymentMethodOptions: string[]
  setPaymentMethodOptions: React.Dispatch<React.SetStateAction<string[]>>
  paymentReceiverOptions: string[]
  setPaymentReceiverOptions: React.Dispatch<React.SetStateAction<string[]>>
  paymentNotePills: string[]
  setPaymentNotePills: React.Dispatch<React.SetStateAction<string[]>>
  universityStatusOptions: { name: string; colorClass: string }[]
  setUniversityStatusOptions: React.Dispatch<React.SetStateAction<{ name: string; colorClass: string }[]>>
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

  // Hoisted filter state values
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])
  const [selectedScores, setSelectedScores] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter option arrays fetched from DB
  const [tariffOptions, setTariffOptions] = useState<string[]>(['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'])
  const [tariffPrices, setTariffPrices] = useState<Record<string, number>>({
    'STANDART': 13000000,
    'PREMIUM': 32500000,
    'VISA PLUS': 65000000,
    'E-VISA (TIL SERTIFIKATISIZ)': 24000000,
    'E-VISA (TIL SERTIFIKATLI)': 16000000,
    'REGIONAL VISA': 24000000,
    'ZERO RISK': 18500000,
    'E-VISA': 2000000,
  })
  const [levelOptions, setLevelOptions] = useState<string[]>(['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'])
  const [groupOptions, setGroupOptions] = useState<string[]>([])
  const [leadByOptions, setLeadByOptions] = useState<string[]>([])
  const [customTagsRegistry, setCustomTagsRegistry] = useState<CustomTag[]>([])
  const [foldersOptions, setFoldersOptions] = useState<Folder[]>([])
  const [officeOptions, setOfficeOptions] = useState<string[]>(['ANDIJON OFFIS', 'TOSHKENT OFFIS'])
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<string[]>(['Karta J.A', 'Karta Abdulaziz', 'Naqd', 'Karta M.A', 'Bank', 'Discount'])
  const [paymentReceiverOptions, setPaymentReceiverOptions] = useState<string[]>(['ABDULAZIZ', 'MUSLIHIDDIN', 'BAXTIYOR', 'MUHAMMADALI', 'JASUR', 'ADMIN', 'Discount'])
  const [paymentNotePills, setPaymentNotePills] = useState<string[]>(['Shartnoma uchun', 'Qarz', 'Elchixona uchun', 'Appfee', 'DISCOUNT'])
  const [universityStatusOptions, setUniversityStatusOptions] = useState<{ name: string; colorClass: string }[]>([
    { name: 'Chosen', colorClass: 'text-blue-500' },
    { name: 'Applying', colorClass: 'text-amber-500' },
    { name: 'Applied', colorClass: 'text-amber-500' },
    { name: 'Accepted', colorClass: 'text-emerald-500' },
    { name: 'Failed', colorClass: 'text-rose-500' }
  ])
  const [activeFolder, setActiveFolder] = useState<string>('all')

  const scrollPositionRef = useRef(0)
  const setScrollPosition = (pos: number) => {
    scrollPositionRef.current = pos
  }
  const getScrollPosition = () => scrollPositionRef.current

  const isHydratedRef = useRef(false)

  // Load selected filters from sessionStorage on mount (to avoid SSR/hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadSession = <T,>(key: string, setter: (val: T) => void) => {
        const saved = sessionStorage.getItem(key)
        if (saved) {
          try {
            setter(JSON.parse(saved))
          } catch (e) {
            console.error(`Failed to parse sessionStorage for ${key}`, e)
          }
        }
      }
      loadSession('selectedTariffs', setSelectedTariffs)
      loadSession('selectedLevels', setSelectedLevels)
      loadSession('selectedGroups', setSelectedGroups)
      loadSession('selectedCerts', setSelectedCerts)
      loadSession('selectedScores', setSelectedScores)
      loadSession('selectedTags', setSelectedTags)
      loadSession('selectedLeads', setSelectedLeads)
      loadSession('activeFolder', setActiveFolder)
      
      isHydratedRef.current = true
    }
  }, [])

  // Save selected filters to sessionStorage whenever they change (only after hydration)
  useEffect(() => {
    if (typeof window !== 'undefined' && isHydratedRef.current) {
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
      const [
        tariffsRes,
        levelsRes,
        groupsRes,
        leadsRes,
        foldersRes,
        officesRes,
        methodsRes,
        receiversRes,
        notesRes,
        statusesRes
      ] = await Promise.all([
        supabase.from('tariff_options').select('name, price'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name'),
        supabase.from('lead_sources').select('name'),
        supabase.from('folders').select('id, name'),
        supabase.from('offices').select('name').order('name'),
        supabase.from('payment_methods').select('name').order('name'),
        supabase.from('payment_receivers').select('name').order('name'),
        supabase.from('payment_note_templates').select('name').order('name'),
        supabase.from('university_statuses').select('name, color_class').order('name')
      ])
 
      if (tariffsRes.data && tariffsRes.data.length > 0) {
        setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
        const priceMap: Record<string, number> = {}
        ;(tariffsRes.data as any[]).forEach(t => {
          priceMap[t.name] = Number(t.price) || 0
        })
        setTariffPrices(prev => ({ ...prev, ...priceMap }))
      }
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
      if (leadsRes.data && leadsRes.data.length > 0) setLeadByOptions((leadsRes.data as any[]).map(l => l.name))
      let folders = (foldersRes.data || []) as Folder[]
      const hasKdb = folders.some(f => f.name.toUpperCase() === 'KDB')
      if (!hasKdb) {
        try {
          const { data: newFolder, error: insertErr } = await (supabase
            .from('folders') as any)
            .insert({ name: 'KDB' })
            .select('id, name')
            .single()
          if (newFolder) {
            folders = [...folders, newFolder]
          } else if (insertErr) {
            console.warn('Failed to auto-create KDB folder:', insertErr)
          }
        } catch (err) {
          console.warn('Error auto-creating KDB folder:', err)
        }
      }
      setFoldersOptions(folders)
      if (officesRes.data && officesRes.data.length > 0) setOfficeOptions((officesRes.data as any[]).map(o => o.name))
      if (methodsRes.data && methodsRes.data.length > 0) setPaymentMethodOptions((methodsRes.data as any[]).map(m => m.name))
      if (receiversRes.data && receiversRes.data.length > 0) setPaymentReceiverOptions((receiversRes.data as any[]).map(r => r.name))
      if (notesRes.data && notesRes.data.length > 0) setPaymentNotePills((notesRes.data as any[]).map(n => n.name))
      if (statusesRes.data && statusesRes.data.length > 0) {
        setUniversityStatusOptions((statusesRes.data as any[]).map(s => ({ name: s.name, colorClass: s.color_class })))
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
      tariffPrices,
      setTariffPrices,
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
      officeOptions,
      setOfficeOptions,
      paymentMethodOptions,
      setPaymentMethodOptions,
      paymentReceiverOptions,
      setPaymentReceiverOptions,
      paymentNotePills,
      setPaymentNotePills,
      universityStatusOptions,
      setUniversityStatusOptions,
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
