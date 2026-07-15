'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Plus, Users, X, Search, AlertCircle, CheckCircle2,
  Tag, Layers, Award, Bookmark, UserCheck, Folder,
  FileSpreadsheet, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Copy, Trash2, Hash, Check, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { type Student, type StudentLevel } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { sendTelegramNotification } from '@/lib/telegram'
import { syncMissingDocuments } from '@/lib/validation'
import { useCssTransition } from '@/hooks/useCssTransition'

const AddStudentModal = dynamic(() => import('./AddStudentModal'), { ssr: false })

export const ROW_COLOR_MAP: Record<string, { bg: string; ball: string; name: string }> = {
  BLUE: { bg: 'rgba(37, 99, 235, 0.45)', ball: '#2563EB', name: 'Blue' },
  EMERALD: { bg: 'rgba(16, 185, 129, 0.45)', ball: '#10B981', name: 'Emerald' },
  RED: { bg: 'rgba(239, 68, 68, 0.45)', ball: '#EF4444', name: 'Red' },
  VIOLET: { bg: 'rgba(139, 92, 246, 0.45)', ball: '#8B5CF6', name: 'Violet' },
  ORANGE: { bg: 'rgba(249, 115, 22, 0.45)', ball: '#F97316', name: 'Orange' },
  YELLOW: { bg: 'rgba(250, 204, 21, 0.45)', ball: '#FACC15', name: 'Yellow' },
  CYAN: { bg: 'rgba(6, 182, 212, 0.45)', ball: '#06B6D4', name: 'Cyan' },
  SLATE: { bg: 'rgba(100, 116, 139, 0.45)', ball: '#64748B', name: 'Slate' }
}

export const CUSTOM_TAG_ICONS: { id: string; emoji: string; label: string }[] = [
  { id: 'new', emoji: '🆕', label: 'New' },
  { id: 'contacted', emoji: '📞', label: 'Contacted' },
  { id: 'interested', emoji: '💬', label: 'Interested' },
  { id: 'documents_pending', emoji: '📄', label: 'Documents Pending' },
  { id: 'missing_documents', emoji: '⚠️', label: 'Missing Documents' },
  { id: 'started', emoji: '📝', label: 'Started' },
  { id: 'submitted', emoji: '📤', label: 'Submitted' },
  { id: 'processing', emoji: '🔄', label: 'Processing' },
  { id: 'waiting', emoji: '⏳', label: 'Waiting' },
  { id: 'interview', emoji: '🎤', label: 'Interview' },
  { id: 'accepted', emoji: '✅', label: 'Accepted' },
  { id: 'enrolled', emoji: '🎓', label: 'Enrolled' },
  { id: 'paid', emoji: '💳', label: 'Paid' },
  { id: 'visa_processing', emoji: '🎫', label: 'Visa Processing' },
  { id: 'visa_approved', emoji: '🛂', label: 'Visa Approved' },
  { id: 'departure', emoji: '✈️', label: 'Departure' },
  { id: 'arrived', emoji: '📍', label: 'Arrived' },
  { id: 'graduated', emoji: '🏆', label: 'Graduated' },
  { id: 'rejected', emoji: '❌', label: 'Rejected' },
  { id: 'on_hold', emoji: '⏸️', label: 'On Hold' },
  { id: 'urgent', emoji: '🚩', label: 'Urgent' },
  { id: 'vip', emoji: '⭐️', label: 'VIP' },
  { id: 'email_sent', emoji: '📧', label: 'Email Sent' },
  { id: 'response_received', emoji: '📨', label: 'Response Received' },
  { id: 'appointment', emoji: '📅', label: 'Appointment Scheduled' },
  { id: 'follow_up', emoji: '🔔', label: 'Follow-Up Required' },
  { id: 'under_review', emoji: '📋', label: 'Under Review' },
  { id: 'docs_verified', emoji: '🔒', label: 'Documents Verified' },
  { id: 'scholarship', emoji: '💎', label: 'Scholarship Awarded' },
  { id: 'dormitory', emoji: '🏠', label: 'Dormitory Arranged' },
  { id: 'expiring_soon', emoji: '⌛️', label: 'Expiring Soon' },
  { id: 're_application', emoji: '🔁', label: 'Re-Application' },
]
// Legacy flat list for backward compat (stored values are still emoji strings)
export const CUSTOM_TAG_EMOJIS = CUSTOM_TAG_ICONS.map(i => i.emoji)

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

