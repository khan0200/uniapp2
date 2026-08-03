'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, Pencil, Loader2, AlertCircle, CheckCircle2, 
  Building2, Landmark, Tag, Layers, 
  ChevronDown, Copy, ArrowLeft,
  Mail, Calendar, MapPin, User, CheckSquare, GraduationCap, Hourglass, X,
  FileText, RefreshCw, Trash2, BookOpen, Maximize2, Minimize2, Eraser
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff, type Profile } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { syncMissingDocuments } from '@/lib/validation'

interface StudentDetailClientProps {
  studentId: string
  onClose?: () => void
  onStudentIdChange?: (newId: string) => void
  /** Drawer-only: whether the panel currently fills the screen. */
  isExpanded?: boolean
  /** Drawer-only: toggles the panel between drawer width and fullscreen. */
  onToggleExpand?: () => void
}

export function StudentDetailClient({ studentId, onClose, onStudentIdChange, isExpanded, onToggleExpand }: StudentDetailClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const {
    setDetailPageActions,
    officeOptions,
    universityStatusOptions,
    students: allStudents,
    tariffOptions,
    tariffPrices,
    levelOptions,
    groupOptions,
    leadByOptions,
    fetchStudents,
    refreshStudent,
  } = useStudentDashboard()

  // State for student details
  const [selectedStudentState, setSelectedStudent] = useState<Student | null>(null)
  const selectedStudent = selectedStudentState || ({} as any)

  // The panel's 3-column layout is designed for a wide viewport. Rather than
  // letting the columns squeeze on a narrower screen, zoom the whole panel
  // down proportionally so it reads the same, just smaller. Driven by width
  // (the panel already fills the viewport height and scrolls internally).
  //
  // Expanded (fullscreen) mode never zooms: the panel already has the whole
  // screen, so scaling down would just leave unused space on the right.
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelZoom, setPanelZoom] = useState(1)

  // Width the 3-column layout was designed against; below this we scale down.
  const PANEL_DESIGN_WIDTH = 1520

  useEffect(() => {
    if (isExpanded) {
      setPanelZoom(1)
      return
    }

    const recalcZoom = () => {
      const el = panelRef.current
      if (!el) return

      // Measure the container, reading it while our own zoom is neutralised —
      // otherwise each pass measures a width the previous zoom already shrank.
      const prevZoom = el.style.zoom
      el.style.zoom = '1'
      const available = el.parentElement?.clientWidth ?? el.clientWidth
      el.style.zoom = prevZoom

      if (!available) return

      const next = Math.min(1, available / PANEL_DESIGN_WIDTH)
      // Below ~0.75 text stops being comfortable; keep the floor there.
      setPanelZoom(Math.max(next, 0.75))
    }

    const raf = requestAnimationFrame(recalcZoom)
    window.addEventListener('resize', recalcZoom)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', recalcZoom)
    }
  }, [isExpanded])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit details state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null)

  // Major modal states
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false)
  const [majorModalLabel, setMajorModalLabel] = useState('')
  const [majorEditingField, setMajorEditingField] = useState<'university_1_major' | 'university_2_major' | 'university_3_major' | 'university_4_major' | 'university_5_major' | null>(null)
  const [tempMajorValue, setTempMajorValue] = useState('')
  const [savingMajor, setSavingMajor] = useState(false)

  // Certificate modal states
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [certModalLabel, setCertModalLabel] = useState('')
  const [certEditingField, setCertEditingField] = useState<'language_certificate' | 'language_certificate_2' | 'language_certificate_3' | null>(null)
  
  const [tempCertType, setTempCertType] = useState('')
  const [tempCertScore, setTempCertScore] = useState('')
  const [tempCertTestDate, setTempCertTestDate] = useState('')
  const [tempCertValidDate, setTempCertValidDate] = useState('')
  const [savingCert, setSavingCert] = useState(false)

  // Educational Background modal states. Every field is optional, so the form
  // is held in one object and blank entries are saved back as NULL.
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
  const [savingSchool, setSavingSchool] = useState(false)
  // Tracks the GPA system field being switched to free-text entry.
  const [gpaSystemManual, setGpaSystemManual] = useState(false)
  // Kept out of tempSchool: that object holds strings and is bulk-trimmed on save.
  const [gradExpected, setGradExpected] = useState(false)
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false)
  const [showMajorSuggestions, setShowMajorSuggestions] = useState(false)
  // Contact and Educational Background share one expanded slot: opening either
  // collapses the other, so the column never shows both in full.
  const [expandedSection, setExpandedSection] = useState<'contact' | 'education'>('contact')
  const eduExpanded = expandedSection === 'education'
  const contactExpanded = expandedSection === 'contact'
  const [tempSchool, setTempSchool] = useState({
    final_school_name: '',
    gpa: '',
    gpa_system: '',
    major: '',
    degree_no: '',
    date_of_entry: '',
    date_of_graduation: '',
    school_address: '',
    school_website: '',
    school_phone: '',
    school_email: ''
  })

  // School/major values previously typed by hand on any student. Merged into the
  // built-in lists so a custom entry only has to be typed once.
  const [customSchools, setCustomSchools] = useState<string[]>([])
  const [customMajors, setCustomMajors] = useState<string[]>([])

  // Custom entries lead so a hand-typed name outranks the built-in catalogue.
  const schoolSuggestions = useMemo(
    () => matchSuggestions([...customSchools, ...UNIVERSITY_SUGGESTIONS], tempSchool.final_school_name),
    [customSchools, tempSchool.final_school_name]
  )

  const uzMajorSuggestions = useMemo(
    () => matchSuggestions([...customMajors, ...UZ_MAJOR_SUGGESTIONS], tempSchool.major),
    [customMajors, tempSchool.major]
  )

  const filteredSuggestions = useMemo(() => {
    if (!tempMajorValue.trim()) return []
    const query = tempMajorValue.toLowerCase()
    
    // De-duplicate array case-insensitively
    const unique = Array.from(new Set(MAJOR_SUGGESTIONS.map(s => s.trim())))
    
    // If the input exactly matches one of the options (case-insensitively), hide suggestions
    const exactMatch = unique.some(s => s.toLowerCase() === query.trim())
    if (exactMatch) return []
    
    return unique.filter(s => s.toLowerCase().includes(query))
  }, [tempMajorValue])
  const [nameLanguage, setNameLanguage] = useState<'EN' | 'KR'>('EN')
  const [koreanNames, setKoreanNames] = useState<{ full: string; family: string; given: string } | null>(null)
  const [isTranslatingNames, setIsTranslatingNames] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  // Extra Level to Study / Language Certificate slots are hidden by default
  // and revealed via the "+" button next to the preceding slot's edit icon,
  // unless the student already has data saved in them.
  const [showLevel2, setShowLevel2] = useState(false)
  const [showCert2, setShowCert2] = useState(false)
  const [showCert3, setShowCert3] = useState(false)
  const [showUni2, setShowUni2] = useState(false)
  const [showUni3, setShowUni3] = useState(false)
  const [showUni4, setShowUni4] = useState(false)
  const [showUni5, setShowUni5] = useState(false)

  // Reset extra slots visibility when switching students
  useEffect(() => {
    if (!selectedStudent) return

    setShowLevel2(!!selectedStudent.level2)
    setShowCert2(!!selectedStudent.language_certificate_2 && selectedStudent.language_certificate_2 !== 'NO CERTIFICATE' && selectedStudent.language_certificate_2.trim() !== '')
    setShowCert3(!!selectedStudent.language_certificate_3 && selectedStudent.language_certificate_3 !== 'NO CERTIFICATE' && selectedStudent.language_certificate_3.trim() !== '')
    setShowUni2(!!selectedStudent.university_2)
    setShowUni3(!!selectedStudent.university_3)
    setShowUni4(!!selectedStudent.university_4)
    setShowUni5(!!selectedStudent.university_5)
  }, [selectedStudent?.id])

  // Also auto-reveal slots if data comes in (e.g., real-time updates)
  useEffect(() => {
    if (selectedStudent?.level2) setShowLevel2(true)
    if (selectedStudent?.language_certificate_2 && selectedStudent.language_certificate_2 !== 'NO CERTIFICATE' && selectedStudent.language_certificate_2.trim() !== '') setShowCert2(true)
    if (selectedStudent?.language_certificate_3 && selectedStudent.language_certificate_3 !== 'NO CERTIFICATE' && selectedStudent.language_certificate_3.trim() !== '') setShowCert3(true)
    if (selectedStudent?.university_2) setShowUni2(true)
    if (selectedStudent?.university_3) setShowUni3(true)
    if (selectedStudent?.university_4) setShowUni4(true)
    if (selectedStudent?.university_5) setShowUni5(true)
  }, [selectedStudent?.level2, selectedStudent?.language_certificate_2, selectedStudent?.language_certificate_3, selectedStudent?.university_2, selectedStudent?.university_3, selectedStudent?.university_4, selectedStudent?.university_5])

  // Close active dropdowns when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target && target.closest && target.closest('.status-dropdown-area')) {
        return;
      }
      setActiveStatusDropdown(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  // Removing an extra Level to Study / Language Certificate slot clears its
  // saved value(s) so it doesn't silently come back on the next refresh —
  // the earlier "hide without clearing" behavior left data in the DB, which
  // the load-time effect above then used to re-show the slot.
  const handleClearAndHideSlot = async (fields: string[], hide: () => void) => {
    if (!selectedStudentState) return
    const hasData = fields.some((f) => !!(selectedStudent as any)?.[f])
    if (hasData && !window.confirm('This will clear the saved value for this field. Continue?')) {
      return
    }

    hide()

    if (!hasData) return

    const updateData: any = Object.fromEntries(fields.map((f) => [f, f.includes('status') ? '' : null]))
    const { error: updateError } = await (supabase
      .from('students') as any)
      .update(updateData)
      .eq('id', selectedStudent.id)

    if (updateError) {
      console.error('Error clearing field(s) on slot removal:', updateError)
      return
    }

    setSelectedStudent((prev) => (prev ? { ...prev, ...updateData } : prev))
    refreshStudent(selectedStudent.id)
  }

  // tariffOptions/tariffPrices/levelOptions/groupOptions/leadByOptions come from
  // the shared dashboard context (fetched once for the whole dashboard).
  // universities/coordinators are specific to this page and fetched below.
  const [universityOptions, setUniversityOptions] = useState<string[]>([])
  const [coordinatorOptions, setCoordinatorOptions] = useState<string[]>([])
  const { profile: loggedInProfile } = useUser()

  // Fetch settings filter options not already covered by the shared context
  const fetchFilterOptions = async () => {
    try {
      const [universitiesRes, coordinatorsRes, schoolsRes] = await Promise.all([
        supabase.from('universities').select('name'),
        supabase.from('coordinators').select('name'),
        // Previously saved schools/majors double as a growing suggestion list.
        supabase.from('students').select('final_school_name, major')
      ])

      if (universitiesRes.data && universitiesRes.data.length > 0) setUniversityOptions((universitiesRes.data as any[]).map(u => u.name))
      if (coordinatorsRes && coordinatorsRes.data && coordinatorsRes.data.length > 0) setCoordinatorOptions((coordinatorsRes.data as any[]).map(c => c.name))
      if (schoolsRes.data) {
        const rows = schoolsRes.data as any[]
        setCustomSchools(dedupeSuggestions(rows.map(r => r.final_school_name), UNIVERSITY_SUGGESTIONS))
        setCustomMajors(dedupeSuggestions(rows.map(r => r.major), UZ_MAJOR_SUGGESTIONS))
      }
    } catch (err) {
      console.error('Error fetching filter options in details:', err)
    }
  }

  const getTariffPrice = (tariff: string | null, languageCertificate: string | null) => {
    if (!tariff || tariff === 'Select') return 0
    if (tariff === 'E-VISA') {
      const hasCert = languageCertificate && languageCertificate !== 'NO CERTIFICATE'
      const key = hasCert ? 'E-VISA (TIL SERTIFIKATLI)' : 'E-VISA (TIL SERTIFIKATISIZ)'
      return tariffPrices[key] || (hasCert ? 16000000 : 24000000)
    }
    return tariffPrices[tariff] || 0
  }

  // Fetch student details. If a cached copy (from the shared dashboard list
  // context) is passed in, we paint immediately with that data instead of
  // blocking on the network, then quietly refresh in the background.
  const fetchStudent = async (cached?: Student | null) => {
    const isBackground = !!cached
    if (isBackground) {
      setSelectedStudent(cached)
      setLoading(false)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const [studentRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        supabase.from('payments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
      ])

      if (studentRes.error) throw studentRes.error
      const fetchedStudent = studentRes.data as Student



      // Auto-validate missing documents on load. Apply the corrected value
      // locally right away and persist it in the background (fire-and-forget)
      // so the page doesn't wait on this write before rendering.
      const syncedPick = syncMissingDocuments(fetchedStudent)
      const originalPick = fetchedStudent.pick_needed || []
      const isPickDifferent = originalPick.length !== syncedPick.length ||
        !originalPick.every((val: string) => syncedPick.includes(val))

      const finalStudent = isPickDifferent
        ? { ...fetchedStudent, pick_needed: syncedPick }
        : fetchedStudent

      if (isPickDifferent) {
        ;(supabase.from('students') as any)
          .update({ pick_needed: syncedPick })
          .eq('id', fetchedStudent.id)
          .then(({ error: updateErr }: { error: any }) => {
            if (updateErr) console.error('Error auto-syncing missing documents on page load:', updateErr)
          })
      }

      setSelectedStudent(finalStudent)
      setPayments(paymentsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching student details:', err)
      if (!isBackground) {
        setError(err.message || 'Failed to load student details. Student may not exist.')
      }
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }

  const handleSaveMajor = async () => {
    if (!majorEditingField || !selectedStudentState) return
    setSavingMajor(true)
    const formattedMajor = tempMajorValue.trim().toUpperCase() || null
    try {
      const nextStudent = {
        ...selectedStudentState,
        [majorEditingField]: formattedMajor,
        jarayon_updated_at: new Date().toISOString()
      }
      const syncedPick = syncMissingDocuments(nextStudent)
      const { error } = await (supabase
        .from('students') as any)
        .update({
          [majorEditingField]: formattedMajor,
          jarayon_updated_at: new Date().toISOString(),
          pick_needed: syncedPick
        })
        .eq('id', selectedStudent.id)
      if (error) throw error

      setSelectedStudent({
        ...nextStudent,
        pick_needed: syncedPick
      })
      setIsMajorModalOpen(false)
      fetchStudents?.()
    } catch (err: any) {
      alert(`Failed to save major: ${err.message}`)
    } finally {
      setSavingMajor(false)
    }
  }

  useEffect(() => {
    const cached = allStudents.find(s => s.id === studentId) || null
    fetchStudent(cached)
    fetchFilterOptions()
    setNameLanguage('EN')
    setKoreanNames(null)
    setTranslateError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const computedPaymentsDone = useMemo(() => {
    return payments
      .filter(p => !p.is_discount && !p.is_withdrawal && p.amount > 0)
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }, [payments])

  const computedDiscount = useMemo(() => {
    return payments
      .filter(p => p.is_discount && p.amount > 0)
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }, [payments])

  // Copy helper
  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1200)
  }

  const splitTranslatedFullName = (translatedFull: string) => {
    const parts = translatedFull.split(' ').filter(Boolean)
    return {
      full: translatedFull,
      family: parts[0] || '',
      given: parts.slice(1).join(' '),
    }
  }

  // Fetch an AI-powered Korean transliteration of the Full Name only.
  // Family/Given Name are derived by splitting the translated full name,
  // mirroring how the English versions split selectedStudent.full_name.
  // Requires an AI API key — no local fallback. Never writes anything to Supabase.
  const handleShowKorean = async () => {
    if (!selectedStudentState) return
    setNameLanguage('KR')

    if (selectedStudent.korean_name) {
      setKoreanNames(splitTranslatedFullName(selectedStudent.korean_name))
      return
    }

    if (koreanNames) return

    const fullName = selectedStudent.full_name || ''

    let aiSettings: any = null
    try {
      const stored = localStorage.getItem('ai_settings')
      if (stored) aiSettings = JSON.parse(stored)
    } catch {
      aiSettings = null
    }

    const provider = aiSettings?.provider || 'gemini'
    const apiKey = ''
    const model = provider === 'openai' ? aiSettings?.openaiModel : aiSettings?.model

    setIsTranslatingNames(true)
    setTranslateError(null)
    try {
      const response = await fetch('/api/translate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: [fullName], provider, apiKey, model }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Translation failed')

      const [full] = data.results || []
      if (!full) throw new Error('AI returned an empty result. Please try again.')

      const { error: updateError } = await (supabase
        .from('students') as any)
        .update({ korean_name: full })
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError

      setSelectedStudent({ ...selectedStudent, korean_name: full })
      setKoreanNames(splitTranslatedFullName(full))
    } catch (err: any) {
      console.error('AI name translation failed:', err)
      setTranslateError(err.message || 'AI translation failed. Please check your API key and try again.')
    } finally {
      setIsTranslatingNames(false)
    }
  }

  const getKoreanTranslation = async (name: string): Promise<string | null> => {
    let aiSettings: any = null
    try {
      const stored = localStorage.getItem('ai_settings')
      if (stored) aiSettings = JSON.parse(stored)
    } catch {
      aiSettings = null
    }

    const provider = aiSettings?.provider || 'gemini'
    const apiKey = ''
    const model = provider === 'openai' ? (aiSettings?.openaiModel || 'gpt-4o') : (aiSettings?.model || 'gemini-3.5-flash')

    try {
      const response = await fetch('/api/translate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: [name], provider, apiKey, model }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Translation failed')
      return data.results?.[0] || null
    } catch (err) {
      console.warn('Auto name translation on edit failed:', err)
      return null
    }
  }

  const uppercaseFields = new Set([
    'full_name',
    'korean_name',
    'address',
    'notes',
    'educational_background',
    'major',
    'father_name',
    'father_job',
    'mother_name',
    'mother_job',
  ])

  const phoneFields = new Set(['phone1', 'phone2', 'father_phone', 'mother_phone'])

  const formatPhoneValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9)
    const first = digits.slice(0, 2)
    const second = digits.slice(2, 5)
    const third = digits.slice(5, 7)
    const fourth = digits.slice(7, 9)
    return [first, second, third, fourth].filter(Boolean).join('-')
  }

  const formatPassportValue = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const letters = clean.replace(/[^A-Z]/g, '').slice(0, 2)
    const digits = clean.replace(/\D/g, '').slice(0, 7)
    return `${letters}${digits}`
  }

  const formatEditValueForField = (field: string, value: string) => {
    if (uppercaseFields.has(field)) return value.toUpperCase()
    if (phoneFields.has(field)) return formatPhoneValue(value)
    if (field === 'passport') return formatPassportValue(value)
    return value
  }

  // Start inline editing
  const handleStartEditing = (field: string, val: any, defaultVal?: any) => {
    setEditingField(field)
    let initialValue = val !== null && val !== undefined && val !== '' ? val : (defaultVal !== undefined ? defaultVal : '')
    if (Array.isArray(initialValue)) {
      initialValue = initialValue.join(', ')
    }
    setEditValue(typeof initialValue === 'string' ? formatEditValueForField(field, initialValue) : initialValue)
  }

  // Cancel inline editing
  const handleCancelEditing = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Save inline edits to Supabase
  const handleSaveField = async (field: any) => {
    if (!selectedStudentState) return
    try {
      let valToSave = editValue



      // Handle virtual / computed fields
      if (field === 'family_name' || field === 'given_name') {
        const parts = selectedStudent.full_name.split(' ').filter(Boolean)
        const currentFamily = parts[0] || ''
        const currentGiven = parts.slice(1).join(' ') || ''
        
        let newFullName = ''
        if (field === 'family_name') {
          newFullName = `${String(editValue).trim()} ${currentGiven}`.trim().toUpperCase()
        } else {
          newFullName = `${currentFamily} ${String(editValue).trim()}`.trim().toUpperCase()
        }
        
        if (!newFullName) {
          alert('Full name cannot be empty.')
          return
        }

        // Save immediately, clearing old Korean name to prevent mismatch
        const updateData: any = { full_name: newFullName, korean_name: null }
        const nextStudent = { ...selectedStudent, ...updateData }
        updateData.pick_needed = syncMissingDocuments(nextStudent)
        const { error: updateError } = await (supabase
          .from('students') as any)
          .update(updateData)
          .eq('id', selectedStudent.id)

        if (updateError) throw updateError
        refreshStudent(selectedStudent.id)

        const updatedStudent = { ...selectedStudent, ...updateData }
        setSelectedStudent(updatedStudent)
        setKoreanNames(null)
        setEditingField(null)

        // Translate in the background and update database when done
        const targetStudentId = selectedStudent.id
        getKoreanTranslation(newFullName).then(async (translated) => {
          if (translated) {
            const finalTranslated = translated.toUpperCase()
            const { error: bgError } = await (supabase
              .from('students') as any)
              .update({ korean_name: finalTranslated })
              .eq('id', targetStudentId)
            if (!bgError) {
              refreshStudent(targetStudentId)
              setSelectedStudent(prev => {
                if (prev && prev.id === targetStudentId) {
                  return { ...prev, korean_name: finalTranslated }
                }
                return prev
              })
              setKoreanNames(splitTranslatedFullName(finalTranslated))
            }
          }
        }).catch(err => console.warn('Background translation error:', err))

        return
      }

      if (field === 'payments_done') {
        const numericVal = Number(editValue)
        if (isNaN(numericVal) || numericVal < 0) {
          alert('Payments Done must be a positive number.')
          return
        }
        const valToSave = -numericVal
        const updateData: any = { balance: valToSave }
        const nextStudent = { ...selectedStudent, ...updateData }
        updateData.pick_needed = syncMissingDocuments(nextStudent)
        
        const { error: updateError } = await (supabase
          .from('students') as any)
          .update(updateData)
          .eq('id', selectedStudent.id)
  
        if (updateError) throw updateError
        refreshStudent(selectedStudent.id)

        const updatedStudent = { ...selectedStudent, ...updateData }
        setSelectedStudent(updatedStudent)
        setEditingField(null)
        return
      }

      // Standard fields
      if (field === 'pick_needed') {
        valToSave = typeof editValue === 'string'
          ? editValue.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []
      } else if (typeof valToSave === 'string') {
        valToSave = valToSave.trim()
        valToSave = formatEditValueForField(String(field), valToSave)
      }

      if (['id', 'full_name'].includes(field) && !valToSave) {
        alert(`${field.toUpperCase().replace('_', ' ')} cannot be empty.`)
        return
      }

      if (field === 'birthday' && valToSave) {
        const birthdayPattern = /^\d{4}-\d{2}-\d{2}$/
        if (!birthdayPattern.test(valToSave) || valToSave < '1980-01-01' || valToSave > '2010-12-31') {
          alert('Birthday must be in format YYYY-MM-DD and between 1980-01-01 and 2010-12-31.')
          return
        }
      }

      if (phoneFields.has(String(field)) && valToSave) {
        const phonePattern = /^[0-9]{2}-[0-9]{3}-[0-9]{2}-[0-9]{2}$/
        if (!phonePattern.test(valToSave)) {
          alert(`${String(field).toUpperCase().replace(/_/g, ' ')} must be formatted as XX-XXX-XX-XX.`)
          return
        }
      }

      if (field === 'passport' && valToSave) {
        const passportPattern = /^[A-Z]{2}[0-9]{7}$/
        if (!passportPattern.test(valToSave)) {
          alert('Passport must be formatted as TTDDDDDDD, for example FA1234545.')
          return
        }
      }

      // If the field is an empty string or 'Select', set it to null to prevent DB check constraint violations
      if (valToSave === '' || (['tariff', 'level', 'level2', 'student_group', 'lead_by', 'coordinator'].includes(String(field)) && valToSave === 'Select')) {
        valToSave = null
      }

      const updateData: any = { [field]: valToSave }

      if (field === 'full_name') {
        updateData.korean_name = null
      }

      // Recalculate balance when tariff or language certificate changes
      if (
        (field === 'tariff' && selectedStudent.tariff !== valToSave) ||
        (field === 'language_certificate' && selectedStudent.tariff === 'E-VISA' && selectedStudent.language_certificate !== valToSave)
      ) {
        const currentTariff = field === 'tariff' ? valToSave : selectedStudent.tariff
        const currentCert = field === 'language_certificate' ? valToSave : selectedStudent.language_certificate

        const oldPrice = getTariffPrice(selectedStudent.tariff, selectedStudent.language_certificate)
        const newPrice = getTariffPrice(currentTariff, currentCert)

        const balanceDiff = oldPrice - newPrice
        if (balanceDiff !== 0) {
          const newBalance = (selectedStudent.balance || 0) + balanceDiff
          updateData.balance = newBalance
        }
      }

      // Run syncMissingDocuments on updated student data
      const nextStudent = { ...selectedStudent, ...updateData }
      const syncedPick = syncMissingDocuments(nextStudent)
      updateData.pick_needed = syncedPick

      const { error: updateError } = await (supabase
        .from('students') as any)
        .update(updateData)
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError
      refreshStudent(selectedStudent.id)

      const updatedStudent = { ...selectedStudent, ...updateData }
      if (field === 'full_name') {
        setKoreanNames(null)

        // Translate in the background and update database when done
        const targetStudentId = selectedStudent.id
        getKoreanTranslation(valToSave || '').then(async (translated) => {
          if (translated) {
            const finalTranslated = translated.toUpperCase()
            const { error: bgError } = await (supabase
              .from('students') as any)
              .update({ korean_name: finalTranslated })
              .eq('id', targetStudentId)
            if (!bgError) {
              refreshStudent(targetStudentId)
              setSelectedStudent(prev => {
                if (prev && prev.id === targetStudentId) {
                  return { ...prev, korean_name: finalTranslated }
                }
                return prev
              })
              setKoreanNames(splitTranslatedFullName(finalTranslated))
            }
          }
        }).catch(err => console.warn('Background translation error:', err))
      } else if (field === 'korean_name') {
        if (valToSave) {
          const parts = valToSave.split(' ').filter(Boolean)
          setKoreanNames({
            full: valToSave,
            family: parts[0] || '',
            given: parts.slice(1).join(' '),
          })
        } else {
          setKoreanNames(null)
        }
      }
      setSelectedStudent(updatedStudent)
      setEditingField(null)

      if (field === 'id') {
        if (onStudentIdChange) {
          onStudentIdChange(valToSave)
        } else {
          router.replace(`/students/${valToSave}`)
        }
      }
    } catch (err: any) {
      console.error('Error updating field details:', err)
      if (err) {
        console.error('Error details keys:', Object.keys(err))
        console.error('Error message:', err.message)
        console.error('Error string:', String(err))
        console.error('Error stack:', err.stack)
      }
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      alert(`Failed to update field: ${errMsg}\nCode: ${err?.code}\nDetails: ${err?.details}\nHint: ${err?.hint}`)
    }
  }

  // Soft Delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudentState) return
    if (!confirm(`Are you sure you want to delete student profile "${selectedStudent.full_name}"?`)) return
    setIsDeleting(true)
    try {
      const { error: deleteError } = await (supabase
        .from('students') as any)
        .update({ is_deleted: true })
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      alert('Student profile deleted successfully.')
      fetchStudents(true)
      if (onClose) {
        onClose()
      } else {
        router.push('/students')
      }
    } catch (err: any) {
      console.error('Error soft-deleting student:', err)
      alert(err.message || 'Failed to delete student.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Restore student
  const handleRestoreStudent = async () => {
    if (!selectedStudentState) return
    if (!confirm(`Are you sure you want to restore student profile "${selectedStudent.full_name}"?`)) return
    setIsDeleting(true)
    try {
      const { error: restoreError } = await (supabase
        .from('students') as any)
        .update({ is_deleted: false })
        .eq('id', selectedStudent.id)

      if (restoreError) throw restoreError

      alert('Student profile restored successfully.')
      fetchStudents(true)
      await fetchStudent()
    } catch (err: any) {
      console.error('Error restoring student:', err)
      alert(err.message || 'Failed to restore student.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Permanent Delete student
  const handlePermanentDeleteStudent = async () => {
    if (!selectedStudentState) return
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete student profile "${selectedStudent.full_name}"? This action CANNOT be undone and will delete all their data.`)) return
    setIsDeleting(true)
    try {
      const { error: deleteError } = await (supabase
        .from('students') as any)
        .delete()
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      alert('Student profile permanently deleted successfully.')
      fetchStudents(true)
      if (onClose) {
        onClose()
      } else {
        router.push('/students')
      }
    } catch (err: any) {
      console.error('Error permanently deleting student:', err)
      alert(err.message || 'Failed to permanently delete student.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Register this page's action buttons (Fill By Document / Reload / Delete)
  // so the shared Header component can render them in the top bar.
  useEffect(() => {
    if (!selectedStudentState) return
    setDetailPageActions({
      onFillByDocument: () => router.push(`/students/${selectedStudent.id}/extract`),
      onReload: fetchStudent,
      onDelete: selectedStudent.is_deleted ? handleRestoreStudent : handleDeleteStudent,
      onPermanentDelete: selectedStudent.is_deleted ? handlePermanentDeleteStudent : undefined,
      isDeleted: selectedStudent.is_deleted,
      isDeleting,
    })
    return () => setDetailPageActions(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentState, isDeleting])

  // Helper to format currency values
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + ' UZS'
  }

  // Get Initials for Details Header Avatar
  const getInitials = (name: string) => {
    if (!name) return 'ST'
    const parts = name.split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }

  // Unified Details Card rendering helper (Defaults all fields to copyable & editable)
  const renderDetailCard = (
    label: string,
    field: keyof Student,
    value: any,
    options: {
      copyable?: boolean
      editable?: boolean
      type?: 'text' | 'select' | 'date'
      selectOptions?: string[]
      badgeColor?: string
      titleColor?: string
      forceBorderColor?: 'blue' | 'red'
      valueClassName?: string
      compact?: boolean
      onAdd?: () => void
      addTitle?: string
      onRemove?: () => void
      removeTitle?: string
      onEdit?: () => void
    } = {}
  ) => {
    if (loading) {
      return (
        <div
          className={cn(
            "bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] border-l-gray-250 dark:border-l-gray-700 rounded-[var(--radius-md)] px-2.5 flex flex-col justify-between animate-pulse",
            options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5'
          )}
        >
          <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
          <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        </div>
      )
    }

    const isEditing = editingField === field
    const isCopied = copiedField === field
    const isMissing = value === null || value === undefined || (Array.isArray(value) ? value.length === 0 : (String(value).trim() === '' || String(value).trim() === '—'))
    const displayValue = isMissing ? 'Not provided' : value

    const copyable = options.copyable !== false
    const editable = options.editable !== false

    const stripeColor = (options.forceBorderColor === 'red' || (isMissing && !options.forceBorderColor))
      ? 'border-l-rose-600'
      : 'border-l-[var(--accent)]'

    const showCopy = !!(copyable && value && !isEditing)
    const showEdit = !!(editable && !isEditing)
    const showAdd = !!(options.onAdd && !isEditing)
    const showRemove = !!(options.onRemove && !isEditing)
    const activeButtonsCount = [showCopy, showEdit, showAdd, showRemove].filter(Boolean).length

    return (
      <div
        className={cn(
          "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-start text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
          stripeColor,
          options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5',
          isCopied && "animate-copy-press"
        )}
        title={copyable && value ? 'Single-click value to copy.' : undefined}
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] uppercase tracking-wide glitter-label min-w-0 truncate" title={label}>
            {label}
          </span>
          <div className={cn(
            "shrink-0 flex items-center",
            activeButtonsCount > 2 ? "gap-0.5" : "gap-1.5"
          )}>
            {copyable && value && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(String(field), Array.isArray(value) ? value.join(', ') : String(value));
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy value"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
            {editable && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (options.onEdit) {
                    options.onEdit();
                    return;
                  }
                  handleStartEditing(String(field), value, options.type === 'select' ? options.selectOptions?.[0] : '');
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Edit field"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {options.onAdd && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  options.onAdd!();
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title={options.addTitle || 'Add another'}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {options.onRemove && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  options.onRemove!();
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-red-600"
                title={options.removeTitle || 'Remove'}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div
          className="mt-0.5 flex items-start min-h-[20px] w-full"
          onClick={() => {
            if (!isEditing && copyable && value) {
              handleCopy(String(field), Array.isArray(value) ? value.join(', ') : String(value));
            }
          }}
        >
          {isEditing ? (
            <div
              className="relative w-full min-w-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveField(field)
                else if (e.key === 'Escape') handleCancelEditing()
              }}
            >
              {options.type === 'select' ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-[var(--surface-elevated)] text-[15px] text-[var(--foreground)] pl-2 pr-14 py-1 rounded border-none outline-none w-full min-w-0 font-medium"
                >
                  {options.selectOptions?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={options.type === 'date' ? 'date' : 'text'}
                  value={editValue}
                  onChange={(e) => setEditValue(formatEditValueForField(String(field), e.target.value))}
                  className={cn("bg-[var(--surface-elevated)] text-[15px] text-[var(--foreground)] pl-2 pr-14 py-1 rounded border-none outline-none w-full min-w-0 font-medium", options.valueClassName)}
                  placeholder={label}
                  autoFocus
                />
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => handleSaveField(field)}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-[0.85] transition-all"
                  title="Save"
                >
                  <CheckCircle2 className="h-3 w-3" />
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-rose-500 hover:bg-rose-600 text-white cursor-pointer active:scale-[0.85] transition-all"
                  title="Cancel"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex-1 min-w-0">
                {(options.badgeColor && !isMissing) ? (
                  Array.isArray(displayValue) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {displayValue.map((item, idx) => (
                        <span key={idx} className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[13px] font-bold uppercase ${options.badgeColor}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[13px] font-bold uppercase ${options.badgeColor}`}>
                      {displayValue}
                    </span>
                  )
                ) : isMissing ? (
                  <span className="text-[14px] font-semibold text-[#B91C1C]">{displayValue}</span>
                ) : (
                  Array.isArray(displayValue) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {displayValue.map((item, idx) => (
                        <span key={idx} className={cn("text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]", options.valueClassName)}>
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={cn("text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]", options.valueClassName)}>{displayValue}</span>
                  )
                )}
              </div>
              {isCopied && (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Year / month / day dropdowns over a single YYYY-MM-DD string. Used by the
  // Educational Background modal, where school dates can be decades back and a
  // native date picker is slow to navigate.
  const renderDateSelects = (
    value: string,
    onChange: (next: string) => void,
    expectedOpt?: { isExpected: boolean; onExpectedChange: (next: boolean) => void },
    onYearPicked?: (year: string) => void
  ) => {
    const [y = '', m = '', d = ''] = value ? value.split('-') : []
    const currentYear = new Date().getFullYear()
    // School dates skew historical: reach back 60 years, ahead 10 for expected graduations.
    const years = Array.from({ length: 71 }, (_, i) => String(currentYear + 10 - i))
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
    const daysCount = y && m ? new Date(parseInt(y), parseInt(m), 0).getDate() : 31
    const days = Array.from({ length: daysCount }, (_, i) => String(i + 1).padStart(2, '0'))

    const update = (part: 'y' | 'm' | 'd', val: string) => {
      let newY = part === 'y' ? val : y
      let newM = part === 'm' ? val : m
      let newD = part === 'd' ? val : d
      // Clearing any part clears the whole date, so a half-set value never saves.
      if (val === '') {
        expectedOpt?.onExpectedChange(false)
        onChange('')
        return
      }
      if (part === 'y' && val === EXPECTED_YEAR) {
        // "Expected" carries no date at all: the flag alone holds the meaning.
        expectedOpt?.onExpectedChange(true)
        onChange('')
        return
      }
      if (part === 'y' && expectedOpt) {
        // Re-evaluate: a year in the future is expected, a past one is not.
        expectedOpt.onExpectedChange(isFutureDate(`${val}-${m || GRADUATION_MONTH}-${d || GRADUATION_DAY}`))
      }
      if (part === 'y' && onYearPicked) {
        // Picking an entry year seeds the standard term start and, via the
        // callback, the matching graduation date.
        onChange(`${val}-${ENTRY_MONTH}-${ENTRY_DAY}`)
        onYearPicked(val)
        return
      }
      if (!newY) newY = String(currentYear)
      if (!newM) newM = '01'
      if (!newD) newD = '01'
      const maxD = new Date(parseInt(newY), parseInt(newM), 0).getDate()
      if (parseInt(newD) > maxD) newD = String(maxD).padStart(2, '0')
      const next = `${newY}-${newM}-${newD}`
      // Editing month/day can push the date across today, so re-check expectedness.
      if (part !== 'y' && expectedOpt) {
        expectedOpt.onExpectedChange(isFutureDate(next))
      }
      onChange(next)
    }

    const selectClass = "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]"
    const isExpected = !!expectedOpt?.isExpected
    // "Expected" holds no date, so the month/day dropdowns have nothing to show.
    const lockParts = isExpected

    return (
      <div className="grid grid-cols-3 gap-1 w-full">
        <select
          value={isExpected ? EXPECTED_YEAR : y}
          onChange={(e) => update('y', e.target.value)}
          className={cn("w-full", selectClass, isExpected && "border-[var(--accent)]")}
        >
          <option value="">YYYY</option>
          {expectedOpt && <option value={EXPECTED_YEAR}>{EXPECTED_YEAR}</option>}
          {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <select
          value={lockParts ? '' : m}
          onChange={(e) => update('m', e.target.value)}
          disabled={lockParts}
          className={cn("w-full", selectClass, lockParts && "opacity-50 cursor-not-allowed")}
        >
          <option value="">MM</option>
          {months.map(mo => <option key={mo} value={mo}>{mo}</option>)}
        </select>
        <select
          value={lockParts ? '' : d}
          onChange={(e) => update('d', e.target.value)}
          disabled={lockParts}
          className={cn("w-full", selectClass, lockParts && "opacity-50 cursor-not-allowed")}
        >
          <option value="">DD</option>
          {days.map(dy => <option key={dy} value={dy}>{dy}</option>)}
        </select>
      </div>
    )
  }

  // Render Language Certificate Card (Now with copy & edit support)
  const renderCertificateCard = (
    label: string,
    certField: keyof Student,
    scoreField: keyof Student,
    testDateField: keyof Student,
    validDateField: keyof Student,
    certsAllowed: string[],
    certColor: string = 'bg-[#de350b]',
    options: {
      compact?: boolean
      onAdd?: () => void
      addTitle?: string
      onRemove?: () => void
      removeTitle?: string
    } = {}
  ) => {
    const isEditing = false;
    const certVal = selectedStudent?.[certField] as string
    const scoreVal = selectedStudent?.[scoreField] as string
    const testDateVal = selectedStudent?.[testDateField] as string
    const validDateVal = selectedStudent?.[validDateField] as string
    const isMissing = !certVal || certVal === 'NO CERTIFICATE' || certVal.trim() === ''

    const isCopied = copiedField === String(certField)

    const showCopy = !!(certVal && certVal !== 'NO CERTIFICATE' && !isEditing)
    const showEdit = !isEditing
    const showAdd = !!(options.onAdd && !isEditing)
    const showRemove = !!(options.onRemove && !isEditing)
    const activeButtonsCount = [showCopy, showEdit, showAdd, showRemove].filter(Boolean).length

    return (
      <div
        className={cn(
          "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-start text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
          isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]',
          options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5',
          isCopied && "animate-copy-press"
        )}
        title={certVal && certVal !== 'NO CERTIFICATE' ? 'Single-click value to copy.' : undefined}
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] uppercase tracking-wide glitter-label min-w-0 truncate" title={label}>{label}</span>
          <div className={cn(
            "shrink-0 flex items-center",
            activeButtonsCount > 2 ? "gap-0.5" : "gap-1.5"
          )}>
            {certVal && certVal !== 'NO CERTIFICATE' && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(String(certField), `${certVal} (SCORE: ${scoreVal || '—'})`);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy certificate details"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCertModalLabel(label);
                  setCertEditingField(certField as any);
                  setTempCertType(certVal && certVal !== 'NO CERTIFICATE' ? certVal : '');
                  setTempCertScore(scoreVal || '');
                  setTempCertTestDate(testDateVal || '');
                  setTempCertValidDate(validDateVal || '');
                  setIsCertModalOpen(true);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Edit certificate"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {options.onAdd && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  options.onAdd!();
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title={options.addTitle || 'Add another certificate'}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {options.onRemove && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  options.onRemove!();
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-red-600"
                title={options.removeTitle || 'Remove'}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-0.5 flex items-start min-h-[20px] w-full"
          onClick={() => {
            if (!isEditing && certVal && certVal !== 'NO CERTIFICATE') {
              handleCopy(String(certField), `${certVal} (SCORE: ${scoreVal || '—'})`);
            }
          }}
        >
          {isEditing ? (
            <div 
              className="flex flex-col gap-1 w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const scoreEl = document.getElementById('edit-score-input') as HTMLInputElement
                  const scoreInput = scoreEl ? scoreEl.value.trim() : ''
                  try {
                     const certToSave = editValue === '' ? null : editValue
                     const scoreToSave = scoreInput === '' ? null : scoreInput
                     const nextStudent = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave }
                     const syncedPick = syncMissingDocuments(nextStudent)
                     const { error } = await (supabase
                       .from('students') as any)
                       .update({ [certField]: certToSave, [scoreField]: scoreToSave, pick_needed: syncedPick })
                       .eq('id', selectedStudent!.id)
                     if (error) throw error
                     const updated = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave, pick_needed: syncedPick }
                     setSelectedStudent(updated)
                     setEditingField(null)
                  } catch (err: any) {
                     alert(err.message)
                  }
                } else if (e.key === 'Escape') {
                  handleCancelEditing()
                }
              }}
            >
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-[var(--surface-elevated)] text-[13px] text-[var(--foreground)] px-2 py-0.5 rounded border-none outline-none w-full"
              >
                {certsAllowed.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {editValue !== 'NO CERTIFICATE' && (
                <input
                  type="text"
                  placeholder="Score"
                  id="edit-score-input"
                  defaultValue={scoreVal || ''}
                  className="bg-[var(--surface-elevated)] text-[13px] text-[var(--foreground)] px-2 py-0.5 rounded border-none outline-none w-full"
                  autoFocus
                />
              )}
              <div className="flex justify-end gap-1 mt-1">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const scoreEl = document.getElementById('edit-score-input') as HTMLInputElement
                    const scoreInput = scoreEl ? scoreEl.value.trim() : ''
                    try {
                      const certToSave = editValue === '' ? null : editValue
                      const scoreToSave = scoreInput === '' ? null : scoreInput
                      const nextStudent = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave }
                      const syncedPick = syncMissingDocuments(nextStudent)
                      const { error } = await (supabase
                        .from('students') as any)
                        .update({ [certField]: certToSave, [scoreField]: scoreToSave, pick_needed: syncedPick })
                        .eq('id', selectedStudent!.id)
                      if (error) throw error
                      const updated = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave, pick_needed: syncedPick }
                      setSelectedStudent(updated)
                      setEditingField(null)
                    } catch (err: any) {
                      alert(err.message)
                    }
                  }}
                  className="bg-[var(--success)] hover:opacity-90 rounded text-white text-[11.5px] px-2 py-0.5 cursor-pointer font-bold"
                >
                  Save
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEditing();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 rounded text-white text-[11.5px] px-2 py-0.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex-1 min-w-0">
                {certVal && certVal !== 'NO CERTIFICATE' ? (
                  <div className="flex flex-col gap-1">
                    <div className="inline-flex flex-wrap items-center text-[13px] font-bold rounded-[4px] overflow-hidden shadow-sm self-start">
                      <span className={`${certColor} text-white px-1.5 py-0.5 uppercase`}>{certVal}</span>
                      <span className="bg-[#0052cc] text-white px-1.5 py-0.5">SCORE: {scoreVal || '—'}</span>
                    </div>
                    {(testDateVal || validDateVal) && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] font-medium">
                        {testDateVal && <span><span className="font-bold">Test:</span> {testDateVal}</span>}
                        {validDateVal && <span><span className="font-bold">Valid:</span> {validDateVal}</span>}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
                )}
              </div>
              {copiedField === String(certField) && (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

      // Render University status card (Now with copy & edit support)
      const renderUniversityCardDetails = (
        label: string,
        uniField: keyof Student,
        statusField: keyof Student,
        options: {
          compact?: boolean
          onAdd?: () => void
          addTitle?: string
          onRemove?: () => void
          removeTitle?: string
        } = {}
      ) => {
        const isEditing = editingField === uniField
        const uniVal = selectedStudent?.[uniField] as string
        const statusVal = selectedStudent?.[statusField] as string

        const getStatusBadgeClass = (status: string) => {
          if (!status) return 'bg-[#0052cc] text-white border-[#0052cc]'
          const matched = universityStatusOptions.find(s => s.name.toUpperCase() === status.toUpperCase())
          if (matched) {
            const cl = matched.colorClass
            if (cl.includes('emerald') || cl.includes('green')) return 'bg-[#36b37e] text-white border-[#36b37e]'
            if (cl.includes('rose') || cl.includes('red')) return 'bg-[#ff5630] text-white border-[#ff5630]'
            if (cl.includes('amber') || cl.includes('yellow')) return 'bg-[#ffab00] text-white border-[#ffab00]'
            if (cl.includes('blue')) return 'bg-[#0052cc] text-white border-[#0052cc]'
            if (cl.includes('indigo')) return 'bg-indigo-600 text-white border-indigo-600'
            if (cl.includes('purple')) return 'bg-purple-600 text-white border-purple-600'
            if (cl.includes('pink')) return 'bg-pink-600 text-white border-pink-600'
            if (cl.includes('cyan')) return 'bg-cyan-600 text-white border-cyan-600'
          }
          const statusUpper = status.toUpperCase()
          if (statusUpper === 'ACCEPTED' || statusUpper === 'FINISHED' || statusUpper === 'ADMITTED') {
            return 'bg-[#36b37e] text-white border-[#36b37e]'
          }
          if (statusUpper === 'FAILED' || statusUpper === 'REJECTED') {
            return 'bg-[#ff5630] text-white border-[#ff5630]'
          }
          if (statusUpper === 'APPLIED' || statusUpper === 'APPLYING') {
            return 'bg-[#ffab00] text-white border-[#ffab00]'
          }
          return 'bg-[#0052cc] text-white border-[#0052cc]'
        }

        const handleStatusSelect = async (newStatus: string) => {
          if (!selectedStudentState) return
          try {
            const nextStudent = {
              ...selectedStudent,
              [statusField]: newStatus,
              jarayon_updated_at: new Date().toISOString()
            }
            const syncedPick = syncMissingDocuments(nextStudent)
            const { error } = await (supabase
              .from('students') as any)
              .update({ [statusField]: newStatus, jarayon_updated_at: new Date().toISOString(), pick_needed: syncedPick })
              .eq('id', selectedStudent.id)
            if (error) throw error

            setSelectedStudent({
              ...nextStudent,
              pick_needed: syncedPick
            })
            setActiveStatusDropdown(null)
          } catch (err: any) {
            alert(`Failed to update status: ${err.message}`)
          }
        }

        const isMissing = !uniVal || uniVal.trim() === ''

        const isCopied = copiedField === String(uniField)

        return (
          <div
            className={cn(
              "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-between text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
              isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]',
              options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5',
              isCopied && "animate-copy-press"
            )}
            title={uniVal ? 'Single-click value to copy.' : undefined}
          >
            {isMissing && (
              <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
            )}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] uppercase tracking-wide glitter-label min-w-0 truncate" title={label}>{label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {uniVal && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(uniField), `${uniVal} (${statusVal || 'Chosen'})`);
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Copy university details"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditing(String(uniField), uniVal);
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Edit university selection"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {uniVal && !isEditing && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('Clear this university selection?')) return;
                      try {
                        const majorField = (uniField === 'university_1' ? 'university_1_major' : uniField === 'university_2' ? 'university_2_major' : uniField === 'university_3' ? 'university_3_major' : uniField === 'university_4' ? 'university_4_major' : 'university_5_major') as keyof Student;
                        const updateData = { [uniField]: null, [statusField]: '', [majorField]: null };
                        const nextStudent = { ...selectedStudent!, ...updateData };
                        const syncedPick = syncMissingDocuments(nextStudent);
                        const { error } = await (supabase.from('students') as any)
                          .update({ ...updateData, pick_needed: syncedPick, jarayon_updated_at: new Date().toISOString() })
                          .eq('id', selectedStudent!.id);
                        if (error) throw error;
                        setSelectedStudent({ ...nextStudent, pick_needed: syncedPick, jarayon_updated_at: new Date().toISOString() });
                      } catch (err: any) {
                        alert(`Failed to clear university: ${err.message}`);
                      }
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-red-600"
                    title="Clear university selection"
                  >
                    <Eraser className="h-3 w-3" />
                  </button>
                )}
                {options.onAdd && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      options.onAdd!();
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title={options.addTitle || 'Add another'}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
                {options.onRemove && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      options.onRemove!();
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-red-600"
                    title={options.removeTitle || 'Remove'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div
              className="mt-0.5 flex items-center min-h-[20px] w-full"
              onClick={() => {
                if (!isEditing && uniVal) {
                  handleCopy(String(uniField), `${uniVal} (${statusVal || 'Chosen'})`);
                }
              }}
            >
              {isEditing ? (
                <div 
                  className="flex flex-col gap-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const uniEl = document.getElementById('edit-uni-name-select') as HTMLSelectElement
                      const uniInput = uniEl ? uniEl.value : ''
                      try {
                        const nextStudent = { ...selectedStudent!, [uniField]: uniInput || null }
                        const syncedPick = syncMissingDocuments(nextStudent)
                        const { error } = await (supabase
                          .from('students') as any)
                          .update({ [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString(), pick_needed: syncedPick })
                          .eq('id', selectedStudent!.id)
                        if (error) throw error
                        const updated = { ...selectedStudent!, [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString(), pick_needed: syncedPick }
                        setSelectedStudent(updated)
                        setEditingField(null)
                      } catch (err: any) {
                        alert(err.message)
                      }
                    } else if (e.key === 'Escape') {
                      handleCancelEditing()
                    }
                  }}
                >
                  <select
                    id="edit-uni-name-select"
                    defaultValue={uniVal || ''}
                    className="bg-[var(--surface-elevated)] text-[13px] text-[var(--foreground)] px-2 py-0.5 rounded border-none outline-none w-full font-medium cursor-pointer"
                    autoFocus
                  >
                    <option value="">None Selected</option>
                    {universityOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-1 mt-1">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const uniEl = document.getElementById('edit-uni-name-select') as HTMLSelectElement
                        const uniInput = uniEl ? uniEl.value : ''
                        try {
                          const nextStudent = { ...selectedStudent!, [uniField]: uniInput || null }
                          const syncedPick = syncMissingDocuments(nextStudent)
                          const { error } = await (supabase
                            .from('students') as any)
                            .update({ [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString(), pick_needed: syncedPick })
                            .eq('id', selectedStudent!.id)
                          if (error) throw error
                          const updated = { ...selectedStudent!, [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString(), pick_needed: syncedPick }
                          setSelectedStudent(updated)
                          setEditingField(null)
                        } catch (err: any) {
                          alert(err.message)
                        }
                      }}
                      className="p-1 bg-[var(--success)] hover:opacity-90 rounded text-white text-[11.5px] px-2 py-0.5 cursor-pointer font-bold"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEditing();
                      }}
                      className="bg-gray-700 hover:bg-gray-800 rounded text-white text-[11.5px] px-2 py-0.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    {uniVal ? (
                      <div className="flex flex-col gap-0.5 w-full">
                        <span className="text-[14px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]" title={uniVal}>{uniVal}</span>
                        <div className="flex relative">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusDropdown(activeStatusDropdown === String(uniField) ? null : String(uniField));
                            }}
                            className={cn(
                              "status-dropdown-area inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase border cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm select-none",
                              getStatusBadgeClass(statusVal)
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />
                            {statusVal || 'Chosen'}
                          </span>

                          {/* Render major text/pill next to it if uniVal exists */}
                          {uniVal && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                const majorField = (uniField === 'university_1' ? 'university_1_major' : uniField === 'university_2' ? 'university_2_major' : uniField === 'university_3' ? 'university_3_major' : uniField === 'university_4' ? 'university_4_major' : 'university_5_major') as keyof Student;
                                setMajorEditingField(majorField as any);
                                setMajorModalLabel(label);
                                setTempMajorValue((selectedStudent?.[majorField] as string) || '');
                                setIsMajorModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[var(--accent)] hover:bg-[var(--border-subtle)] active:scale-95 transition-all shadow-sm select-none cursor-pointer"
                            >
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {((selectedStudent?.[(uniField === 'university_1' ? 'university_1_major' : uniField === 'university_2' ? 'university_2_major' : uniField === 'university_3' ? 'university_3_major' : uniField === 'university_4' ? 'university_4_major' : 'university_5_major') as keyof Student] as string) || 'Add Major').toUpperCase()}
                            </span>
                          )}

                          {activeStatusDropdown === String(uniField) && (
                            <>
                              {/* Transparent overlay backdrop to handle clicks outside */}
                              <div 
                                className="fixed inset-0 z-30 cursor-default" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusDropdown(null);
                                }}
                              />
                              
                              {/* Dropdown Popover */}
                              <div 
                                className="status-dropdown-area absolute left-0 mt-6 w-36 bg-white dark:bg-[#1c1c1e] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg z-40 py-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-2.5 py-1 text-[10.5px] uppercase font-bold tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border)] mb-0.5 select-none">
                                  University Status
                                </div>
                                {universityStatusOptions.map((item) => (
                                  <button
                                    key={item.name}
                                    onClick={() => handleStatusSelect(item.name)}
                                    className="w-full text-left px-2.5 py-1 text-[14px] font-semibold text-[var(--foreground)] hover:bg-[var(--border-subtle)] flex items-center gap-2 cursor-pointer transition-all"
                                  >
                                    <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0 bg-current", item.colorClass)} />
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
                    )}
                  </div>
                  {copiedField === String(uniField) && (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }

  // Render auto calculated Family/Given Name cards (ReadOnly copyable only)
  const renderAutoNameCard = (label: string, value: string, field: 'family_name' | 'given_name', isLoading: boolean = false) => {
    if (loading || isLoading) {
      return (
        <div
          className={cn(
            "bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] border-l-gray-250 dark:border-l-gray-700 rounded-[var(--radius-md)] px-2.5 py-1 flex flex-col justify-between animate-pulse min-h-[52px]"
          )}
        >
          <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
          <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        </div>
      )
    }

    const isCopied = copiedField === field
    const isMissing = !isLoading && (!value || value.trim() === '' || value.trim() === '—')
    return (
      <div
        className={cn(
          "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 py-1 flex flex-col justify-start min-h-[52px] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
          isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]',
          isCopied && "animate-copy-press"
        )}
        title={value && !isLoading ? 'Single-click value to copy.' : undefined}
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] uppercase tracking-wide glitter-label min-w-0 truncate" title={label}>
              {label}
            </span>
            <span className="bg-[var(--border-subtle)] border border-[var(--border)] text-[9.5px] px-1.5 py-0.2 rounded font-bold text-[var(--foreground-muted)] uppercase shrink-0">AUTO</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {value && !isLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(field, value);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy value"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-0.5 flex items-center justify-between gap-2 min-h-[20px] w-full"
          onClick={() => {
            if (value && !isLoading) {
              handleCopy(field, value);
            }
          }}
        >
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <span className="text-[14px] font-medium italic text-[#64748B]">{value}</span>
            ) : value ? (
              <span className="text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]">{value}</span>
            ) : (
              <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
            )}
          </div>
          {isCopied && (
            <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
          )}
        </div>
      </div>
    )
  }

  if (error || (!selectedStudentState && !loading)) {
    return (
      <div className="flex h-full items-center justify-center text-foreground p-6">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 text-center shadow-[var(--shadow-md)]">
          <AlertCircle className="h-12 w-12 text-[var(--danger)] mx-auto mb-4" />
          <h2 className="text-[20.5px] font-bold text-[var(--foreground)] mb-2">Error Loading Profile</h2>
          <p className="text-[15.5px] text-[var(--foreground-muted)] mb-6">{error || 'Student not found or has been deleted.'}</p>
          {onClose ? (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-[15.5px] font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Close
            </button>
          ) : (
            <Link
              href="/students"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-[15.5px] font-semibold transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Link>
          )}
        </div>
      </div>
    )
  }

  const formatRegistrationDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not recorded'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${day}.${month}.${year} ${hours}:${minutes}`
    } catch {
      return dateStr
    }
  }

  return (
    <PageShell className="p-3 gap-3">
      <div
        ref={panelRef}
        className="bg-transparent text-[var(--foreground)] transition-colors flex flex-col gap-2.5"
        style={{ zoom: panelZoom }}
      >
        {/* Student Header Identifier Banner (Extremely compact) */}
        <div className="py-2.5 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] flex items-center gap-3 shadow-[var(--shadow-sm)] transition-colors flex-shrink-0">
          {onClose ? (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)] shrink-0 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
              Close
            </button>
          ) : (
            <Link
              href="/students"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)] shrink-0 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
              Back
            </Link>
          )}
          <div className={cn(
            "w-11 h-11 bg-[var(--accent)] rounded-full flex items-center justify-center font-bold text-white text-sm select-none shadow-[var(--shadow-sm)]",
            loading && "bg-gray-200 dark:bg-gray-700 animate-pulse text-transparent"
          )}>
            {getInitials(selectedStudent.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <>
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
              </>
            ) : (
              <>
                <h1 className="text-[17.5px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">
                  {selectedStudent.full_name}
                </h1>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground-muted)] mt-0.5 flex-wrap">
                  <span>ID: <span className="font-mono text-[var(--accent)] font-bold text-[13px]">{selectedStudent.id}</span></span>
                  <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />
                  {selectedStudent.is_deleted ? (
                    <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-1.5 py-0.2 rounded-full text-[10.5px] font-extrabold uppercase animate-pulse">
                      DELETED
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.2 rounded-full text-[10.5px] font-extrabold uppercase">
                      ACTIVE
                    </span>
                  )}
                  {selectedStudent.student_group && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />
                      <span className="text-[var(--foreground)] uppercase font-bold text-[11.5px]">{selectedStudent.student_group}</span>
                    </>
                  )}
                  {selectedStudent.created_at && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--foreground-muted)]" title="First time registered in CRM">
                        <Calendar className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                        <span>Registered: <span className="font-mono text-[var(--foreground)] font-bold">{formatRegistrationDate(selectedStudent.created_at)}</span></span>
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {onClose && (
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {!loading && (
                <>
                  <button
                    onClick={() => router.push(`/students/${selectedStudent.id}/extract`)}
                    className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2.5 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer"
                    title="Fill student details from a document using AI"
                  >
                    <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span className="hidden sm:inline">Fill By Document</span>
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={selectedStudent.is_deleted ? handleRestoreStudent : handleDeleteStudent}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50',
                      selectedStudent.is_deleted
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-[var(--border-subtle)]'
                        : 'text-[var(--danger)] hover:bg-[var(--border-subtle)] hover:text-red-600'
                    )}
                    title={selectedStudent.is_deleted ? 'Restore student profile' : 'Delete student profile'}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : selectedStudent.is_deleted ? (
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{selectedStudent.is_deleted ? 'Restore' : 'Delete'}</span>
                  </button>
                  {selectedStudent.is_deleted && (
                    <button
                      disabled={isDeleting}
                      onClick={handlePermanentDeleteStudent}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 text-[var(--danger)] hover:bg-[var(--border-subtle)] hover:text-red-600"
                      title="Permanently delete student profile"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">Permanently Delete</span>
                    </button>
                  )}
                  <span className="h-5 w-[1px] bg-[var(--border)] mx-1" />
                </>
              )}
              <button
                onClick={() => {
                  if (onToggleExpand) {
                    onToggleExpand()
                  } else {
                    router.push(`/students/${selectedStudent.id}`)
                  }
                }}
                className="p-1.5 hover:bg-[var(--border-subtle)] rounded-full text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                title={onToggleExpand ? (isExpanded ? 'Collapse panel' : 'Expand to fullscreen') : 'Open in full page'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--border-subtle)] rounded-full text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                title="Close Profile Details"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

        {/* Main Dashboard Layout (3-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1.25fr_0.75fr] gap-3 pb-1">
          {/* Column 1: Passport Details & Contact */}
          <div className="flex flex-col gap-2">
            {/* Passport Details Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Passport Details
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {isTranslatingNames && <Loader2 className="h-3 w-3 animate-spin text-[var(--accent)]" />}
                  <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden text-[10.5px] font-bold">
                    <button
                      onClick={() => setNameLanguage('EN')}
                      className={`px-2 py-0.5 cursor-pointer transition-all ${nameLanguage === 'EN' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[#64748B] hover:bg-[var(--surface-elevated)]'}`}
                      title="Show names in original Latin script"
                    >
                      EN
                    </button>
                    <button
                      onClick={handleShowKorean}
                      disabled={isTranslatingNames}
                      className={`px-2 py-0.5 cursor-pointer transition-all border-l border-[var(--border)] disabled:opacity-60 ${nameLanguage === 'KR' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[#64748B] hover:bg-[var(--surface-elevated)]'}`}
                      title="Show name in Korean (uses AI translation if not saved yet)"
                    >
                      KR
                    </button>
                  </div>
                </div>
              </div>
              {nameLanguage === 'KR' && translateError && (
                <div className="text-[10.5px] font-medium text-amber-600 -mt-1">{translateError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <div className="sm:col-span-2">
                  {nameLanguage === 'KR' ? (
                    renderDetailCard(
                      'Full Name (Korean)',
                      'korean_name',
                      selectedStudent.korean_name || (isTranslatingNames ? 'Translating...' : ''),
                      {
                        titleColor: 'text-[var(--accent)]',
                        editable: !isTranslatingNames,
                        copyable: !isTranslatingNames,
                        compact: true
                      }
                    )
                  ) : (
                    renderDetailCard(
                      'Full Name',
                      'full_name',
                      selectedStudent.full_name,
                      {
                        titleColor: 'text-[var(--accent)]',
                        editable: true,
                        copyable: true,
                        compact: true
                      }
                    )
                  )}
                </div>
                {renderAutoNameCard(
                  'Family Name',
                  nameLanguage === 'KR'
                    ? (selectedStudent.korean_name ? selectedStudent.korean_name.split(' ')[0] : (isTranslatingNames ? 'Translating...' : ''))
                    : (selectedStudent.full_name ? (selectedStudent.full_name.split(' ')[0] || '') : ''),
                  'family_name',
                  nameLanguage === 'KR' && isTranslatingNames
                )}
                {renderAutoNameCard(
                  'Given Name',
                  nameLanguage === 'KR'
                    ? (selectedStudent.korean_name ? selectedStudent.korean_name.split(' ').slice(1).join(' ') : (isTranslatingNames ? 'Translating...' : ''))
                    : (selectedStudent.full_name ? (selectedStudent.full_name.split(' ').slice(1).join(' ') || '') : ''),
                  'given_name',
                  nameLanguage === 'KR' && isTranslatingNames
                )}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {renderDetailCard('Sex', 'gender', selectedStudent.gender, {
                    type: 'select',
                    selectOptions: ['MALE', 'FEMALE'],
                    titleColor: 'text-[var(--accent)]',
                    compact: true
                  })}
                  {renderDetailCard('Birthday', 'birthday', selectedStudent.birthday, { type: 'date', titleColor: 'text-[var(--accent)]', compact: true })}
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  {renderDetailCard('Passport', 'passport', selectedStudent.passport, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Date of Issue', 'passport_issue_date', selectedStudent.passport_issue_date, { type: 'date', titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Date of Expiration', 'passport_expire_date', selectedStudent.passport_expire_date, { type: 'date', titleColor: 'text-[var(--accent)]', compact: true })}
                </div>
              </div>
            </div>

            {/* Contact Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <Mail className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Contact
                </h3>
              </div>
              {/* Contact runs compact: four cards, two of them full width, so
                  the shorter card height keeps the column from dominating.
                  Phones stay visible; email/address expand with the section. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {renderDetailCard('Phone 1', 'phone1', selectedStudent.phone1, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Phone 2', 'phone2', selectedStudent.phone2, { titleColor: 'text-[var(--accent)]', compact: true })}
                {contactExpanded && (
                  <>
                    <div className="sm:col-span-2">
                      {renderDetailCard('Email', 'email', selectedStudent.email, { titleColor: 'text-[var(--accent)]', compact: true })}
                    </div>
                    <div className="sm:col-span-2">
                      {renderDetailCard('Address', 'address', selectedStudent.address, { titleColor: 'text-[var(--accent)]', compact: true })}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setExpandedSection(contactExpanded ? 'education' : 'contact')}
                aria-expanded={contactExpanded}
                className="flex items-center justify-center gap-1 w-full py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                {contactExpanded ? 'Show less' : 'Show more'}
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  contactExpanded && "rotate-180"
                )} />
              </button>
            </div>

            {/* Educational Background Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-0.5">
                <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Educational Background
                </h3>
                <button
                  onClick={() => {
                    setGpaSystemManual(false)
                    setShowSchoolSuggestions(false)
                    setShowMajorSuggestions(false)
                    setGradExpected(!!selectedStudent.graduation_expected)
                    setTempSchool({
                      final_school_name: selectedStudent.final_school_name || '',
                      gpa: selectedStudent.gpa || '',
                      gpa_system: selectedStudent.gpa_system || '',
                      major: selectedStudent.major || '',
                      degree_no: selectedStudent.degree_no || '',
                      date_of_entry: selectedStudent.date_of_entry || '',
                      date_of_graduation: selectedStudent.date_of_graduation || '',
                      school_address: selectedStudent.school_address || '',
                      school_website: selectedStudent.school_website || '',
                      school_phone: selectedStudent.school_phone || '',
                      school_email: selectedStudent.school_email || ''
                    })
                    setIsSchoolModalOpen(true)
                  }}
                  title="Edit educational background"
                  className="ml-auto p-0.5 rounded transition-all cursor-pointer hover:bg-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              {/* Fields sit on the same white surface the other cards use, so the
                  tinted panel reads as a grey frame around them. */}
              <div className="flex flex-col gap-0.5 bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] rounded-[var(--radius-md)] px-2.5 py-2">
                {([
                  { key: 'final_school_name', label: 'Final School Name', value: selectedStudent.final_school_name, stacked: true, always: true },
                  { key: 'major', label: 'Major', value: selectedStudent.major, stacked: true, always: true },
                  { key: 'gpa', label: 'GPA', value: formatGpa(selectedStudent.gpa, selectedStudent.gpa_system), stacked: false, always: false },
                  { key: 'degree_no', label: 'Degree No', value: selectedStudent.degree_no, stacked: false, always: false },
                  { key: 'date_of_entry', label: 'Date of Entry', value: selectedStudent.date_of_entry, stacked: false, always: false },
                  {
                    key: 'date_of_graduation',
                    label: 'Date of Graduation',
                    value: selectedStudent.graduation_expected
                      ? EXPECTED_YEAR
                      : selectedStudent.date_of_graduation,
                    stacked: false,
                    always: false
                  },
                  { key: 'school_address', label: 'School Address', value: selectedStudent.school_address, stacked: true, always: false },
                  { key: 'school_website', label: 'School Website', value: selectedStudent.school_website, stacked: false, always: false },
                  { key: 'school_phone', label: 'School Phone', value: selectedStudent.school_phone, stacked: false, always: false },
                  { key: 'school_email', label: 'School E-mail', value: selectedStudent.school_email, stacked: false, always: false }
                ] as const).filter(row => eduExpanded || row.always).map(row => {
                  const value = (row.value || '').trim()
                  const isCopied = copiedField === `edu_${row.key}`
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        "group/row rounded-[var(--radius-sm)] px-1.5 -mx-1 py-1 transition-colors hover:bg-[var(--border-subtle)]/50",
                        row.stacked ? "flex flex-col gap-0.5" : "flex items-baseline justify-between gap-3"
                      )}
                    >
                      <span className="text-[10.5px] uppercase tracking-wider text-[var(--foreground-muted)] font-semibold shrink-0">
                        {row.label}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 min-w-0",
                        row.stacked ? "w-full" : "justify-end"
                      )}>
                        {value ? (
                          <span className="text-[13px] font-semibold text-[var(--foreground)] break-words min-w-0 leading-snug">
                            {value}
                          </span>
                        ) : (
                          <span className="text-[13px] font-medium text-[var(--foreground-muted)]/60">—</span>
                        )}
                        {value && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Copies the value alone — never the label.
                              handleCopy(`edu_${row.key}`, value)
                            }}
                            title={`Copy ${row.label.toLowerCase()}`}
                            className={cn(
                              "shrink-0 p-0.5 rounded transition-all cursor-pointer focus:opacity-100 hover:bg-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
                              isCopied ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
                            )}
                          >
                            {isCopied
                              ? <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                              : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => setExpandedSection(eduExpanded ? 'contact' : 'education')}
                  aria-expanded={eduExpanded}
                  className="mt-1 pt-1.5 flex items-center justify-center gap-1 w-full border-t border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  {eduExpanded ? 'Show less' : 'Show more'}
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    eduExpanded && "rotate-180"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Academic, Universities & Family */}
          <div className="flex flex-col gap-2">
            {/* Academic & Languages Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Academic & Languages
                </h3>
              </div>
              {/* Single 2-column flow: each optional slot fills the next free
                  cell instead of claiming its own row, so adding Level 2 /
                  Cert 2 / Cert 3 never leaves a gap beside a lone card. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {renderDetailCard('Tariff', 'tariff', selectedStudent.tariff, {
                  type: 'select',
                  selectOptions: ['Select', ...tariffOptions],
                  badgeColor: 'bg-[#00875a] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}
                {renderDetailCard('Level to Study', 'level', selectedStudent.level, {
                  type: 'select',
                  selectOptions: ['Select', ...levelOptions],
                  badgeColor: 'bg-[#0052cc] text-white',
                  titleColor: 'text-[var(--accent)]',
                  onAdd: showLevel2 ? undefined : () => setShowLevel2(true),
                  addTitle: 'Add Level to Study 2'
                })}

                {showLevel2 && renderDetailCard('Level to Study 2', 'level2', selectedStudent.level2, {
                  type: 'select',
                  selectOptions: ['Select', ...levelOptions],
                  badgeColor: 'bg-[#ff9900] text-white',
                  titleColor: 'text-[var(--accent)]',
                  onRemove: () => handleClearAndHideSlot(['level2'], () => setShowLevel2(false)),
                  removeTitle: 'Remove Level to Study 2'
                })}

                {renderCertificateCard('Language Certificate 1', 'language_certificate', 'certificate_score', 'certificate_test_date', 'certificate_valid_date', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#de350b]', {
                  onAdd: showCert2 ? undefined : () => setShowCert2(true),
                  addTitle: 'Add Language Certificate 2'
                })}

                {showCert2 && renderCertificateCard('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', 'certificate_2_test_date', 'certificate_2_valid_date', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#00b8d9]', {
                  onAdd: showCert3 ? undefined : () => setShowCert3(true),
                  addTitle: 'Add Language Certificate 3',
                  onRemove: () => handleClearAndHideSlot(
                    ['language_certificate_2', 'certificate_score_2', 'certificate_2_test_date', 'certificate_2_valid_date'],
                    () => { setShowCert2(false); setShowCert3(false) }
                  ),
                  removeTitle: 'Remove Language Certificate 2'
                })}

                {showCert3 && renderCertificateCard('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', 'certificate_3_test_date', 'certificate_3_valid_date', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#ff5630]', {
                  onRemove: () => handleClearAndHideSlot(
                    ['language_certificate_3', 'certificate_score_3', 'certificate_3_test_date', 'certificate_3_valid_date'],
                    () => setShowCert3(false)
                  ),
                  removeTitle: 'Remove Language Certificate 3'
                })}
              </div>
            </div>

            {/* Universities & Docs Block */}
            <div className="relative z-20 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  CHOSEN UNIVERSITIES
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {renderUniversityCardDetails('University 1', 'university_1', 'university_1_status', {
                  onAdd: showUni2 ? undefined : () => setShowUni2(true),
                  addTitle: 'Add University 2'
                })}
                {showUni2 && renderUniversityCardDetails('University 2', 'university_2', 'university_2_status', {
                  onAdd: showUni3 ? undefined : () => setShowUni3(true),
                  addTitle: 'Add University 3',
                  onRemove: () => handleClearAndHideSlot(['university_2', 'university_2_status', 'university_2_major'], () => { setShowUni2(false); setShowUni3(false); setShowUni4(false); setShowUni5(false); }),
                  removeTitle: 'Remove University 2'
                })}
                {showUni3 && renderUniversityCardDetails('University 3', 'university_3', 'university_3_status', {
                  onAdd: showUni4 ? undefined : () => setShowUni4(true),
                  addTitle: 'Add University 4',
                  onRemove: () => handleClearAndHideSlot(['university_3', 'university_3_status', 'university_3_major'], () => { setShowUni3(false); setShowUni4(false); setShowUni5(false); }),
                  removeTitle: 'Remove University 3'
                })}
                {showUni4 && renderUniversityCardDetails('University 4', 'university_4', 'university_4_status', {
                  onAdd: showUni5 ? undefined : () => setShowUni5(true),
                  addTitle: 'Add University 5',
                  onRemove: () => handleClearAndHideSlot(['university_4', 'university_4_status', 'university_4_major'], () => { setShowUni4(false); setShowUni5(false); }),
                  removeTitle: 'Remove University 4'
                })}
                {showUni5 && renderUniversityCardDetails('University 5', 'university_5', 'university_5_status', {
                  compact: true,
                  onRemove: () => handleClearAndHideSlot(['university_5', 'university_5_status', 'university_5_major'], () => setShowUni5(false)),
                  removeTitle: 'Remove University 5'
                })}
              </div>
            </div>

            {/* Family Info Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Family Info
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {renderDetailCard('Father Fullname', 'father_name', selectedStudent.father_name, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Mother Fullname', 'mother_name', selectedStudent.mother_name, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Father Phone', 'father_phone', selectedStudent.father_phone, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Mother Phone', 'mother_phone', selectedStudent.mother_phone, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Father Job', 'father_job', selectedStudent.father_job, { titleColor: 'text-[var(--accent)]', compact: true })}
                {renderDetailCard('Mother Job', 'mother_job', selectedStudent.mother_job, { titleColor: 'text-[var(--accent)]', compact: true })}
                <div className="sm:col-span-2">
                  {renderDetailCard('Notes', 'notes', selectedStudent.notes, { titleColor: 'text-[var(--accent)]', compact: true })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: System & Finance */}
          <div className="flex flex-col gap-2">
            {/* System & Finance Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-2 shadow-[var(--shadow-sm)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  System & Finance
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {/* Office Location Card */}
                {/* Office Card */}
                {loading ? (
                  <div className="bg-blue-500/20 rounded-[var(--radius-md)] p-2.5 min-h-[62px] animate-pulse flex flex-col justify-between">
                    <div className="h-2.5 w-12 bg-blue-400/30 rounded" />
                    <div className="h-3.5 w-24 bg-blue-400/30 rounded" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "bg-blue-500 dark:bg-blue-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] shadow-sm cursor-pointer transition-all duration-200",
                      copiedField === 'office' && "animate-copy-press"
                    )}
                    title="Single-click value to copy."
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] uppercase font-bold tracking-wider text-blue-100 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Office
                      </span>
                      <div className="flex items-center gap-1">
                        {selectedStudent.office && editingField !== 'office' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy('office', selectedStudent.office || '')
                            }}
                            className="p-0.5 hover:bg-blue-600/50 rounded transition-all cursor-pointer text-blue-200 hover:text-white"
                            title="Copy office location"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        {editingField !== 'office' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing('office', selectedStudent.office)
                            }}
                            className="p-0.5 hover:bg-blue-600/50 rounded transition-all cursor-pointer text-blue-200 hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div 
                      className="mt-0.5 flex items-center min-h-[22px] w-full"
                      onClick={() => {
                        if (editingField !== 'office' && selectedStudent.office) {
                          handleCopy('office', selectedStudent.office)
                        }
                      }}
                    >
                      {editingField === 'office' ? (
                        <div 
                          className="flex items-center gap-1.5 w-full"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveField('office')
                            else if (e.key === 'Escape') handleCancelEditing()
                          }}
                        >
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-blue-600 text-[15px] text-white px-2 py-0.5 rounded border border-blue-400 focus:outline-none w-full font-semibold cursor-pointer"
                          >
                            {officeOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveField('office')}
                            className="p-0.5 hover:bg-blue-700 rounded text-emerald-250 cursor-pointer active:scale-[0.85] transition-transform"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEditing}
                            className="p-0.5 hover:bg-blue-700 rounded text-rose-250 cursor-pointer active:scale-[0.85] transition-transform"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="text-[15px] font-bold tracking-wide uppercase truncate">{selectedStudent.office || 'Not provided'}</span>
                          {copiedField === 'office' && (
                            <CheckCircle2 className="h-4 w-4 text-white shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Student Balance Card */}
                {loading ? (
                  <div className="bg-emerald-500/20 rounded-[var(--radius-md)] p-2.5 min-h-[62px] animate-pulse flex flex-col justify-between">
                    <div className="h-2.5 w-12 bg-emerald-400/30 rounded" />
                    <div className="h-3.5 w-24 bg-emerald-400/30 rounded" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer transition-all duration-200",
                      selectedStudent.balance < 0 ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600',
                      copiedField === 'balance' && "animate-copy-press"
                    )}
                    title="Single-click value to copy."
                    onClick={() => {
                      handleCopy('balance', String(selectedStudent.balance))
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        Balance
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy('balance', String(selectedStudent.balance))
                          }}
                          className="p-0.5 hover:bg-black/10 rounded transition-all cursor-pointer text-white"
                          title="Copy balance"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 min-h-[22px] w-full">
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(selectedStudent.balance)}
                      </span>
                      {copiedField === 'balance' && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                      )}
                    </div>
                  </div>
                )}

                {/* Payments Done Card */}
                {loading ? (
                  <div className="bg-emerald-500/20 rounded-[var(--radius-md)] p-2.5 min-h-[62px] animate-pulse flex flex-col justify-between">
                    <div className="h-2.5 w-20 bg-emerald-400/30 rounded" />
                    <div className="h-3.5 w-24 bg-emerald-400/30 rounded" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "bg-emerald-500 dark:bg-emerald-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer transition-all duration-200",
                      copiedField === 'payments_done' && "animate-copy-press"
                    )}
                    title="Single-click value to copy."
                    onClick={() => {
                      handleCopy('payments_done', String(computedPaymentsDone))
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        Payments Done
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy('payments_done', String(computedPaymentsDone))
                          }}
                          className="p-0.5 hover:bg-black/10 rounded transition-all cursor-pointer text-white"
                          title="Copy payments done"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 min-h-[22px] w-full">
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(computedPaymentsDone)}
                      </span>
                      {copiedField === 'payments_done' && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                      )}
                    </div>
                  </div>
                )}

                {/* Discount Card */}
                {loading ? (
                  <div className="bg-orange-500/20 rounded-[var(--radius-md)] p-2.5 min-h-[62px] animate-pulse flex flex-col justify-between">
                    <div className="h-2.5 w-16 bg-orange-400/30 rounded" />
                    <div className="h-3.5 w-24 bg-orange-400/30 rounded" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "bg-orange-500 dark:bg-orange-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer transition-all duration-200",
                      copiedField === 'discount' && "animate-copy-press"
                    )}
                    title="Single-click value to copy."
                    onClick={() => {
                      handleCopy('discount', String(computedDiscount))
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Discount
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy('discount', String(computedDiscount))
                          }}
                          className="p-0.5 hover:bg-black/10 rounded transition-all cursor-pointer text-white"
                          title="Copy discount amount"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 min-h-[22px] w-full">
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(computedDiscount)}
                      </span>
                      {copiedField === 'discount' && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                      )}
                    </div>
                  </div>
                )}

                {renderDetailCard('Student ID', 'id', selectedStudent.id, { 
                  titleColor: 'text-[var(--accent)]',
                  valueClassName: 'font-mono'
                })}

                {renderDetailCard('Group', 'student_group', selectedStudent.student_group, {
                  type: 'select',
                  selectOptions: ['Select', ...groupOptions],
                  badgeColor: 'bg-[#6554c0] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}

                {renderDetailCard('Lead By', 'lead_by', selectedStudent.lead_by, {
                  type: 'select',
                  selectOptions: ['Select', ...leadByOptions],
                  badgeColor: 'bg-[#00b8d9] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}

                {renderDetailCard('Missing Documents', 'pick_needed', selectedStudent.pick_needed, {
                  badgeColor: 'bg-[#5243aa] text-white',
                  titleColor: 'text-[var(--accent)]',
                  forceBorderColor: selectedStudent.pick_needed && selectedStudent.pick_needed.length > 0 ? 'red' : 'blue',
                  editable: false
                })}

                {renderDetailCard('Kordinator', 'coordinator', selectedStudent.coordinator, {
                  type: 'select',
                  selectOptions: ['Select', ...coordinatorOptions],
                  badgeColor: 'bg-[#ff5630] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}

              </div>
            </div>
          </div>
        </div>
      </div>

      
      {/* Certificate Editing Modal */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCertModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl p-6 w-full max-w-lg mx-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCertModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[17px] font-bold text-[var(--foreground)] mb-3 pr-6">
              Edit {certModalLabel}
            </h3>

            {selectedStudent && (
              <div className="flex flex-col gap-1 mb-5 p-3 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border)]">
                <div className="text-[14px] font-semibold text-[var(--foreground)]">
                  {selectedStudent.full_name}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedStudent.tariff && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-white">
                      {selectedStudent.tariff}
                    </span>
                  )}
                  {selectedStudent.educational_background && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-500 text-white">
                      {selectedStudent.educational_background}
                    </span>
                  )}
                  {selectedStudent.level && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#0052cc] text-white">
                      {selectedStudent.level}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                  Certificate Type
                </label>
                <select
                  value={tempCertType}
                  onChange={(e) => setTempCertType(e.target.value)}
                  className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                >
                  <option value="">-- Select Certificate --</option>
                  <option value="NO CERTIFICATE">NO CERTIFICATE</option>
                  {['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {tempCertType && tempCertType !== 'NO CERTIFICATE' && (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                      Score
                    </label>
                    {['TOPIK', 'IELTS', 'CEFR'].includes(tempCertType) ? (
                      <select
                        value={tempCertScore}
                        onChange={(e) => setTempCertScore(e.target.value)}
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                      >
                        <option value="">-- Select Score --</option>
                        {tempCertType === 'TOPIK' && ['EXPECTED', '1', '2', '3', '4', '5', '6'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        {tempCertType === 'IELTS' && ['EXPECTED', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        {tempCertType === 'CEFR' && ['EXPECTED', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={tempCertScore}
                        onChange={(e) => setTempCertScore(e.target.value)}
                        placeholder="e.g. 6.0"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                      />
                    )}
                  </div>
                  
                  {['TOPIK', 'IELTS', 'CEFR', 'TOEFL', 'SKA'].includes(tempCertType) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                          Test Date
                        </label>
                        {(() => {
                          const parts = tempCertTestDate ? tempCertTestDate.split('-') : ['', '', ''];
                          const y = parts[0] || '';
                          const m = parts[1] || '';
                          const d = parts[2] || '';
                          const years = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - 10 + i));
                          const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                          const daysCount = y && m ? new Date(parseInt(y), parseInt(m), 0).getDate() : 31;
                          const days = Array.from({ length: daysCount }, (_, i) => String(i + 1).padStart(2, '0'));

                          const update = (field: 'y'|'m'|'d', val: string) => {
                            let newY = field === 'y' ? val : y || String(new Date().getFullYear());
                            let newM = field === 'm' ? val : m || '01';
                            let newD = field === 'd' ? val : d || '01';
                            if (newY && newM) {
                              const maxD = new Date(parseInt(newY), parseInt(newM), 0).getDate();
                              if (parseInt(newD) > maxD) newD = String(maxD).padStart(2, '0');
                            }
                            const newDate = `${newY}-${newM}-${newD}`;
                            setTempCertTestDate(newDate);
                            // Auto add 2 years minus 1 day to valid date
                            const dateObj = new Date(parseInt(newY) + 2, parseInt(newM) - 1, parseInt(newD) - 1);
                            const validY = String(dateObj.getFullYear());
                            const validM = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const validD = String(dateObj.getDate()).padStart(2, '0');
                            setTempCertValidDate(`${validY}-${validM}-${validD}`);
                          };

                          return (
                            <div className="flex gap-1">
                              <select value={y} onChange={(e) => update('y', e.target.value)} className="w-[45%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">YYYY</option>
                                {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                              </select>
                              <select value={m} onChange={(e) => update('m', e.target.value)} className="w-[27%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">MM</option>
                                {months.map(mo => <option key={mo} value={mo}>{mo}</option>)}
                              </select>
                              <select value={d} onChange={(e) => update('d', e.target.value)} className="w-[27%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">DD</option>
                                {days.map(dy => <option key={dy} value={dy}>{dy}</option>)}
                              </select>
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                          Valid Date
                        </label>
                        {(() => {
                          const parts = tempCertValidDate ? tempCertValidDate.split('-') : ['', '', ''];
                          const y = parts[0] || '';
                          const m = parts[1] || '';
                          const d = parts[2] || '';
                          const years = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - 8 + i));
                          const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                          const daysCount = y && m ? new Date(parseInt(y), parseInt(m), 0).getDate() : 31;
                          const days = Array.from({ length: daysCount }, (_, i) => String(i + 1).padStart(2, '0'));

                          const update = (field: 'y'|'m'|'d', val: string) => {
                            let newY = field === 'y' ? val : y || String(new Date().getFullYear() + 2);
                            let newM = field === 'm' ? val : m || '01';
                            let newD = field === 'd' ? val : d || '01';
                            if (newY && newM) {
                              const maxD = new Date(parseInt(newY), parseInt(newM), 0).getDate();
                              if (parseInt(newD) > maxD) newD = String(maxD).padStart(2, '0');
                            }
                            setTempCertValidDate(`${newY}-${newM}-${newD}`);
                          };

                          return (
                            <div className="flex gap-1">
                              <select value={y} onChange={(e) => update('y', e.target.value)} className="w-[45%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">YYYY</option>
                                {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                              </select>
                              <select value={m} onChange={(e) => update('m', e.target.value)} className="w-[27%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">MM</option>
                                {months.map(mo => <option key={mo} value={mo}>{mo}</option>)}
                              </select>
                              <select value={d} onChange={(e) => update('d', e.target.value)} className="w-[27%] bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-2 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[13px]">
                                <option value="">DD</option>
                                {days.map(dy => <option key={dy} value={dy}>{dy}</option>)}
                              </select>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setIsCertModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                disabled={savingCert}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedStudent || !certEditingField) return;
                  setSavingCert(true);
                  try {
                    const isNoCert = tempCertType === 'NO CERTIFICATE' || tempCertType === '';
                    
                    const scoreField = certEditingField === 'language_certificate' ? 'certificate_score' : certEditingField.replace('language_certificate_', 'certificate_score_') as keyof Student;
                    const testDateField = certEditingField === 'language_certificate' ? 'certificate_test_date' : certEditingField.replace('language_', 'certificate_').replace('_certificate', '') + '_test_date' as keyof Student;
                    const validDateField = certEditingField === 'language_certificate' ? 'certificate_valid_date' : certEditingField.replace('language_', 'certificate_').replace('_certificate', '') + '_valid_date' as keyof Student;

                    const certToSave = isNoCert ? (tempCertType === 'NO CERTIFICATE' ? 'NO CERTIFICATE' : null) : tempCertType;
                    const scoreToSave = isNoCert || tempCertScore === '' ? null : tempCertScore;
                    const testDateToSave = isNoCert || tempCertTestDate === '' ? null : tempCertTestDate;
                    const validDateToSave = isNoCert || tempCertValidDate === '' ? null : tempCertValidDate;

                    const updates = {
                      [certEditingField]: certToSave,
                      [scoreField]: scoreToSave,
                      [testDateField]: testDateToSave,
                      [validDateField]: validDateToSave
                    };
                    
                    const nextStudent = { ...selectedStudent, ...updates } as any;
                    const syncedPick = syncMissingDocuments(nextStudent);
                    
                    const { error } = await (supabase.from('students') as any)
                      .update({ ...updates, pick_needed: syncedPick })
                      .eq('id', selectedStudent.id);
                      
                    if (error) throw error;
                    
                    const updated = { ...selectedStudent, ...updates, pick_needed: syncedPick } as any;
                    setSelectedStudent(updated);
                    setIsCertModalOpen(false);
                  } catch (err: any) {
                    alert('Error saving certificate: ' + err.message);
                  } finally {
                    setSavingCert(false);
                  }
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                disabled={savingCert}
              >
                {savingCert ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Educational Background Modal */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSchoolModalOpen(false)}
          />
          {/* Modal Container: max-h keeps the taller form usable on short screens */}
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl p-6 w-full max-w-4xl mx-4 z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsSchoolModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[17px] font-bold text-[var(--foreground)] mb-1 pr-6">
              Edit Educational Background
            </h3>
            <p className="text-[12px] text-[var(--foreground-muted)] mb-5">
              All fields are optional — leave blank to clear.
            </p>

            {/* 8 columns from sm up so fields can take uneven widths (GPA narrow,
                Major wide) and each row still ends flush with the modal edge. */}
            <div className="grid grid-cols-1 sm:grid-cols-8 gap-4">
              {([
                { key: 'final_school_name', label: 'Final School Name', type: 'text', placeholder: 'e.g. Tashkent State University', full: true },
                { key: 'major', label: 'Major', type: 'text', placeholder: 'e.g. Computer Science', full: true },
                { key: 'gpa', label: 'GPA', type: 'text', placeholder: 'e.g. 3.8', span: 'sm:col-span-2' },
                { key: 'gpa_system', label: 'System', type: 'select', options: GPA_SYSTEM_OPTIONS, span: 'sm:col-span-2' },
                { key: 'degree_no', label: 'Degree No', type: 'text', placeholder: 'e.g. AB1234567', span: 'sm:col-span-4' },
                { key: 'date_of_entry', label: 'Date of Entry', type: 'date', span: 'sm:col-span-4' },
                { key: 'date_of_graduation', label: 'Date of Graduation', type: 'date', span: 'sm:col-span-4' },
                { key: 'school_address', label: 'School Address', type: 'text', placeholder: 'Street, city, country', full: true },
                { key: 'school_website', label: 'School Website', type: 'url', placeholder: 'https://example.edu', span: 'sm:col-span-3' },
                { key: 'school_phone', label: 'School Phone', type: 'tel', placeholder: '+998 XX XXX XX XX', span: 'sm:col-span-2' },
                { key: 'school_email', label: 'School E-mail', type: 'email', placeholder: 'info@example.edu', span: 'sm:col-span-3' }
              ] as const).map(f => (
                <div key={f.key} className={cn(
                  ('full' in f && f.full) && 'sm:col-span-8',
                  ('span' in f && f.span) || undefined
                )}>
                  <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                    {f.label}
                  </label>
                  {f.type === 'date' ? (
                    renderDateSelects(
                      tempSchool[f.key],
                      (next) => setTempSchool(prev => ({ ...prev, [f.key]: next })),
                      f.key === 'date_of_graduation'
                        ? { isExpected: gradExpected, onExpectedChange: setGradExpected }
                        : undefined,
                      f.key === 'date_of_entry'
                        ? (year) => {
                            const gradYear = String(parseInt(year) + DEFAULT_COURSE_YEARS)
                            const gradDate = `${gradYear}-${GRADUATION_MONTH}-${GRADUATION_DAY}`
                            // A graduation that hasn't happened yet is recorded as
                            // "expected" only — no year, month or day is claimed.
                            const expected = isFutureDate(gradDate)
                            setGradExpected(expected)
                            setTempSchool(prev => ({
                              ...prev,
                              date_of_graduation: expected ? '' : gradDate
                            }))
                          }
                        : undefined
                    )
                  ) : f.type === 'select' ? (
                    (() => {
                      const opts = 'options' in f ? f.options : []
                      const val = tempSchool[f.key]
                      // A saved value outside the preset list means it was typed
                      // in manually, so reopen the form in manual mode.
                      const isManual = gpaSystemManual || (val !== '' && !opts.includes(val as any))
                      return isManual ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => setTempSchool(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder="e.g. 10"
                            autoFocus
                            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setGpaSystemManual(false)
                              setTempSchool(prev => ({ ...prev, [f.key]: '' }))
                            }}
                            title="Back to preset systems"
                            className="shrink-0 px-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={val}
                          onChange={(e) => {
                            if (e.target.value === GPA_SYSTEM_MANUAL) {
                              setGpaSystemManual(true)
                              setTempSchool(prev => ({ ...prev, [f.key]: '' }))
                              return
                            }
                            setTempSchool(prev => ({ ...prev, [f.key]: e.target.value }))
                          }}
                          className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                        >
                          <option value="">Select</option>
                          {opts.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )
                    })()
                  ) : (f.key === 'final_school_name' || f.key === 'major') ? (
                    (() => {
                      const isSchool = f.key === 'final_school_name'
                      const list = isSchool ? schoolSuggestions : uzMajorSuggestions
                      const open = isSchool ? showSchoolSuggestions : showMajorSuggestions
                      const setOpen = isSchool ? setShowSchoolSuggestions : setShowMajorSuggestions
                      return (
                        <div className="relative">
                          <input
                            type="text"
                            value={tempSchool[f.key]}
                            onChange={(e) => {
                              setTempSchool(prev => ({ ...prev, [f.key]: e.target.value.toUpperCase() }))
                              setOpen(true)
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder={'placeholder' in f ? f.placeholder : undefined}
                            autoComplete="off"
                            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                          />
                          {open && list.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] shadow-lg z-50 divide-y divide-[var(--border-subtle)] animate-in fade-in slide-in-from-top-1 duration-100">
                              {list.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => {
                                    setTempSchool(prev => ({ ...prev, [f.key]: suggestion }))
                                    setOpen(false)
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors cursor-pointer"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <input
                      type={f.type}
                      value={tempSchool[f.key]}
                      onChange={(e) => setTempSchool(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={'placeholder' in f ? f.placeholder : undefined}
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setIsSchoolModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                disabled={savingSchool}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedStudent) return;
                  setSavingSchool(true);
                  try {
                    // Blank inputs are stored as NULL rather than empty strings so
                    // the cards keep showing "Not provided" for missing values.
                    const updates = {
                      ...Object.fromEntries(
                        Object.entries(tempSchool).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()])
                      ),
                      graduation_expected: gradExpected
                    };

                    const nextStudent = { ...selectedStudent, ...updates } as any;
                    const syncedPick = syncMissingDocuments(nextStudent);

                    const { error } = await (supabase.from('students') as any)
                      .update({ ...updates, pick_needed: syncedPick })
                      .eq('id', selectedStudent.id);

                    if (error) throw error;

                    setSelectedStudent({ ...selectedStudent, ...updates, pick_needed: syncedPick } as any);
                    // Make the just-saved values suggestable right away instead of
                    // waiting for the next fetch.
                    setCustomSchools(prev => dedupeSuggestions(
                      [...prev, tempSchool.final_school_name],
                      UNIVERSITY_SUGGESTIONS
                    ));
                    setCustomMajors(prev => dedupeSuggestions(
                      [...prev, tempSchool.major],
                      UZ_MAJOR_SUGGESTIONS
                    ));
                    setIsSchoolModalOpen(false);
                  } catch (err: any) {
                    alert('Error saving educational background: ' + err.message);
                  } finally {
                    setSavingSchool(false);
                  }
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                disabled={savingSchool}
              >
                {savingSchool ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Major Editing Modal */}
      {isMajorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMajorModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl p-6 w-full max-w-md mx-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsMajorModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[var(--accent)]" />
              Write Selected Major
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] mb-3">
              Enter the major manually for <strong>{majorModalLabel}</strong>.
            </p>
            <div className="relative mb-5">
              <input
                type="text"
                value={tempMajorValue}
                onChange={(e) => setTempMajorValue(e.target.value)}
                placeholder="e.g. BUSINESS ADMINISTRATION"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all uppercase"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    await handleSaveMajor();
                  }
                }}
              />
              {filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] shadow-lg z-50 divide-y divide-[var(--border-subtle)] animate-in fade-in slide-in-from-top-1 duration-100">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTempMajorValue(suggestion.toUpperCase())}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      {suggestion.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsMajorModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-[var(--radius-md)] bg-gray-200 dark:bg-gray-800 text-[var(--foreground)] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMajor}
                disabled={savingMajor}
                className="px-4 py-2 text-xs font-bold rounded-[var(--radius-md)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {savingMajor && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}

// Higher education institutions of Uzbekistan, offered as type-ahead
// suggestions for the Final School Name field. Free text is still allowed.
const UNIVERSITY_SUGGESTIONS = [
  "\"COLLEGIUM HUMANUM\" WARSAW MANAGEMENT UNIVERSITY, ANDIJAN BRANCH",
  "ABU RAYHON BERUNIY UNIVERSITY",
  "ACADEMY OF PUBLIC ADMINISTRATION",
  "ACADEMY OF THE ARMED FORCES OF THE REPUBLIC OF UZBEKISTAN",
  "ACADEMY OF THE MINISTRY OF EMERGENCY SITUATIONS OF THE REPUBLIC OF UZBEKISTAN",
  "ACADEMY OF THE MINISTRY OF INTERNAL AFFAIRS OF THE REPUBLIC OF UZBEKISTAN",
  "ACADEMY OF THE STATE SECURITY SERVICE OF THE REPUBLIC OF UZBEKISTAN",
  "AJU UNIVERSITY IN TASHKENT",
  "AKFA UNIVERSITY",
  "ALL-RUSSIAN STATE INSTITUTE OF CINEMATOGRAPHY, TASHKENT BRANCH",
  "AMITY UNIVERSITY IN TASHKENT",
  "ANDIJAN INSTITUTE OF AGRICULTURE AND AGROTECHNOLOGIES",
  "ANDIJAN INSTITUTE OF ECONOMICS AND CONSTRUCTION",
  "ANDIJAN MACHINE-BUILDING INSTITUTE",
  "ANDIJAN MEDICAL INSTITUTE",
  "ANDIJAN STATE UNIVERSITY",
  "ANDIJAN STATE UNIVERSITY, PEDAGOGICAL INSTITUTE",
  "ASTRAKHAN STATE TECHNICAL UNIVERSITY, TASHKENT BRANCH",
  "BANKING AND FINANCE ACADEMY",
  "BINARY UNIVERSITY IN URGENCH",
  "BRITISH MANAGEMENT UNIVERSITY IN TASHKENT",
  "BUKHARA INSTITUTE OF ENGINEERING AND TECHNOLOGY",
  "BUKHARA MEDICAL INSTITUTE",
  "BUKHARA STATE UNIVERSITY",
  "BUKHARA STATE UNIVERSITY, PEDAGOGICAL INSTITUTE",
  "CAMBRIDGE INTERNATIONAL UNIVERSITY IN TASHKENT",
  "CHIRCHIQ STATE PEDAGOGICAL UNIVERSITY OF TASHKENT REGION",
  "D. I. MENDELEEV RUSSIAN UNIVERSITY OF CHEMICAL TECHNOLOGY, TASHKENT BRANCH",
  "FERGANA MEDICAL INSTITUTE OF PUBLIC HEALTH",
  "FERGANA POLYTECHNIC INSTITUTE",
  "FERGANA STATE UNIVERSITY",
  "G. V. PLEKHANOV RUSSIAN UNIVERSITY OF ECONOMICS, TASHKENT BRANCH",
  "GULISTAN STATE UNIVERSITY",
  "HIGHER MILITARY CUSTOMS INSTITUTE",
  "HIGHER SCHOOL OF NATIONAL DANCE AND CHOREOGRAPHY",
  "HIGHER SCHOOL OF STRATEGIC ANALYSIS AND FORESIGHT",
  "I. M. GUBKIN RUSSIAN UNIVERSITY OF OIL AND GAS, TASHKENT BRANCH",
  "INHA UNIVERSITY IN TASHKENT",
  "INTERNATIONAL AGRICULTURE UNIVERSITY",
  "INTERNATIONAL ISLAMIC ACADEMY OF UZBEKISTAN",
  "INTERNATIONAL NORDIC UNIVERSITY",
  "ISFT TASHKENT",
  "IT-PARK UNIVERSITY",
  "JIZZAKH AVIATION HIGHER MILITARY SCHOOL",
  "JIZZAKH POLYTECHNIC INSTITUTE",
  "JIZZAKH STATE PEDAGOGICAL UNIVERSITY",
  "KARAKALPAK STATE UNIVERSITY",
  "KARAKALPAKSTAN MEDICAL INSTITUTE",
  "KARSHI STATE TECHNICAL UNIVERSITY",
  "KARSHI STATE UNIVERSITY",
  "KAZAN FEDERAL UNIVERSITY, JIZZAKH BRANCH",
  "KOKAND STATE PEDAGOGICAL INSTITUTE",
  "KOKAND UNIVERSITY",
  "KOREA INTERNATIONAL UNIVERSITY IN FERGANA",
  "KUKMIN UNIVERSITY IN ANGREN",
  "LATVIAN HIGHER SCHOOL OF INFORMATION SYSTEMS MANAGEMENT, FERGANA BRANCH",
  "M. AUEZOV SOUTH KAZAKHSTAN RESEARCH UNIVERSITY, CHIRCHIQ BRANCH",
  "M. V. LOMONOSOV MOSCOW STATE UNIVERSITY, TASHKENT BRANCH",
  "MILITARY INSTITUTE OF INFORMATION AND COMMUNICATION TECHNOLOGIES AND COMMUNICATIONS OF THE MINISTRY OF DEFENCE OF THE REPUBLIC OF UZBEKISTAN",
  "MISIS, ALMALYK BRANCH",
  "MMFI TASHKENT BRANCH",
  "MOSCOW STATE INSTITUTE OF INTERNATIONAL RELATIONS, TASHKENT BRANCH",
  "NAMANGAN INSTITUTE OF ENGINEERING AND CONSTRUCTION",
  "NAMANGAN INSTITUTE OF ENGINEERING AND TECHNOLOGY",
  "NAMANGAN STATE PEDAGOGICAL INSTITUTE",
  "NAMANGAN STATE UNIVERSITY",
  "NATIONAL INSTITUTE OF FINE ARTS AND DESIGN",
  "NATIONAL UNIVERSITY OF UZBEKISTAN",
  "NATIONAL UNIVERSITY OF UZBEKISTAN, JIZZAKH BRANCH",
  "NAVOI STATE MINING INSTITUTE, ALMALYK FACULTY",
  "NAVOI STATE MINING INSTITUTE, NUKUS BRANCH",
  "NAVOI STATE MINING INSTITUTE, ZARAFSHAN FACULTY",
  "NAVOI STATE PEDAGOGICAL INSTITUTE",
  "NAVOI STATE UNIVERSITY OF MINING AND TECHNOLOGIES",
  "NEW UZBEKISTAN UNIVERSITY",
  "NUKUS STATE PEDAGOGICAL INSTITUTE",
  "OXUS UNIVERSITY",
  "PDP UNIVERSITY",
  "PHARMACEUTICAL TECHNICAL UNIVERSITY",
  "PUBLIC SAFETY UNIVERSITY OF THE NATIONAL GUARD OF THE REPUBLIC OF UZBEKISTAN",
  "PUCHON UNIVERSITY IN TASHKENT",
  "RUSSIAN STATE UNIVERSITY OF PHYSICAL EDUCATION, SPORT, YOUTH AND TOURISM, SAMARKAND BRANCH",
  "SAINT PETERSBURG STATE UNIVERSITY, TASHKENT BRANCH",
  "SAMARKAND HIGHER MILITARY SCHOOL OF AUTOMOTIVE COMMANDER-ENGINEERS",
  "SAMARKAND INSTITUTE OF ECONOMICS AND SERVICE",
  "SAMARKAND INSTITUTE OF VETERINARY MEDICINE",
  "SAMARKAND INSTITUTE OF VETERINARY MEDICINE, NUKUS BRANCH",
  "SAMARKAND STATE ARCHITECTURE AND CONSTRUCTION INSTITUTE",
  "SAMARKAND STATE INSTITUTE OF FOREIGN LANGUAGES",
  "SAMARKAND STATE MEDICAL INSTITUTE",
  "SAMARKAND STATE UNIVERSITY",
  "SAMARKAND STATE UNIVERSITY, DENOV INSTITUTE OF ENTREPRENEURSHIP AND PEDAGOGY",
  "SAMARKAND STATE UNIVERSITY, KATTAKURGAN BRANCH",
  "SAMARKAND STATE UNIVERSITY, URGUT BRANCH",
  "SAMBHRAM UNIVERSITY",
  "SAMBHRAM UNIVERSITY, JIZZAKH BRANCH",
  "SHAHRISABZ STATE PEDAGOGICAL INSTITUTE",
  "SHARDA UNIVERSITY IN ANDIJAN",
  "SHINHAN UNIVERSITY IN TASHKENT",
  "SILK ROAD INTERNATIONAL UNIVERSITY OF TOURISM",
  "SINGAPORE INSTITUTE OF MANAGEMENT DEVELOPMENT IN TASHKENT",
  "SWISS UNIVERSITY OF MEDICINE AND INFORMATION TECHNOLOGY IN MARGILAN",
  "TASHKENT ARCHITECTURE AND CIVIL ENGINEERING UNIVERSITY",
  "TASHKENT CHEMICAL-TECHNOLOGICAL INSTITUTE",
  "TASHKENT CHEMICAL-TECHNOLOGICAL INSTITUTE, KUNGRAD DEPARTMENT",
  "TASHKENT CHEMICAL-TECHNOLOGICAL INSTITUTE, YANGIYER BRANCH",
  "TASHKENT HIGHER COMBINED ARMS COMMAND SCHOOL",
  "TASHKENT INSTITUTE OF AUTOMOBILE ROADS",
  "TASHKENT INSTITUTE OF FINANCE",
  "TASHKENT INSTITUTE OF IRRIGATION AND MELIORATION",
  "TASHKENT INSTITUTE OF IRRIGATION AND MELIORATION, BUKHARA BRANCH",
  "TASHKENT INSTITUTE OF RAILWAY ENGINEERS",
  "TASHKENT INSTITUTE OF TEXTILE AND LIGHT INDUSTRY",
  "TASHKENT INTERNATIONAL UNIVERSITY OF EDUCATION",
  "TASHKENT ISLAMIC INSTITUTE",
  "TASHKENT MEDICAL ACADEMY",
  "TASHKENT MEDICAL ACADEMY, TERMEZ BRANCH",
  "TASHKENT MEDICAL ACADEMY, URGENCH BRANCH",
  "TASHKENT PEDIATRIC MEDICAL INSTITUTE",
  "TASHKENT PEDIATRIC MEDICAL INSTITUTE, NUKUS BRANCH",
  "TASHKENT PHARMACEUTICAL INSTITUTE",
  "TASHKENT PHARMACEUTICAL INSTITUTE, KHAZORASP BRANCH",
  "TASHKENT REGIONAL PEDAGOGICAL INSTITUTE",
  "TASHKENT STATE AGRARIAN UNIVERSITY",
  "TASHKENT STATE AGRARIAN UNIVERSITY, NUKUS BRANCH",
  "TASHKENT STATE AGRARIAN UNIVERSITY, SAMARKAND BRANCH",
  "TASHKENT STATE AGRARIAN UNIVERSITY, TERMEZ BRANCH",
  "TASHKENT STATE DENTAL INSTITUTE",
  "TASHKENT STATE DENTAL INSTITUTE, ANDIJAN BRANCH",
  "TASHKENT STATE DENTAL INSTITUTE, BUKHARA BRANCH",
  "TASHKENT STATE DENTAL INSTITUTE, NUKUS BRANCH",
  "TASHKENT STATE LAW UNIVERSITY",
  "TASHKENT STATE LAW UNIVERSITY, SPECIALIZED BRANCH",
  "TASHKENT STATE PEDAGOGICAL UNIVERSITY",
  "TASHKENT STATE PEDAGOGICAL UNIVERSITY, TERMEZ BRANCH",
  "TASHKENT STATE TECHNICAL UNIVERSITY",
  "TASHKENT STATE TECHNICAL UNIVERSITY, ALMALYK BRANCH",
  "TASHKENT STATE TECHNICAL UNIVERSITY, KOKAND BRANCH",
  "TASHKENT STATE TECHNICAL UNIVERSITY, NUKUS BRANCH",
  "TASHKENT STATE TECHNICAL UNIVERSITY, TERMEZ BRANCH",
  "TASHKENT STATE TRANSPORT UNIVERSITY",
  "TASHKENT STATE TRANSPORT UNIVERSITY, KATTAKURGAN BRANCH",
  "TASHKENT STATE UNIVERSITY OF ECONOMICS",
  "TASHKENT STATE UNIVERSITY OF ECONOMICS, SAMARKAND BRANCH",
  "TASHKENT STATE UNIVERSITY OF ORIENTAL STUDIES",
  "TASHKENT STATE UNIVERSITY OF UZBEK LANGUAGE AND LITERATURE",
  "TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES",
  "TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES, FERGANA BRANCH",
  "TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES, NUKUS BRANCH",
  "TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES, SAMARKAND BRANCH",
  "TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES, URGENCH BRANCH",
  "TAX ACADEMY",
  "TEAM UNIVERSITY IN TASHKENT",
  "TEAM UNIVERSITY IN TERMEZ",
  "TERMEZ STATE UNIVERSITY",
  "TURIN POLYTECHNIC UNIVERSITY IN TASHKENT",
  "TURKISH UNIVERSITY OF ECONOMICS AND TECHNOLOGY, TASHKENT BRANCH",
  "UNIVERSITY OF PISA, TASHKENT BRANCH",
  "UNIVERSITY OF WORLD ECONOMY AND DIPLOMACY",
  "URGENCH STATE UNIVERSITY",
  "UZBEK NATIONAL INSTITUTE OF MUSICAL ART",
  "UZBEK-BELARUSIAN JOINT INTERSECTORAL INSTITUTE OF APPLIED TECHNICAL QUALIFICATIONS IN TASHKENT",
  "UZBEKISTAN STATE ACADEMY OF CHOREOGRAPHY, URGENCH BRANCH",
  "UZBEKISTAN STATE CONSERVATORY",
  "UZBEKISTAN STATE INSTITUTE OF ARTS AND CULTURE",
  "UZBEKISTAN STATE INSTITUTE OF ARTS AND CULTURE, FERGANA REGIONAL BRANCH",
  "UZBEKISTAN STATE INSTITUTE OF ARTS AND CULTURE, NUKUS BRANCH",
  "UZBEKISTAN STATE UNIVERSITY OF PHYSICAL EDUCATION AND SPORT",
  "UZBEKISTAN STATE UNIVERSITY OF PHYSICAL EDUCATION AND SPORT, FERGANA BRANCH",
  "UZBEKISTAN STATE UNIVERSITY OF PHYSICAL EDUCATION AND SPORT, NUKUS BRANCH",
  "UZBEKISTAN STATE WORLD LANGUAGES UNIVERSITY",
  "UZBEKISTAN UNIVERSITY OF JOURNALISM AND MASS COMMUNICATIONS",
  "WEBSTER UNIVERSITY IN TASHKENT",
  "WESTMINSTER INTERNATIONAL UNIVERSITY IN TASHKENT",
  "YEOJU TECHNICAL INSTITUTE IN TASHKENT",
  "ZARMED UNIVERSITY"
]

// Undergraduate programs commonly offered by Uzbek universities. Distinct from
// MAJOR_SUGGESTIONS, which covers majors at the destination (Korean) university.
const UZ_MAJOR_SUGGESTIONS = [
  "ACCOUNTING AND AUDITING",
  "AEROSPACE TECHNOLOGIES",
  "AGROCHEMISTRY AND SOIL SCIENCE",
  "AGROENGINEERING",
  "AGRONOMY",
  "AIR TRAFFIC CONTROL",
  "ANTHROPOLOGY AND ETHNOLOGY",
  "APPLIED ACCOUNTING",
  "APPLIED ART",
  "APPLIED MATHEMATICS",
  "AQUATIC BIORESOURCES AND AQUACULTURE",
  "ARCHAEOLOGY",
  "ARCHITECTURAL DESIGN",
  "ARCHITECTURE",
  "ARCHIVAL SCIENCE",
  "ART HISTORY",
  "ARTIFICIAL INTELLIGENCE",
  "ASTRONOMY",
  "AUTOMATION AND CONTROL",
  "AUTOMOTIVE ENGINEERING",
  "AVIATION ENGINEERING",
  "BANKING",
  "BIOLOGY",
  "BIOMEDICAL ENGINEERING",
  "BIOTECHNOLOGY",
  "BUSINESS MANAGEMENT",
  "CADASTRE",
  "CANNING TECHNOLOGY",
  "CARTOGRAPHY AND REMOTE SENSING",
  "CHEMICAL ENGINEERING",
  "CHEMISTRY",
  "CHOREOGRAPHY",
  "COMPUTER SCIENCE",
  "CONSTRUCTION AND OPERATION OF UTILITIES",
  "COUNTRY STUDIES",
  "CULTURAL STUDIES",
  "CYBERSECURITY ENGINEERING",
  "DEEP GAS PROCESSING TECHNOLOGY",
  "DENTISTRY",
  "DESIGN",
  "ECOLOGY AND ENVIRONMENT PROTECTION",
  "ECONOMICS",
  "ELECTRIC POWER ENGINEERING",
  "ELECTRICAL ENGINEERING",
  "ENGINEERING TECHNOLOGIES",
  "FINANCE",
  "FINE ARTS AND ENGINEERING GRAPHICS",
  "FLIGHT OPERATION OF AIRCRAFT",
  "FOLK ART",
  "FOOD TECHNOLOGY",
  "FOREIGN LANGUAGE AND LITERATURE",
  "HISTORY",
  "HYDROLOGY",
  "INDUSTRIAL ENGINEERING AND MANAGEMENT",
  "INDUSTRIAL PHARMACY",
  "INFOCOMMUNICATION ENGINEERING",
  "INFORMATION SECURITY",
  "INFORMATION SERVICE AND PUBLIC RELATIONS",
  "INFORMATION SYSTEMS AND TECHNOLOGIES",
  "INSTRUMENTAL PERFORMANCE",
  "INTERNATIONAL RELATIONS",
  "ISLAMIC STUDIES",
  "JOURNALISM",
  "JURISPRUDENCE",
  "LIBRARY AND INFORMATION ACTIVITIES",
  "LIFE SAFETY",
  "LIGHT INDUSTRY ENGINEERING",
  "LINGUISTICS",
  "LOGISTICS",
  "MATHEMATICS AND COMPUTER SCIENCE",
  "MECHANICAL ENGINEERING",
  "MECHANICS AND MATHEMATICAL MODELING",
  "MECHANIZATION OF AGRICULTURE",
  "MECHATRONICS AND ROBOTICS",
  "MEDICAL AND PREVENTIVE SERVICES",
  "MEDICINE",
  "METAL TECHNOLOGIES",
  "METALLURGY ENGINEERING",
  "METEOROLOGY AND CLIMATOLOGY",
  "METROLOGY AND STANDARDIZATION",
  "MINING",
  "MINING ELECTROMECHANICS",
  "MUSEUM BUSINESS",
  "MUSIC EDUCATION",
  "NATIONAL IDEA, SPIRITUALITY BASICS AND RIGHT EDUCATION",
  "PEDIATRICS",
  "PEDAGOGY",
  "PHILOLOGY",
  "PHILOSOPHY",
  "POLITICAL SCIENCE",
  "PSYCHOLOGY",
  "SOCIOLOGY",
  "SPECIAL PEDAGOGY",
  "TAXES AND TAXATION",
  "TRANSLATION STUDIES",
  "WORLD ECONOMY AND INTERNATIONAL ECONOMIC RELATIONSHIPS"
]

// Year-dropdown sentinel for a graduation date that hasn't happened yet.
const EXPECTED_YEAR = 'EXPECTED'

// Typical academic calendar: studies start early September and end mid-July,
// so picking an entry year pre-fills both dates and the standard 4-year span.
const ENTRY_MONTH = '09'
const ENTRY_DAY = '02'
const GRADUATION_MONTH = '07'
const GRADUATION_DAY = '20'
const DEFAULT_COURSE_YEARS = 4

const normalizeSuggestion = (s: string) =>
  s.toUpperCase().replace(/[ʻʼʽ‘’'`]/g, '').replace(/\s+/g, ' ').trim()

// Values typed by hand on past students, minus blanks and anything the built-in
// list already covers, so the two can be concatenated without repeats.
const dedupeSuggestions = (values: (string | null)[], builtIn: string[]) => {
  const known = new Set(builtIn.map(normalizeSuggestion))
  const out: string[] = []
  for (const raw of values) {
    const value = (raw || '').trim()
    if (!value) continue
    const key = normalizeSuggestion(value)
    if (known.has(key)) continue
    known.add(key)
    out.push(value.toUpperCase())
  }
  return out.sort((a, b) => a.localeCompare(b, 'en'))
}

// Type-ahead matching for the Educational Background fields. Okina/apostrophe
// variants (Oʻ, Gʻ, ʼ) are rarely typed, so both sides are flattened first.
const matchSuggestions = (list: string[], input: string) => {
  const normalize = normalizeSuggestion
  const query = normalize(input)
  if (!query) return []
  // An exact match means the field is settled; nothing left to suggest.
  if (list.some(s => normalize(s) === query)) return []
  return list.filter(s => normalize(s).includes(query)).slice(0, 50)
}

// GPA and its scale read as one value, e.g. "3.95/5". Falls back to the bare
// score when no system is recorded. Mirrors the Excel export's GPA column.
const formatGpa = (gpa: string | null, system: string | null) => {
  const score = (gpa || '').trim()
  if (!score) return ''
  const scale = (system || '').trim()
  return scale ? `${score}/${scale}` : score
}

// A graduation date still in the future is "expected" rather than recorded.
const isFutureDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)
  if (isNaN(parsed.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parsed.getTime() > today.getTime()
}

// GPA scales. MANUAL_ENTRY swaps the dropdown for a free-text box so unusual
// scales can still be recorded.
const GPA_SYSTEM_MANUAL = 'MANUAL ENTRY'
const GPA_SYSTEM_OPTIONS = ['4', '4.5', '5', '100', GPA_SYSTEM_MANUAL]

const MAJOR_SUGGESTIONS = [
  "Business Administration",
  "International Business",
  "Economics",
  "Accounting",
  "Finance",
  "Marketing",
  "Hospitality & Tourism Management",
  "Hotel Management",
  "Tourism Management",
  "Global Business",
  "International Trade",
  "International Studies",
  "Korean Language & Literature",
  "Korean Language Education",
  "Media & Communication",
  "Journalism",
  "Artificial Intelligence",
  "Computer Science",
  "Software Engineering",
  "Computer Engineering",
  "Information Technology (IT)",
  "Data Science",
  "Cyber Security",
  "Electrical Engineering",
  "Electronic Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Industrial Engineering",
  "Automotive Engineering",
  "Naval Architecture & Marine Engineering",
  "SHIP BUILDING",
  "Marine Power Machinery Engineering",
  "Architecture",
  "Biotechnology",
  "Biomedical Engineering",
  "Nursing",
  "Pharmacy",
  "Fashion Design",
  "Beauty & Cosmetology",
  "Animation & Game Design",
  "Visual Design",
  "Music & Performing Arts",
  "Korean Tourism Service Department"
]
