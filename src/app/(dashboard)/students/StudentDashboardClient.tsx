'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Filter, Users, X, Loader2, Search, AlertCircle, CheckCircle2, 
  Building2, User, Landmark, Tag, Layers, Award, Bookmark, UserCheck, 
  FileSpreadsheet, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GraduationCap, Hourglass, CheckSquare, 
  MessageSquare, Sparkles, Copy, RefreshCw, Trash2, HelpCircle, Pencil, Hash
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff, type StudentLanguageCertificate } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { motion, AnimatePresence } from 'framer-motion'

export const ROW_COLOR_MAP: Record<string, { bg: string; ball: string; name: string }> = {
  DARK_BLUE: { bg: 'rgba(30, 58, 138, 0.22)', ball: '#1E3A8A', name: 'Dark Blue' },
  DARK_GREEN: { bg: 'rgba(22, 101, 52, 0.22)', ball: '#166534', name: 'Dark Green' },
  DARK_RED: { bg: 'rgba(153, 27, 27, 0.22)', ball: '#991B1B', name: 'Dark Red' },
  PURPLE: { bg: 'rgba(107, 33, 168, 0.22)', ball: '#6B21A8', name: 'Purple' },
  ORANGE: { bg: 'rgba(194, 65, 12, 0.22)', ball: '#C2410C', name: 'Orange' },
  TEAL: { bg: 'rgba(15, 118, 110, 0.22)', ball: '#0F766E', name: 'Teal' },
  BROWN: { bg: 'rgba(120, 53, 15, 0.22)', ball: '#78350F', name: 'Brown' },
  DARK_PINK: { bg: 'rgba(157, 23, 77, 0.22)', ball: '#9D174D', name: 'Dark Pink' },
  CYAN_DARK: { bg: 'rgba(0, 189, 189, 0.22)', ball: '#00bdbd', name: 'Cyan Dark' },
  MUSTARD: { bg: 'rgba(77, 124, 15, 0.22)', ball: '#4D7C0F', name: 'Mustard' },
  SLATE: { bg: 'rgba(51, 65, 85, 0.22)', ball: '#334155', name: 'Slate' },
  GREEN: { bg: 'rgba(34, 197, 94, 0.18)', ball: '#34c759', name: 'Green' },
  BLUE: { bg: 'rgba(0, 122, 255, 0.18)', ball: '#007aff', name: 'Blue' },
  YELLOW: { bg: 'rgba(255, 159, 10, 0.18)', ball: '#ff9f0a', name: 'Yellow' }
}

export const CUSTOM_TAG_EMOJIS = [
  '🏷️','📌','⭐','🎯','🔥','✅','❌','⏳','🔄','💡',
  '📞','📧','💬','📱','🤝','📲','📣','📢','🔔','🚨',
  '📄','📋','🗂️','📁','📝','🧾','📃','🗃️','📎','🗒️',
  '💰','💳','🏦','💵','💸','🤑','💹','📈','📉','🏧',
  '🎓','📚','📖','🏫','✏️','🖊️','📐','🔬','🖥️','💻',
  '✈️','🛂','🌐','🏠','🗓️','📅','🕐','🗺️','🌍','🏙️',
  '🔴','🟡','🟢','🔵','🟣','🟠','⚪','⚫','🟤','🔶',
  '🔑','🔒','📊','🚀','🏆','👤','👥','🤖','⚙️','🛠️'
]

export interface CustomTag {
  name: string
  icon: string
}

// Alphanumeric sorting logic matching legacy compareStudentIds helper
const compareStudentIds = (a: Student, b: Student, order: 'asc' | 'desc' = 'asc') => {
  const idA = a.id || ""
  const idB = b.id || ""

  const parseId = (idStr: string) => {
    const str = idStr.trim()
    const match = str.match(/^([A-Za-z\s_-]*)(\d*)$/)
    if (match) {
      return {
        prefix: match[1] || "",
        num: match[2] ? parseInt(match[2], 10) : null
      }
    }
    return { prefix: str, num: null }
  }

  const valA = parseId(idA)
  const valB = parseId(idB)

  const prefixComp = valA.prefix.localeCompare(valB.prefix, undefined, { sensitivity: 'base' })
  if (prefixComp !== 0) {
    return order === 'asc' ? prefixComp : -prefixComp
  }

  if (valA.num !== null && valB.num !== null) {
    return order === 'asc' ? valA.num - valB.num : valB.num - valA.num
  } else if (valA.num !== null) {
    return order === 'asc' ? 1 : -1
  } else if (valB.num !== null) {
    return order === 'asc' ? -1 : 1
  }

  return order === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA)
}