export function StudentDashboardClient({ hidePhone = false }: { hidePhone?: boolean } = {}) {
  const supabase = createClient()

  const [activeTooltip, setActiveTooltip] = useState<{ studentId: string; tagKey: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null)
  // Gates the dynamic import of AddStudentModal so its chunk isn't fetched
  // until the user opens it for the first time; stays true afterward so the
  // modal can play its CSS exit animation on subsequent closes.
  const [hasOpenedAddModal, setHasOpenedAddModal] = useState(false)

  // Choose University states for Invoice
  const [activeInvoiceStudentId, setActiveInvoiceStudentId] = useState<string | null>(null)
  const [invoicePendingStatus, setInvoicePendingStatus] = useState<string | null>(null)
  const [uniSearchQuery, setUniSearchQuery] = useState('')
  const [isChooseUniModalOpen, setIsChooseUniModalOpen] = useState(false)
  const [universityOptions, setUniversityOptions] = useState<string[]>([])

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('name')
          .order('name')
        if (data) {
          setUniversityOptions(data.map(u => u.name))
        }
      } catch (err) {
        console.error('Error fetching universities:', err)
      }
    }
    fetchUniversities()
  }, [])

  // Context shared state
  const {
    searchQuery,
    isAddStudentModalOpen: isModalOpen,
    setIsAddStudentModalOpen: setIsModalOpen,
    students,
    setStudents,
    loading,
    error,
    fetchStudents,
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
    isExcelModalOpen,
    setIsExcelModalOpen,
    tariffOptions,
    levelOptions,
    customTagsRegistry,
    setCustomTagsRegistry,
    foldersOptions,
    activeFolder,
    setActiveFolder,
    officeOptions
  } = useStudentDashboard()

  const excelModalTransition = useCssTransition(isExcelModalOpen, 220)

  const certOptions = ['NO CERTIFICATE', 'EXPECTED', 'TOPIK', 'SKA', 'IELTS', 'TOEFL', 'SAT', 'CEFR']

  const showScoreFilter = selectedCerts.length === 1 && (selectedCerts[0] === 'TOPIK' || selectedCerts[0] === 'IELTS')
  const activeCertForScore = showScoreFilter ? selectedCerts[0] : null



  const getScoreLabel = (score: string) => {
    if (score === 'EXPECTED') return 'Expected'
    if (activeCertForScore === 'TOPIK') return `TOPIK ${score}`
    if (activeCertForScore === 'IELTS') return `IELTS ${score}`
    return score
  }

  // Score filter clearing is managed directly inside the FilterPanel modal (during draft updates)
  // and when clearing the certificate chip in the main view.

  // Excel Export Modal States

  const [excelSearchQuery, setExcelSearchQuery] = useState('')
  const [excelSearchType, setExcelSearchType] = useState<'all' | 'id' | 'name' | 'phone' | 'university'>('all')
  const [excelSelectedFolders, setExcelSelectedFolders] = useState<string[]>([])
  const [excelSelectedTariffs, setExcelSelectedTariffs] = useState<string[]>([])
  const [excelSelectedLevels, setExcelSelectedLevels] = useState<string[]>([])
  const [excelSelectedGroups, setExcelSelectedGroups] = useState<string[]>([])
  const [excelSelectedCerts, setExcelSelectedCerts] = useState<string[]>([])
  const [excelSelectedScores, setExcelSelectedScores] = useState<string[]>([])
  const [excelSelectedTags, setExcelSelectedTags] = useState<string[]>([])
  const [excelSelectedLeads, setExcelSelectedLeads] = useState<string[]>([])

  // Toggle states for excel filter dropdowns
  const [isExcelFolderDropdownOpen, setIsExcelFolderDropdownOpen] = useState(false)
  const [isExcelTariffDropdownOpen, setIsExcelTariffDropdownOpen] = useState(false)
  const [isExcelLevelDropdownOpen, setIsExcelLevelDropdownOpen] = useState(false)
  const [isExcelGroupDropdownOpen, setIsExcelGroupDropdownOpen] = useState(false)
  const [isExcelCertDropdownOpen, setIsExcelCertDropdownOpen] = useState(false)
  const [isExcelScoreDropdownOpen, setIsExcelScoreDropdownOpen] = useState(false)
  const [isExcelTagDropdownOpen, setIsExcelTagDropdownOpen] = useState(false)
  const [isExcelLeadDropdownOpen, setIsExcelLeadDropdownOpen] = useState(false)

  const [selectedExcelIds, setSelectedExcelIds] = useState<string[]>([])
  const [excelExportMode, setExcelExportMode] = useState<'full' | 'partial'>('full')

  const showExcelScoreFilter = excelSelectedCerts.length === 1 && (excelSelectedCerts[0] === 'TOPIK' || excelSelectedCerts[0] === 'IELTS')
  const excelActiveCertForScore = showExcelScoreFilter ? excelSelectedCerts[0] : null
  const getExcelScoreOptions = () => {
    if (excelActiveCertForScore === 'TOPIK') {
      return ['EXPECTED', '1', '2', '3', '4', '5', '6']
    }
    if (excelActiveCertForScore === 'IELTS') {
      return ['EXPECTED', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']
    }
    return []
  }
  const excelScoreOptions = getExcelScoreOptions()
  const getExcelScoreLabel = (score: string) => {
    if (score === 'EXPECTED') return 'Expected'
    if (excelActiveCertForScore === 'TOPIK') return `TOPIK ${score}`
    if (excelActiveCertForScore === 'IELTS') return `IELTS ${score}`
    return score
  }

  const prevExcelActiveCertRef = useRef<string | null>(undefined as any)
  useEffect(() => {
    const prev = prevExcelActiveCertRef.current
    prevExcelActiveCertRef.current = excelActiveCertForScore
    if (prev === undefined) return
    if (prev !== excelActiveCertForScore) {
      setExcelSelectedScores([])
    }
  }, [excelActiveCertForScore])

  const excelFilteredStudents = students.filter(student => {
    // 0. Folder filtering
    if (excelSelectedFolders.length > 0) {
      let matchesFolder = false
      if (excelSelectedFolders.includes('NO_FOLDER')) {
        if (!student.folder_ids || student.folder_ids.length === 0) {
          matchesFolder = true
        }
      }
      if (student.folder_ids && student.folder_ids.some(fid => excelSelectedFolders.includes(fid))) {
        matchesFolder = true
      }
      if (!matchesFolder) return false
    }

    // 1. Deleted Students handling
    const showDeleted = excelSelectedLevels.includes('DELETED')
    if (showDeleted) {
      if (student.is_deleted !== true) return false
    } else {
      if (student.is_deleted === true) return false
    }

    // 2. Search query matching
    let matchesSearch = false
    if (!excelSearchQuery.trim()) {
      matchesSearch = true
    } else {
      const q = excelSearchQuery.toLowerCase().trim()
      const idMatch = student.id.toLowerCase().includes(q)
      const nameMatch = student.full_name.toLowerCase().includes(q)
      const phoneMatch = !!(student.phone1?.includes(excelSearchQuery) || student.phone2?.includes(excelSearchQuery))
      const emailMatch = !!(student.email?.toLowerCase().includes(q))
      const uniMatch = !!(student.university_1?.toLowerCase().includes(q) || student.university_2?.toLowerCase().includes(q) || student.university_3?.toLowerCase().includes(q))
      const certMatch = !!(student.language_certificate?.toLowerCase().includes(q) || student.certificate_score?.toLowerCase().includes(q))

      if (excelSearchType === 'all') {
        matchesSearch = idMatch || nameMatch || phoneMatch || emailMatch || uniMatch || certMatch
      } else if (excelSearchType === 'id') {
        matchesSearch = idMatch
      } else if (excelSearchType === 'name') {
        matchesSearch = nameMatch
      } else if (excelSearchType === 'phone') {
        matchesSearch = phoneMatch
      } else if (excelSearchType === 'university') {
        matchesSearch = uniMatch
      }
    }
    if (!matchesSearch) return false

    // 3. Tariff filter
    let matchesTariff = false
    if (excelSelectedTariffs.length === 0) {
      matchesTariff = true
    } else {
      if (excelSelectedTariffs.includes('NO_TARIFF') && !student.tariff) {
        matchesTariff = true
      }
      if (student.tariff && excelSelectedTariffs.includes(student.tariff)) {
        matchesTariff = true
      }
    }
    if (!matchesTariff) return false

    // 4. Level filter (handling NO_LEVEL and DELETED)
    const activeLevels = excelSelectedLevels.filter(l => l !== 'DELETED')
    let matchesLevel = false
    if (activeLevels.length === 0) {
      matchesLevel = true
    } else {
      if (activeLevels.includes('NO_LEVEL') && !student.level && !student.level2) {
        matchesLevel = true
      }
      if (student.level && activeLevels.includes(student.level)) {
        matchesLevel = true
      }
      if (student.level2 && activeLevels.includes(student.level2)) {
        matchesLevel = true
      }
    }
    if (!matchesLevel) return false

    // 5. Group filter
    let matchesGroup = false
    if (excelSelectedGroups.length === 0) {
      matchesGroup = true
    } else {
      if (excelSelectedGroups.includes('NO_GROUP') && !student.student_group) {
        matchesGroup = true
      }
      if (student.student_group && excelSelectedGroups.includes(student.student_group)) {
        matchesGroup = true
      }
    }
    if (!matchesGroup) return false

    // 6. Language Certificate filter
    let matchesCertificate = false
    if (excelSelectedCerts.length === 0) {
      matchesCertificate = true
    } else {
      if (excelSelectedCerts.includes("NO CERTIFICATE")) {
        const hasNoCert = !student.language_certificate || student.language_certificate === "NO CERTIFICATE"
        if (hasNoCert) matchesCertificate = true
      }
      if (excelSelectedCerts.includes("EXPECTED")) {
        const hasExpected = (student.certificate_score && student.certificate_score.toUpperCase() === "EXPECTED") ||
          (student.certificate_score_2 && student.certificate_score_2.toUpperCase() === "EXPECTED") ||
          (student.certificate_score_3 && student.certificate_score_3.toUpperCase() === "EXPECTED")
        if (hasExpected) matchesCertificate = true
      }
      const hasAnySelected = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
        .some(cert => cert && cert !== "NO CERTIFICATE" && excelSelectedCerts.includes(cert))
      if (hasAnySelected) matchesCertificate = true
    }

    // 6b. Score filter
    if (matchesCertificate && excelSelectedScores.length > 0 && excelSelectedCerts.length === 1) {
      const cert = excelSelectedCerts[0] || ""
      const scores = [student.certificate_score, student.certificate_score_2, student.certificate_score_3]
      const certs = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
      matchesCertificate = certs.some((c, i) => {
        if (!c || c === "NO CERTIFICATE") return false
        if (c.toUpperCase() !== cert.toUpperCase()) return false
        const score = (scores[i] || "").trim().toUpperCase()
        return excelSelectedScores.some(f => f.toUpperCase() === score)
      })
    }
    if (!matchesCertificate) return false

    // 7. Tags filter
    let matchesTag = false
    if (excelSelectedTags.length === 0) {
      matchesTag = true
    } else {
      matchesTag = excelSelectedTags.some(tag => {
        if (tag === 'Custom') {
          const predefined = ['Call', 'Apply', 'Documents', 'Payment']
          return student.task_tags && student.task_tags.some(t => !predefined.includes(t))
        } else {
          return student.task_tags && student.task_tags.includes(tag)
        }
      })
    }
    if (!matchesTag) return false

    // 8. Lead By filter
    let matchesLeadBy = false
    if (excelSelectedLeads.length === 0) {
      matchesLeadBy = true
    } else {
      if (excelSelectedLeads.includes('NO_LEADBY') && !student.lead_by) {
        matchesLeadBy = true
      }
      if (student.lead_by && excelSelectedLeads.includes(student.lead_by)) {
        matchesLeadBy = true
      }
    }
    return matchesLeadBy
  })

  const sortedExcelStudents = useMemo(() => {
    return [...excelFilteredStudents].sort((a, b) => compareStudentIds(a, b, sortOrder))
  }, [excelFilteredStudents, sortOrder])

  // Helper to style SheetJS worksheets beautifully
  const styleWorksheet = (ws: any, isStudentSingle: boolean = false) => {
    if (!ws) return

    // Get range of sheet
    const ref = ws['!ref']
    if (!ref) return

    // Parse range manually or use decode_range helper safely
    const decodeRange = (rangeStr: string) => {
      const parts = rangeStr.split(':')
      const start = parts[0]
      const end = parts[1] || parts[0]

      const parseCell = (cellStr: string) => {
        const match = cellStr.match(/^([A-Z]+)([0-9]+)$/)
        if (!match) return { c: 0, r: 0 }

        let c = 0
        const colStr = match[1]
        for (let i = 0; i < colStr.length; i++) {
          c = c * 26 + (colStr.charCodeAt(i) - 64)
        }
        return { c: c - 1, r: parseInt(match[2], 10) - 1 }
      }

      return { s: parseCell(start), e: parseCell(end) }
    }

    const encodeCell = (cell: { c: number; r: number }) => {
      let colStr = ''
      let temp = cell.c
      while (temp >= 0) {
        colStr = String.fromCharCode((temp % 26) + 65) + colStr
        temp = Math.floor(temp / 26) - 1
      }
      return colStr + (cell.r + 1)
    }

    const range = decodeRange(ref)

    // Styles definition using Segoe UI font for high compatibility and aesthetics
    const headerStyle = {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F497D' } }, // Premium Deep Navy Blue
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '1F497D' } },
        bottom: { style: 'medium', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '1F497D' } },
        right: { style: 'thin', color: { rgb: '1F497D' } }
      }
    }

    const centerStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } }, // Subtle light blue-gray for zebra striping
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const centerStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const leftStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const leftStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const rightStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const rightStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    // Loop through all cell coordinates in range
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = encodeCell({ r: R, c: C })
        let cell = ws[cellRef]
        if (!cell) {
          // Create an empty text cell placeholder to display clean borders
          cell = { t: 's', v: '' }
          ws[cellRef] = cell
        }

        // Header row formatting
        if (R === 0 && !isStudentSingle) {
          cell.s = headerStyle
          continue
        }

        // Data Row Styling (Odd / Even zebra striping and alignment rules)
        const isEven = R % 2 === 0
        let style = isEven ? leftStyleEven : leftStyleOdd

        // Horizontal list coordinates
        const colHeaderCell = ws[encodeCell({ r: 0, c: C })]
        const headerName = colHeaderCell ? String(colHeaderCell.v).toUpperCase() : ''

        if (
          headerName === 'NO' ||
          headerName === 'STUDENT ID' ||
          headerName === 'SEX' ||
          headerName === 'BIRTHDAY' ||
          headerName === 'PASSPORT' ||
          headerName === 'DATE OF ISSUE' ||
          headerName === 'DATE OF EXPIRATION' ||
          headerName.includes('STATUS') ||
          headerName.includes('SCORE') ||
          headerName === 'PRIORITY' ||
          headerName === 'DATE & TIME' ||
          headerName === 'DATE' ||
          headerName.includes('PHONE') ||
          headerName.includes('TARIFF') ||
          headerName.includes('GROUP') ||
          headerName.includes('OFFICE') ||
          headerName.includes('LEAD') ||
          headerName.includes('LEVEL')
        ) {
          style = isEven ? centerStyleEven : centerStyleOdd
        } else if (headerName.includes('UZS') || headerName.includes('BALANCE') || headerName.includes('DISCOUNT') || headerName.includes('AMOUNT')) {
          style = isEven ? rightStyleEven : rightStyleOdd
          if (cell.v !== '' && cell.v !== null && cell.v !== undefined) {
            const num = parseFloat(String(cell.v).replace(/,/g, ''))
            if (!isNaN(num)) {
              cell.t = 'n'
              cell.v = num
              cell.z = '#,##0'
            }
          }
        }

        cell.s = style
      }
    }

    // Apply row heights (Header: 28px, Rows: 22px for spacious touch)
    const rowHeights = []
    rowHeights.push({ hpx: 28 }) // Header row
    for (let R = 1; R <= range.e.r; ++R) {
      rowHeights.push({ hpx: 22 })
    }
    ws['!rows'] = rowHeights
  }

  // Download selected students as Excel
  const downloadSelectedAsExcel = async () => {
    if (selectedExcelIds.length === 0) {
      alert('Please select at least one student!')
      return
    }

    // Load the Excel library only when actually exporting, instead of
    // shipping it in the initial bundle for this page.
    const XLSX = await import('xlsx-js-style')

    // Get student data for selected IDs globally, matching the alphabetical sort order
    const selectedStudents = students
      .filter((s) => selectedExcelIds.includes(s.id))
      .sort((a, b) => compareStudentIds(a, b, sortOrder))

    let excelData: Record<string, any>[]
    let colWidths: { wch: number }[]

    if (excelExportMode === 'partial') {
      // ── Partial export: personal / contact / certificate columns only ──
      excelData = selectedStudents.map((s, index) => ({
        No: index + 1,
        'Student ID': s.id || '',
        'Full Name': s.full_name || '',
        'Korean Name': s.korean_name || '',
        'Phone 1': s.phone1 || '',
        'Phone 2': s.phone2 || '',
        Email: s.email || '',
        Birthday: s.birthday || '',
        Sex: s.gender || '',
        Passport: s.passport || '',
        'Date of Issue': s.passport_issue_date || '',
        'Date of Expiration': s.passport_expire_date || '',
        'Language Certificate 1': s.language_certificate || '',
        'Score 1': s.certificate_score || '',
        'Language Certificate 2': s.language_certificate_2 || '',
        'Score 2': s.certificate_score_2 || '',
        'Language Certificate 3': s.language_certificate_3 || '',
        'Score 3': s.certificate_score_3 || '',
        Address: s.address || '',
        'Educational Background': s.educational_background || '',
        major: s.major || '',
        'Father Fullname': s.father_name || '',
        'Father Phone': s.father_phone || '',
        'Mother Fullname': s.mother_name || '',
        'Mother Phone': s.mother_phone || '',
      }))
      colWidths = [
        { wch: 5 },  // No
        { wch: 12 }, // Student ID
        { wch: 35 }, // Full Name
        { wch: 35 }, // Korean Name
        { wch: 15 }, // Phone 1
        { wch: 15 }, // Phone 2
        { wch: 25 }, // Email
        { wch: 12 }, // Birthday
        { wch: 6 },  // Sex
        { wch: 12 }, // Passport
        { wch: 12 }, // Date of Issue
        { wch: 12 }, // Date of Expiration
        { wch: 20 }, // Language Certificate 1
        { wch: 8 },  // Score 1
        { wch: 20 }, // Language Certificate 2
        { wch: 8 },  // Score 2
        { wch: 20 }, // Language Certificate 3
        { wch: 8 },  // Score 3
        { wch: 40 }, // Address
        { wch: 35 }, // Educational Background
        { wch: 20 }, // major
        { wch: 35 }, // Father Fullname
        { wch: 15 }, // Father Phone
        { wch: 35 }, // Mother Fullname
        { wch: 15 }, // Mother Phone
      ]
    } else {
      // ── Full export: all columns ──
      excelData = selectedStudents.map((s, index) => ({
        No: index + 1,
        'Student ID': s.id || '',
        'Full Name': s.full_name || '',
        'Korean Name': s.korean_name || '',
        'Phone 1': s.phone1 || '',
        'Phone 2': s.phone2 || '',
        Email: s.email || '',
        Birthday: s.birthday || '',
        Sex: s.gender || '',
        Passport: s.passport || '',
        'Date of Issue': s.passport_issue_date || '',
        'Date of Expiration': s.passport_expire_date || '',
        'Language Certificate 1': s.language_certificate || '',
        'Score 1': s.certificate_score || '',
        'Language Certificate 2': s.language_certificate_2 || '',
        'Score 2': s.certificate_score_2 || '',
        'Language Certificate 3': s.language_certificate_3 || '',
        'Score 3': s.certificate_score_3 || '',
        Address: s.address || '',
        'Education Level 1': s.level || '',
        'Education Level 2': s.level2 || '',
        Tariff: s.tariff || '',
        Group: s.student_group || '',
        'Lead by': s.lead_by || '',
        Office: s.office || '',
        'Educational Background': s.educational_background || '',
        major: s.major || '',
        'Father Fullname': s.father_name || '',
        'Father Phone': s.father_phone || '',
        'Mother Fullname': s.mother_name || '',
        'Mother Phone': s.mother_phone || '',
        'University 1': s.university_1 || '',
        'University 1 Status': s.university_1_status || '',
        'University 2': s.university_2 || '',
        'University 2 Status': s.university_2_status || '',
        'University 3': s.university_3 || '',
        'University 3 Status': s.university_3_status || '',
        Notes: s.notes || '',
        Priority: s.row_color || '',
        'Balance (UZS)': s.balance !== undefined ? s.balance : '',
        'Discount (UZS)': s.discount !== undefined ? s.discount : '',
      }))
      colWidths = [
        { wch: 5 },  // No
        { wch: 12 }, // Student ID
        { wch: 35 }, // Full Name
        { wch: 35 }, // Korean Name
        { wch: 15 }, // Phone 1
        { wch: 15 }, // Phone 2
        { wch: 25 }, // Email
        { wch: 12 }, // Birthday
        { wch: 6 },  // Sex
        { wch: 12 }, // Passport
        { wch: 12 }, // Date of Issue
        { wch: 12 }, // Date of Expiration
        { wch: 20 }, // Language Certificate 1
        { wch: 8 },  // Score 1
        { wch: 20 }, // Language Certificate 2
        { wch: 8 },  // Score 2
        { wch: 20 }, // Language Certificate 3
        { wch: 8 },  // Score 3
        { wch: 40 }, // Address
        { wch: 20 }, // Education Level 1
        { wch: 20 }, // Education Level 2
        { wch: 15 }, // Tariff
        { wch: 15 }, // Group
        { wch: 15 }, // Lead by
        { wch: 15 }, // Office
        { wch: 35 }, // Educational Background
        { wch: 20 }, // major
        { wch: 35 }, // Father Fullname
        { wch: 15 }, // Father Phone
        { wch: 35 }, // Mother Fullname
        { wch: 15 }, // Mother Phone
        { wch: 30 }, // University 1
        { wch: 18 }, // University 1 Status
        { wch: 30 }, // University 2
        { wch: 18 }, // University 2 Status
        { wch: 30 }, // University 3
        { wch: 18 }, // University 3 Status
        { wch: 30 }, // Notes
        { wch: 12 }, // Priority
        { wch: 15 }, // Balance (UZS)
        { wch: 15 }, // Discount (UZS)
      ]
    }

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    ws['!cols'] = colWidths

    // Apply premium styling
    styleWorksheet(ws, false)

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0]
    const suffix = excelExportMode === 'partial' ? '_Partial' : '_Full'
    const filename = `Students_Export${suffix}_${dateStr}.xlsx`

    // Download
    XLSX.writeFile(wb, filename)

    // Close modal
    setIsExcelModalOpen(false)
  }

  // Reset select checklist to empty ONLY when the modal transitions from closed to open (unchecked by default)
  useEffect(() => {
    if (isExcelModalOpen) {
      setExcelSelectedFolders(
        activeFolder === 'all' || activeFolder === 'deleted'
          ? []
          : activeFolder === 'except'
            ? ['NO_FOLDER']
            : [activeFolder]
      )
      setExcelSelectedTariffs(selectedTariffs)
      setExcelSelectedLevels(activeFolder === 'deleted' ? ['DELETED'] : selectedLevels)
      setExcelSelectedGroups(selectedGroups)
      setExcelSelectedCerts(selectedCerts)
      setExcelSelectedScores(selectedScores)
      setExcelSelectedTags(selectedTags)
      setExcelSelectedLeads(selectedLeads)
      setExcelSearchQuery(searchQuery)
      setSelectedExcelIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExcelModalOpen])

  // Dismiss active action tag tooltip on global click
  useEffect(() => {
    if (!activeTooltip) return
    const handleGlobalClick = () => {
      setActiveTooltip(null)
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [activeTooltip])

  const handleToggleExcelStudent = (id: string) => {
    setSelectedExcelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAllExcel = () => {
    const allFilteredIds = sortedExcelStudents.map(s => s.id)
    const allSelected = allFilteredIds.every(id => selectedExcelIds.includes(id))

    if (allSelected) {
      setSelectedExcelIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedExcelIds(prev => {
        const added = allFilteredIds.filter(id => !prev.includes(id))
        return [...prev, ...added]
      })
    }
  }

  const allFilteredIds = sortedExcelStudents.map(s => s.id)
  const checkedFilteredCount = allFilteredIds.filter(id => selectedExcelIds.includes(id)).length
  const isAllExcelSelected = allFilteredIds.length > 0 && checkedFilteredCount === allFilteredIds.length
  const isExcelIndeterminate = checkedFilteredCount > 0 && checkedFilteredCount < allFilteredIds.length

  // Modal form state
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState<boolean>(false)

  // Form inputs
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [office, setOffice] = useState<string>('')
  const [popoverAnchor, setPopoverAnchor] = useState<{ studentId: string; rect: DOMRect } | null>(null)
  const popoverTransition = useCssTransition(!!popoverAnchor, 220)
  // Keep the last non-null anchor around while the close animation plays,
  // since popoverAnchor itself flips to null immediately on close.
  const lastPopoverAnchorRef = useRef(popoverAnchor)
  if (popoverAnchor) lastPopoverAnchorRef.current = popoverAnchor

  useEffect(() => {
    if (officeOptions && officeOptions.length > 0 && !office) {
      setOffice(officeOptions[0])
    }
  }, [officeOptions, office])

  // Add Student modal can also be opened from the Header; catch both triggers.
  useEffect(() => {
    if (isModalOpen) setHasOpenedAddModal(true)
  }, [isModalOpen])

  // Students are already fetched once by StudentDashboardProvider on mount and
  // kept fresh via fetchStudents(true) after every mutation below, so no
  // re-fetch is needed here on each visit to this page.

  // Listen to scroll events on main-content container and save to context
  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    if (!mainContent) return

    const handleScroll = () => {
      setScrollPosition(mainContent.scrollTop)
    }

    mainContent.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      mainContent.removeEventListener('scroll', handleScroll)
    }
  }, [setScrollPosition])

  // Restore scroll position after data is loaded and rendered
  useEffect(() => {
    if (!loading && students.length > 0) {
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        // Use a small timeout to ensure the DOM is settled
        const timeoutId = setTimeout(() => {
          mainContent.scrollTop = getScrollPosition()
        }, 50)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [loading, students, getScrollPosition])

  useEffect(() => {
    const saved = localStorage.getItem('customTagsRegistry')
    if (saved) {
      try {
        setCustomTagsRegistry(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse customTagsRegistry:', e)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students])

  // Reset pagination when search query or filter values change
  useEffect(() => {
    setCurrentPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTariffs, selectedLevels, selectedGroups, selectedCerts, selectedScores, selectedTags, selectedLeads])

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
      fetchStudents(true)
    }
  }

  const handleUpdateInvoice = async (studentId: string, status: string | null, university: string | null = null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, invoice: status, invoice_university: university } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ invoice: status, invoice_university: university })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student invoice status:', updateError.message || updateError)
      fetchStudents(true)
    }
  }

  const handleInvoiceChange = (studentId: string, currentStatus: string | null, newStatus: string) => {
    const isFirstAssign = (!currentStatus || currentStatus === 'NOT TAKEN') && newStatus !== 'NOT TAKEN'
    
    if (isFirstAssign) {
      setActiveInvoiceStudentId(studentId)
      setInvoicePendingStatus(newStatus)
      setUniSearchQuery('')
      setIsChooseUniModalOpen(true)
    } else {
      const student = students.find(s => s.id === studentId)
      const uniToKeep = newStatus === 'NOT TAKEN' ? null : (student?.invoice_university || null)
      handleUpdateInvoice(studentId, newStatus, uniToKeep)
    }
  }

  const handleUpdateCoa = async (studentId: string, status: string | null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, coa: status } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ coa: status })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student CoA status:', updateError.message || updateError)
      fetchStudents(true)
    }
  }

  const handleUpdateEmbassy = async (studentId: string, status: string | null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, embassy: status } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ embassy: status })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student embassy status:', updateError.message || updateError)
      fetchStudents(true)
    }
  }

  const getInvoiceBadgeClass = (status: string | null) => {
    const val = status || 'NOT TAKEN'
    if (val === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30 font-bold'
    if (val === 'NOT PAID') return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30 font-bold'
    if (val === 'TAKEN') return 'bg-violet-50 text-violet-700 border-violet-200/50 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-800/30 font-bold'
    if (val === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30 font-bold'
    return 'bg-zinc-100 text-zinc-700 border-zinc-200/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/30 font-semibold'
  }

  const getCoaBadgeClass = (status: string | null) => {
    const val = status || 'NOT TAKEN'
    if (val === 'TAKEN') return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30 font-bold'
    if (val === 'MISTAKE') return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30 font-bold'
    if (val === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30 font-bold'
    return 'bg-zinc-100 text-zinc-700 border-zinc-200/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/30 font-semibold'
  }

  const getEmbassyBadgeClass = (status: string | null) => {
    const val = status || 'Not Applied'
    if (val === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30'
    if (val === 'Applied') return 'bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30'
    if (val === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30'
    return 'bg-zinc-100 text-zinc-700 border-zinc-200/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/30'
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
      fetchStudents(true)
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
      fetchStudents(true)
    }
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete student profile "${studentName}"?`)) return
    setPopoverAnchor(null)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_deleted: true } : s))
    const { error: deleteError } = await (supabase
      .from('students') as any)
      .update({ is_deleted: true })
      .eq('id', studentId)
    if (deleteError) {
      console.error('Error soft-deleting student:', deleteError)
      fetchStudents(true)
    }
  }

  const handleRestoreStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to restore student profile "${studentName}"?`)) return
    setPopoverAnchor(null)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_deleted: false } : s))
    const { error: restoreError } = await (supabase
      .from('students') as any)
      .update({ is_deleted: false })
      .eq('id', studentId)
    if (restoreError) {
      console.error('Error restoring student:', restoreError)
      fetchStudents(true)
    }
  }

  const handlePermanentDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete student profile "${studentName}"? This action CANNOT be undone and will delete all their data.`)) return
    setPopoverAnchor(null)
    setStudents(prev => prev.filter(s => s.id !== studentId))
    const { error: deleteError } = await (supabase
      .from('students') as any)
      .delete()
      .eq('id', studentId)
    if (deleteError) {
      console.error('Error permanently deleting student:', deleteError)
      fetchStudents(true)
    }
  }

  const handleChangeStudentFolder = async (studentId: string, folderIds: string[]) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, folder_ids: folderIds } : s))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ folder_ids: folderIds })
      .eq('id', studentId)
    if (updateError) {
      console.error('Error updating student folder:', updateError)
      fetchStudents(true)
    }
  }

  const [isFolderAddModalOpen, setIsFolderAddModalOpen] = useState(false)
  const folderAddTransition = useCssTransition(isFolderAddModalOpen, 220)
  const [folderAddSearch, setFolderAddSearch] = useState('')
  const [folderAddSelectedIds, setFolderAddSelectedIds] = useState<string[]>([])

  const handleOpenFolderAdd = () => {
    setFolderAddSelectedIds([])
    setFolderAddSearch('')
    setIsFolderAddModalOpen(true)
  }

  const handleSaveFolderAdd = async () => {
    if (folderAddSelectedIds.length === 0 || activeFolder === 'all' || activeFolder === 'deleted' || activeFolder === 'except') return
    const folderId = activeFolder
    
    // Optimistic update
    setStudents(prev => prev.map(s => {
      if (folderAddSelectedIds.includes(s.id)) {
        const current = s.folder_ids || []
        const updated = current.includes(folderId) ? current : [...current, folderId]
        return { ...s, folder_ids: updated }
      }
      return s
    }))
    setIsFolderAddModalOpen(false)

    try {
      const updates = folderAddSelectedIds.map(async (studentId) => {
        const student = students.find(s => s.id === studentId)
        if (!student) return
        const current = student.folder_ids || []
        if (current.includes(folderId)) return
        const updated = [...current, folderId]
        const { error } = await (supabase
          .from('students') as any)
          .update({ folder_ids: updated })
          .eq('id', studentId)
        if (error) throw error
      })
      await Promise.all(updates)
    } catch (updateError) {
      console.error('Error adding students to folder:', updateError)
      fetchStudents(true)
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
      // Auto-translate name to Korean on creation
      let translatedKoreanName: string | null = null
      try {
        let aiSettings: any = null
        try {
          const stored = localStorage.getItem('ai_settings')
          if (stored) aiSettings = JSON.parse(stored)
        } catch {}
        
        const provider = aiSettings?.provider || 'gemini'
        const apiKey = (provider === 'openai' ? aiSettings?.openaiApiKey : aiSettings?.apiKey) || ''
        const model = provider === 'openai' ? (aiSettings?.openaiModel || 'gpt-4o') : (aiSettings?.model || 'gemini-3.5-flash')

        const response = await fetch('/api/translate-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: [fullName.trim()], provider, apiKey, model }),
        })
        const data = await response.json()
        if (response.ok && data.results && data.results[0]) {
          translatedKoreanName = String(data.results[0]).toUpperCase()
        }
      } catch (translateErr) {
        console.warn('Auto name translation failed on creation:', translateErr)
      }

      const { error: insertError } = await supabase
        .from('students')
        .insert({
          id: studentId.trim().toUpperCase(),
          full_name: fullName.trim().toUpperCase(),
          korean_name: translatedKoreanName,
          office: office,
          // Explicitly set default fields to avoid RLS/constraint issue
          university_1_status: 'Chosen',
          balance: 0,
          discount: 0,
          pick_needed: syncMissingDocuments({
            id: studentId.trim().toUpperCase(),
            full_name: fullName.trim().toUpperCase(),
            office: office,
            phone1: null,
            phone2: null,
            father_phone: null,
            mother_phone: null,
            email: null,
            passport: null,
            address: null,
            level: null,
            pick_needed: []
          } as unknown as Student),
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

      // Send Telegram Notification
      const safeName = fullName ? fullName.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unknown'
      const safeOffice = office ? office.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-'
      const notifMsg = `🆕 <b>New Registration!</b>\n\n👤 <b>Name:</b> ${safeName}\n🆔 <b>ID:</b> ${studentId.trim().toUpperCase()}\n🏢 <b>Office:</b> ${safeOffice}`
      sendTelegramNotification(notifMsg)

      setModalSuccess(true)
      setStudentId('')
      setFullName('')
      setOffice(officeOptions[0] || '')

      await fetchStudents(true)

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
    // 1. Folder filtering
    if (activeFolder === 'deleted') {
      if (student.is_deleted !== true) return false
    } else if (activeFolder === 'all') {
      if (student.is_deleted === true) return false
    } else if (activeFolder === 'except') {
      if (student.is_deleted === true) return false
      if (student.folder_ids && student.folder_ids.length > 0) return false
    } else {
      // Custom folder selection
      if (student.is_deleted === true) return false
      if (!(student.folder_ids || []).includes(activeFolder)) return false
    }

    // 2. Search query matching
    const matchesSearch =
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.phone1 && student.phone1.includes(searchQuery)) ||
      (student.phone2 && student.phone2.includes(searchQuery))

    // 3. Tariff filter (handling NO_TARIFF)
    let matchesTariff = false
    if (selectedTariffs.length === 0) {
      matchesTariff = true
    } else {
      if (selectedTariffs.includes('NO_TARIFF') && !student.tariff) {
        matchesTariff = true
      }
      if (student.tariff && selectedTariffs.includes(student.tariff)) {
        matchesTariff = true
      }
    }

    // 4. Level filter (handling NO_LEVEL and DELETED)
    const activeLevels = selectedLevels.filter(l => l !== 'DELETED')
    let matchesLevel = false
    if (activeLevels.length === 0) {
      matchesLevel = true
    } else {
      if (activeLevels.includes('NO_LEVEL') && !student.level && !student.level2) {
        matchesLevel = true
      }
      if (student.level && activeLevels.includes(student.level)) {
        matchesLevel = true
      }
      if (student.level2 && activeLevels.includes(student.level2)) {
        matchesLevel = true
      }
    }

    // 5. Group filter (handling NO_GROUP)
    let matchesGroup = false
    if (selectedGroups.length === 0) {
      matchesGroup = true
    } else {
      if (selectedGroups.includes('NO_GROUP') && !student.student_group) {
        matchesGroup = true
      }
      if (student.student_group && selectedGroups.includes(student.student_group)) {
        matchesGroup = true
      }
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
      const certs = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
      matchesCertificate = certs.some((c, i) => {
        if (!c || c === "NO CERTIFICATE") return false
        if (c.toUpperCase() !== cert.toUpperCase()) return false
        const score = (scores[i] || "").trim().toUpperCase()
        return selectedScores.some(f => f.toUpperCase() === score)
      })
    }

    let matchesTag = false
    if (selectedTags.length === 0) {
      matchesTag = true
    } else {
      matchesTag = selectedTags.some(tag => {
        if (tag === 'Custom') {
          const predefined = ['Call', 'Apply', 'Documents', 'Payment']
          return student.task_tags && student.task_tags.some(t => !predefined.includes(t))
        } else {
          return student.task_tags && student.task_tags.includes(tag)
        }
      })
    }

    let matchesLeadBy = false
    if (selectedLeads.length === 0) {
      matchesLeadBy = true
    } else {
      if (selectedLeads.includes('NO_LEADBY') && !student.lead_by) {
        matchesLeadBy = true
      }
      if (student.lead_by && selectedLeads.includes(student.lead_by)) {
        matchesLeadBy = true
      }
    }

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
      if (colorKey === 'EMERALD' || colorKey === 'BLUE' || colorKey === 'YELLOW') {
        return {
          className: (colorKey === 'EMERALD'
            ? 'bg-[#8fcc77] hover:bg-[#7ec264] dark:bg-emerald-900/65 dark:hover:bg-emerald-900/80'
            : colorKey === 'BLUE'
              ? 'bg-[#82b9e3] hover:bg-[#6aa9da] dark:bg-blue-900/65 dark:hover:bg-blue-900/80'
              : 'bg-[#ffd24d] hover:bg-[#ffc61a] dark:bg-amber-900/65 dark:hover:bg-amber-900/80'),
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
      <ul className="space-y-1 text-[10px] text-[var(--foreground)] leading-relaxed list-none pl-0 font-medium">
        {unis.map((uni, idx) => (
          <li key={idx} className="flex items-start gap-1 min-w-0">
            <span className="text-[var(--foreground-muted)] select-none shrink-0">•</span>
            <span className="truncate" title={uni || undefined}>{uni}</span>
          </li>
        ))}
      </ul>
    )
  }

  // Render Actions column circular indicators

  const hasActiveFilters = 
    selectedTariffs.length > 0 ||
    selectedLevels.length > 0 ||
    selectedGroups.length > 0 ||
    selectedCerts.length > 0 ||
    selectedScores.length > 0 ||
    selectedTags.length > 0 ||
    selectedLeads.length > 0

  const renderActiveFilterChips = () => {
    if (!hasActiveFilters) return null

    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1 select-none animate-in fade-in slide-in-from-top-1 duration-200">
        <span className="text-[11px] font-bold text-[var(--foreground-muted)] mr-1">Active Filters:</span>
        
        {selectedTariffs.map(t => (
          <div key={`tariff-${t}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Tariff: {t === 'NO_TARIFF' ? 'No Tariff' : t}</span>
            <button 
              type="button" 
              onClick={() => setSelectedTariffs(prev => prev.filter(x => x !== t))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedLevels.map(l => (
          <div key={`level-${l}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Level: {l === 'NO_LEVEL' ? 'No Level' : l === 'DELETED' ? 'Deleted students' : l}</span>
            <button 
              type="button" 
              onClick={() => setSelectedLevels(prev => prev.filter(x => x !== l))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedGroups.map(g => (
          <div key={`group-${g}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Group: {g === 'NO_GROUP' ? 'No Group' : g}</span>
            <button 
              type="button" 
              onClick={() => setSelectedGroups(prev => prev.filter(x => x !== g))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedCerts.map(c => (
          <div key={`cert-${c}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Cert: {c}</span>
            <button 
              type="button" 
              onClick={() => {
                setSelectedCerts(prev => prev.filter(x => x !== c))
                setSelectedScores([])
              }}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedScores.map(s => (
          <div key={`score-${s}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Score: {getScoreLabel(s)}</span>
            <button 
              type="button" 
              onClick={() => setSelectedScores(prev => prev.filter(x => x !== s))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedTags.map(t => (
          <div key={`tag-${t}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Tag: {getCustomTagIcon(t)} {t}</span>
            <button 
              type="button" 
              onClick={() => setSelectedTags(prev => prev.filter(x => x !== t))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selectedLeads.map(l => (
          <div key={`lead-${l}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] font-semibold rounded-full shadow-xs">
            <span>Lead: {l === 'NO_LEADBY' ? 'No Lead by' : l}</span>
            <button 
              type="button" 
              onClick={() => setSelectedLeads(prev => prev.filter(x => x !== l))}
              className="text-[var(--foreground-muted)] hover:text-red-500 rounded-full hover:bg-red-500/10 h-4 w-4 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button 
          onClick={resetAllFilters}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ml-1 cursor-pointer select-none"
        >
          Clear All
        </button>
      </div>
    )
  }
 
  return (
    <PageShell>
      {/* Active Filter Chips */}
      {renderActiveFilterChips()}
 
      {/* Telegram-Style Folders Selector */}
      <div className="mb-3 flex items-center overflow-x-auto scrollbar-none gap-6 select-none shrink-0 border-b border-[var(--border)] dark:border-border/60 pb-2 px-1">
        {/* All Folder */}
        <button
          onClick={() => setActiveFolder('all')}
          className={cn(
            "relative text-sm font-semibold transition-all cursor-pointer whitespace-nowrap pb-2 -mb-2.5 border-b-2",
            activeFolder === 'all'
              ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold animate-none"
              : "text-[var(--foreground-muted)] border-transparent hover:text-[var(--foreground)]"
          )}
        >
          All
        </button>

        {/* Custom Folders */}
        {foldersOptions.map((folder) => {
          const isActive = activeFolder === folder.id
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={cn(
                "relative text-sm font-semibold transition-all cursor-pointer whitespace-nowrap pb-2 -mb-2.5 border-b-2",
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold animate-none"
                  : "text-[var(--foreground-muted)] border-transparent hover:text-[var(--foreground)]"
              )}
            >
              {folder.name}
            </button>
          )
        })}
 
        {/* Except Folder */}
        <button
          onClick={() => setActiveFolder('except')}
          className={cn(
            "relative text-sm font-semibold transition-all cursor-pointer whitespace-nowrap pb-2 -mb-2.5 border-b-2 ml-auto",
            activeFolder === 'except'
              ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold animate-none"
              : "text-[var(--foreground-muted)] border-transparent hover:text-[var(--foreground)]"
          )}
        >
          Except
        </button>

        {/* Archive Folder */}
        <button
          onClick={() => setActiveFolder('deleted')}
          className={cn(
            "relative text-sm font-semibold transition-all cursor-pointer whitespace-nowrap pb-2 -mb-2.5 border-b-2",
            activeFolder === 'deleted'
              ? "text-red-500 border-red-500 font-bold animate-none"
              : "text-[var(--foreground-muted)] border-transparent hover:text-red-500"
          )}
        >
          Archive
        </button>
      </div>

      {/* Roster Total Count */}
      <div className="mb-2 flex justify-between items-center text-xs text-[var(--foreground-muted)] italic px-1 font-medium select-none">
        <div>
          {(searchQuery || selectedTariffs.length > 0 || selectedLevels.length > 0 || selectedGroups.length > 0 || selectedCerts.length > 0 || selectedScores.length > 0 || selectedTags.length > 0 || selectedLeads.length > 0) ? (
            <span>Showing {filteredStudents.length} of {students.filter(s => activeFolder === 'deleted' ? s.is_deleted : activeFolder === 'all' ? !s.is_deleted : activeFolder === 'except' ? (!s.is_deleted && (!s.folder_ids || s.folder_ids.length === 0)) : (!s.is_deleted && (s.folder_ids || []).includes(activeFolder))).length} students</span>
          ) : (
            <span>Showing all students in {activeFolder === 'all' ? 'All' : activeFolder === 'deleted' ? 'Archive' : activeFolder === 'except' ? 'Except' : (foldersOptions.find(f => f.id === activeFolder)?.name || 'Folder')}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Add to Folder button — only for custom folders */}
          {activeFolder !== 'all' && activeFolder !== 'deleted' && activeFolder !== 'except' && (
            <button
              onClick={handleOpenFolderAdd}
              className="not-italic inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add to Folder
            </button>
          )}
          <div className="text-right">Total {filteredStudents.length} students</div>
        </div>
      </div>

      {/* Main Table Display */}
      {loading ? (
        // Skeleton Loader
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="divide-y divide-[var(--border)] animate-pulse">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center gap-6">
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
            onClick={() => fetchStudents(true)}
            className="mt-4 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        // Empty State
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Users className="h-8 w-8 text-[var(--accent)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {activeFolder !== 'all' && activeFolder !== 'deleted' && activeFolder !== 'except' ? 'No students in this folder yet' : 'No students found'}
          </h3>
          <p className="mt-1.5 text-sm text-[var(--foreground-muted)] max-w-sm mx-auto">
            {activeFolder !== 'all' && activeFolder !== 'deleted' && activeFolder !== 'except'
              ? `Add students to the "${foldersOptions.find(f => f.id === activeFolder)?.name || 'folder'}" folder to see them here.`
              : 'No students match your active search filters or table criteria.'}
          </p>
          {activeFolder !== 'all' && activeFolder !== 'deleted' && activeFolder !== 'except' ? (
            <button
              onClick={handleOpenFolderAdd}
              className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Students to Folder
            </button>
          ) : !searchQuery && selectedTariffs.length === 0 && selectedLevels.length === 0 && (
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
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: '5rem' }} />
                <col style={{ width: hidePhone ? '28%' : '27%' }} />
                {!hidePhone && <col style={{ width: '13%' }} />}
                <col style={{ width: hidePhone ? '10%' : '11%' }} />
                {!hidePhone && <col style={{ width: '17%' }} />}
                {hidePhone && <col style={{ width: '11%' }} />}
                {hidePhone && <col style={{ width: '10%' }} />}
                {hidePhone && <col style={{ width: '11%' }} />}
                <col style={{ width: hidePhone ? '10%' : '12%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)] select-none">
                  <th
                    className="px-1 py-2.5 cursor-pointer select-none hover:bg-[var(--surface-elevated)] transition-colors rounded-tl-[var(--radius-lg)]"
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
                  <th className="px-1 py-2.5 w-[18%]">Full Name</th>
                  {!hidePhone && <th className="px-6 py-2.5 w-[12%]">Phone</th>}
                  <th className="px-6 py-2.5 w-[10%]">Level</th>
                  {!hidePhone && <th className="px-6 py-2.5 w-[32%]">University</th>}
                  {hidePhone && <th className="px-6 py-2.5 w-[11%]">Invoice</th>}
                  {hidePhone && <th className="px-6 py-2.5 w-[10%]">CoA</th>}
                  {hidePhone && <th className="px-6 py-2.5 w-[11%]">Embassy</th>}
                  <th className="px-6 py-2.5 text-left w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paginatedStudents.map((student) => {
                  const bgObj = getRowBgStyleAndClass(student)
                  return (
                    <tr
                      key={student.id}
                      onClick={() => window.open(`/students/${student.id}`, '_blank')}
                      className={`group cursor-pointer transition-colors text-sm text-[var(--foreground)] ${bgObj.className}`}
                      style={bgObj.style}
                    >
                      {/* ID Badge Column */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-center w-10 h-6.5 text-[11px] font-bold bg-[#007aff] text-white rounded-[4px] shadow-sm select-all">
                          {student.id}
                        </div>
                      </td>

                      {/* Full Name & Tariff Info Column */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold uppercase tracking-wide text-xs text-[var(--foreground)]">
                            {student.full_name}
                          </span>
                          {(() => {
                            const missing = syncMissingDocuments(student)
                            const isFullOk = missing.includes('FULL OK')
                            const hasMissing = missing.length > 0 && !isFullOk
                            if (isFullOk) {
                              return (
                                <span
                                  title="All required documents completed"
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shadow-sm flex-shrink-0"
                                  style={{ fontSize: '9px', boxShadow: '0 1px 4px rgba(16,185,129,0.45)' }}
                                >
                                  ✓
                                </span>
                              )
                            }
                            if (hasMissing) {
                              return (
                                <span
                                  title="Student has missing documents"
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white shadow-sm flex-shrink-0"
                                  style={{ fontSize: '9px', fontWeight: 900, boxShadow: '0 1px 4px rgba(245,158,11,0.45)' }}
                                >
                                  !
                                </span>
                              )
                            }
                            return null
                          })()}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(student.full_name)
                              setCopiedId(student.id)
                              setTimeout(() => setCopiedId(null), 2000)
                            }}
                            className="inline-flex items-center justify-center p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Copy full name"
                          >
                            {copiedId === student.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)] font-semibold tracking-wider uppercase mt-1">
                          {student.tariff || 'NO TARIFF'}
                        </div>
                      </td>

                      {/* Phone Numbers Column */}
                      {!hidePhone && (
                        <td className="px-6 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-3">
                            <div>
                              <div>{student.phone1 || '—'}</div>
                              {student.phone2 && <div className="mt-0.5">{student.phone2}</div>}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const lines = [
                                  `${student.id}  ${student.full_name}`,
                                  student.phone1,
                                  student.phone2
                                ].filter(Boolean)
                                navigator.clipboard.writeText(lines.join('\n'))
                                setCopiedPhoneId(student.id)
                                setTimeout(() => setCopiedPhoneId(null), 2000)
                              }}
                              className="inline-flex items-center justify-center p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Copy ID, name, and phone numbers"
                            >
                              {copiedPhoneId === student.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Levels & Languages Column */}
                      <td className="px-6 py-2.5 whitespace-nowrap">
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

                      {/* Invoice Column */}
                      {hidePhone && (
                        <td className="px-6 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center justify-center">
                            <select
                              value={student.invoice || 'NOT TAKEN'}
                              onChange={(e) => handleInvoiceChange(student.id, student.invoice, e.target.value)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none transition-all duration-200 select-none",
                                getInvoiceBadgeClass(student.invoice)
                              )}
                            >
                              <option value="NOT TAKEN" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Not Taken</option>
                              <option value="TAKEN" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Taken</option>
                              <option value="NOT PAID" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Not Paid</option>
                              <option value="PAID" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Paid</option>
                              <option value="CANCELLED" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Cancelled</option>
                            </select>
                            {student.invoice_university && (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold mt-1 block truncate max-w-[110px]" title={student.invoice_university}>
                                {student.invoice_university}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* CoA Column */}
                      {hidePhone && (
                        <td className="px-6 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={student.coa || 'NOT TAKEN'}
                            onChange={(e) => handleUpdateCoa(student.id, e.target.value)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none transition-all duration-200 select-none",
                              getCoaBadgeClass(student.coa)
                            )}
                          >
                            <option value="NOT TAKEN" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Not Taken</option>
                            <option value="TAKEN" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Taken</option>
                            <option value="MISTAKE" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Mistake</option>
                            <option value="CANCELLED" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Cancelled</option>
                          </select>
                        </td>
                      )}

                      {/* Embassy Column */}
                      {hidePhone && (
                        <td className="px-6 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={student.embassy || 'Not Applied'}
                            onChange={(e) => handleUpdateEmbassy(student.id, e.target.value)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none transition-all duration-200 select-none",
                              getEmbassyBadgeClass(student.embassy)
                            )}
                          >
                            <option value="Not Applied" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Not Applied</option>
                            <option value="Applied" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Applied</option>
                            <option value="Approved" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Approved</option>
                            <option value="Rejected" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Rejected</option>
                          </select>
                        </td>
                      )}

                      {/* Universities List Column */}
                      {!hidePhone && (
                        <td className="px-6 py-2.5 max-w-0">
                          {renderUniversities(student)}
                        </td>
                      )}

                      {/* Actions Column (Color Ball + Task Tags) */}
                      <td className="px-6 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-start gap-3 select-none whitespace-nowrap flex-nowrap">
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
                          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                            {(student.task_tags || []).map((tag, tagIdx) => {
                              const icon = getCustomTagIcon(tag)
                              return (
                                <span
                                  key={tagIdx}
                                  className="inline-flex items-center justify-center w-6.5 h-6.5 text-[13px] bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[6px] shadow-sm relative cursor-pointer select-none"
                                  title={tag}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (activeTooltip?.studentId === student.id && activeTooltip?.tagKey === tag) {
                                      setActiveTooltip(null)
                                    } else {
                                      setActiveTooltip({ studentId: student.id, tagKey: tag })
                                    }
                                  }}
                                >
                                  {icon}

                                  {/* iOS-styled Tooltip */}
                                  {activeTooltip?.studentId === student.id && activeTooltip?.tagKey === tag && (
                                    <div
                                      className="animate-dropdown-in absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-black/90 dark:bg-zinc-800 border border-white/10 dark:border-zinc-700/50 text-[10px] font-bold text-white rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] whitespace-nowrap z-50 pointer-events-none"
                                      style={{ transformOrigin: 'bottom center' }}
                                    >
                                      {tag}
                                      {/* Tooltip Triangle Arrow */}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4.5px] border-t-black/90 dark:border-t-zinc-800" />
                                    </div>
                                  )}
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
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-xs font-semibold border transition-all cursor-pointer ${currentPage === pageNum
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

      {/* Add Student Modal (lazy-loaded: not downloaded until first opened) */}
      {hasOpenedAddModal && (
        <AddStudentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          officeOptions={officeOptions}
          studentId={studentId}
          setStudentId={setStudentId}
          fullName={fullName}
          setFullName={setFullName}
          office={office}
          setOffice={setOffice}
          submitting={submitting}
          modalError={modalError}
          modalSuccess={modalSuccess}
          onSubmit={handleCreateStudent}
        />
      )}

      {/* Actions Modal */}
      {popoverTransition.shouldRender && (() => {
          const anchor = popoverAnchor || lastPopoverAnchorRef.current
          const student = anchor ? students.find(s => s.id === anchor.studentId) : undefined
          if (!student) return null

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop Overlay */}
              <div
                onClick={() => {
                  setPopoverAnchor(null)
                }}
                className={cn(
                  'fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out',
                  popoverTransition.isVisible ? 'opacity-100' : 'opacity-0'
                )}
              />

              {/* Modal Dialog Panel */}
              <div
                className={cn(
                  'relative w-full max-w-[640px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] z-10 text-xs text-[var(--foreground)] flex flex-col',
                  'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                  popoverTransition.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Student Name, ID and Close Button */}
                <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate" title={student.full_name}>
                      {student.full_name}
                    </h3>
                    <p className="text-[11px] text-[var(--foreground-muted)] font-medium mt-1">
                      Student ID: <span className="font-mono">{student.id}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPopoverAnchor(null)
                    }}
                    className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                    title="Close Menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex flex-col gap-6 px-6 py-6 max-h-[70vh] overflow-y-auto">

                  {/* ── Select Color Section ───────────────────── */}
                  <div>
                    <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10.5px] mb-3">
                      Select Color
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {Object.entries(ROW_COLOR_MAP).map(([name, data]) => {
                        const isActive = student.row_color?.toUpperCase() === name
                        return (
                          <button
                            key={name}
                            onClick={() => handleUpdateColor(student.id, name)}
                            className={`relative w-8 h-8 rounded-full cursor-pointer transition-all duration-150 flex items-center justify-center ${isActive ? 'scale-105' : 'hover:scale-110'
                              }`}
                            style={{
                              backgroundColor: data.ball,
                              boxShadow: isActive ? `0 0 0 2px var(--surface-elevated), 0 0 0 4px ${data.ball}` : undefined
                            }}
                            title={data.name}
                          >
                            {isActive && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                          </button>
                        )
                      })}
                      {/* Clear Color */}
                      <button
                        onClick={() => handleUpdateColor(student.id, null)}
                        className="w-8 h-8 rounded-full border border-dashed border-[var(--border)] cursor-pointer flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all"
                        title="Clear Color"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)]" />

                  {/* ── Quick Actions Section ───────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-3 select-none">
                      <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10.5px]">
                        Assign to Folder
                      </div>
                    </div>
 
                    {/* Inline Folder Selector Grid */}
                    <div className="flex flex-wrap gap-2">
                      {/* No Folder (All) Button */}
                      <button
                        type="button"
                        onClick={() => handleChangeStudentFolder(student.id, [])}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]",
                          (!student.folder_ids || student.folder_ids.length === 0)
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-bold shadow-xs"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)]"
                        )}
                      >
                        <span>📁 All (No Folder)</span>
                      </button>
 
                      {/* Custom Folders */}
                      {foldersOptions.map((folder) => {
                        const currentFolders = student.folder_ids || []
                        const isActive = currentFolders.includes(folder.id)
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => {
                              const newFolders = isActive
                                ? currentFolders.filter(id => id !== folder.id)
                                : [...currentFolders, folder.id]
                              handleChangeStudentFolder(student.id, newFolders)
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] animate-none",
                              isActive
                                ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-bold shadow-xs"
                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border-subtle)]"
                            )}
                          >
                            <span>📁 {folder.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)]" />

                  {/* ── Custom Tags Section ────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-[var(--foreground-muted)] uppercase tracking-wider text-[10.5px]">
                        Custom Tags
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2 max-h-56 overflow-y-auto pr-1">
                      {customTagsRegistry.length === 0 ? (
                        <div className="text-[11px] text-[var(--foreground-subtle)] italic py-1">
                          No custom tags yet.
                        </div>
                      ) : (
                        customTagsRegistry.map((tag) => {
                          const isActive = student.task_tags?.includes(tag.name)
                          return (
                            <button
                              key={tag.name}
                              onClick={() => handleToggleTag(student.id, tag.name)}
                              className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-[var(--radius-md)] border text-[12.5px] font-semibold transition-all text-left w-full cursor-pointer ${isActive
                                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                                }`}
                              title={isActive ? 'Click to remove from this student' : 'Click to apply to this student'}
                            >
                              <span className="leading-none text-base shrink-0">{tag.icon}</span>
                              <span className="truncate flex-1">{tag.name}</span>
                              {isActive && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Manage link */}
                    <a
                      href="/settings"
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--accent)] hover:underline opacity-70 hover:opacity-100 transition-opacity mt-0.5"
                    >
                      Manage custom tags in Settings →
                    </a>
                  </div>
                </div>

                {/* ── Clear All Flags / Delete Student Buttons ──────────────────── */}
                <div className="px-6 pb-6 pt-2 flex gap-3">
                  {student.is_deleted ? (
                    <>
                      <button
                        onClick={() => handleRestoreStudent(student.id, student.full_name)}
                        className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 font-semibold active:scale-[0.97] transition-all text-[11.5px] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-none" />
                        <span>Restore Student</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteStudent(student.id, student.full_name)}
                        className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold active:scale-[0.97] transition-all text-[11.5px] cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        <span>Permanently Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleClearFlagsAndColor(student.id)}
                        className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-red-500/25 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 font-semibold active:scale-[0.97] transition-all text-[11.5px] cursor-pointer"
                      >
                        Clear All Color & Tags
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                        className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold active:scale-[0.97] transition-all text-[11.5px] cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        <span>Delete Student</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
      })()}
      {/* Folder Add Students Modal */}
      {folderAddTransition.shouldRender && (() => {
          const folderName = foldersOptions.find(f => f.id === activeFolder)?.name || 'Folder'
          // All active students not already in this folder
          const pickableStudents = students.filter(s =>
            !s.is_deleted && !(s.folder_ids || []).includes(activeFolder)
          )
          const filtered = pickableStudents.filter(s =>
            s.full_name.toLowerCase().includes(folderAddSearch.toLowerCase()) ||
            s.id.toLowerCase().includes(folderAddSearch.toLowerCase())
          )
          const allSelected = filtered.length > 0 && filtered.every(s => folderAddSelectedIds.includes(s.id))
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={() => setIsFolderAddModalOpen(false)}
                className={cn(
                  'absolute inset-0 bg-black/50 transition-opacity duration-220 ease-out',
                  folderAddTransition.isVisible ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div
                className={cn(
                  'relative w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] z-10 flex flex-col max-h-[80vh]',
                  'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                  folderAddTransition.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
                )}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] shrink-0">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--foreground)]">Add Students to Folder</h3>
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      Folder: <span className="font-semibold text-blue-600 dark:text-blue-400">{folderName}</span>
                      {folderAddSelectedIds.length > 0 && <span className="ml-2 text-[var(--accent)] font-bold">· {folderAddSelectedIds.length} selected</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsFolderAddModalOpen(false)}
                    className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-4 pb-3 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--foreground-subtle)] pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search students by name or ID..."
                      value={folderAddSearch}
                      onChange={e => setFolderAddSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] focus:outline-none focus:border-blue-500 text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Select All row */}
                {filtered.length > 0 && (
                  <div className="px-6 pb-2 shrink-0">
                    <button
                      onClick={() => {
                        if (allSelected) {
                          setFolderAddSelectedIds(prev => prev.filter(id => !filtered.some(s => s.id === id)))
                        } else {
                          setFolderAddSelectedIds(prev => Array.from(new Set([...prev, ...filtered.map(s => s.id)])))
                        }
                      }}
                      className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {allSelected ? 'Deselect all' : `Select all ${filtered.length}`}
                    </button>
                  </div>
                )}

                {/* Student List */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-1.5">
                  {filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-[var(--foreground-muted)] italic">
                      {pickableStudents.length === 0 ? 'All students are already in this folder.' : 'No students match your search.'}
                    </div>
                  ) : filtered.map(s => {
                    const isSelected = folderAddSelectedIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => setFolderAddSelectedIds(prev =>
                          isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        )}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all w-full",
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                            : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--border-subtle)]"
                        )}
                      >
                        <div className={cn(
                          "h-4.5 w-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--foreground)] truncate">{s.full_name}</div>
                          <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{s.id}</div>
                        </div>
                        {s.folder_ids && s.folder_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {s.folder_ids.map(fId => {
                              const fName = foldersOptions.find(f => f.id === fId)?.name
                              if (!fName) return null
                              return (
                                <span key={fId} className="text-[10px] text-[var(--foreground-subtle)] bg-[var(--surface-elevated)] border border-[var(--border)] rounded px-1.5 py-0.5">
                                  {fName}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {folderAddSelectedIds.length} student{folderAddSelectedIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsFolderAddModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFolderAdd}
                      disabled={folderAddSelectedIds.length === 0}
                      className="px-4 py-2 text-xs font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save ({folderAddSelectedIds.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
      })()}

      {/* Choose University Modal for Invoice */}
      {isChooseUniModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div
            onClick={() => {
              setIsChooseUniModalOpen(false)
              setActiveInvoiceStudentId(null)
              setInvoicePendingStatus(null)
            }}
            className="fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out"
          />

          {/* Modal Panel */}
          <div className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10 flex flex-col max-h-[80vh]">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsChooseUniModalOpen(false)
                setActiveInvoiceStudentId(null)
                setInvoicePendingStatus(null)
              }}
              className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-[16px] font-bold text-[var(--foreground)] mb-1">
              Select University for Invoice
            </h3>
            <p className="text-[11px] text-[var(--foreground-muted)] mb-4">
              Please identify which university issued this invoice.
            </p>

            {/* Search Input */}
            <div className="relative mb-3.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--foreground-subtle)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search university..."
                value={uniSearchQuery}
                onChange={(e) => setUniSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] focus:outline-none focus:border-blue-500 text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]"
                autoFocus
              />
            </div>

            {/* University List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 max-h-[40vh] pr-1 scrollbar-thin">
              {(() => {
                const filtered = universityOptions.filter((uni) =>
                  uni.toLowerCase().includes(uniSearchQuery.toLowerCase())
                )

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-[var(--foreground-subtle)] italic">
                      No universities found matching your search.
                    </div>
                  )
                }

                return filtered.map((uni) => (
                  <button
                    key={uni}
                    onClick={() => {
                      if (activeInvoiceStudentId && invoicePendingStatus) {
                        handleUpdateInvoice(activeInvoiceStudentId, invoicePendingStatus, uni)
                      }
                      setIsChooseUniModalOpen(false)
                      setActiveInvoiceStudentId(null)
                      setInvoicePendingStatus(null)
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--border-subtle)] text-xs font-semibold text-[var(--foreground)] text-left cursor-pointer transition-all w-full"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{uni}</span>
                  </button>
                ))
              })()}
            </div>

            {/* Cancel Button */}
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => {
                  setIsChooseUniModalOpen(false)
                  setActiveInvoiceStudentId(null)
                  setInvoicePendingStatus(null)
                }}
                className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to Excel Modal */}
      {excelModalTransition.shouldRender && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <div
              onClick={() => setIsExcelModalOpen(false)}
              className={cn(
                'fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out',
                excelModalTransition.isVisible ? 'opacity-100' : 'opacity-0'
              )}
            />

            {/* Modal Panel */}
            <div
              className={cn(
                'relative w-full max-w-5xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10 flex flex-col max-h-[90vh]',
                'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                excelModalTransition.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
              )}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Download as Excel
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] mb-5">
                Filter and select specific students to compile into a styled Excel workbook.
              </p>

              {/* ── Search and Filter Controls Row ────────────────── */}
              <div className="mb-4 space-y-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-inner">
                {/* Click Away Overlay to dismiss open filter dropdowns inside modal */}
                {(isExcelTariffDropdownOpen || isExcelLevelDropdownOpen || isExcelGroupDropdownOpen || isExcelCertDropdownOpen || isExcelScoreDropdownOpen || isExcelTagDropdownOpen || isExcelLeadDropdownOpen || isExcelFolderDropdownOpen) && (
                  <div
                    className="fixed inset-0 z-30 bg-transparent cursor-default"
                    onClick={() => {
                      setIsExcelTariffDropdownOpen(false)
                      setIsExcelLevelDropdownOpen(false)
                      setIsExcelGroupDropdownOpen(false)
                      setIsExcelCertDropdownOpen(false)
                      setIsExcelScoreDropdownOpen(false)
                      setIsExcelTagDropdownOpen(false)
                      setIsExcelLeadDropdownOpen(false)
                      setIsExcelFolderDropdownOpen(false)
                    }}
                  />
                )}

                {/* First Row: Search Type, Search Query, Tariff */}
                <div className="flex flex-col md:flex-row gap-3 items-end relative z-50">
                  {/* Search Type (Small place) */}
                  <div className="w-full md:w-36">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Search Type
                    </label>
                    <select
                      value={excelSearchType}
                      onChange={(e) => setExcelSearchType(e.target.value as any)}
                      className="w-full h-[34px] px-3 py-1.5 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none text-xs font-semibold cursor-pointer"
                    >
                      <option value="all">All Fields</option>
                      <option value="id">ID</option>
                      <option value="name">Name</option>
                      <option value="phone">Phone</option>
                      <option value="university">University</option>
                    </select>
                  </div>

                  {/* Search Query */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Search Query
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={excelSearchQuery}
                        onChange={(e) => setExcelSearchQuery(e.target.value)}
                        className="w-full h-[34px] pl-8 pr-3 py-1.5 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Folder */}
                  <div className="w-full md:w-48 relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Folder
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelFolderDropdownOpen(prev => !prev)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Folder className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedFolders.length === 0
                          ? 'All Folders'
                          : excelSelectedFolders.length === (foldersOptions.length + 1)
                            ? 'All Folders'
                            : excelSelectedFolders.map(fid => fid === 'NO_FOLDER' ? 'No Folder' : (foldersOptions.find(f => f.id === fid)?.name || fid)).join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelFolderDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedFolders(prev => prev.length === (foldersOptions.length + 1) ? [] : ['NO_FOLDER', ...foldersOptions.map(f => f.id)])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedFolders.length === (foldersOptions.length + 1)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedFolders(prev => prev.includes('NO_FOLDER') ? prev.filter(f => f !== 'NO_FOLDER') : [...prev, 'NO_FOLDER'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedFolders.includes('NO_FOLDER')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>No Folder</span>
                        </div>
                        {foldersOptions.map(f => {
                          const isChecked = excelSelectedFolders.includes(f.id)
                          return (
                            <div
                              key={f.id}
                              onClick={() => setExcelSelectedFolders(prev => prev.includes(f.id) ? prev.filter(fid => fid !== f.id) : [...prev, f.id])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{f.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tariff */}
                  <div className="w-full md:w-48 relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Tariff
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelTariffDropdownOpen(prev => !prev)
                        setIsExcelFolderDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedTariffs.length === 0
                          ? 'All Tariffs'
                          : excelSelectedTariffs.length === (tariffOptions.length + 1)
                            ? 'All Tariffs'
                            : excelSelectedTariffs.map(t => t === 'NO_TARIFF' ? 'No Tariff' : t).join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelTariffDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedTariffs(prev => prev.length === (tariffOptions.length + 1) ? [] : ['NO_TARIFF', ...tariffOptions])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedTariffs.length === (tariffOptions.length + 1)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedTariffs(prev => prev.includes('NO_TARIFF') ? prev.filter(t => t !== 'NO_TARIFF') : [...prev, 'NO_TARIFF'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedTariffs.includes('NO_TARIFF')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>No Tariff</span>
                        </div>
                        {tariffOptions.map(opt => {
                          const isChecked = excelSelectedTariffs.includes(opt)
                          return (
                            <div
                              key={opt}
                              onClick={() => setExcelSelectedTariffs(prev => prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{opt}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Second Row: Level, Group, Certificate, (Score), Tags, Lead By */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 ${showExcelScoreFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 w-full relative z-40`}>
                  {/* Levels Filter */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Level
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelLevelDropdownOpen(prev => !prev)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedLevels.length === 0
                          ? 'All Levels'
                          : excelSelectedLevels.length === (levelOptions.length + 2)
                            ? 'All Levels'
                            : excelSelectedLevels.length + ' Selected'}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelLevelDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedLevels(prev => prev.length === (levelOptions.length + 2) ? [] : ['NO_LEVEL', 'DELETED', ...levelOptions])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedLevels.length === (levelOptions.length + 2)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedLevels(prev => prev.includes('NO_LEVEL') ? prev.filter(l => l !== 'NO_LEVEL') : [...prev, 'NO_LEVEL'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedLevels.includes('NO_LEVEL')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>No Level</span>
                        </div>
                        {levelOptions.map(opt => {
                          const isChecked = excelSelectedLevels.includes(opt)
                          return (
                            <div
                              key={opt}
                              onClick={() => setExcelSelectedLevels(prev => prev.includes(opt) ? prev.filter(l => l !== opt) : [...prev, opt])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{opt}</span>
                            </div>
                          )
                        })}
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedLevels(prev => prev.includes('DELETED') ? prev.filter(l => l !== 'DELETED') : [...prev, 'DELETED'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-rose-500/10 dark:hover:bg-rose-950/20 transition-colors select-none text-[11px] font-bold text-rose-600 dark:text-rose-400"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedLevels.includes('DELETED')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-rose-300 dark:border-rose-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <span>Deleted students</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Groups Filter */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Group
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelGroupDropdownOpen(prev => !prev)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedGroups.length === 0
                          ? 'All Groups'
                          : excelSelectedGroups.length === (uniqueGroups.length + 1)
                            ? 'All Groups'
                            : excelSelectedGroups.map(g => g === 'NO_GROUP' ? 'No Group' : g).join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelGroupDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedGroups(prev => prev.length === (uniqueGroups.length + 1) ? [] : ['NO_GROUP', ...uniqueGroups])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedGroups.length === (uniqueGroups.length + 1)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedGroups(prev => prev.includes('NO_GROUP') ? prev.filter(g => g !== 'NO_GROUP') : [...prev, 'NO_GROUP'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedGroups.includes('NO_GROUP')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>No Group</span>
                        </div>
                        {uniqueGroups.map(grp => {
                          const isChecked = excelSelectedGroups.includes(grp)
                          return (
                            <div
                              key={grp}
                              onClick={() => setExcelSelectedGroups(prev => prev.includes(grp) ? prev.filter(g => g !== grp) : [...prev, grp])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{grp}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Certificates Filter */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Certificate
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelCertDropdownOpen(prev => !prev)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedCerts.length === 0
                          ? 'All Certificates'
                          : excelSelectedCerts.length === certOptions.length
                            ? 'All Certificates'
                            : excelSelectedCerts.join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelCertDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedCerts(prev => prev.length === certOptions.length ? [] : [...certOptions])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedCerts.length === certOptions.length}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        {certOptions.map(cert => {
                          const isChecked = excelSelectedCerts.includes(cert)
                          return (
                            <div
                              key={cert}
                              onClick={() => setExcelSelectedCerts(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert])}
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

                  {/* Dynamic Score Filter */}
                  {showExcelScoreFilter && (
                    <div className="relative animate-in fade-in zoom-in-95 duration-100">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                        Score
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelScoreDropdownOpen(prev => !prev)
                          setIsExcelCertDropdownOpen(false)
                        }}
                        className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                      >
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                        <span className="truncate select-none pr-1">
                          {excelSelectedScores.length === 0
                            ? 'All Scores'
                            : excelSelectedScores.length === excelScoreOptions.length
                              ? 'All Scores'
                              : excelSelectedScores.map(getExcelScoreLabel).join(', ')}
                        </span>
                        <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                      </button>

                      {isExcelScoreDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                          <div
                            className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                            onClick={() => setExcelSelectedScores(prev => prev.length === excelScoreOptions.length ? [] : [...excelScoreOptions])}
                          >
                            <input
                              type="checkbox"
                              checked={excelSelectedScores.length === excelScoreOptions.length}
                              readOnly
                              className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Select All</span>
                          </div>
                          <div className="h-px bg-[var(--border)] my-1" />
                          {excelScoreOptions.map(score => {
                            const isChecked = excelSelectedScores.includes(score)
                            return (
                              <div
                                key={score}
                                onClick={() => setExcelSelectedScores(prev => prev.includes(score) ? prev.filter(s => s !== score) : [...prev, score])}
                                className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{getExcelScoreLabel(score)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags Filter */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Tasks/Tags
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelTagDropdownOpen(prev => !prev)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelLeadDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <Bookmark className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedTags.length === 0
                          ? 'All Tasks/Tags'
                          : excelSelectedTags.length === (['Call', 'Apply', 'Documents', 'Payment', 'Custom', ...uniqueTags.filter(t => !['Call', 'Apply', 'Documents', 'Payment'].includes(t))].length)
                            ? 'All Tasks/Tags'
                            : excelSelectedTags.join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelTagDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedTags(prev => {
                            const allOpts = ['Call', 'Apply', 'Documents', 'Payment', 'Custom', ...uniqueTags.filter(t => !['Call', 'Apply', 'Documents', 'Payment'].includes(t))]
                            return prev.length === allOpts.length ? [] : [...allOpts]
                          })}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedTags.length === (['Call', 'Apply', 'Documents', 'Payment', 'Custom', ...uniqueTags.filter(t => !['Call', 'Apply', 'Documents', 'Payment'].includes(t))].length)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        {['Call', 'Apply', 'Documents', 'Payment', 'Custom', ...uniqueTags.filter(t => !['Call', 'Apply', 'Documents', 'Payment'].includes(t))].map(tag => {
                          const isChecked = excelSelectedTags.includes(tag)
                          return (
                            <div
                              key={tag}
                              onClick={() => setExcelSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{getCustomTagIcon(tag)} {tag}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lead By Filter */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                      Lead By
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExcelLeadDropdownOpen(prev => !prev)
                        setIsExcelTariffDropdownOpen(false)
                        setIsExcelLevelDropdownOpen(false)
                        setIsExcelGroupDropdownOpen(false)
                        setIsExcelCertDropdownOpen(false)
                        setIsExcelScoreDropdownOpen(false)
                        setIsExcelTagDropdownOpen(false)
                      }}
                      className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-semibold cursor-pointer flex items-center justify-between text-left h-[34px] relative"
                    >
                      <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
                      <span className="truncate select-none pr-1">
                        {excelSelectedLeads.length === 0
                          ? 'All Lead By'
                          : excelSelectedLeads.length === (uniqueLeadBys.length + 1)
                            ? 'All Lead By'
                            : excelSelectedLeads.map(l => l === 'NO_LEADBY' ? 'No Lead by' : l).join(', ')}
                      </span>
                      <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
                    </button>

                    {isExcelLeadDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg py-1.5 z-40 max-h-72 overflow-y-auto">
                        <div
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-bold text-[var(--foreground)]"
                          onClick={() => setExcelSelectedLeads(prev => prev.length === (uniqueLeadBys.length + 1) ? [] : ['NO_LEADBY', ...uniqueLeadBys])}
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedLeads.length === (uniqueLeadBys.length + 1)}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>Select All</span>
                        </div>
                        <div className="h-px bg-[var(--border)] my-1" />
                        <div
                          onClick={() => setExcelSelectedLeads(prev => prev.includes('NO_LEADBY') ? prev.filter(l => l !== 'NO_LEADBY') : [...prev, 'NO_LEADBY'])}
                          className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                        >
                          <input
                            type="checkbox"
                            checked={excelSelectedLeads.includes('NO_LEADBY')}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>No Lead by</span>
                        </div>
                        {uniqueLeadBys.map(lead => {
                          const isChecked = excelSelectedLeads.includes(lead)
                          return (
                            <div
                              key={lead}
                              onClick={() => setExcelSelectedLeads(prev => prev.includes(lead) ? prev.filter(l => l !== lead) : [...prev, lead])}
                              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors select-none text-[11px] font-medium text-[var(--foreground)]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{lead}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Selection Count Header ──────────────────────── */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--border)]">
                <span className="font-bold text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                  Select Students to Export
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                  {selectedExcelIds.length} SELECTED
                </span>
              </div>

              {/* ── Scrollable Student Grid Table ───────────────── */}
              <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] shadow-inner max-h-[350px]">
                <table className="w-full border-collapse text-left text-xs font-medium">
                  <thead className="sticky top-0 bg-[var(--surface-elevated)] border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] z-10">
                    <tr>
                      <th className="px-4 py-2.5 text-center w-12">
                        <input
                          type="checkbox"
                          checked={isAllExcelSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isExcelIndeterminate
                          }}
                          onChange={handleToggleSelectAllExcel}
                          className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-2.5 w-20">ID</th>
                      <th className="px-4 py-2.5">Full Name</th>
                      <th className="px-4 py-2.5">Level</th>
                      <th className="px-4 py-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sortedExcelStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[var(--foreground-subtle)] font-semibold italic">
                          No students match the active export search filters.
                        </td>
                      </tr>
                    ) : (
                      sortedExcelStudents.map(student => {
                        const isChecked = selectedExcelIds.includes(student.id)
                        const bgObj = getRowBgStyleAndClass(student)
                        return (
                          <tr
                            key={student.id}
                            onClick={() => handleToggleExcelStudent(student.id)}
                            className={`cursor-pointer hover:bg-[var(--border-subtle)] transition-colors ${isChecked ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''}`}
                            style={bgObj.style}
                          >
                            <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleExcelStudent(student.id)}
                                className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-center w-10 h-6 text-[10px] font-bold bg-[#007aff] text-white rounded-[4px] shadow-sm">
                                {student.id}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold uppercase tracking-wide text-xs text-[var(--foreground)]">
                                {student.full_name}
                              </div>
                              {student.tariff && (
                                <span className="inline-block mt-0.5 text-[8px] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-subtle)] px-1 rounded font-bold uppercase tracking-wider">
                                  {student.tariff}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {student.level && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${getLevelBadgeStyles(student.level)}`}>
                                    {student.level}
                                  </span>
                                )}
                                {student.level2 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-[#ffab00] text-gray-900">
                                    {student.level2}
                                  </span>
                                )}
                              </div>
                              {renderCertificatePills(student)}
                            </td>
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                {(student.task_tags || []).map((tag, tagIdx) => {
                                  const icon = getCustomTagIcon(tag)
                                  return (
                                    <span
                                      key={tagIdx}
                                      className="inline-flex items-center justify-center w-5.5 h-5.5 text-[11px] bg-[var(--surface-elevated)] border border-[var(--border)] rounded shadow-sm"
                                      title={tag}
                                    >
                                      {icon}
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Footer: Export Mode Toggle + Action Buttons ──── */}
              <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col gap-3">

                {/* Full / Partial segmented toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] shrink-0">
                    Export Mode
                  </span>
                  <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-0.5 gap-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setExcelExportMode('full')}
                      className={`px-4 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none ${excelExportMode === 'full'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                        }`}
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcelExportMode('partial')}
                      className={`px-4 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer select-none ${excelExportMode === 'partial'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border-subtle)]'
                        }`}
                    >
                      Partial
                    </button>
                  </div>
                  <span className="text-[10px] text-[var(--foreground-subtle)] italic">
                    {excelExportMode === 'full'
                      ? 'All columns — complete student record'
                      : 'Personal & contact info only (25 cols)'}
                  </span>
                </div>

                {/* Cancel + Download row */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExcelModalOpen(false)}
                    className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={downloadSelectedAsExcel}
                    disabled={selectedExcelIds.length === 0}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-[var(--radius-md)] transition-all cursor-pointer select-none"
                    style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Download {excelExportMode === 'partial' ? 'Partial' : 'Full'} Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

    </PageShell>
  )
}
