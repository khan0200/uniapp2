'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { type Student } from '@/types/database'
import { syncMissingDocuments, isFieldFilled } from '@/lib/validation'
import { 
  Folder, ChevronDown, ChevronUp, CheckCircle2, ShieldAlert,
  X, Loader2, ArrowLeft, Plus, AlertCircle, Info, RefreshCw, Hash, Users, Bookmark, UserCheck, Layers, Tag,
  FileText, CheckSquare
} from 'lucide-react'

export function DocumentsClient() {
  const supabase = createClient()
  const { searchQuery } = useStudentDashboard()

  // States
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Selected filter states
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])
  const [selectedScores, setSelectedScores] = useState<string[]>([])
  const [selectedMissingDocs, setSelectedMissingDocs] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filter dropdown state
  const [isTariffDropdownOpen, setIsTariffDropdownOpen] = useState(false)
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false)
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false)
  const [isScoreDropdownOpen, setIsScoreDropdownOpen] = useState(false)
  const [isMissingDropdownOpen, setIsMissingDropdownOpen] = useState(false)

  // Selected student for details modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalUpdating, setModalUpdating] = useState(false)

  // Option lists
  const [tariffOptions, setTariffOptions] = useState<string[]>(['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'])
  const [levelOptions, setLevelOptions] = useState<string[]>(['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'])
  const [groupOptions, setGroupOptions] = useState<string[]>([])

  const certOptions = ['NO CERTIFICATE', 'EXPECTED', 'TOPIK', 'SKA', 'IELTS', 'TOEFL', 'SAT', 'CEFR']
  
  const pickNeededList = [
    "APOSTILLE", "BIRTH CERTIFICATE", "MARRIAGE CERTIFICATE", "AJRASHGANLIK",
    "Foreign passport", "Student ID", "Mother passport", "MOTHER DEATH",
    "Father passport", "FATHER DEATH", "IELTS", "TOEFL", "SKA", "TOPIK",
    "SAT", "CEFR", "3.5x4.5", "2 ta nomer", "Email", "Manzil", "Edu-Level", "FULL OK"
  ]

  // Fetch Students & Options
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
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const [tariffsRes, levelsRes, groupsRes] = await Promise.all([
        supabase.from('tariff_options').select('name'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name')
      ])

      if (tariffsRes.data && tariffsRes.data.length > 0) setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
    } catch (err) {
      console.error('Error fetching filter options:', err)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchFilterOptions()
  }, [])

  // Auto-update modal student reference if background students array updates
  useEffect(() => {
    if (selectedStudent) {
      const updated = students.find(s => s.id === selectedStudent.id)
      if (updated) setSelectedStudent(updated)
    }
  }, [students])

  // Reset filter dropdown toggles on click outside
  const closeAllDropdowns = () => {
    setIsTariffDropdownOpen(false)
    setIsLevelDropdownOpen(false)
    setIsGroupDropdownOpen(false)
    setIsCertDropdownOpen(false)
    setIsMissingDropdownOpen(false)
    setIsScoreDropdownOpen(false)
  }

  // Document Helpers
  const getEffectiveMissingDocs = (s: Student): string[] => {
    return syncMissingDocuments(s)
  }

  const getDocColor = (docName: string) => {
    if (docName === "FULL OK") {
      return { bg: '#10b981', text: '#ffffff', border: 'rgba(255,255,255,0.15)' }
    }
    const colors = [
      { bg: '#ef4444', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#10b981', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#f59e0b', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#6366f1', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#db2777', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#ea580c', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#2563eb', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      { bg: '#8b5cf6', text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
    ]
    let hash = 0
    for (let i = 0; i < docName.length; i++) {
      hash = docName.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const getDocRemainingCount = (s: Student, docName: string): number => {
    const missingList = getEffectiveMissingDocs(s)
    const isFullOk = missingList.includes("FULL OK")
    const isMissing = !isFullOk && missingList.includes(docName)
    
    if (isMissing) return 0
    
    let key: keyof Student
    if (docName === "BIRTH CERTIFICATE") key = "bc_hand_count"
    else if (docName === "MARRIAGE CERTIFICATE") key = "mc_hand_count"
    else if (docName === "APOSTILLE") key = "apos_hand_count"
    else if (docName === "3.5x4.5") key = "pic_hand_count"
    else return 0
    
    if (s[key] !== undefined && s[key] !== null) {
      return Number(s[key])
    }
    
    let used = 0
    if (s.university_1 && s.university_1.trim() !== "") used++
    if (s.university_2 && s.university_2.trim() !== "") used++
    if (s.university_3 && s.university_3.trim() !== "") used++
    return Math.max(0, 3 - used)
  }

  // Sorting (Alphanumeric sorting logic matching legacy compareStudentIds helper)
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

  // Filters Reset & Toggles
  const handleToggleTariff = (opt: string) => {
    setSelectedTariffs(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
  }
  const handleToggleAllTariffs = () => {
    setSelectedTariffs(prev => prev.length === tariffOptions.length ? [] : [...tariffOptions])
  }

  const handleToggleLevel = (opt: string) => {
    setSelectedLevels(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
  }
  const handleToggleAllLevels = () => {
    setSelectedLevels(prev => prev.length === (levelOptions.length + 2) ? [] : ['NO_LEVEL', 'DELETED', ...levelOptions])
  }

  const handleToggleGroup = (opt: string) => {
    setSelectedGroups(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
  }
  const handleToggleAllGroups = () => {
    const activeGroups = groupOptions.length > 0 ? groupOptions : Array.from(new Set(students.map(s => s.student_group).filter(Boolean))) as string[]
    setSelectedGroups(prev => prev.length === (activeGroups.length + 1) ? [] : ['NO_GROUP', ...activeGroups])
  }

  const handleToggleCert = (opt: string) => {
    setSelectedCerts(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
  }
  const handleToggleAllCerts = () => {
    setSelectedCerts(prev => prev.length === certOptions.length ? [] : [...certOptions])
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

  const handleToggleMissingDocs = (opt: string) => {
    setSelectedMissingDocs(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
  }
  const handleToggleAllMissingDocs = () => {
    setSelectedMissingDocs(prev => prev.length === pickNeededList.length ? [] : [...pickNeededList])
  }

  // In-Modal Actions
  const handleTogglePickNeeded = async (studentId: string, pill: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    
    let updatedPick: string[] = student.pick_needed ? [...student.pick_needed] : []
    let showMessage: string | null = null

    const isRemoving = updatedPick.includes(pill) || (pill === "FULL OK" && updatedPick.includes("FULL OK"))

    if (isRemoving) {
      if (pill === "2 ta nomer") {
        const phoneFields = [student.phone1, student.phone2, student.father_phone, student.mother_phone]
        const filledPhones = phoneFields.filter(isFieldFilled).length
        if (filledPhones < 2) {
          alert("Talabaga kamida 2 ta nomer kirgizing!")
          return
        }
      } else if (pill === "Email") {
        if (!isFieldFilled(student.email)) {
          alert("Email manzilini kirgizing!")
          return
        }
      } else if (pill === "Foreign passport") {
        if (!isFieldFilled(student.passport)) {
          alert("Pasport raqamini kirgizing!")
          return
        }
      } else if (pill === "Manzil") {
        if (!isFieldFilled(student.address)) {
          alert("Talabaning manzilini kirgizing!")
          return
        }
      } else if (pill === "Edu-Level") {
        if (!isFieldFilled(student.level)) {
          alert("Ta'lim darajasini kirgizing!")
          return
        }
      }
    }

    if (pill === "FULL OK") {
      if (updatedPick.includes("FULL OK")) {
        updatedPick = []
      } else {
        updatedPick = ["FULL OK"]
      }
    } else {
      updatedPick = updatedPick.filter(p => p !== "FULL OK")
      if (updatedPick.includes(pill)) {
        updatedPick = updatedPick.filter(p => p !== pill)
        // Set triggers for custom alerts
        if (pill === "Foreign passport") {
          showMessage = "Talabani zagranini oldingizmi? uni kirgizing, ismini tekshirib yozib qo'ying!"
        } else if (pill === "2 ta nomer") {
          showMessage = "Talabaning nomerini to'g'ri yozing! Bazaga kiritish esdan chiqmasin!"
        } else if (pill === "Email") {
          showMessage = "Email ni tekshirib oling, Bazaga kiritish esdan chiqmasin! Iltimos"
        } else if (pill === "Manzil") {
          showMessage = "Manzil ingliz tilida yozing iltimos. Bazaga kiritish esdan chiqmasin"
        } else if (["IELTS", "TOEFL", "SKA", "TOPIK", "SAT", "CEFR"].includes(pill)) {
          showMessage = "Til sertifikati va darajasini talabani bazasiga yozib qo'ying!"
        }
      } else {
        updatedPick.push(pill)
      }
    }

    // Run syncMissingDocuments to ensure required fields remain consistent
    const nextStudent = { ...student, pick_needed: updatedPick }
    const syncedPick = syncMissingDocuments(nextStudent)
    updatedPick = syncedPick

    setModalUpdating(true)
    try {
      const { error: updateErr } = await (supabase
        .from('students') as any)
        .update({ pick_needed: updatedPick })
        .eq('id', studentId)

      if (updateErr) throw updateErr
      
      // Update local state immediately
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, pick_needed: updatedPick } : s))
      if (showMessage) {
        alert(showMessage)
      }
    } catch (err: any) {
      console.error('Error updating pick needed:', err)
      alert(err.message || 'Failed to update missing documents list.')
    } finally {
      setModalUpdating(false)
    }
  }

  const handleToggleMcEnabled = async (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    const newMc = !student.has_mc
    
    setModalUpdating(true)
    try {
      const { error: updateErr } = await (supabase
        .from('students') as any)
        .update({ has_mc: newMc })
        .eq('id', studentId)

      if (updateErr) throw updateErr
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, has_mc: newMc } : s))
    } catch (err: any) {
      console.error('Error toggling has_mc:', err)
      alert(err.message || 'Failed to update MC requirement.')
    } finally {
      setModalUpdating(false)
    }
  }

  const handleUpdateCopyCount = async (studentId: string, field: 'bc_hand_count' | 'mc_hand_count' | 'apos_hand_count' | 'pic_hand_count', value: number) => {
    if (value < 0) return
    setModalUpdating(true)
    try {
      const { error: updateErr } = await (supabase
        .from('students') as any)
        .update({ [field]: value })
        .eq('id', studentId)

      if (updateErr) throw updateErr
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s))
    } catch (err: any) {
      console.error('Error updating hand count:', err)
      alert(err.message || 'Failed to update document hand count.')
    } finally {
      setModalUpdating(false)
    }
  }

  // Filter core student list
  const filteredStudents = students.filter(student => {
    // 1. Deleted Students
    const showDeleted = selectedLevels.includes('DELETED')
    if (showDeleted) {
      if (student.is_deleted !== true) return false
    } else {
      if (student.is_deleted === true) return false
    }

    // 2. Tariff Filter
    if (selectedTariffs.length > 0) {
      const matchesTariff = selectedTariffs.includes(student.tariff || 'NO_TARIFF') || 
                            (selectedTariffs.includes('NO_TARIFF') && !student.tariff)
      if (!matchesTariff) return false
    }

    // 3. Level Filter
    const activeLevels = selectedLevels.filter(l => l !== 'DELETED')
    if (activeLevels.length > 0) {
      const matchesLevel = activeLevels.includes(student.level || '') || 
                           activeLevels.includes(student.level2 || '') || 
                           (activeLevels.includes('NO_LEVEL') && !student.level && !student.level2)
      if (!matchesLevel) return false
    }

    // 4. Group Filter
    if (selectedGroups.length > 0) {
      const matchesGroup = selectedGroups.includes(student.student_group || '') || 
                           (selectedGroups.includes('NO_GROUP') && !student.student_group)
      if (!matchesGroup) return false
    }

    // 5. Certificate Filter
    if (selectedCerts.length > 0) {
      let matchesCert = false
      if (selectedCerts.includes('NO CERTIFICATE') && (!student.language_certificate || student.language_certificate === 'NO CERTIFICATE')) {
        matchesCert = true
      }
      if (selectedCerts.includes('EXPECTED') && (student.certificate_score?.toUpperCase() === 'EXPECTED' || student.certificate_score_2?.toUpperCase() === 'EXPECTED' || student.certificate_score_3?.toUpperCase() === 'EXPECTED')) {
        matchesCert = true
      }
      const certMatches = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
        .some(c => c && c !== 'NO CERTIFICATE' && selectedCerts.includes(c))
      if (certMatches) matchesCert = true
      
      // If a specific score sub-filter is also active, additionally check score
      if (matchesCert && selectedScores.length > 0 && selectedCerts.length === 1) {
        const cert = selectedCerts[0] || ""
        const scores = [student.certificate_score, student.certificate_score_2, student.certificate_score_3]
        const certs  = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
        matchesCert = certs.some((c, i) => {
          if (!c || c === "NO CERTIFICATE") return false
          if (c.toUpperCase() !== cert.toUpperCase()) return false
          const score = (scores[i] || "").trim().toUpperCase()
          return selectedScores.some(f => f.toUpperCase() === score)
        })
      }

      if (!matchesCert) return false
    }

    // 6. Missing Docs Filter (OR matching)
    if (selectedMissingDocs.length > 0) {
      const missingList = getEffectiveMissingDocs(student)
      const matchesMissing = selectedMissingDocs.some(d => missingList.includes(d))
      if (!matchesMissing) return false
    }

    // 7. Search query matching
    if (searchQuery) {
      const matchesSearch =
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.phone1 && student.phone1.includes(searchQuery)) ||
        (student.phone2 && student.phone2.includes(searchQuery))
      if (!matchesSearch) return false
    }

    return true
  })

  const sortedStudents = [...filteredStudents].sort((a, b) => compareStudentIds(a, b, sortOrder))

  // Render Pill badges
  const renderMissingPills = (s: Student) => {
    const missingDocs = getEffectiveMissingDocs(s)
    if (missingDocs.includes("FULL OK")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500 text-white shadow-sm border-none">
          ✔ FULL OK
        </span>
      )
    }
    
    const items = missingDocs.filter(d => d !== "FULL OK" && !(d === "MARRIAGE CERTIFICATE" && s.has_mc === false))
    if (items.length === 0) {
      return <span className="text-xs text-[var(--foreground-muted)] italic font-medium">No missing documents</span>
    }

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {items.map(d => {
          let label = d
          if (d === "BIRTH CERTIFICATE") label = "BC"
          else if (d === "MARRIAGE CERTIFICATE") label = "MC"
          else if (d === "APOSTILLE") label = "APOS"
          else if (d === "3.5x4.5") label = "PIC"

          const colors = getDocColor(label)
          return (
            <span
              key={d}
              className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase shadow-sm text-white border-none"
              style={{ backgroundColor: colors.bg }}
            >
              {label}
            </span>
          )
        })}
      </div>
    )
  }

  // Render cell counter statuses
  const DOC_BADGE_BASE = "h-6 w-6 shrink-0 rounded-full inline-flex items-center justify-center leading-none font-bold text-[10px] shadow-sm border"

  const renderDocCell = (s: Student, docName: string) => {
    if (docName === "MARRIAGE CERTIFICATE" && s.has_mc === false) {
      return (
        <span className={`${DOC_BADGE_BASE} bg-[var(--border-subtle)] text-[var(--foreground-muted)] border-[var(--border)]`}>
          N/A
        </span>
      )
    }

    const missingList = getEffectiveMissingDocs(s)
    const isFullOk = missingList.includes("FULL OK")
    const isMissing = !isFullOk && missingList.includes(docName)

    if (isMissing) {
      return (
        <span className={`${DOC_BADGE_BASE} bg-rose-500 text-white border-rose-600/10`}>
          0
        </span>
      )
    }

    const remaining = getDocRemainingCount(s, docName)
    if (remaining === 0) {
      return (
        <span className={`${DOC_BADGE_BASE} bg-amber-500 text-white border-amber-600/10`}>
          0
        </span>
      )
    }

    return (
      <span className={`${DOC_BADGE_BASE} bg-emerald-500 text-white border-emerald-600/10`}>
        {remaining}
      </span>
    )
  }

  // Render Student Ghost Metadata
  const getGhostText = (s: Student) => {
    const parts = []
    if (s.id) parts.push(s.id)
    if (s.tariff) parts.push(s.tariff)
    if (s.level) parts.push(s.level)
    if (s.level2) parts.push(s.level2)
    return parts.join(" | ")
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + ' UZS'
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Dropdowns Click-Outside Backdrop */}
      {(isTariffDropdownOpen || isLevelDropdownOpen || isGroupDropdownOpen || isCertDropdownOpen || isMissingDropdownOpen || isScoreDropdownOpen) && (
        <div className="fixed inset-0 z-30 bg-transparent cursor-default" onClick={closeAllDropdowns} />
      )}

      {/* Roster Filters Menu Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-wrap gap-3 items-center justify-between z-40">
        <div className={`grid grid-cols-2 md:grid-cols-3 ${showScoreFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 w-full`}>
          {/* Tariffs Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setIsTariffDropdownOpen(prev => !prev) }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
            >
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <span className="truncate pr-1">
                {selectedTariffs.length === 0 ? 'All Tariffs' : selectedTariffs.length + ' Selected'}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            </button>
            {isTariffDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllTariffs}
                >
                  <input type="checkbox" checked={selectedTariffs.length === tariffOptions.length} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                {tariffOptions.map(opt => (
                  <div key={opt} onClick={() => handleToggleTariff(opt)} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                    <input type="checkbox" checked={selectedTariffs.includes(opt)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Levels Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setIsLevelDropdownOpen(prev => !prev) }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
            >
              <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <span className="truncate pr-1">
                {selectedLevels.length === 0 ? 'All Levels' : selectedLevels.length + ' Selected'}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            </button>
            {isLevelDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllLevels}
                >
                  <input type="checkbox" checked={selectedLevels.length === (levelOptions.length + 2)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                <div onClick={() => handleToggleLevel('NO_LEVEL')} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                  <input type="checkbox" checked={selectedLevels.includes('NO_LEVEL')} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>No Level</span>
                </div>
                {levelOptions.map(opt => (
                  <div key={opt} onClick={() => handleToggleLevel(opt)} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                    <input type="checkbox" checked={selectedLevels.includes(opt)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span>{opt}</span>
                  </div>
                ))}
                <div className="h-px bg-[var(--border)] my-1" />
                <div onClick={() => handleToggleLevel('DELETED')} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-rose-500/10 dark:hover:bg-rose-950/20 transition-colors select-none text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <input type="checkbox" checked={selectedLevels.includes('DELETED')} readOnly className="h-3.5 w-3.5 rounded border-rose-300 dark:border-rose-900 text-rose-600 focus:ring-rose-500 cursor-pointer" />
                  <span>Deleted students</span>
                </div>
              </div>
            )}
          </div>

          {/* Groups Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setIsGroupDropdownOpen(prev => !prev) }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
            >
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <span className="truncate pr-1">
                {selectedGroups.length === 0 ? 'All Groups' : selectedGroups.length + ' Selected'}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            </button>
            {isGroupDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllGroups}
                >
                  <input type="checkbox" checked={selectedGroups.length === (groupOptions.length + 1)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                <div onClick={() => handleToggleGroup('NO_GROUP')} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                  <input type="checkbox" checked={selectedGroups.includes('NO_GROUP')} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>No Group</span>
                </div>
                {groupOptions.map(opt => (
                  <div key={opt} onClick={() => handleToggleGroup(opt)} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                    <input type="checkbox" checked={selectedGroups.includes(opt)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificates Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setIsCertDropdownOpen(prev => !prev) }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
            >
              <Bookmark className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <span className="truncate pr-1">
                {selectedCerts.length === 0 ? 'All Certificates' : selectedCerts.length + ' Selected'}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            </button>
            {isCertDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllCerts}
                >
                  <input type="checkbox" checked={selectedCerts.length === certOptions.length} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                {certOptions.map(opt => (
                  <div key={opt} onClick={() => handleToggleCert(opt)} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                    <input type="checkbox" checked={selectedCerts.includes(opt)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Score Filter (shown for TOPIK/IELTS) */}
          {showScoreFilter && (
            <div className="relative animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => { closeAllDropdowns(); setIsScoreDropdownOpen(prev => !prev) }}
                className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
              >
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                <span className="truncate pr-1">
                  {selectedScores.length === 0
                    ? 'All Scores'
                    : selectedScores.length === scoreOptions.length
                    ? 'All Scores'
                    : selectedScores.map(getScoreLabel).join(', ')}
                </span>
                <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
              </button>

              {isScoreDropdownOpen && (
                <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
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

          {/* Missing Docs Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { closeAllDropdowns(); setIsMissingDropdownOpen(prev => !prev) }}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
            >
              <ShieldAlert className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <span className="truncate pr-1">
                {selectedMissingDocs.length === 0 ? 'All Missing Docs' : selectedMissingDocs.length + ' Selected'}
              </span>
              <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)]" />
            </button>
            {isMissingDropdownOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1.5 z-50 max-h-72 overflow-y-auto">
                <div 
                  className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]" 
                  onClick={handleToggleAllMissingDocs}
                >
                  <input type="checkbox" checked={selectedMissingDocs.length === pickNeededList.length} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span>Select All</span>
                </div>
                <div className="h-px bg-[var(--border)] my-1" />
                {pickNeededList.map(opt => (
                  <div key={opt} onClick={() => handleToggleMissingDocs(opt)} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]">
                    <input type="checkbox" checked={selectedMissingDocs.includes(opt)} readOnly className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roster Counter Summary */}
      <div className="flex justify-between items-center text-xs text-[var(--foreground-muted)] italic px-1 font-semibold select-none">
        <div>
          {(searchQuery || selectedTariffs.length > 0 || selectedLevels.length > 0 || selectedGroups.length > 0 || selectedCerts.length > 0 || selectedScores.length > 0 || selectedMissingDocs.length > 0) ? (
            <span>Showing {filteredStudents.length} of {students.filter(s => selectedLevels.includes('DELETED') ? s.is_deleted : !s.is_deleted).length} students</span>
          ) : (
            <span>Showing all {selectedLevels.includes('DELETED') ? 'deleted' : 'active'} students</span>
          )}
        </div>
        <div className="text-right">
          Total {filteredStudents.length} students
        </div>
      </div>

      {/* Main Roster Display Table */}
      {loading ? (
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
                <div className="h-4 w-20 bg-[var(--border-subtle)] rounded animate-bounce" />
                <div className="h-5 w-5 bg-[var(--border-subtle)] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-sm)]">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">Failed to Load Documents Dashboard</h3>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{error}</p>
          <button onClick={fetchStudents} className="mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer">
            Reload
          </button>
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center shadow-[var(--shadow-sm)]">
          <Folder className="mx-auto h-12 w-12 text-[var(--foreground-subtle)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">No matching student documents found</h3>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">Adjust your filter options and try again.</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)] select-none">
                  <th 
                    className="px-6 py-3.5 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <span className="flex items-center gap-1">
                      ID / Name
                      {sortOrder === 'asc' ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--accent)]" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 text-[var(--accent)]" />
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-3.5">Missing</th>
                  <th className="px-4 py-3.5 text-center w-16">BC</th>
                  <th className="px-4 py-3.5 text-center w-16">MC</th>
                  <th className="px-4 py-3.5 text-center w-16">APOS</th>
                  <th className="px-4 py-3.5 text-center w-16">PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedStudents.map(student => (
                  <tr 
                    key={student.id} 
                    onClick={async () => {
                      const syncedPick = syncMissingDocuments(student)
                      const originalPick = student.pick_needed || []
                      const isPickDifferent = originalPick.length !== syncedPick.length || 
                        !originalPick.every((val: string) => syncedPick.includes(val))

                      let updatedStudent = student
                      if (isPickDifferent) {
                        const { error: updateErr } = await (supabase
                          .from('students') as any)
                          .update({ pick_needed: syncedPick })
                          .eq('id', student.id)
                        if (!updateErr) {
                          updatedStudent = { ...student, pick_needed: syncedPick }
                          setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s))
                        } else {
                          console.error('Error auto-syncing missing documents on modal open:', updateErr)
                        }
                      }
                      setSelectedStudent(updatedStudent)
                      setIsModalOpen(true)
                    }}
                    className={`cursor-pointer hover:bg-[var(--surface-hover)] transition-colors text-sm text-[var(--foreground)] ${student.is_deleted ? 'bg-rose-500/5 dark:bg-rose-950/10' : ''}`}
                  >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        {student.is_deleted && <ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                        <span className="font-bold uppercase tracking-wide text-xs">{student.full_name}</span>
                      </div>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-semibold tracking-wider uppercase mt-1.5 block">
                        {getGhostText(student)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {renderMissingPills(student)}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center justify-center">{renderDocCell(student, "BIRTH CERTIFICATE")}</div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center justify-center">{renderDocCell(student, "MARRIAGE CERTIFICATE")}</div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center justify-center">{renderDocCell(student, "APOSTILLE")}</div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center justify-center">{renderDocCell(student, "3.5x4.5")}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dynamic Manage Documents Modal */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10 flex flex-col gap-6">
            {/* Close Button */}
            <button 
              disabled={modalUpdating}
              onClick={() => setIsModalOpen(false)} 
              className="absolute right-6 top-6 rounded-full p-2 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-50 border border-[var(--border)]"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--foreground)] select-all uppercase tracking-wide leading-tight">
                  Documents: {selectedStudent.full_name}
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5 font-medium">Manage student documents</p>
              </div>
            </div>

            {/* Student Info Card Grid */}
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 select-text">
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Student ID</span>
                <span className="text-sm font-extrabold text-[#007aff] font-mono">{selectedStudent.id}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Status</span>
                {selectedStudent.is_deleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Deleted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                )}
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Group</span>
                <span className="text-sm font-bold text-[var(--foreground)] uppercase">{selectedStudent.student_group || 'No Group'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Edu-Level</span>
                <span className="text-sm font-bold text-[var(--foreground)] uppercase">
                  {[selectedStudent.level, selectedStudent.level2].filter(Boolean).join(', ') || 'No Level'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Office</span>
                <span className="text-sm font-bold text-[var(--foreground)] uppercase">{selectedStudent.office || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-1">Payments Done</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Math.max(0, -selectedStudent.balance))}
                </span>
              </div>
            </div>

            {/* Split cards grid for Missing & Pick needed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Missing Documents Column */}
              <div className="border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 bg-[var(--surface-elevated)] min-h-[300px]">
                <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-rose-500" />
                  Missing documents
                </h3>
                
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] pr-1">
                  {getEffectiveMissingDocs(selectedStudent).length === 0 ? (
                    <span className="text-xs text-[var(--foreground-muted)] italic font-semibold py-2">No missing documents specified.</span>
                  ) : (
                    getEffectiveMissingDocs(selectedStudent).map(doc => {
                      let label = doc
                      if (doc === "BIRTH CERTIFICATE") label = "BC"
                      else if (doc === "MARRIAGE CERTIFICATE") label = "MC"
                      else if (doc === "APOSTILLE") label = "APOS"
                      else if (doc === "3.5x4.5") label = "PIC"

                      // Match color based on the design screenshot: APOSTILLE -> orange, BIRTH CERTIFICATE -> yellow-orange
                      let bgStyle = 'bg-gray-500'
                      if (doc === 'APOSTILLE') bgStyle = 'bg-[#ea580c]'
                      else if (doc === 'BIRTH CERTIFICATE') bgStyle = 'bg-[#f59e0b]'
                      else if (doc === 'MARRIAGE CERTIFICATE') bgStyle = 'bg-[#2563eb]'
                      else if (doc === 'AJRASHGANLIK') bgStyle = 'bg-[#ec4899]'
                      else if (doc === 'Foreign passport') bgStyle = 'bg-[#ea580c]'
                      else if (doc === 'FULL OK') bgStyle = 'bg-emerald-500'

                      return (
                        <div 
                          key={doc} 
                          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-bold text-white shadow-sm w-full transition-all ${bgStyle}`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-white" />
                            <span>{doc}</span>
                          </div>
                          
                          <button
                            type="button"
                            disabled={modalUpdating}
                            onClick={() => handleTogglePickNeeded(selectedStudent.id, doc)}
                            className="p-1 hover:bg-white/15 rounded-lg transition-all cursor-pointer disabled:opacity-50 text-white"
                            title="Remove document"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Pick Needed Column */}
              <div className="border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 bg-[var(--surface-elevated)] min-h-[300px]">
                <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                  Pick needed
                </h3>
                
                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[320px] pr-1">
                  {pickNeededList.map(pill => {
                    const isActive = (selectedStudent.pick_needed || []).includes(pill) || (pill === "FULL OK" && (selectedStudent.pick_needed || []).includes("FULL OK"))
                    
                    let activeStyle = 'bg-gray-600 text-white border-gray-700'
                    if (isActive) {
                      if (pill === 'APOSTILLE' || pill === 'Foreign passport') activeStyle = 'bg-[#ea580c] text-white border-[#ea580c]'
                      else if (pill === 'BIRTH CERTIFICATE') activeStyle = 'bg-[#f59e0b] text-white border-[#f59e0b]'
                      else if (pill === 'MARRIAGE CERTIFICATE') activeStyle = 'bg-[#2563eb] text-white border-[#2563eb]'
                      else if (pill === 'AJRASHGANLIK') activeStyle = 'bg-[#ec4899] text-white border-[#ec4899]'
                      else if (pill === 'FULL OK') activeStyle = 'bg-emerald-500 text-white border-emerald-600'
                    }

                    return (
                      <button
                        key={pill}
                        type="button"
                        disabled={modalUpdating}
                        onClick={() => handleTogglePickNeeded(selectedStudent.id, pill)}
                        className={`px-3.5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wide border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
                          isActive
                            ? `${activeStyle} shadow-sm`
                            : (pill === "FULL OK"
                                ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800')
                        }`}
                      >
                        {pill}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Card Counter Override */}
            <div className="border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 bg-[var(--surface-elevated)]">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-blue-500" />
                Physical Copies In Hand (Override)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'bc_hand_count', docName: 'BIRTH CERTIFICATE', label: 'BC' },
                  { key: 'mc_hand_count', docName: 'MARRIAGE CERTIFICATE', label: 'MC' },
                  { key: 'apos_hand_count', docName: 'APOSTILLE', label: 'APOS' },
                  { key: 'pic_hand_count', docName: '3.5x4.5', label: 'PIC' }
                ].map(item => {
                  const missingList = getEffectiveMissingDocs(selectedStudent)
                  const isMissing = !missingList.includes("FULL OK") && missingList.includes(item.docName)
                  const isMcDisabled = (item.label === "MC" && selectedStudent.has_mc === false)
                  const remaining = getDocRemainingCount(selectedStudent, item.docName)
                  const isDisabled = isMissing || isMcDisabled || modalUpdating

                  return (
                    <div key={item.key} className="relative rounded-2xl border border-[var(--border)] bg-gray-50 dark:bg-zinc-950 p-4 flex flex-col items-center justify-between min-h-[100px] select-none shadow-sm">
                      {item.label === "MC" && (
                        <div className="absolute top-3 right-3 z-10 flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedStudent.has_mc !== false} 
                              onChange={() => handleToggleMcEnabled(selectedStudent.id)}
                              disabled={modalUpdating}
                              className="sr-only peer" 
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
                          </label>
                        </div>
                      )}
                      
                      <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider mb-2">{item.label}</span>
                      
                      <div className="flex items-center justify-between w-full mt-2 px-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateCopyCount(selectedStudent.id, item.key as any, remaining - 1)}
                          disabled={isDisabled || remaining <= 0}
                          className="h-8 w-8 rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all text-sm font-bold shadow-sm"
                        >
                          -
                        </button>
                        
                        <span className={`font-extrabold text-base w-12 text-center ${
                          isMcDisabled 
                            ? 'text-gray-400 dark:text-gray-600' 
                            : (remaining > 0 ? 'text-[#007aff]' : 'text-gray-700 dark:text-gray-300')
                        }`}>
                          {isMcDisabled ? 'N/A' : remaining}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleUpdateCopyCount(selectedStudent.id, item.key as any, remaining + 1)}
                          disabled={isDisabled}
                          className="h-8 w-8 rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all text-sm font-bold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer with Done button */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-[#007aff] hover:bg-blue-600 text-white rounded-full px-6 py-2.5 flex items-center gap-2 font-bold text-sm shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