export function StudentDashboardClient() {
  const router = useRouter()
  const supabase = createClient()

  // State for students list
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Context shared state
  const { searchQuery, isAddStudentModalOpen: isModalOpen, setIsAddStudentModalOpen: setIsModalOpen } = useStudentDashboard()

  // Search & Filters state
  const [tariffFilter, setTariffFilter] = useState<StudentTariff | 'ALL' | 'NO_TARIFF'>('ALL')
  const [levelFilter, setLevelFilter] = useState<StudentLevel | 'ALL' | 'NO_LEVEL' | 'DELETED'>('ALL')
  const [groupFilter, setGroupFilter] = useState<string | 'ALL'>('ALL')
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])
  const [selectedScores, setSelectedScores] = useState<string[]>([])
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false)
  const [isScoreDropdownOpen, setIsScoreDropdownOpen] = useState(false)

  const certOptions = ['NO CERTIFICATE', 'EXPECTED', 'TOPIK', 'SKA', 'IELTS', 'TOEFL', 'SAT', 'CEFR']

  const handleToggleCert = (cert: string) => {
    setSelectedCerts(prev =>
      prev.includes(cert)
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    )
  }

  const handleToggleAllCerts = () => {
    setSelectedCerts(prev =>
      prev.length === certOptions.length ? [] : [...certOptions]
    )
  }

  const showScoreFilter = selectedCerts.length === 1 && (selectedCerts[0] === 'TOPIK' || selectedCerts[0] === 'IELTS')
  const activeCertForScore = showScoreFilter ? selectedCerts[0] : null

  const getScoreOptions = () => {
    if (activeCertForScore === 'TOPIK') {
      return ['EXPECTED', '1', '2', '3', '4', '5', '6']
    }
    if (activeCertForScore === 'IELTS') {
      return ['EXPECTED', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']
    }
    return []
  }

  const scoreOptions = getScoreOptions()

  const handleToggleScore = (score: string) => {
    setSelectedScores(prev =>
      prev.includes(score)
        ? prev.filter(s => s !== score)
        : [...prev, score]
    )
  }

  const handleToggleAllScores = () => {
    setSelectedScores(prev =>
      prev.length === scoreOptions.length ? [] : [...scoreOptions]
    )
  }

  const getScoreLabel = (score: string) => {
    if (score === 'EXPECTED') return 'Expected'
    if (activeCertForScore === 'TOPIK') return `TOPIK ${score}`
    if (activeCertForScore === 'IELTS') return `IELTS ${score}`
    return score
  }

  // Clear score filter when active certificate changes
  useEffect(() => {
    setSelectedScores([])
  }, [activeCertForScore])
  const [tagFilter, setTagFilter] = useState<string | 'ALL'>('ALL')
  const [leadByFilter, setLeadByFilter] = useState<string | 'ALL'>('ALL')

  // Modal form state
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState<boolean>(false)

  // Form inputs
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [office, setOffice] = useState<'ANDIJON OFFIS' | 'TOSHKENT OFFIS'>('ANDIJON OFFIS')

  // Actions Popover State
  const [popoverAnchor, setPopoverAnchor] = useState<{ studentId: string; rect: DOMRect } | null>(null)
  const [customTagsRegistry, setCustomTagsRegistry] = useState<CustomTag[]>([])
  const [newCustomTagName, setNewCustomTagName] = useState('')
  const [newCustomTagEmoji, setNewCustomTagEmoji] = useState('🏷️')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<{ originalName: string; newName: string; emoji: string } | null>(null)



  // Fetch students on mount
  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setStudents(data || [])
    } catch (err: any) {
      console.error('Error fetching students:', err)
      setError(err.message || 'Failed to load students. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Dynamic Option States from Settings
  const [tariffOptions, setTariffOptions] = useState<string[]>(['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'])
  const [levelOptions, setLevelOptions] = useState<string[]>(['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'])
  const [groupOptions, setGroupOptions] = useState<string[]>([])
  const [leadByOptions, setLeadByOptions] = useState<string[]>([])

  const fetchFilterOptions = async () => {
    try {
      const [tariffsRes, levelsRes, groupsRes, leadsRes] = await Promise.all([
        supabase.from('tariff_options').select('name'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name'),
        supabase.from('lead_sources').select('name')
      ])

      if (tariffsRes.data && tariffsRes.data.length > 0) setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
      if (leadsRes.data && leadsRes.data.length > 0) setLeadByOptions((leadsRes.data as any[]).map(l => l.name))
    } catch (err) {
      console.error('Error fetching filter options in dashboard:', err)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('customTagsRegistry')
    if (saved) {
      try {
        setCustomTagsRegistry(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse customTagsRegistry:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (students.length === 0) return
    const allTags = Array.from(new Set(students.flatMap(s => s.task_tags || []).filter(Boolean))) as string[]
    const predefined = ['Call', 'Apply', 'Documents', 'Payment']
    const customTags = allTags.filter(t => !predefined.includes(t))

    setCustomTagsRegistry(prev => {
      let changed = false
      const updated = [...prev]
      customTags.forEach(tag => {
        if (!updated.some(entry => entry.name === tag)) {
          updated.push({ name: tag, icon: '🏷️' })
          changed = true
        }
      })
      if (changed) {
        localStorage.setItem('customTagsRegistry', JSON.stringify(updated))
        return updated
      }
      return prev
    })
  }, [students])

  // Reset pagination when search query or filter values change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, tariffFilter, levelFilter, groupFilter, selectedCerts, selectedScores, tagFilter, leadByFilter])

  const getCustomTagIcon = (tagName: string) => {
    if (tagName === 'Call') return '📞'
    if (tagName === 'Apply') return '🎓'
    if (tagName === 'Documents') return '📄'
    if (tagName === 'Payment') return '💰'
    const entry = customTagsRegistry.find(t => t.name === tagName)
    return entry ? (entry.icon || '🏷️') : '🏷️'
  }

  const handleUpdateColor = async (studentId: string, color: string | null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, row_color: color } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ row_color: color })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student color:', updateError)
      fetchStudents()
    }
  }

  const handleToggleTag = async (studentId: string, tagName: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    const currentTags = student.task_tags || []
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName]
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, task_tags: newTags } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ task_tags: newTags })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student tags:', updateError)
      fetchStudents()
    }
  }

  const handleAddCustomTag = async (studentId: string) => {
    if (!newCustomTagName.trim()) return
    const tagName = newCustomTagName.trim()
    const student = students.find(s => s.id === studentId)
    if (!student) return
    const currentTags = student.task_tags || []
    const newTags = currentTags.includes(tagName) ? currentTags : [...currentTags, tagName]
    if (!customTagsRegistry.some(r => r.name === tagName)) {
      const updatedRegistry = [...customTagsRegistry, { name: tagName, icon: newCustomTagEmoji }]
      setCustomTagsRegistry(updatedRegistry)
      localStorage.setItem('customTagsRegistry', JSON.stringify(updatedRegistry))
    }
    setNewCustomTagName('')
    setNewCustomTagEmoji('🏷️')
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, task_tags: newTags } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ task_tags: newTags })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student tags:', updateError)
      fetchStudents()
    }
  }

  const handleEditCustomTag = async (studentId: string, originalName: string, newName: string, emoji: string) => {
    if (!newName.trim()) return
    const cleanedNewName = newName.trim()
    const updatedRegistry = customTagsRegistry.map(t => 
      t.name === originalName ? { name: cleanedNewName, icon: emoji } : t
    )
    setCustomTagsRegistry(updatedRegistry)
    localStorage.setItem('customTagsRegistry', JSON.stringify(updatedRegistry))
    setStudents(prev => prev.map(s => {
      if (s.task_tags && s.task_tags.includes(originalName)) {
        return {
          ...s,
          task_tags: s.task_tags.map(t => t === originalName ? cleanedNewName : t)
        }
      }
      return s
    }))
    const affectedStudents = students.filter(s => s.task_tags && s.task_tags.includes(originalName))
    for (const s of affectedStudents) {
      const updatedTags = s.task_tags.map(t => t === originalName ? cleanedNewName : t)
      const { error: updateError } = await (supabase
        .from('students') as any)
        .update({ task_tags: updatedTags })
        .eq('id', s.id)
      if (updateError) {
        console.error(`Failed to rename tag for student ${s.id}:`, updateError)
      }
    }
    setEditingTag(null)
  }

  const handleDeleteCustomTagGlobally = async (tagName: string) => {
    if (!confirm(`Are you sure you want to delete tag "${tagName}" globally? It will be removed from all students.`)) return
    const updatedRegistry = customTagsRegistry.filter(t => t.name !== tagName)
    setCustomTagsRegistry(updatedRegistry)
    localStorage.setItem('customTagsRegistry', JSON.stringify(updatedRegistry))
    setStudents(prev => prev.map(s => {
      if (s.task_tags && s.task_tags.includes(tagName)) {
        return {
          ...s,
          task_tags: s.task_tags.filter(t => t !== tagName)
        }
      }
      return s
    }))
    const affectedStudents = students.filter(s => s.task_tags && s.task_tags.includes(tagName))
    for (const s of affectedStudents) {
      const updatedTags = s.task_tags.filter(t => t !== tagName)
      const { error: updateError } = await (supabase
        .from('students') as any)
        .update({ task_tags: updatedTags })
        .eq('id', s.id)
      if (updateError) {
        console.error(`Failed to remove deleted tag from student ${s.id}:`, updateError)
      }
    }
  }

  const handleClearFlagsAndColor = async (studentId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, row_color: null, task_tags: [] } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ row_color: null, task_tags: [] })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error clearing flags and color:', updateError)
      fetchStudents()
    }
  }

  // Handle student creation
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)
    setModalSuccess(false)

    // Basic Client-Side Validation
    if (!studentId.trim()) {
      setModalError('Student ID is required.')
      setSubmitting(false)
      return
    }
    if (!fullName.trim()) {
      setModalError('Student name is required.')
      setSubmitting(false)
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('students')
        .insert({
          id: studentId.trim().toUpperCase(),
          full_name: fullName.trim().toUpperCase(),
          office: office,
          // Explicitly set default fields to avoid RLS/constraint issue
          university_1_status: 'Chosen',
          balance: 0,
          discount: 0,
          pick_needed: [] as string[],
          has_mc: false,
          bc_hand_count: 0,
          mc_hand_count: 0,
          apos_hand_count: 0,
          pic_hand_count: 0,
          is_deleted: false,
          task_tags: [] as string[],
          // Explicitly set check-constrained fields to null to prevent empty string default check failures
          gender: null,
          birthday: null,
          phone1: null,
          level: null,
          level2: null,
          tariff: null,
          language_certificate: null,
          language_certificate_2: null,
          language_certificate_3: null
        } as any)

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`Student ID "${studentId}" is already taken. Please choose another.`)
        }
        throw insertError
      }

      setModalSuccess(true)
      setStudentId('')
      setFullName('')
      setOffice('ANDIJON OFFIS')

      await fetchStudents()

      setTimeout(() => {
        setIsModalOpen(false)
        setModalSuccess(false)
      }, 1500)

    } catch (err: any) {
      console.error('Error inserting student:', err)
      setModalError(err.message || 'Failed to create student.')
    } finally {
      setSubmitting(false)
    }
  }

  // Extract dynamic filter options from fetched students dataset
  const uniqueGroups = Array.from(new Set(students.map(s => s.student_group).filter(Boolean))) as string[]
  const uniqueLeadBys = Array.from(new Set(students.map(s => s.lead_by).filter(Boolean))) as string[]
  const uniqueTags = Array.from(new Set(students.flatMap(s => s.task_tags || []).filter(Boolean))) as string[]

  // Filter students based on all filter parameters
  const filteredStudents = students.filter(student => {
    // 1. Deleted Students handling
    const isDeletedFilterActive = (levelFilter as any) === 'DELETED'
    if (isDeletedFilterActive) {
      if (student.is_deleted !== true) return false
    } else {
      if (student.is_deleted === true) return false
    }

    // 2. Search query matching
    const matchesSearch = 
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.phone1 && student.phone1.includes(searchQuery)) ||
      (student.phone2 && student.phone2.includes(searchQuery))
    
    // 3. Tariff filter (handling NO_TARIFF)
    let matchesTariff = false
    if (tariffFilter === 'ALL') {
      matchesTariff = true
    } else if ((tariffFilter as any) === 'NO_TARIFF') {
      matchesTariff = !student.tariff || (student.tariff as any) === ''
    } else {
      matchesTariff = student.tariff === (tariffFilter as any)
    }

    // 4. Level filter (handling NO_LEVEL and DELETED)
    let matchesLevel = false
    if (levelFilter === 'ALL' || (levelFilter as any) === 'DELETED') {
      matchesLevel = true
    } else if ((levelFilter as any) === 'NO_LEVEL') {
      matchesLevel = (!student.level || (student.level as any) === '') && (!student.level2 || (student.level2 as any) === '')
    } else {
      matchesLevel = student.level === (levelFilter as any) || student.level2 === (levelFilter as any)
    }

    // 5. Group filter (handling NO_GROUP)
    let matchesGroup = false
    if (groupFilter === 'ALL') {
      matchesGroup = true
    } else if (groupFilter === 'NO_GROUP') {
      matchesGroup = !student.student_group || student.student_group === ''
    } else {
      matchesGroup = student.student_group === groupFilter
    }
    
    // 6. Language Certificate filter (handling NO CERTIFICATE / nulls & multi-select)
    let matchesCertificate = false
    if (selectedCerts.length === 0) {
      matchesCertificate = true
    } else {
      if (selectedCerts.includes("NO CERTIFICATE")) {
        const hasNoCert = !student.language_certificate || student.language_certificate === "NO CERTIFICATE"
        if (hasNoCert) matchesCertificate = true
      }
      if (selectedCerts.includes("EXPECTED")) {
        const hasExpected = (student.certificate_score && student.certificate_score.toUpperCase() === "EXPECTED") ||
                            (student.certificate_score_2 && student.certificate_score_2.toUpperCase() === "EXPECTED") ||
                            (student.certificate_score_3 && student.certificate_score_3.toUpperCase() === "EXPECTED")
        if (hasExpected) matchesCertificate = true
      }
      const hasAnySelected = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
        .some(cert => cert && cert !== "NO CERTIFICATE" && selectedCerts.includes(cert))
      if (hasAnySelected) matchesCertificate = true
    }

    // If a specific score sub-filter is also active, additionally check score
    if (matchesCertificate && selectedScores.length > 0 && selectedCerts.length === 1) {
      const cert = selectedCerts[0] || ""
      const scores = [student.certificate_score, student.certificate_score_2, student.certificate_score_3]
      const certs  = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
      matchesCertificate = certs.some((c, i) => {
        if (!c || c === "NO CERTIFICATE") return false
        if (c.toUpperCase() !== cert.toUpperCase()) return false
        const score = (scores[i] || "").trim().toUpperCase()
        return selectedScores.some(f => f.toUpperCase() === score)
      })
    }

    const matchesTag = tagFilter === 'ALL' || (student.task_tags && student.task_tags.includes(tagFilter))
    const matchesLeadBy = leadByFilter === 'ALL' || student.lead_by === leadByFilter

    return matchesSearch && matchesTariff && matchesLevel && matchesGroup && matchesCertificate && matchesTag && matchesLeadBy
  })

  // Sorting logic matching legacy roster
  const sortedStudents = [...filteredStudents].sort((a, b) => compareStudentIds(a, b, sortOrder))

  // Pagination logic
  const pageSize = 30
  const totalPages = Math.ceil(sortedStudents.length / pageSize)
  const paginatedStudents = sortedStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'Student ID', 'Full Name', 'Passport', 'Gender', 'Birthday', 
      'Phone 1', 'Phone 2', 'Email', 'Address', 'Level', 'Level 2', 
      'Educational Background', 'Tariff', 'Certificate 1', 'Score 1',
      'Certificate 2', 'Score 2', 'Certificate 3', 'Score 3',
      'University 1', 'Status 1', 'University 2', 'Status 2', 'University 3', 'Status 3',
      'Balance', 'Discount', 'Group', 'Lead By', 'Office', 'Created At'
    ]

    const rows = filteredStudents.map(s => [
      s.id, s.full_name, s.passport || '', s.gender || '', s.birthday || '',
      s.phone1 || '', s.phone2 || '', s.email || '', s.address || '', s.level || '', s.level2 || '',
      s.educational_background || '', s.tariff || '', s.language_certificate || '', s.certificate_score || '',
      s.language_certificate_2 || '', s.certificate_score_2 || '', s.language_certificate_3 || '', s.certificate_score_3 || '',
      s.university_1 || '', s.university_1_status || '', s.university_2 || '', s.university_2_status || '', s.university_3 || '', s.university_3_status || '',
      s.balance, s.discount, s.student_group || '', s.lead_by || '', s.office || '', s.created_at
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const strVal = String(val).replace(/"/g, '""')
        return strVal.includes(',') || strVal.includes('\n') || strVal.includes('"') ? `"${strVal}"` : strVal
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }



  // Row background color selector matching visual row highlights
  const getRowBgStyleAndClass = (student: Student) => {
    if (!student.row_color) {
      return { 
        className: 'bg-[var(--surface)] hover:bg-[var(--border-subtle)]', 
        style: {} 
      }
    }

    const colorKey = student.row_color.toUpperCase()
    const mapping = ROW_COLOR_MAP[colorKey]

    if (mapping) {
      if (colorKey === 'GREEN' || colorKey === 'BLUE' || colorKey === 'YELLOW') {
        return { 
          className: (colorKey === 'GREEN'
            ? 'bg-[#e2f0d9]/60 hover:bg-[#d6e9cb] dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30'
            : colorKey === 'BLUE'
            ? 'bg-[#deebf7]/60 hover:bg-[#c6dbef] dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
            : 'bg-[#fff2cc]/60 hover:bg-[#ffe599] dark:bg-amber-950/20 dark:hover:bg-amber-950/30'),
          style: { borderLeft: `4px solid ${mapping.ball}` } 
        }
      }
      
      return { 
        className: 'hover:brightness-95 dark:hover:brightness-110', 
        style: { 
          backgroundColor: mapping.bg,
          borderLeft: `4px solid ${mapping.ball}`
        } 
      }
    }

    return { 
      className: 'bg-[var(--surface)] hover:bg-[var(--border-subtle)]', 
      style: {} 
    }
  }

  // Level Badge style selector
  const getLevelBadgeStyles = (level: StudentLevel) => {
    switch (level) {
      case 'MASTER NO CERTIFICATE':
        return 'bg-[#00875a] text-white'
      case 'COLLEGE':
        return 'bg-[#6554c0] text-white'
      case 'BACHELOR':
        return 'bg-[#0052cc] text-white'
      case 'MASTERS':
        return 'bg-[#36b37e] text-white'
      case 'LANGUAGE COURSE':
        return 'bg-[#ffab00] text-gray-900'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // Render language certificate pill in dual-pill format matching mockup
  const renderCertificatePills = (student: Student) => {
    const certs = [
      { type: student.language_certificate, score: student.certificate_score, color: 'bg-[#de350b]' },
      { type: student.language_certificate_2, score: student.certificate_score_2, color: 'bg-[#00b8d9]' },
      { type: student.language_certificate_3, score: student.certificate_score_3, color: 'bg-[#ff5630]' }
    ].filter(c => c.type && c.type !== 'NO CERTIFICATE')

    if (certs.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 mt-1.5">
        {certs.map((c, idx) => (
          <div key={idx} className="inline-flex items-center text-[10px] font-bold tracking-tight rounded-[4px] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <span className={`${c.color} text-white px-1.5 py-0.5 uppercase`}>{c.type}</span>
            <span className="bg-[#0052cc] text-white px-1.5 py-0.5">{c.score || '—'}</span>
          </div>
        ))}
      </div>
    )
  }

  // Render university stack
  const renderUniversities = (student: Student) => {
    const unis = [student.university_1, student.university_2, student.university_3].filter(Boolean)
    if (unis.length === 0) return <span className="text-gray-400 dark:text-gray-600">—</span>

    return (
      <ul className="space-y-1 text-xs text-[var(--foreground)] leading-relaxed list-none pl-0 font-medium whitespace-nowrap">
        {unis.map((uni, idx) => (
          <li key={idx} className="flex items-start gap-1">
            <span className="text-[var(--foreground-muted)] select-none">•</span>
            <span>{uni}</span>
          </li>
        ))}
      </ul>
    )
  }

  // Render Actions column circular indicators
  const renderActionCircle = (student: Student) => {
    const isCompleted = student.university_1_status === 'Accepted' || student.university_1_status === 'Finished'
    return (
      <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
        isCompleted 
          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' 
          : 'border-gray-300 dark:border-gray-600 bg-transparent hover:border-gray-400'
      }`}>
        {isCompleted && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    )
  }

  // Render Actions column status icon
  const renderActionIcon = (student: Student) => {
    if (student.university_1_status === 'Accepted' || student.university_1_status === 'Finished') {
      return <CheckSquare className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
    }
    if (student.university_1_status === 'Admitted' || student.university_1_status === 'Graduated') {
      return <GraduationCap className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
    }
    if (student.university_1_status === 'Chosen' || student.university_1_status === 'Applying') {
      return <Hourglass className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400 animate-pulse" />
    }
    if (student.notes?.toLowerCase().includes('phone') || student.notes?.toLowerCase().includes('call')) {
      return <MessageSquare className="h-4.5 w-4.5 text-sky-500 dark:text-sky-400" />
    }
    return null
  }

  // Helper to format currency values
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + ' UZS'
  }



  return (
    <PageShell>
      {/* Filters Popover Overlay Backdrop */}
      {(isCertDropdownOpen || isScoreDropdownOpen) && (
        <div 
          className="fixed inset-0 z-30 bg-transparent cursor-default" 
          onClick={() => {
            setIsCertDropdownOpen(false)
            setIsScoreDropdownOpen(false)
          }}
        />
      )}

      {/* Redesigned Filters Card Section */}
      <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-wrap lg:flex-nowrap gap-3 items-center justify-between">
        <div className={`grid grid-cols-2 md:grid-cols-3 ${showScoreFilter ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-3 w-full`}>
          {/* Tariffs Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={tariffFilter}
              onChange={(e) => setTariffFilter(e.target.value as any)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Tariffs</option>
              <option value="NO_TARIFF">No Tariff</option>
              {tariffOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

          {/* Levels Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="NO_LEVEL">No Level</option>
              <option value="DELETED">Deleted Students</option>
              {levelOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

          {/* Groups Filter */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              <option value="NO_GROUP">No Group</option>
              {uniqueGroups.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

          {/* Certificates Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsCertDropdownOpen(prev => !prev)
                setIsScoreDropdownOpen(false)
              }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium cursor-pointer flex items-center justify-between text-left h-[34px] relative animate-none"
            >
              <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
              <span className="truncate select-none pr-1">
                {selectedCerts.length === 0
                  ? 'All Certificates'
                  : selectedCerts.length === certOptions.length
                  ? 'All Certificates'
                  : selectedCerts.join(', ')}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
            </button>

            {isCertDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllCerts}
                >
                  <input
                    type="checkbox"
                    checked={selectedCerts.length === certOptions.length}
                    readOnly
                    className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                {certOptions.map(cert => {
                  const isChecked = selectedCerts.includes(cert)
                  return (
                    <div
                      key={cert}
                      onClick={() => handleToggleCert(cert)}
                      className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{cert}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dynamic Score Filter (shown for TOPIK/IELTS) */}
          {showScoreFilter && (
            <div className="relative animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsScoreDropdownOpen(prev => !prev)
                  setIsCertDropdownOpen(false)
                }}
                className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium cursor-pointer flex items-center justify-between text-left h-[34px] relative animate-none"
              >
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                <span className="truncate select-none pr-1">
                  {selectedScores.length === 0
                    ? 'All Scores'
                    : selectedScores.length === scoreOptions.length
                    ? 'All Scores'
                    : selectedScores.map(getScoreLabel).join(', ')}
                </span>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
              </button>

              {isScoreDropdownOpen && (
                <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                  <div 
                    className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                    onClick={handleToggleAllScores}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScores.length === scoreOptions.length}
                      readOnly
                      className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Select All</span>
                  </div>
                  <div className="h-px bg-[var(--border)] my-1" />
                  {scoreOptions.map(score => {
                    const isChecked = selectedScores.includes(score)
                    return (
                      <div
                        key={score}
                        onClick={() => handleToggleScore(score)}
                        className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{getScoreLabel(score)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tags Filter */}
          <div className="relative">
            <Bookmark className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Tasks/Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

          {/* Lead By Filter */}
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={leadByFilter}
              onChange={(e) => setLeadByFilter(e.target.value)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Lead By</option>
              {uniqueLeadBys.map(lead => (
                <option key={lead} value={lead}>{lead}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>
        </div>

        {/* Excel Export Button */}
        <button
          onClick={handleExportCSV}
          className="flex-shrink-0 flex items-center justify-center p-2 rounded-[var(--radius-md)] border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400 transition-all cursor-pointer shadow-sm select-none"
          title="Export Roster to Excel/CSV"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Roster Total Count */}
      <div className="mb-2 flex justify-between items-center text-xs text-[var(--foreground-muted)] italic px-1 font-medium">
        <div>
          {(searchQuery || tariffFilter !== 'ALL' || levelFilter !== 'ALL' || groupFilter !== 'ALL' || selectedCerts.length > 0 || selectedScores.length > 0 || tagFilter !== 'ALL' || leadByFilter !== 'ALL') && (
            <span>Found {filteredStudents.length} matching students</span>
          )}
        </div>
        <div className="text-right">
          Total {students.length} students
        </div>
      </div>

      {/* Main Table Display */}
      {loading ? (
        // Skeleton Loader
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="divide-y divide-[var(--border)] animate-pulse">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="p-5 flex justify-between items-center gap-6">
                <div className="flex gap-4 items-center flex-1">
                  <div className="h-6 w-9 bg-[var(--border-subtle)] rounded-[4px]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-[var(--border-subtle)] rounded" />
                    <div className="h-3 w-1/4 bg-[var(--border-subtle)] rounded" />
                  </div>
                </div>
                <div className="h-4 w-28 bg-[var(--border-subtle)] rounded" />
                <div className="h-4 w-20 bg-[var(--border-subtle)] rounded" />
                <div className="h-4 w-40 bg-[var(--border-subtle)] rounded" />
                <div className="h-5 w-5 bg-[var(--border-subtle)] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        // Error Display
        <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-sm)]">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">Failed to Load Students</h3>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{error}</p>
          <button
            onClick={fetchStudents}
            className="mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        // Empty State
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center shadow-[var(--shadow-sm)]">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Users className="h-8 w-8 text-[var(--accent)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            No students found
          </h3>
          <p className="mt-1.5 text-sm text-[var(--foreground-muted)] max-w-sm mx-auto">
            No students match your active search filters or table criteria.
          </p>
          {!searchQuery && tariffFilter === 'ALL' && levelFilter === 'ALL' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </button>
          )}
        </div>
      ) : (
        // Redesigned Students Data Table
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)] text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)] select-none">
                  <th 
                    className="px-6 py-3.5 w-24 cursor-pointer select-none hover:bg-[var(--surface-elevated)] transition-colors rounded-tl-[var(--radius-lg)]"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <span className="flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)]">
                      ID
                      {sortOrder === 'asc' ? (
                        <ChevronDown className="h-3 w-3 text-[var(--accent)]" />
                      ) : (
                        <ChevronUp className="h-3 w-3 text-[var(--accent)]" />
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-3.5">Full Name</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Level</th>
                  <th className="px-6 py-3.5">University</th>
                  <th className="px-6 py-3.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedStudents.map((student) => {
                  const bgObj = getRowBgStyleAndClass(student)
                  return (
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/students/${student.id}`)}
                      className={`cursor-pointer transition-colors text-sm text-[var(--foreground)] ${bgObj.className}`}
                      style={bgObj.style}
                    >
                      {/* ID Badge Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center w-10 h-6.5 text-[11px] font-bold bg-[#007aff] text-white rounded-[4px] shadow-sm select-all">
                          {student.id}
                        </div>
                      </td>

                      {/* Full Name & Tariff Info Column */}
                      <td className="px-6 py-4">
                        <div className="font-bold uppercase tracking-wide text-xs text-[var(--foreground)]">
                          {student.full_name}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)] font-semibold tracking-wider uppercase mt-1">
                          {student.tariff || 'NO TARIFF'} 
                          {student.language_certificate && student.language_certificate !== 'NO CERTIFICATE' 
                            ? ' (TIL SERTIFIKATLI)' 
                            : ' (TIL SERTIFIKATISIZ)'}
                        </div>
                      </td>

                      {/* Phone Numbers Column */}
                      <td className="px-6 py-4 font-mono text-xs text-[var(--foreground-muted)] whitespace-nowrap">
                        <div>{student.phone1 || '—'}</div>
                        {student.phone2 && <div className="mt-0.5">{student.phone2}</div>}
                      </td>

                      {/* Levels & Languages Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Level Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {student.level && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getLevelBadgeStyles(student.level)}`}>
                              {student.level}
                            </span>
                          )}
                          {student.level2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#ffab00] text-gray-900">
                              {student.level2}
                            </span>
                          )}
                        </div>
                        {/* Certificate Split Pills */}
                        {renderCertificatePills(student)}
                      </td>

                      {/* Universities List Column */}
                      <td className="px-6 py-4">
                        {renderUniversities(student)}
                      </td>

                      {/* Actions Column (Color Ball + Task Tags) */}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 select-none">
                          {/* Color Ball Wrapper */}
                          <div 
                            className="flex items-center justify-center w-6.5 h-6.5 rounded-full border cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm relative bg-[var(--surface-elevated)]"
                            style={{
                              borderColor: student.row_color ? ROW_COLOR_MAP[student.row_color.toUpperCase()]?.ball : 'var(--border)',
                            }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setPopoverAnchor({ studentId: student.id, rect })
                            }}
                          >
                            <div 
                              className="w-3.5 h-3.5 rounded-full transition-all"
                              style={{
                                backgroundColor: student.row_color ? ROW_COLOR_MAP[student.row_color.toUpperCase()]?.ball : 'transparent',
                                border: student.row_color ? 'none' : '2px dashed var(--foreground-subtle)',
                              }}
                            />
                          </div>

                          {/* Task Tags Container */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(student.task_tags || []).map((tag, tagIdx) => {
                              const icon = getCustomTagIcon(tag)
                              return (
                                <span 
                                  key={tagIdx} 
                                  className="inline-flex items-center justify-center w-6.5 h-6.5 text-[13px] bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[6px] shadow-sm"
                                  title={tag}
                                >
                                  {icon}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-6 py-4 select-none">
              <div className="text-xs text-[var(--foreground-muted)] font-medium">
                Showing <span className="font-semibold text-[var(--foreground)]">{Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}</span> to <span className="font-semibold text-[var(--foreground)]">{Math.min(filteredStudents.length, currentPage * pageSize)}</span> of <span className="font-semibold text-[var(--foreground)]">{filteredStudents.length}</span> students
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-xs font-semibold border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!submitting) setIsModalOpen(false)
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10"
            >
              {/* Close Button */}
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                Add New Student
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mb-5">
                Register a new student profile in the CRM system.
              </p>

              {/* Status Alerts */}
              {modalError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-sm text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{modalError}</p>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[var(--radius-md)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3.5 text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <p>Student successfully registered!</p>
                </div>
              )}

              {/* Add Student Form */}
              <form onSubmit={handleCreateStudent} className="space-y-4">
                {/* Student ID */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-1.5 flex items-center gap-1">
                    <Landmark className="h-3 w-3" />
                    Student ID
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting || modalSuccess}
                    placeholder="F999"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-all font-mono font-semibold"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-1.5 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting || modalSuccess}
                    placeholder="BAXTIYOR"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-all font-medium"
                  />
                </div>

                {/* Office Dropdown */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-1.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Office Branch
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={office}
                    onChange={(e) => setOffice(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm"
                  >
                    <option value="ANDIJON OFFIS">ANDIJON OFFIS</option>
                    <option value="TOSHKENT OFFIS">TOSHKENT OFFIS</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={submitting || modalSuccess}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || modalSuccess}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-[var(--radius-md)] transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.2)' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Student'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Actions Popover Overlay Backdrop */}
      {popoverAnchor && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => {
            setPopoverAnchor(null)
            setEditingTag(null)
            setIsEmojiPickerOpen(false)
          }}
        />
      )}

      {/* Actions Popover Panel */}
      {popoverAnchor && (() => {
        const student = students.find(s => s.id === popoverAnchor.studentId)
        if (!student) return null

        return (
          <div 
            className="absolute z-50 w-72 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-lg)] text-xs text-[var(--foreground)] flex flex-col gap-4 animate-in fade-in zoom-in duration-150"
            style={{
              top: `${popoverAnchor.rect.bottom + window.scrollY + 6}px`,
              left: `${Math.max(10, Math.min(window.innerWidth - 300, popoverAnchor.rect.left + window.scrollX - 120))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Select Color Section ───────────────────── */}
            <div>
              <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px] mb-2">
                Select Color
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(ROW_COLOR_MAP).map(([name, data]) => {
                  const isActive = student.row_color?.toUpperCase() === name
                  return (
                    <button
                      key={name}
                      onClick={() => handleUpdateColor(student.id, name)}
                      className={`w-6.5 h-6.5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                        isActive ? 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-black' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: data.ball }}
                      title={data.name}
                    />
                  )
                })}
                {/* Clear Color */}
                <button
                  onClick={() => handleUpdateColor(student.id, null)}
                  className="w-6.5 h-6.5 rounded-full border border-[var(--border)] cursor-pointer flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] text-[10px] font-bold"
                  title="Clear Color"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── Predefined Tasks Section ────────────────── */}
            <div>
              <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px] mb-2">
                Predefined Tasks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Call', icon: '📞' },
                  { name: 'Apply', icon: '🎓' },
                  { name: 'Documents', icon: '📄' },
                  { name: 'Payment', icon: '💰' }
                ].map((task) => {
                  const isActive = student.task_tags?.includes(task.name)
                  return (
                    <button
                      key={task.name}
                      onClick={() => handleToggleTag(student.id, task.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-semibold cursor-pointer transition-all hover:bg-[var(--border-subtle)] ${
                        isActive 
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]' 
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'
                      }`}
                    >
                      <span>{task.icon}</span>
                      <span>{task.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Custom Tags Section ────────────────────── */}
            <div>
              <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10px] mb-2">
                Custom Tags
              </div>

              {/* Tag editing modal/input inline */}
              {editingTag ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-2.5 flex flex-col gap-2 mb-3">
                  <div className="font-bold text-[9px] uppercase text-[var(--accent)]">Edit Custom Tag</div>
                  <div className="flex items-center gap-1.5">
                    {/* Emoji Select */}
                    <button
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="w-8 h-8 rounded border border-[var(--border)] bg-[var(--surface-elevated)] flex items-center justify-center text-base cursor-pointer hover:bg-[var(--border-subtle)]"
                    >
                      {editingTag.emoji}
                    </button>
                    {/* Tag Name Input */}
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] font-medium text-xs focus:outline-none"
                      value={editingTag.newName}
                      onChange={(e) => setEditingTag({ ...editingTag, newName: e.target.value })}
                    />
                  </div>
                  {/* Emoji Picker Grid */}
                  {isEmojiPickerOpen && (
                    <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-y-auto border border-[var(--border)] bg-[var(--surface-elevated)] rounded p-1.5">
                      {CUSTOM_TAG_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setEditingTag({ ...editingTag, emoji })
                            setIsEmojiPickerOpen(false)
                          }}
                          className="w-5.5 h-5.5 flex items-center justify-center text-xs rounded hover:bg-[var(--border-subtle)] cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingTag(null)}
                      className="px-2 py-1 text-[10px] font-semibold border border-[var(--border)] rounded hover:bg-[var(--border-subtle)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditCustomTag(student.id, editingTag.originalName, editingTag.newName, editingTag.emoji)}
                      className="px-2 py-1 text-[10px] font-semibold bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-28 overflow-y-auto pr-1">
                  {customTagsRegistry.length === 0 ? (
                    <div className="text-[10px] text-[var(--foreground-subtle)] italic py-1">
                      No custom tags registered. Type below to add.
                    </div>
                  ) : (
                    customTagsRegistry.map((tag) => {
                      const isActive = student.task_tags?.includes(tag.name)
                      return (
                        <div 
                          key={tag.name}
                          className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-[var(--radius-sm)] border text-xs font-semibold cursor-pointer select-none transition-all hover:bg-[var(--border-subtle)] ${
                            isActive 
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]' 
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'
                          }`}
                          onClick={() => handleToggleTag(student.id, tag.name)}
                        >
                          <span>{tag.icon}</span>
                          <span>{tag.name}</span>
                          <div className="flex items-center gap-0.5 ml-1 select-none">
                            {/* Pencil to rename */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingTag({ originalName: tag.name, newName: tag.name, emoji: tag.icon })
                                setIsEmojiPickerOpen(false)
                              }}
                              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-all cursor-pointer"
                              title="Edit Tag"
                            >
                              <Pencil className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                            </button>
                            {/* Trash to remove globally */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCustomTagGlobally(tag.name)
                              }}
                              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-all cursor-pointer text-red-500"
                              title="Delete tag globally"
                            >
                              <Trash2 className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Add Custom Tag Form */}
              {!editingTag && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Emoji selector dropdown */}
                    <button
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="w-7 h-7 shrink-0 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-sm cursor-pointer hover:bg-[var(--border-subtle)]"
                      title="Select Emoji"
                    >
                      {newCustomTagEmoji}
                    </button>
                    {/* Text Input */}
                    <input
                      type="text"
                      className="flex-1 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-semibold text-xs focus:outline-none placeholder-[var(--foreground-subtle)]"
                      placeholder="Add tag name..."
                      value={newCustomTagName}
                      onChange={(e) => setNewCustomTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCustomTag(student.id)
                      }}
                    />
                    {/* Save Button */}
                    <button
                      onClick={() => handleAddCustomTag(student.id)}
                      className="px-2 h-7 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold cursor-pointer flex items-center justify-center"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Emoji Picker Grid */}
                  {isEmojiPickerOpen && (
                    <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-y-auto border border-[var(--border)] bg-[var(--surface-elevated)] rounded p-1.5 shadow-[var(--shadow-sm)] animate-in fade-in zoom-in duration-100">
                      {CUSTOM_TAG_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewCustomTagEmoji(emoji)
                            setIsEmojiPickerOpen(false)
                          }}
                          className="w-5.5 h-5.5 flex items-center justify-center text-xs rounded hover:bg-[var(--border-subtle)] cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Clear All Flags Button ──────────────────── */}
            <div className="pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => handleClearFlagsAndColor(student.id)}
                className="w-full py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] font-bold transition-all text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Clear All Color & Tags
              </button>
            </div>
          </div>
        )
      })()}

    </PageShell>
  )
}
