'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, Pencil, Loader2, AlertCircle, CheckCircle2, 
  Building2, Landmark, Tag, Layers, 
  ChevronDown, Copy, RefreshCw, Trash2, ArrowLeft,
  Mail, Calendar, MapPin, User, FileText, CheckSquare, GraduationCap, Hourglass, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { cn } from '@/lib/utils'

interface StudentDetailClientProps {
  studentId: string
}

export function StudentDetailClient({ studentId }: StudentDetailClientProps) {
  const supabase = createClient()
  const router = useRouter()

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

  // Dynamic Select Options from Settings
  const [tariffOptions, setTariffOptions] = useState<string[]>(['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'])
  const [levelOptions, setLevelOptions] = useState<string[]>(['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'])
  const [groupOptions, setGroupOptions] = useState<string[]>(['2026 BAHOR', '2026 KUZ', '2027 BAHOR'])
  const [leadByOptions, setLeadByOptions] = useState<string[]>(['Ali Uncle', 'Cornell', 'Headway', 'SeoulStudy', 'UP Marhamat'])
  const [universityOptions, setUniversityOptions] = useState<string[]>([])

  // Fetch settings filter options
  const fetchFilterOptions = async () => {
    try {
      const [tariffsRes, levelsRes, groupsRes, leadsRes, universitiesRes] = await Promise.all([
        supabase.from('tariff_options').select('name'),
        supabase.from('education_levels').select('name'),
        supabase.from('student_groups').select('name'),
        supabase.from('lead_sources').select('name'),
        supabase.from('universities').select('name')
      ])

      if (tariffsRes.data && tariffsRes.data.length > 0) setTariffOptions((tariffsRes.data as any[]).map(t => t.name))
      if (levelsRes.data && levelsRes.data.length > 0) setLevelOptions((levelsRes.data as any[]).map(l => l.name))
      if (groupsRes.data && groupsRes.data.length > 0) setGroupOptions((groupsRes.data as any[]).map(g => g.name))
      if (leadsRes.data && leadsRes.data.length > 0) setLeadByOptions((leadsRes.data as any[]).map(l => l.name))
      if (universitiesRes.data && universitiesRes.data.length > 0) setUniversityOptions((universitiesRes.data as any[]).map(u => u.name))
    } catch (err) {
      console.error('Error fetching filter options in details:', err)
    }
  }

  const TARIFF_PRICES: Record<string, number> = {
    'STANDART': 13000000,
    'PREMIUM': 32500000,
    'VISA PLUS': 65000000,
    'E-VISA (TIL SERTIFIKATISIZ)': 24000000,
    'E-VISA (TIL SERTIFIKATLI)': 16000000,
    'REGIONAL VISA': 2000000,
    'ZERO RISK': 18500000,
    'E-VISA': 2000000,
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
      setSelectedStudent(studentRes.data)
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
  }, [studentId])

  const computedPaymentsDone = useMemo(() => {
    const hasHistory = payments.length > 0
    if (hasHistory) {
      return payments
        .filter(p => !p.is_discount && !p.is_withdrawal && p.amount > 0)
        .reduce((sum, p) => sum + Number(p.amount), 0)
    }
    
    // Fallback: Tariff Price + Balance - Discount
    if (!selectedStudent) return 0
    const tariffPrice = TARIFF_PRICES[selectedStudent.tariff || ''] || 0
    const discount = selectedStudent.discount || 0
    const paid = tariffPrice + (selectedStudent.balance || 0) - discount
    return Math.max(0, paid)
  }, [payments, selectedStudent])

  const computedDiscount = useMemo(() => {
    const hasHistory = payments.length > 0
    if (hasHistory) {
      const totalDisc = payments
        .filter(p => p.is_discount && p.amount > 0)
        .reduce((sum, p) => sum + Number(p.amount), 0)
      if (totalDisc > 0) return totalDisc
    }
    return selectedStudent?.discount || 0
  }, [payments, selectedStudent])

  // Copy helper
  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1200)
  }

  const uppercaseFields = new Set([
    'full_name',
    'address',
    'notes',
    'educational_background',
    'major',
    'father_job',
    'mother_job',
  ])

  const phoneFields = new Set(['phone1', 'phone2', 'father_phone', 'mother_phone'])

  const formatPhoneValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9)
    const first = digits.slice(0, 2)
    const second = digits.slice(2, 5)
    const third = digits.slice(5, 9)
    return [first, second, third].filter(Boolean).join('-')
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
    const initialValue = val !== null && val !== undefined && val !== '' ? val : (defaultVal !== undefined ? defaultVal : '')
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

        const updateData = { full_name: newFullName }
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

      if (field === 'payments_done') {
        const numericVal = Number(editValue)
        if (isNaN(numericVal) || numericVal < 0) {
          alert('Payments Done must be a positive number.')
          return
        }
        const valToSave = -numericVal
        const updateData = { balance: valToSave }
        
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
        const phonePattern = /^[0-9]{2}-[0-9]{3}-[0-9]{4}$/
        if (!phonePattern.test(valToSave)) {
          alert(`${String(field).toUpperCase().replace(/_/g, ' ')} must be formatted as XX-XXX-XXXX.`)
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

      // If the field is an empty string, set it to null to prevent DB check constraint violations
      if (valToSave === '') {
        valToSave = null
      }

      const updateData = { [field]: valToSave }

      const { error: updateError } = await (supabase
        .from('students') as any)
        .update(updateData)
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError

      const updatedStudent = { ...selectedStudent, ...updateData }
      setSelectedStudent(updatedStudent)
      setEditingField(null)

      if (field === 'id') {
        router.replace(`/students/${valToSave}`)
      }
    } catch (err: any) {
      console.error('Error updating field details:', err)
      const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      alert(`Failed to update field: ${errMsg}\nCode: ${err.code}\nDetails: ${err.details}\nHint: ${err.hint}`)
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
    } = {}
  ) => {
    const isEditing = editingField === field
    const isCopied = copiedField === field
    const displayValue = value === null || value === undefined || value === '' ? '—' : value

    const copyable = options.copyable !== false
    const editable = options.editable !== false

    const isMissing = value === null || value === undefined || String(value).trim() === '' || String(value).trim() === '—'
    const borderLeftColor = options.forceBorderColor 
      ? (options.forceBorderColor === 'red' ? 'border-l-rose-500 dark:border-l-rose-600' : 'border-l-blue-500 dark:border-l-blue-600')
      : (isMissing ? 'border-l-rose-500 dark:border-l-rose-600' : 'border-l-blue-500 dark:border-l-blue-600')

    return (
      <div 
        onDoubleClick={() => {
          if (editable && !isEditing) {
            handleStartEditing(String(field), value, options.type === 'select' ? options.selectOptions?.[0] : '')
          }
        }} 
        className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 flex flex-col justify-between min-h-[58px] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/50 transition-all animate-in fade-in duration-200 cursor-pointer border-l-4 ${borderLeftColor}`}
        title={`${editable ? 'Double-click to edit. ' : ''}${copyable && value ? 'Single-click value to copy.' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10.5px] uppercase font-bold tracking-wider ${options.titleColor || 'text-[var(--accent)]'}`}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            {copyable && value && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(String(field), String(value));
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
          className="mt-1 flex items-center min-h-[22px] w-full"
          onClick={() => {
            if (!isEditing && copyable && value) {
              handleCopy(String(field), String(value));
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
                  className="bg-[var(--surface-elevated)] text-[13.5px] text-[var(--foreground)] pl-2 pr-14 py-1 rounded border border-[var(--accent)] focus:outline-none focus:border-[var(--accent)] w-full min-w-0 font-medium"
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
                  className="bg-[var(--surface-elevated)] text-[13.5px] text-[var(--foreground)] pl-2 pr-14 py-1 rounded border border-[var(--accent)] focus:outline-none focus:border-[var(--accent)] w-full min-w-0 font-medium"
                  placeholder={label}
                  autoFocus
                />
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => handleSaveField(field)}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-colors"
                  title="Save"
                >
                  <CheckCircle2 className="h-3 w-3" />
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="h-5 w-5 inline-flex items-center justify-center rounded bg-rose-500 hover:bg-rose-600 text-white cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            isCopied ? (
              <span className="text-[13.5px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
            ) : (options.badgeColor && !isMissing) ? (
              <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[11.5px] font-bold uppercase ${options.badgeColor}`}>
                {displayValue}
              </span>
            ) : (
              <span className="text-[13.5px] font-semibold tracking-wide text-[var(--foreground)]">{displayValue}</span>
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
    certColor: string = 'bg-[#de350b]'
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
        className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 flex flex-col justify-between min-h-[58px] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/50 transition-all cursor-pointer border-l-4 ${
          isMissing ? 'border-l-rose-500 dark:border-l-rose-600' : 'border-l-blue-500 dark:border-l-blue-600'
        }`}
        title="Double-click to edit. Single-click value to copy."
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--accent)]">{label}</span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
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
          className="mt-1 flex items-center min-h-[22px] w-full"
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
                     const { error } = await (supabase
                       .from('students') as any)
                       .update({ [certField]: certToSave, [scoreField]: scoreToSave })
                       .eq('id', selectedStudent!.id)
                     if (error) throw error
                     const updated = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave }
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
                className="bg-[var(--surface-elevated)] text-[11.5px] text-[var(--foreground)] px-2 py-0.5 rounded border border-[var(--border)] w-full focus:outline-none focus:border-[var(--accent)]"
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
                  className="bg-[var(--surface-elevated)] text-[11.5px] text-[var(--foreground)] px-2 py-0.5 rounded border border-[var(--border)] w-full focus:outline-none"
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
                      const { error } = await (supabase
                        .from('students') as any)
                        .update({ [certField]: certToSave, [scoreField]: scoreToSave })
                        .eq('id', selectedStudent!.id)
                      if (error) throw error
                      const updated = { ...selectedStudent!, [certField]: certToSave, [scoreField]: scoreToSave }
                      setSelectedStudent(updated)
                      setEditingField(null)
                    } catch (err: any) {
                      alert(err.message)
                    }
                  }}
                  className="bg-[var(--success)] hover:opacity-90 rounded text-white text-[10.5px] px-2 py-0.5 cursor-pointer font-bold"
                >
                  Save
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEditing();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 rounded text-white text-[10.5px] px-2 py-0.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            copiedField === String(certField) ? (
              <span className="text-[13.5px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
            ) : certVal && certVal !== 'NO CERTIFICATE' ? (
              <div className="inline-flex items-center text-[11.5px] font-bold rounded-[4px] overflow-hidden shadow-sm">
                <span className={`${certColor} text-white px-1.5 py-0.5 uppercase`}>{certVal}</span>
                <span className="bg-[#0052cc] text-white px-1.5 py-0.5">SCORE: {scoreVal || '—'}</span>
              </div>
            ) : (
              <span className="text-[11.5px] font-semibold text-[var(--foreground-subtle)] uppercase">NO CERTIFICATE</span>
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
        statusField: keyof Student
      ) => {
        const isEditing = editingField === uniField
        const uniVal = selectedStudent?.[uniField] as string
        const statusVal = selectedStudent?.[statusField] as string

        const getStatusBadgeClass = (status: string) => {
          if (!status) return 'bg-[#0052cc] text-white border-[#0052cc]'
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
            const { error } = await (supabase
              .from('students') as any)
              .update({ [statusField]: newStatus, jarayon_updated_at: new Date().toISOString() })
              .eq('id', selectedStudent.id)
            if (error) throw error

            setSelectedStudent({
              ...selectedStudent,
              [statusField]: newStatus,
              jarayon_updated_at: new Date().toISOString()
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
            className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 flex flex-col justify-between min-h-[58px] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/50 transition-all cursor-pointer border-l-4 ${
              isMissing ? 'border-l-rose-500 dark:border-l-rose-600' : 'border-l-blue-500 dark:border-l-blue-600'
            }`}
            title="Double-click to edit. Single-click value to copy."
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--accent)]">{label}</span>
              <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
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
                    className="p-0.5 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer opacity-60 hover:opacity-100 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Edit university selection"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div 
              className="mt-1 flex items-center min-h-[22px] w-full"
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
                        const { error } = await (supabase
                          .from('students') as any)
                          .update({ [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString() })
                          .eq('id', selectedStudent!.id)
                        if (error) throw error
                        const updated = { ...selectedStudent!, [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString() }
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
                    className="bg-[var(--surface-elevated)] text-[11.5px] text-[var(--foreground)] px-2 py-0.5 rounded border border-[var(--border)] w-full focus:outline-none font-medium cursor-pointer"
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
                          const { error } = await (supabase
                            .from('students') as any)
                            .update({ [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString() })
                            .eq('id', selectedStudent!.id)
                          if (error) throw error
                          const updated = { ...selectedStudent!, [uniField]: uniInput || null, jarayon_updated_at: new Date().toISOString() }
                          setSelectedStudent(updated)
                          setEditingField(null)
                        } catch (err: any) {
                          alert(err.message)
                        }
                      }}
                      className="p-1 bg-[var(--success)] hover:opacity-90 rounded text-white text-[10.5px] px-2 py-0.5 cursor-pointer font-bold"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEditing();
                      }}
                      className="bg-gray-700 hover:bg-gray-800 rounded text-white text-[10.5px] px-2 py-0.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                copiedField === String(uniField) ? (
                  <span className="text-[13.5px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
                ) : uniVal ? (
                  <div className="flex flex-col gap-0.5 w-full">
                    <span className="text-[12.5px] font-semibold tracking-wide text-[var(--foreground)]" title={uniVal}>{uniVal}</span>
                    <div className="flex relative">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStatusDropdown(activeStatusDropdown === String(uniField) ? null : String(uniField));
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase border cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm select-none",
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
                            className="absolute left-0 mt-6 w-36 bg-white dark:bg-[#1c1c1e] border border-[var(--border)] rounded-lg shadow-lg z-40 py-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2.5 py-1 text-[9.5px] uppercase font-bold tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border)] mb-0.5 select-none">
                              University Status
                            </div>
                            {[
                              { name: 'Chosen', colorClass: 'text-blue-500' },
                              { name: 'Applying', colorClass: 'text-amber-500' },
                              { name: 'Applied', colorClass: 'text-amber-500' },
                              { name: 'Accepted', colorClass: 'text-emerald-500' },
                              { name: 'Failed', colorClass: 'text-rose-500' }
                            ].map((item) => (
                              <button
                                key={item.name}
                                onClick={() => handleStatusSelect(item.name)}
                                className="w-full text-left px-2.5 py-1 text-[12.5px] font-semibold text-[var(--foreground)] hover:bg-[var(--border-subtle)] flex items-center gap-2 cursor-pointer transition-all"
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
                  <span className="text-[11.5px] font-semibold text-[var(--foreground-subtle)] uppercase">None Selected</span>
                )
              )}
            </div>
          </div>
        )
      }

  // Render auto calculated Family/Given Name cards (ReadOnly copyable only)
  const renderAutoNameCard = (label: string, value: string, field: 'family_name' | 'given_name') => {
    const isCopied = copiedField === field
    const isMissing = !value || value.trim() === '' || value.trim() === '—'
    return (
      <div 
        className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 flex flex-col justify-between min-h-[58px] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/50 transition-all cursor-pointer animate-in fade-in duration-200 border-l-4 ${
          isMissing ? 'border-l-rose-500 dark:border-l-rose-600' : 'border-l-blue-500 dark:border-l-blue-600'
        }`}
        title={value ? 'Single-click value to copy.' : ''}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--accent)]">
              {label}
            </span>
            <span className="bg-[var(--border-subtle)] border border-[var(--border)] text-[8.5px] px-1.5 py-0.2 rounded font-bold text-[var(--foreground-muted)] uppercase">AUTO</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            {value && (
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
          className="mt-1 flex items-center min-h-[22px]"
          onClick={() => {
            if (value) {
              handleCopy(field, value);
            }
          }}
        >
          {isCopied ? (
            <span className="text-[13.5px] font-bold text-[var(--success)] animate-pulse">Copied!</span>
          ) : (
            <span className="text-[13.5px] font-semibold tracking-wide text-[var(--foreground)]">{value || '—'}</span>
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-[15.5px] font-semibold transition-all shadow-sm"
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
      <div className="bg-background text-[var(--foreground)] transition-colors flex flex-col gap-2.5">
        {/* Header Action Bar (Highly compact) */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-[var(--border)] flex-shrink-0">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-md text-[13.5px] font-semibold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchStudent}
              className="inline-flex items-center gap-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2.5 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-md text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer"
              title="Reload student data"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[var(--accent)]" />
              Reload
            </button>
            {selectedStudent.is_deleted ? (
              <button 
                disabled={isDeleting}
                onClick={handleRestoreStudent}
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-[var(--border-subtle)] px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50"
                title="Restore student profile"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                Restore
              </button>
            ) : (
              <button 
                disabled={isDeleting}
                onClick={handleDeleteStudent}
                className="inline-flex items-center gap-1 text-[var(--danger)] hover:bg-[var(--border-subtle)] hover:text-red-600 px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-md text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50"
                title="Delete student profile"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Student Header Identifier Banner (Extremely compact) */}
        <div className="py-2 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg flex items-center gap-3 shadow-[var(--shadow-sm)] transition-colors flex-shrink-0">
          <div className="w-11 h-11 bg-[var(--accent)] rounded-full flex items-center justify-center font-bold text-white text-sm select-none shadow-[var(--shadow-sm)]">
            {getInitials(selectedStudent.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">
              {selectedStudent.full_name}
            </h1>
            <div className="flex items-center gap-2 text-[11.5px] font-semibold text-[var(--foreground-muted)] mt-0.5">
              <span>ID: <span className="font-mono text-[var(--accent)] font-bold text-[11.5px]">{selectedStudent.id}</span></span>
              <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />
              {selectedStudent.is_deleted ? (
                <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-1.5 py-0.2 rounded-full text-[9.5px] font-extrabold uppercase animate-pulse">
                  DELETED
                </span>
              ) : (
                <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.2 rounded-full text-[9.5px] font-extrabold uppercase">
                  ACTIVE
                </span>
              )}
              {selectedStudent.student_group && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[var(--foreground-subtle)]" />
                  <span className="text-[var(--foreground)] uppercase font-bold text-[10.5px]">{selectedStudent.student_group}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout (3-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.54fr_1.36fr_0.5fr] gap-3 pb-1">
          {/* Column 1: Personal Info & Contact Info */}
          <div className="flex flex-col gap-3">
            {/* Personal & Passport Block */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 shadow-[var(--shadow-md)] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Personal & Passport
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  {renderDetailCard('Full Name', 'full_name', selectedStudent.full_name, { titleColor: 'text-[var(--accent)]' })}
                </div>
                {renderAutoNameCard('Family Name', selectedStudent.full_name.split(' ')[0] || '', 'family_name')}
                {renderAutoNameCard('Given Name', selectedStudent.full_name.split(' ').slice(1).join(' ') || '', 'given_name')}
                {renderDetailCard('Sex', 'gender', selectedStudent.gender, { 
                  type: 'select', 
                  selectOptions: ['MALE', 'FEMALE'],
                  titleColor: 'text-[var(--accent)]' 
                })}
                {renderDetailCard('Birthday', 'birthday', selectedStudent.birthday, { type: 'date', titleColor: 'text-[var(--accent)]' })}
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    {renderDetailCard('Student Number 1', 'phone1', selectedStudent.phone1, { titleColor: 'text-[var(--accent)]' })}
                  </div>
                  <div className="sm:col-span-1">
                    {renderDetailCard('Student Number 2', 'phone2', selectedStudent.phone2, { titleColor: 'text-[var(--accent)]' })}
                  </div>
                  <div className="sm:col-span-2">
                    {renderDetailCard('Email', 'email', selectedStudent.email, { titleColor: 'text-[var(--accent)]' })}
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 shadow-[var(--shadow-md)] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Academic & Languages
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {renderDetailCard('Tariff', 'tariff', selectedStudent.tariff, { 
                    type: 'select', 
                    selectOptions: tariffOptions,
                    badgeColor: 'bg-[#00875a] text-white',
                    titleColor: 'text-[var(--accent)]'
                  })}
                  {renderDetailCard('Education Level', 'level', selectedStudent.level, { 
                    type: 'select', 
                    selectOptions: levelOptions,
                    badgeColor: 'bg-[#0052cc] text-white',
                    titleColor: 'text-[var(--accent)]'
                  })}
                  {renderDetailCard('Education Level 2', 'level2', selectedStudent.level2, { 
                    type: 'select', 
                    selectOptions: levelOptions,
                    badgeColor: 'bg-[#ff9900] text-white',
                    titleColor: 'text-[var(--accent)]'
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {renderCertificateCard('Language Certificate 1', 'language_certificate', 'certificate_score', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#de350b]')}
                  {renderCertificateCard('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#00b8d9]')}
                  {renderCertificateCard('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE'], 'bg-[#ff5630]')}
                </div>
              </div>
            </div>

            {/* Universities & Docs Block */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 shadow-[var(--shadow-md)] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Universities & Docs
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {renderUniversityCardDetails('University 1', 'university_1', 'university_1_status')}
                {renderUniversityCardDetails('University 2', 'university_2', 'university_2_status')}
                {renderUniversityCardDetails('University 3', 'university_3', 'university_3_status')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderDetailCard('Father Phone', 'father_phone', selectedStudent.father_phone, { titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Mother Phone', 'mother_phone', selectedStudent.mother_phone, { titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Father Job', 'father_job', selectedStudent.father_job, { titleColor: 'text-[var(--accent)]' })}
                  {renderDetailCard('Mother Job', 'mother_job', selectedStudent.mother_job, { titleColor: 'text-[var(--accent)]' })}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: System & Finance */}
          <div className="flex flex-col gap-3">
            {/* System & Finance Block */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 shadow-[var(--shadow-md)] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border)]">
                <Landmark className="h-3.5 w-3.5 text-[var(--accent)]" />
                <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  System & Finance
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {/* Office Location Card */}
                <div 
                  onDoubleClick={() => {
                    if (editingField !== 'office') {
                      handleStartEditing('office', selectedStudent.office)
                    }
                  }}
                  className="bg-blue-500 dark:bg-blue-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[50px] shadow-sm cursor-pointer"
                  title="Double-click to edit. Single-click value to copy."
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-blue-100 flex items-center gap-1">
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
                          className="bg-blue-600 text-[13.5px] text-white px-2 py-0.5 rounded border border-blue-400 focus:outline-none w-full font-semibold cursor-pointer"
                        >
                          <option value="ANDIJON OFFIS">ANDIJON OFFIS</option>
                          <option value="TOSHKENT OFFIS">TOSHKENT OFFIS</option>
                        </select>
                        <button
                          onClick={() => handleSaveField('office')}
                          className="p-0.5 hover:bg-blue-700 rounded text-emerald-250 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEditing}
                          className="p-0.5 hover:bg-blue-700 rounded text-rose-250 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      copiedField === 'office' ? (
                        <span className="text-[13.5px] font-bold text-white animate-pulse">Copied!</span>
                      ) : (
                        <span className="text-[13.5px] font-bold tracking-wide uppercase">{selectedStudent.office || '—'}</span>
                      )
                    )}
                  </div>
                </div>

                {/* Student Balance Card */}
                <div 
                  className={`rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[50px] cursor-pointer ${
                    selectedStudent.balance < 0 ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600'
                  }`}
                  title="Single-click value to copy."
                  onClick={() => {
                    handleCopy('balance', String(selectedStudent.balance))
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
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
                      <span className="text-[13.5px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[13.5px] font-bold tracking-wide">
                        {formatCurrency(selectedStudent.balance)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payments Done Card */}
                <div 
                  className="bg-emerald-500 dark:bg-emerald-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[50px] cursor-pointer"
                  title="Single-click value to copy."
                  onClick={() => {
                    handleCopy('payments_done', String(computedPaymentsDone))
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
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
                      <span className="text-[13.5px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[13.5px] font-bold tracking-wide">
                        {formatCurrency(computedPaymentsDone)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Discount Card */}
                <div 
                  className="bg-orange-500 dark:bg-orange-600 rounded-[var(--radius-md)] p-2.5 text-white flex flex-col justify-between min-h-[50px] cursor-pointer"
                  title="Single-click value to copy."
                  onClick={() => {
                    handleCopy('discount', String(computedDiscount))
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-white opacity-95 flex items-center gap-1">
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
                      <span className="text-[13.5px] font-bold text-white animate-pulse">Copied!</span>
                    ) : (
                      <span className="text-[13.5px] font-bold tracking-wide">
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



                {/* AI Document Extraction Card (Copyable / Action Link) */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-2.5 hover:bg-[var(--border-subtle)] transition-all cursor-pointer flex items-center justify-between shadow-[var(--shadow-sm)] min-h-[50px]">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold tracking-wider text-[var(--accent)] block">
                      Fill By Document
                    </span>
                    <span className="text-[13.5px] font-bold text-[var(--foreground)] mt-0.5 block">
                      AI Document Extraction
                    </span>
                  </div>
                  <span className="text-[var(--foreground-subtle)] font-mono text-[15.5px] font-bold">&gt;</span>
                </div>

                {renderDetailCard('Missing Documents', 'pick_needed', selectedStudent.pick_needed?.join(', '), { 
                  badgeColor: 'bg-[#5243aa] text-white',
                  titleColor: 'text-[var(--accent)]',
                  forceBorderColor: selectedStudent.pick_needed && selectedStudent.pick_needed.length > 0 ? 'red' : 'blue'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
