'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, Pencil, Loader2, AlertCircle, CheckCircle2, 
  Building2, Landmark, Tag, Layers, 
  ChevronDown, Copy, ArrowLeft,
  Mail, Calendar, MapPin, User, CheckSquare, GraduationCap, Hourglass, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { cn } from '@/lib/utils'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { syncMissingDocuments } from '@/lib/validation'

interface StudentDetailClientProps {
  studentId: string
}



export function StudentDetailClient({ studentId }: StudentDetailClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const { setDetailPageActions, officeOptions, universityStatusOptions } = useStudentDashboard()

  // State for student details
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit details state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null)
  const [nameLanguage, setNameLanguage] = useState<'EN' | 'KR'>('EN')
  const [koreanNames, setKoreanNames] = useState<{ full: string; family: string; given: string } | null>(null)
  const [isTranslatingNames, setIsTranslatingNames] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  // Dynamic Select Options from Settings
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
  const [groupOptions, setGroupOptions] = useState<string[]>(['2026 BAHOR', '2026 KUZ', '2027 BAHOR'])
  const [leadByOptions, setLeadByOptions] = useState<string[]>(['Ali Uncle', 'Cornell', 'Headway', 'SeoulStudy', 'UP Marhamat'])
  const [universityOptions, setUniversityOptions] = useState<string[]>([])
  const [coordinatorOptions, setCoordinatorOptions] = useState<string[]>([])

  // Fetch settings filter options
  const fetchFilterOptions = async () => {
    try {
      const [tariffsRes, levelsRes, groupsRes, leadsRes, universitiesRes, coordinatorsRes] = await Promise.all([
        supabase.from('tariff_options').select('name, price'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name'),
        supabase.from('lead_sources').select('name'),
        supabase.from('universities').select('name'),
        supabase.from('coordinators').select('name')
      ])

      if (tariffsRes.data && tariffsRes.data.length > 0) {
        setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
        const map: Record<string, number> = {}
        ;(tariffsRes.data as any[]).forEach(t => {
          map[t.name] = Number(t.price) || 0
        })
        setTariffPrices(prev => ({ ...prev, ...map }))
      }
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
      if (leadsRes.data && leadsRes.data.length > 0) setLeadByOptions((leadsRes.data as any[]).map(l => l.name))
      if (universitiesRes.data && universitiesRes.data.length > 0) setUniversityOptions((universitiesRes.data as any[]).map(u => u.name))
      if (coordinatorsRes && coordinatorsRes.data && coordinatorsRes.data.length > 0) setCoordinatorOptions((coordinatorsRes.data as any[]).map(c => c.name))
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

  // Fetch student details on mount
  const fetchStudent = async () => {
    try {
      setLoading(true)
      setError(null)
      const [studentRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        supabase.from('payments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
      ])

      if (studentRes.error) throw studentRes.error
      const fetchedStudent = studentRes.data as Student
      
      // Auto-validate and sync missing documents on load
      const syncedPick = syncMissingDocuments(fetchedStudent)
      let finalStudent = fetchedStudent

      const originalPick = fetchedStudent.pick_needed || []
      const isPickDifferent = originalPick.length !== syncedPick.length || 
        !originalPick.every((val: string) => syncedPick.includes(val))

      if (isPickDifferent) {
        const { error: updateErr } = await (supabase
          .from('students') as any)
          .update({ pick_needed: syncedPick })
          .eq('id', fetchedStudent.id)
        
        if (!updateErr) {
          finalStudent = { ...fetchedStudent, pick_needed: syncedPick }
        } else {
          console.error('Error auto-syncing missing documents on page load:', updateErr)
        }
      }

      setSelectedStudent(finalStudent)
      setPayments(paymentsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching student details:', err)
      setError(err.message || 'Failed to load student details. Student may not exist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudent()
    fetchFilterOptions()
    setNameLanguage('EN')
    setKoreanNames(null)
    setTranslateError(null)
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

  // Fetch an AI-powered Korean transliteration of the Full Name only.
  // Family/Given Name are derived by splitting the translated full name,
  // mirroring how the English versions split selectedStudent.full_name.
  // Requires an AI API key — no local fallback. Never writes anything to Supabase.
  const handleShowKorean = async () => {
    if (!selectedStudent) return
    setNameLanguage('KR')

    const splitTranslatedFullName = (translatedFull: string) => {
      const parts = translatedFull.split(' ').filter(Boolean)
      return {
        full: translatedFull,
        family: parts[0] || '',
        given: parts.slice(1).join(' '),
      }
    }

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
    const apiKey = (provider === 'openai' ? aiSettings?.openaiApiKey : aiSettings?.apiKey) || ''
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
    if (!selectedStudent) return
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

        const updateData: any = { full_name: newFullName, korean_name: null }
        const nextStudent = { ...selectedStudent, ...updateData }
        updateData.pick_needed = syncMissingDocuments(nextStudent)
        const { error: updateError } = await (supabase
          .from('students') as any)
          .update(updateData)
          .eq('id', selectedStudent.id)

        if (updateError) throw updateError

        const updatedStudent = { ...selectedStudent, ...updateData }
        setSelectedStudent(updatedStudent)
        setKoreanNames(null)
        setEditingField(null)
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
      if (valToSave === '' || (['tariff', 'level', 'level2'].includes(String(field)) && valToSave === 'Select')) {
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

      const updatedStudent = { ...selectedStudent, ...updateData }
      if (field === 'full_name') {
        setKoreanNames(null)
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
        router.replace(`/students/${valToSave}`)
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
    if (!selectedStudent) return
    if (!confirm(`Are you sure you want to delete student profile "${selectedStudent.full_name}"?`)) return
    setIsDeleting(true)
    try {
      const { error: deleteError } = await (supabase
        .from('students') as any)
        .update({ is_deleted: true })
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      alert('Student profile deleted successfully.')
      router.push('/students')
    } catch (err: any) {
      console.error('Error soft-deleting student:', err)
      alert(err.message || 'Failed to delete student.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Restore student
  const handleRestoreStudent = async () => {
    if (!selectedStudent) return
    if (!confirm(`Are you sure you want to restore student profile "${selectedStudent.full_name}"?`)) return
    setIsDeleting(true)
    try {
      const { error: restoreError } = await (supabase
        .from('students') as any)
        .update({ is_deleted: false })
        .eq('id', selectedStudent.id)

      if (restoreError) throw restoreError

      alert('Student profile restored successfully.')
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
    if (!selectedStudent) return
    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete student profile "${selectedStudent.full_name}"? This action CANNOT be undone and will delete all their data.`)) return
    setIsDeleting(true)
    try {
      const { error: deleteError } = await (supabase
        .from('students') as any)
        .delete()
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      alert('Student profile permanently deleted successfully.')
      router.push('/students')
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
    if (!selectedStudent) return
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
  }, [selectedStudent, isDeleting])

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
    } = {}
  ) => {
    const isEditing = editingField === field
    const isCopied = copiedField === field
    const isMissing = value === null || value === undefined || (Array.isArray(value) ? value.length === 0 : (String(value).trim() === '' || String(value).trim() === '—'))
    const displayValue = isMissing ? 'Not provided' : value

    const copyable = options.copyable !== false
    const editable = options.editable !== false

    const stripeColor = (options.forceBorderColor === 'red' || (isMissing && !options.forceBorderColor))
      ? 'border-l-rose-600'
      : 'border-l-[var(--accent)]'

    return (
      <div
        onDoubleClick={() => {
          if (editable && !isEditing) {
            handleStartEditing(String(field), value, options.type === 'select' ? options.selectOptions?.[0] : '')
          }
        }}
        className={cn(
          "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-between text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
          stripeColor,
          options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5'
        )}
        title={`${editable ? 'Double-click to edit. ' : ''}${copyable && value ? 'Single-click value to copy.' : ''}`}
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide glitter-label">
            {label}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {copyable && value && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(String(field), Array.isArray(value) ? value.join(', ') : String(value));
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy value"
              >
                {isCopied ? (
                  <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
            {editable && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEditing(String(field), value, options.type === 'select' ? options.selectOptions?.[0] : '');
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Edit field"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div
          className="mt-0.5 flex items-center min-h-[20px] w-full"
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
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleSaveField(field)}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-colors"
                  title="Save"
                >
                  <CheckCircle2 className="h-3 w-3" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleCancelEditing}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-rose-500 hover:bg-rose-600 text-white cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              </div>
            </div>
          ) : (
            isCopied ? (
              <span className="text-[15px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
            ) : (options.badgeColor && !isMissing) ? (
              Array.isArray(displayValue) ? (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
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
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {displayValue.map((item, idx) => (
                    <span key={idx} className={cn("text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]", options.valueClassName)}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <span className={cn("text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]", options.valueClassName)}>{displayValue}</span>
              )
            )
          )}
        </div>
      </div>
    )
  }

  // Render Language Certificate Card (Now with copy & edit support)
  const renderCertificateCard = (
    label: string,
    certField: keyof Student,
    scoreField: keyof Student,
    certsAllowed: string[],
    certColor: string = 'bg-[#de350b]',
    options: {
      compact?: boolean
    } = {}
  ) => {
    const isEditing = editingField === certField
    const certVal = selectedStudent?.[certField] as string
    const scoreVal = selectedStudent?.[scoreField] as string
    const isMissing = !certVal || certVal === 'NO CERTIFICATE' || certVal.trim() === ''

    return (
      <div
        onDoubleClick={() => {
          if (!isEditing) {
            handleStartEditing(String(certField), certVal, certsAllowed[0]);
          }
        }}
        className={cn(
          "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-between text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
          isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]',
          options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5'
        )}
        title="Double-click to edit. Single-click value to copy."
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide glitter-label">{label}</span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {certVal && certVal !== 'NO CERTIFICATE' && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(String(certField), `${certVal} (SCORE: ${scoreVal || '—'})`);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy certificate details"
              >
                {copiedField === String(certField) ? (
                  <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEditing(String(certField), certVal, certsAllowed[0]);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Edit certificate"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-0.5 flex items-center min-h-[20px] w-full"
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
            copiedField === String(certField) ? (
              <span className="text-[15px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
            ) : certVal && certVal !== 'NO CERTIFICATE' ? (
              <div className="inline-flex items-center text-[13px] font-bold rounded-[4px] overflow-hidden shadow-sm">
                <span className={`${certColor} text-white px-1.5 py-0.5 uppercase`}>{certVal}</span>
                <span className="bg-[#0052cc] text-white px-1.5 py-0.5">SCORE: {scoreVal || '—'}</span>
              </div>
            ) : (
              <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
            )
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
          if (!selectedStudent) return
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

        return (
          <div
            onDoubleClick={() => {
              if (!isEditing) {
                handleStartEditing(String(uniField), uniVal);
              }
            }}
            className={cn(
              "group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] rounded-[var(--radius-md)] px-2.5 flex flex-col justify-between text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer",
              isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]',
              options.compact ? 'min-h-[52px] py-1' : 'min-h-[65px] py-1.5'
            )}
            title="Double-click to edit. Single-click value to copy."
          >
            {isMissing && (
              <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] uppercase tracking-wide glitter-label">{label}</span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {uniVal && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(uniField), `${uniVal} (${statusVal || 'Chosen'})`);
                    }}
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Copy university details"
                  >
                    {copiedField === String(uniField) ? (
                      <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
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
                copiedField === String(uniField) ? (
                  <span className="text-[15px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
                ) : uniVal ? (
                  <div className="flex flex-col gap-0.5 w-full">
                    <span className="text-[14px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]" title={uniVal}>{uniVal}</span>
                    <div className="flex relative">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStatusDropdown(activeStatusDropdown === String(uniField) ? null : String(uniField));
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase border cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm select-none",
                          getStatusBadgeClass(statusVal)
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />
                        {statusVal || 'Chosen'}
                      </span>

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
                            className="absolute left-0 mt-6 w-36 bg-white dark:bg-[#1c1c1e] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg z-40 py-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
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
                )
              )}
            </div>
          </div>
        )
      }

  // Render auto calculated Family/Given Name cards (ReadOnly copyable only)
  const renderAutoNameCard = (label: string, value: string, field: 'family_name' | 'given_name', isLoading: boolean = false) => {
    const isCopied = copiedField === field
    const isMissing = !isLoading && (!value || value.trim() === '' || value.trim() === '—')
    return (
      <div
        className={`group relative bg-[var(--surface)] border border-[#E5E7EB] dark:border-[var(--border)] border-l-[3px] ${isMissing ? 'border-l-rose-600' : 'border-l-[var(--accent)]'} rounded-[var(--radius-md)] px-2.5 py-1.5 flex flex-col justify-between min-h-[65px] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all duration-200 cursor-pointer`}
        title={value && !isLoading ? 'Single-click value to copy.' : ''}
      >
        {isMissing && (
          <span className="wave-dot" style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', height: '8px', width: '8px', borderRadius: '9999px', backgroundColor: '#e11d48', color: '#e11d48' }} />
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wide glitter-label">
              {label}
            </span>
            <span className="bg-[var(--border-subtle)] border border-[var(--border)] text-[9.5px] px-1.5 py-0.2 rounded font-bold text-[var(--foreground-muted)] uppercase">AUTO</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {value && !isLoading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(field, value);
                }}
                className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                title="Copy value"
              >
                {isCopied ? (
                  <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-0.5 flex items-center min-h-[20px]"
          onClick={() => {
            if (value && !isLoading) {
              handleCopy(field, value);
            }
          }}
        >
          {isCopied ? (
            <span className="text-[15px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
          ) : isLoading ? (
            <span className="text-[14px] font-medium italic text-[#64748B]">{value}</span>
          ) : value ? (
            <span className="text-[15px] font-semibold tracking-wide text-[#0F172A] dark:text-[var(--foreground)]">{value}</span>
          ) : (
            <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-[15.5px] font-medium text-[var(--foreground-muted)]">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (error || !selectedStudent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 text-center shadow-[var(--shadow-md)]">
          <AlertCircle className="h-12 w-12 text-[var(--danger)] mx-auto mb-4" />
          <h2 className="text-[20.5px] font-bold text-[var(--foreground)] mb-2">Error Loading Profile</h2>
          <p className="text-[15.5px] text-[var(--foreground-muted)] mb-6">{error || 'Student not found or has been deleted.'}</p>
          <Link
            href="/students"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-[15.5px] font-semibold transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PageShell className="p-3 gap-3">
      <div className="bg-transparent text-[var(--foreground)] transition-colors flex flex-col gap-2.5">
        {/* Student Header Identifier Banner (Extremely compact) */}
        <div className="py-2.5 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] flex items-center gap-3 shadow-[var(--shadow-sm)] transition-colors flex-shrink-0">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)] shrink-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
            Back
          </Link>
          <div className="w-11 h-11 bg-[var(--accent)] rounded-full flex items-center justify-center font-bold text-white text-sm select-none shadow-[var(--shadow-sm)]">
            {getInitials(selectedStudent.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17.5px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">
              {selectedStudent.full_name}
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground-muted)] mt-0.5">
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
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout (3-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1.25fr_0.75fr] gap-3 pb-1">
          {/* Column 1: Personal Info & Contact Info */}
          <div className="flex flex-col gap-3">
            {/* Personal & Passport Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-sm)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Personal & Passport
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="sm:col-span-2">
                  {nameLanguage === 'KR' ? (
                    renderDetailCard(
                      'Full Name (Korean)',
                      'korean_name',
                      selectedStudent.korean_name || (isTranslatingNames ? 'Translating...' : ''),
                      {
                        titleColor: 'text-[var(--accent)]',
                        editable: !isTranslatingNames,
                        copyable: !isTranslatingNames
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
                        copyable: true
                      }
                    )
                  )}
                </div>
                {renderAutoNameCard(
                  'Family Name',
                  nameLanguage === 'KR'
                    ? (selectedStudent.korean_name ? selectedStudent.korean_name.split(' ')[0] : (isTranslatingNames ? 'Translating...' : ''))
                    : (selectedStudent.full_name.split(' ')[0] || ''),
                  'family_name',
                  nameLanguage === 'KR' && isTranslatingNames
                )}
                {renderAutoNameCard(
                  'Given Name',
                  nameLanguage === 'KR'
                    ? (selectedStudent.korean_name ? selectedStudent.korean_name.split(' ').slice(1).join(' ') : (isTranslatingNames ? 'Translating...' : ''))
                    : (selectedStudent.full_name.split(' ').slice(1).join(' ') || ''),
                  'given_name',
                  nameLanguage === 'KR' && isTranslatingNames
                )}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-1.5">
                  <div className="sm:col-span-1">
                    {renderDetailCard('Sex', 'gender', selectedStudent.gender, {
                      type: 'select',
                      selectOptions: ['MALE', 'FEMALE'],
                      titleColor: 'text-[var(--accent)]'
                    })}
                  </div>
                  <div className="sm:col-span-1">
                    {renderDetailCard('Birthday', 'birthday', selectedStudent.birthday, { type: 'date', titleColor: 'text-[var(--accent)]' })}
                  </div>
                  <div className="sm:col-span-2">
                    {renderDetailCard('Email', 'email', selectedStudent.email, { titleColor: 'text-[var(--accent)]', valueClassName: 'text-[12px]' })}
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {renderDetailCard('Phone 1', 'phone1', selectedStudent.phone1, { titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Phone 2', 'phone2', selectedStudent.phone2, { titleColor: 'text-[var(--accent)]' })}
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {renderDetailCard('Passport', 'passport', selectedStudent.passport, { titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Date of Issue', 'passport_issue_date', selectedStudent.passport_issue_date, { type: 'date', titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Date of Expiration', 'passport_expire_date', selectedStudent.passport_expire_date, { type: 'date', titleColor: 'text-[var(--accent)]' })}
                </div>

                <div className="sm:col-span-2">
                  {renderDetailCard('Address', 'address', selectedStudent.address, { titleColor: 'text-[var(--accent)]' })}
                </div>
                <div className="sm:col-span-2">
                  {renderDetailCard('Notes', 'notes', selectedStudent.notes, { titleColor: 'text-[var(--accent)]' })}
                </div>
                <div className="sm:col-span-2">
                  {renderDetailCard('Educational Background', 'educational_background', selectedStudent.educational_background, { titleColor: 'text-[var(--accent)]' })}
                </div>
                <div className="sm:col-span-2">
                  {renderDetailCard('Major', 'major', selectedStudent.major, { titleColor: 'text-[var(--accent)]' })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Academic & Universities */}
          <div className="flex flex-col gap-3">
            {/* Academic & Languages Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-sm)] flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border)]">
                <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Academic & Languages
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {renderDetailCard('Tariff', 'tariff', selectedStudent.tariff, {
                    type: 'select',
                    selectOptions: ['Select', ...tariffOptions],
                    badgeColor: 'bg-[#00875a] text-white',
                    titleColor: 'text-[var(--accent)]'
                  })}
                  {renderDetailCard('Education Level', 'level', selectedStudent.level, {
                    type: 'select',
                    selectOptions: ['Select', ...levelOptions],
                    badgeColor: 'bg-[#0052cc] text-white',
                    titleColor: 'text-[var(--accent)]'
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {renderCertificateCard('Language Certificate 1', 'language_certificate', 'certificate_score', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#de350b]')}
                  {renderCertificateCard('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#00b8d9]')}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {renderDetailCard('Education Level 2', 'level2', selectedStudent.level2, {
                    type: 'select',
                    selectOptions: ['Select', ...levelOptions],
                    badgeColor: 'bg-[#ff9900] text-white',
                    titleColor: 'text-[var(--accent)]',
                    compact: true
                  })}
                  {renderCertificateCard('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#ff5630]', { compact: true })}
                </div>
              </div>
            </div>

            {/* Universities & Docs Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-sm)] flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border)]">
                <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Universities & Docs
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {renderUniversityCardDetails('University 1', 'university_1', 'university_1_status')}
                {renderUniversityCardDetails('University 2', 'university_2', 'university_2_status')}
                {renderUniversityCardDetails('University 3', 'university_3', 'university_3_status', { compact: true })}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {renderDetailCard('Father Fullname', 'father_name', selectedStudent.father_name, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Mother Fullname', 'mother_name', selectedStudent.mother_name, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Father Phone', 'father_phone', selectedStudent.father_phone, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Mother Phone', 'mother_phone', selectedStudent.mother_phone, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Father Job', 'father_job', selectedStudent.father_job, { titleColor: 'text-[var(--accent)]', compact: true })}
                  {renderDetailCard('Mother Job', 'mother_job', selectedStudent.mother_job, { titleColor: 'text-[var(--accent)]', compact: true })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: System & Finance */}
          <div className="flex flex-col gap-3">
            {/* System & Finance Block */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-sm)] flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border)]">
                <Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
                  System & Finance
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {/* Office Location Card */}
                <div 
                  onDoubleClick={() => {
                    if (editingField !== 'office') {
                      handleStartEditing('office', selectedStudent.office)
                    }
                  }}
                  className="bg-blue-500 dark:bg-blue-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] shadow-sm cursor-pointer"
                  title="Double-click to edit. Single-click value to copy."
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
                          {copiedField === 'office' ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
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
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleSaveField('office')}
                          className="p-0.5 hover:bg-blue-700 rounded text-emerald-250 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={handleCancelEditing}
                          className="p-0.5 hover:bg-blue-700 rounded text-rose-250 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </motion.button>
                      </div>
                    ) : (
                      copiedField === 'office' ? (
                        <span className="text-[15px] font-bold text-white animate-pulse">Copied!</span>
                      ) : (
                        <span className="text-[15px] font-bold tracking-wide uppercase">{selectedStudent.office || 'Not provided'}</span>
                      )
                    )}
                  </div>
                </div>

                {/* Student Balance Card */}
                <div 
                  className={`rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer ${
                    selectedStudent.balance < 0 ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600'
                  }`}
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
                        {copiedField === 'balance' ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center min-h-[22px] w-full">
                    {copiedField === 'balance' ? (
                      <span className="text-[15px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(selectedStudent.balance)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payments Done Card */}
                <div 
                  className="bg-emerald-500 dark:bg-emerald-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer"
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
                        {copiedField === 'payments_done' ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center min-h-[22px] w-full">
                    {copiedField === 'payments_done' ? (
                      <span className="text-[15px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(computedPaymentsDone)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Discount Card */}
                <div 
                  className="bg-orange-500 dark:bg-orange-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[62px] cursor-pointer"
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
                        {copiedField === 'discount' ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center min-h-[22px] w-full">
                    {copiedField === 'discount' ? (
                      <span className="text-[15px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[15px] font-bold tracking-wide">
                        {formatCurrency(computedDiscount)}
                      </span>
                    )}
                  </div>
                </div>

                {renderDetailCard('Group', 'student_group', selectedStudent.student_group, { 
                  type: 'select',
                  selectOptions: groupOptions,
                  badgeColor: 'bg-[#6554c0] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}

                {renderDetailCard('Lead By', 'lead_by', selectedStudent.lead_by, { 
                  type: 'select',
                  selectOptions: leadByOptions,
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
                  selectOptions: coordinatorOptions,
                  badgeColor: 'bg-[#ff5630] text-white',
                  titleColor: 'text-[var(--accent)]'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
