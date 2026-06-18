'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Filter, Users, X, Loader2, Search, AlertCircle, CheckCircle2, 
  Building2, User, Landmark, Tag, Layers, Award, Bookmark, UserCheck, 
  FileSpreadsheet, ChevronDown, GraduationCap, Hourglass, CheckSquare, 
  MessageSquare, Sparkles, Copy, RefreshCw, Trash2, HelpCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff, type StudentLanguageCertificate } from '@/types/database'
import { PageShell } from '@/components/ui/PageShell'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { motion, AnimatePresence } from 'framer-motion'

export function StudentDashboardClient() {
  const supabase = createClient()

  // State for students list
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Context shared state
  const { searchQuery, isAddStudentModalOpen: isModalOpen, setIsAddStudentModalOpen: setIsModalOpen } = useStudentDashboard()

  // Search & Filters state
  const [tariffFilter, setTariffFilter] = useState<StudentTariff | 'ALL'>('ALL')
  const [levelFilter, setLevelFilter] = useState<StudentLevel | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState<string | 'ALL'>('ALL')
  const [certificateFilter, setCertificateFilter] = useState<StudentLanguageCertificate | 'ALL'>('ALL')
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

  // Details Modal State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch students on mount
  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('is_deleted', false)
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

  useEffect(() => {
    fetchStudents()
  }, [])

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
          task_tags: [] as string[]
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
    const matchesSearch = 
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.phone1 && student.phone1.includes(searchQuery)) ||
      (student.phone2 && student.phone2.includes(searchQuery))
    
    const matchesTariff = tariffFilter === 'ALL' || student.tariff === tariffFilter
    const matchesLevel = levelFilter === 'ALL' || student.level === levelFilter || student.level2 === levelFilter
    const matchesGroup = groupFilter === 'ALL' || student.student_group === groupFilter
    
    const matchesCertificate = certificateFilter === 'ALL' || 
      student.language_certificate === certificateFilter ||
      student.language_certificate_2 === certificateFilter ||
      student.language_certificate_3 === certificateFilter

    const matchesTag = tagFilter === 'ALL' || (student.task_tags && student.task_tags.includes(tagFilter))
    const matchesLeadBy = leadByFilter === 'ALL' || student.lead_by === leadByFilter

    return matchesSearch && matchesTariff && matchesLevel && matchesGroup && matchesCertificate && matchesTag && matchesLeadBy
  })

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

  // Copy helper
  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1200)
  }

  // Start inline editing
  const handleStartEditing = (field: string, val: any) => {
    setEditingField(field)
    setEditValue(val || '')
  }

  // Cancel inline editing
  const handleCancelEditing = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Save inline edits to Supabase
  const handleSaveField = async (field: keyof Student) => {
    if (!selectedStudent) return
    try {
      let valToSave = editValue
      if (typeof valToSave === 'string') {
        valToSave = valToSave.trim()
        if (['id', 'full_name', 'passport', 'address'].includes(field)) {
          valToSave = valToSave.toUpperCase()
        }
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

      if (field === 'phone1' && valToSave) {
        const phonePattern = /^[0-9]{2}-[0-9]{3}-[0-9]{2}-[0-9]{2}$/
        if (!phonePattern.test(valToSave)) {
          alert('Phone 1 must be formatted as 00-000-00-00.')
          return
        }
      }

      const updateData = { [field]: valToSave }

      const { error: updateError } = await (supabase
        .from('students') as any)
        .update(updateData)
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError

      const updatedStudent = { ...selectedStudent, ...updateData }
      setSelectedStudent(updatedStudent)
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s))
      setEditingField(null)
    } catch (err: any) {
      console.error('Error updating field:', err)
      alert(err.message || 'Failed to update field.')
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

      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id))
      setSelectedStudent(null)
    } catch (err: any) {
      console.error('Error soft-deleting student:', err)
      alert(err.message || 'Failed to delete student.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Row background color selector matching visual row highlights
  const getRowBgColor = (student: Student) => {
    if (student.row_color?.toUpperCase() === 'GREEN') {
      return 'bg-[#e2f0d9]/60 hover:bg-[#d6e9cb] dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30'
    }
    if (student.row_color?.toUpperCase() === 'BLUE') {
      return 'bg-[#deebf7]/60 hover:bg-[#c6dbef] dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
    }
    if (student.row_color?.toUpperCase() === 'YELLOW') {
      return 'bg-[#fff2cc]/60 hover:bg-[#ffe599] dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
    }
    return 'bg-[var(--surface)] hover:bg-[var(--border-subtle)]'
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
      <ul className="space-y-1 text-xs text-[var(--foreground)] max-w-xs leading-relaxed list-none pl-0 font-medium">
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

  // Get Initials for Details Header Avatar
  const getInitials = (name: string) => {
    if (!name) return 'ST'
    const parts = name.split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }

  // Unified Details Card rendering helper matching mockup layout styling
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
    } = {}
  ) => {
    const isEditing = editingField === field
    const isCopied = copiedField === field
    const displayValue = value === null || value === undefined || value === '' ? '—' : value

    return (
      <div className="bg-[#1c1c1e] border border-gray-800 rounded-lg p-3 flex flex-col justify-between min-h-[64px] text-white">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${options.titleColor || 'text-gray-400'}`}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            {options.copyable && value && !isEditing && (
              <button
                onClick={() => handleCopy(String(field), String(value))}
                className="p-1 hover:bg-gray-800 rounded transition-all cursor-pointer"
                title="Copy value"
              >
                {isCopied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>
            )}
            {options.editable && !isEditing && (
              <button
                onClick={() => handleStartEditing(String(field), value)}
                className="p-1 hover:bg-gray-800 rounded transition-all cursor-pointer text-gray-400 hover:text-white"
                title="Edit field"
              >
                <Plus className="h-3.5 w-3.5" style={{ transform: 'rotate(45deg)' }} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center min-h-[24px]">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              {options.type === 'select' ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-[#2c2c2e] text-sm text-white px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-full"
                >
                  {options.selectOptions?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={options.type === 'date' ? 'date' : 'text'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-[#2c2c2e] text-sm text-white px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500 w-full"
                  placeholder={label}
                  autoFocus
                />
              )}
              <button
                onClick={() => handleSaveField(field)}
                className="p-1 hover:bg-gray-800 rounded text-emerald-400 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancelEditing}
                className="p-1 hover:bg-gray-800 rounded text-rose-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            options.badgeColor ? (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${options.badgeColor}`}>
                {displayValue}
              </span>
            ) : (
              <span className="text-sm font-medium tracking-wide text-gray-200">{displayValue}</span>
            )
          )}
        </div>
      </div>
    )
  }

  // Render Language Certificate Card (Row 7) inside Details Modal
  const renderCertificateCard = (
    label: string,
    certField: keyof Student,
    scoreField: keyof Student,
    certsAllowed: string[]
  ) => {
    const isEditing = editingField === certField
    const certVal = selectedStudent?.[certField] as string
    const scoreVal = selectedStudent?.[scoreField] as string

    return (
      <div className="bg-[#1c1c1e] border border-gray-800 rounded-lg p-3 flex flex-col justify-between min-h-[64px] text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">{label}</span>
          {!isEditing && (
            <button
              onClick={() => handleStartEditing(String(certField), certVal)}
              className="p-1 hover:bg-gray-800 rounded transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Edit certificate"
            >
              <Plus className="h-3.5 w-3.5 text-gray-400" style={{ transform: 'rotate(45deg)' }} />
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center min-h-[24px] w-full">
          {isEditing ? (
            <div className="flex flex-col gap-1.5 w-full">
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-[#2c2c2e] text-xs text-white px-2 py-1 rounded border border-gray-700 w-full"
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
                  className="bg-[#2c2c2e] text-xs text-white px-2 py-1 rounded border border-gray-700 w-full"
                />
              )}
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={async () => {
                    const scoreEl = document.getElementById('edit-score-input') as HTMLInputElement
                    const scoreInput = scoreEl ? scoreEl.value.trim() : ''
                    try {
                      const { error } = await (supabase
                        .from('students') as any)
                        .update({ [certField]: editValue, [scoreField]: scoreInput })
                        .eq('id', selectedStudent!.id)
                      if (error) throw error
                      const updated = { ...selectedStudent!, [certField]: editValue, [scoreField]: scoreInput }
                      setSelectedStudent(updated)
                      setStudents(prev => prev.map(s => s.id === selectedStudent!.id ? updated : s))
                      setEditingField(null)
                    } catch (err: any) {
                      alert(err.message)
                    }
                  }}
                  className="p-1 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-xs px-2 cursor-pointer font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="p-1 bg-gray-700 hover:bg-gray-800 rounded text-white text-xs px-2 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            certVal && certVal !== 'NO CERTIFICATE' ? (
              <div className="inline-flex items-center text-xs font-bold rounded-[4px] overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                <span className="bg-[#de350b] text-white px-2 py-0.5 uppercase">{certVal}</span>
                <span className="bg-[#0052cc] text-white px-2 py-0.5">SCORE: {scoreVal || '—'}</span>
              </div>
            ) : (
              <span className="text-sm font-medium tracking-wide text-gray-500 font-semibold">NO CERTIFICATE</span>
            )
          )}
        </div>
      </div>
    )
  }

  // Render University status card inside Details Modal
  const renderUniversityCardDetails = (
    label: string,
    uniField: keyof Student,
    statusField: keyof Student
  ) => {
    const isEditing = editingField === uniField
    const uniVal = selectedStudent?.[uniField] as string
    const statusVal = selectedStudent?.[statusField] as string

    const getStatusBadgeClass = (status: string) => {
      if (!status) return 'bg-gray-700 text-gray-300'
      if (status.toUpperCase() === 'APPLIED') return 'bg-amber-600 text-white'
      if (status.toUpperCase() === 'ACCEPTED') return 'bg-emerald-600 text-white'
      if (status.toUpperCase() === 'FAILED' || status.toUpperCase() === 'REJECTED') return 'bg-rose-600 text-white'
      return 'bg-blue-600 text-white'
    }

    return (
      <div className="bg-[#1c1c1e] border border-gray-800 rounded-lg p-3 flex flex-col justify-between min-h-[72px] text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">{label}</span>
          {!isEditing && (
            <button
              onClick={() => handleStartEditing(String(uniField), uniVal)}
              className="p-1 hover:bg-gray-800 rounded transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Edit university selection"
            >
              <Plus className="h-3.5 w-3.5 text-gray-400" style={{ transform: 'rotate(45deg)' }} />
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center min-h-[30px] w-full">
          {isEditing ? (
            <div className="flex flex-col gap-1.5 w-full">
              <input
                type="text"
                id="edit-uni-name-input"
                defaultValue={uniVal || ''}
                placeholder="University Name"
                className="bg-[#2c2c2e] text-xs text-white px-2 py-1 rounded border border-gray-700 w-full"
              />
              <select
                id="edit-uni-status-select"
                defaultValue={statusVal || 'Chosen'}
                className="bg-[#2c2c2e] text-xs text-white px-2 py-1 rounded border border-gray-700 w-full"
              >
                <option value="Chosen">Chosen</option>
                <option value="Applying">Applying</option>
                <option value="Applied">Applied</option>
                <option value="Accepted">Accepted</option>
                <option value="Failed">Failed</option>
              </select>
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  onClick={async () => {
                    const uniEl = document.getElementById('edit-uni-name-input') as HTMLInputElement
                    const statusEl = document.getElementById('edit-uni-status-select') as HTMLSelectElement
                    const uniInput = uniEl ? uniEl.value.trim() : ''
                    const statusInput = statusEl ? statusEl.value : 'Chosen'
                    try {
                      const { error } = await (supabase
                        .from('students') as any)
                        .update({ [uniField]: uniInput, [statusField]: statusInput, jarayon_updated_at: new Date().toISOString() })
                        .eq('id', selectedStudent!.id)
                      if (error) throw error
                      const updated = { ...selectedStudent!, [uniField]: uniInput, [statusField]: statusInput, jarayon_updated_at: new Date().toISOString() }
                      setSelectedStudent(updated)
                      setStudents(prev => prev.map(s => s.id === selectedStudent!.id ? updated : s))
                      setEditingField(null)
                    } catch (err: any) {
                      alert(err.message)
                    }
                  }}
                  className="p-1 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-xs px-2 cursor-pointer font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="p-1 bg-gray-700 hover:bg-gray-800 rounded text-white text-xs px-2 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            uniVal ? (
              <div className="flex flex-col gap-1 w-full">
                <span className="text-xs font-semibold tracking-wide text-gray-200">{uniVal}</span>
                <div className="flex">
                  <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[9px] font-extrabold uppercase ${getStatusBadgeClass(statusVal)}`}>
                    {statusVal || 'Chosen'}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm font-medium tracking-wide text-gray-500 font-semibold">None Selected</span>
            )
          )}
        </div>
      </div>
    )
  }

  // Render auto calculated Family/Given Name cards
  const renderAutoNameCard = (label: string, value: string, field: string) => {
    const isCopied = copiedField === field
    return (
      <div className="bg-[#1c1c1e] border border-gray-800 rounded-lg p-3 flex flex-col justify-between min-h-[64px] text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
              {label}
            </span>
            <span className="bg-gray-800 text-[8px] px-1 rounded font-bold text-gray-400">AUTO</span>
          </div>
          {value && (
            <button
              onClick={() => handleCopy(field, value)}
              className="p-1 hover:bg-gray-800 rounded transition-all cursor-pointer opacity-60 hover:opacity-100 text-gray-400"
            >
              {isCopied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center min-h-[24px]">
          <span className="text-sm font-semibold tracking-wide text-gray-300">{value || '—'}</span>
        </div>
      </div>
    )
  }

  return (
    <PageShell>

      {/* Redesigned Filters Card Section */}
      <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-wrap lg:flex-nowrap gap-3 items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
          {/* Tariffs Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={tariffFilter}
              onChange={(e) => setTariffFilter(e.target.value as any)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Tariffs</option>
              <option value="STANDART">STANDART</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="VISA PLUS">VISA PLUS</option>
              <option value="E-VISA">E-VISA</option>
              <option value="REGIONAL VISA">REGIONAL VISA</option>
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
              <option value="COLLEGE">COLLEGE</option>
              <option value="BACHELOR">BACHELOR</option>
              <option value="MASTERS">MASTERS</option>
              <option value="MASTER NO CERTIFICATE">MASTER NO CERTIFICATE</option>
              <option value="LANGUAGE COURSE">LANGUAGE COURSE</option>
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
              {uniqueGroups.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

          {/* Certificates Filter */}
          <div className="relative">
            <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none" />
            <select
              value={certificateFilter}
              onChange={(e) => setCertificateFilter(e.target.value as any)}
              className="w-full pl-9 pr-7 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none hover:border-blue-400 transition-all text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="ALL">All Certificates</option>
              <option value="TOPIK">TOPIK</option>
              <option value="IELTS">IELTS</option>
              <option value="TOEFL">TOEFL</option>
              <option value="SKA">SKA</option>
              <option value="NO CERTIFICATE">NO CERTIFICATE</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-subtle)] pointer-events-none" />
          </div>

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
          {(searchQuery || tariffFilter !== 'ALL' || levelFilter !== 'ALL' || groupFilter !== 'ALL' || certificateFilter !== 'ALL' || tagFilter !== 'ALL' || leadByFilter !== 'ALL') && (
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
                  <th className="px-6 py-3.5 w-20">
                    <span className="flex items-center gap-1">
                      ID
                      <ChevronDown className="h-3 w-3" />
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
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`cursor-pointer transition-colors text-sm text-[var(--foreground)] ${getRowBgColor(student)}`}
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

                    {/* Status Circle & Action Icon Column */}
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        {renderActionCircle(student)}
                        {renderActionIcon(student)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* High-Fidelity Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!editingField) setSelectedStudent(null)
              }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-6xl h-[90vh] overflow-hidden rounded-[var(--radius-lg)] border border-gray-800 bg-[#0a0a0a] p-6 shadow-[var(--shadow-lg)] z-10 text-white flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-900 flex-shrink-0">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
                  <User className="h-4 w-4 text-[var(--accent)]" />
                  Student Details
                </div>
                <div className="flex items-center gap-4">
                  {/* Refresh Roster Details */}
                  <button 
                    onClick={fetchStudents}
                    className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition-all cursor-pointer"
                    title="Reload student data"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {/* Delete student profile button */}
                  <button 
                    disabled={isDeleting}
                    onClick={handleDeleteStudent}
                    className="text-rose-500 hover:text-rose-400 p-1 hover:bg-gray-800 rounded transition-all cursor-pointer disabled:opacity-50"
                    title="Delete student profile"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  {/* Close modal button */}
                  <button 
                    onClick={() => {
                      if (!editingField) setSelectedStudent(null)
                    }}
                    className="text-gray-400 hover:text-white p-1 hover:bg-gray-800/80 rounded transition-all cursor-pointer"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Student Header Identifier Banner */}
              <div className="py-5 flex items-center gap-4 flex-shrink-0">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-lg select-none">
                  {getInitials(selectedStudent.full_name)}
                </div>
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wide text-white">
                    {selectedStudent.full_name}
                  </h1>
                  <div className="flex items-center gap-2.5 mt-1 text-xs font-semibold text-gray-400">
                    <span>Student ID: <span className="font-mono text-blue-400 font-bold">{selectedStudent.id}</span></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                    <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                      ACTIVE
                    </span>
                    {selectedStudent.student_group && (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                        <span className="text-gray-300 uppercase">{selectedStudent.student_group}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Three-Column Grid Details */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
                  
                  {/* Column 1: Academic Profile */}
                  <div className="lg:col-span-3 space-y-3.5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                      Academic Profile
                    </h3>
                    
                    {renderDetailCard('Student ID', 'id', selectedStudent.id, { titleColor: 'text-sky-400' })}
                    
                    {renderDetailCard('Tariff', 'tariff', selectedStudent.tariff, { 
                      editable: true, 
                      type: 'select', 
                      selectOptions: ['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'],
                      badgeColor: 'bg-emerald-650 text-white bg-emerald-700/80',
                      titleColor: 'text-sky-400'
                    })}
                    
                    {renderDetailCard('Group', 'student_group', selectedStudent.student_group, { 
                      editable: true, 
                      badgeColor: 'bg-rose-950/40 border border-rose-900/30 text-rose-300',
                      titleColor: 'text-sky-400'
                    })}
                    
                    {renderDetailCard('Education Level', 'level', selectedStudent.level, { 
                      editable: true, 
                      type: 'select', 
                      selectOptions: ['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'],
                      badgeColor: 'bg-blue-900/40 border border-blue-800/30 text-blue-300',
                      titleColor: 'text-sky-400'
                    })}

                    {renderDetailCard('Education Level 2', 'level2', selectedStudent.level2, { 
                      editable: true, 
                      type: 'select', 
                      selectOptions: ['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'],
                      badgeColor: 'bg-amber-950/40 border border-amber-900/30 text-amber-300',
                      titleColor: 'text-sky-400'
                    })}

                    {renderDetailCard('Lead By', 'lead_by', selectedStudent.lead_by, { editable: true, titleColor: 'text-sky-400' })}

                    {renderDetailCard('Missing Documents', 'pick_needed', selectedStudent.pick_needed?.join(', '), { 
                      badgeColor: 'bg-[#6554c0]/20 border border-[#6554c0]/30 text-purple-300',
                      titleColor: 'text-sky-400'
                    })}
                  </div>

                  {/* Column 2: Contact, Passport and University */}
                  <div className="lg:col-span-6 space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                      Contact, Passport and University
                    </h3>

                    {/* Full name card */}
                    {renderDetailCard('Full Name', 'full_name', selectedStudent.full_name, { copyable: true, editable: true, titleColor: 'text-sky-400' })}

                    {/* Auto Generated Family/Given Names */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {renderAutoNameCard('Family Name', selectedStudent.full_name.split(' ')[0] || '', 'family_name')}
                      {renderAutoNameCard('Given Name', selectedStudent.full_name.split(' ').slice(1).join(' ') || '', 'given_name')}
                    </div>

                    {/* Phone Stack */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {renderDetailCard('Student Number 1', 'phone1', selectedStudent.phone1, { copyable: true, editable: true, titleColor: 'text-sky-400' })}
                      {renderDetailCard('Student Number 2', 'phone2', selectedStudent.phone2, { copyable: true, editable: true, titleColor: 'text-sky-400' })}
                    </div>

                    {/* Parents phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {renderDetailCard('Father Phone', 'father_phone', selectedStudent.father_phone, { editable: true, titleColor: 'text-rose-450 text-rose-400/80' })}
                      {renderDetailCard('Mother Phone', 'mother_phone', selectedStudent.mother_phone, { editable: true, titleColor: 'text-rose-450 text-rose-400/80' })}
                    </div>

                    {/* Email, birthday and sex */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="md:col-span-2">
                        {renderDetailCard('Email', 'email', selectedStudent.email, { copyable: true, editable: true, titleColor: 'text-sky-400' })}
                      </div>
                      {renderDetailCard('Sex', 'gender', selectedStudent.gender, { 
                        editable: true, 
                        type: 'select', 
                        selectOptions: ['MALE', 'FEMALE'],
                        titleColor: 'text-sky-400' 
                      })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="md:col-span-2">
                        {renderDetailCard('Birthday', 'birthday', selectedStudent.birthday, { copyable: true, editable: true, type: 'date', titleColor: 'text-sky-400' })}
                      </div>
                      {renderDetailCard('Passport', 'passport', selectedStudent.passport, { copyable: true, editable: true, titleColor: 'text-sky-400' })}
                    </div>

                    {/* Passport issues dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {renderDetailCard('Date of Issue', 'passport_issue_date', selectedStudent.passport_issue_date, { copyable: true, editable: true, type: 'date', titleColor: 'text-sky-400' })}
                      {renderDetailCard('Date of Expiration', 'passport_expire_date', selectedStudent.passport_expire_date, { copyable: true, editable: true, type: 'date', titleColor: 'text-sky-400' })}
                    </div>

                    {/* Educational background */}
                    {renderDetailCard('Educational Background', 'educational_background', selectedStudent.educational_background, { editable: true, titleColor: 'text-sky-400' })}

                    {/* Certificates rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {renderCertificateCard('Language Certificate 1', 'language_certificate', 'certificate_score', ['TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE'])}
                      {renderCertificateCard('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', ['TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE'])}
                      {renderCertificateCard('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', ['TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE'])}
                    </div>

                    {/* Universities stack */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {renderUniversityCardDetails('University 1', 'university_1', 'university_1_status')}
                      {renderUniversityCardDetails('University 2', 'university_2', 'university_2_status')}
                      {renderUniversityCardDetails('University 3', 'university_3', 'university_3_status')}
                    </div>

                    {/* Address & Notes */}
                    {renderDetailCard('Address', 'address', selectedStudent.address, { copyable: true, editable: true, titleColor: 'text-sky-400' })}
                    {renderDetailCard('Notes', 'notes', selectedStudent.notes, { editable: true, titleColor: 'text-sky-400' })}
                  </div>

                  {/* Column 3: System and Finance */}
                  <div className="lg:col-span-3 space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                      System and Finance
                    </h3>

                    {/* Office card (solid blue) */}
                    <div className="bg-blue-600 rounded-lg p-3.5 text-white flex flex-col justify-between min-h-[72px]" style={{ boxShadow: '0 4px 14px rgba(59, 127, 245, 0.3)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Office Location
                        </span>
                        {editingField !== 'office' && (
                          <button
                            onClick={() => handleStartEditing('office', selectedStudent.office)}
                            className="p-1 hover:bg-blue-700/50 rounded transition-all cursor-pointer text-blue-200 hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center min-h-[28px]">
                        {editingField === 'office' ? (
                          <div className="flex items-center gap-2 w-full">
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-blue-700 text-sm text-white px-2 py-1 rounded border border-blue-500 focus:outline-none w-full font-semibold"
                            >
                              <option value="ANDIJON OFFIS">ANDIJON OFFIS</option>
                              <option value="TOSHKENT OFFIS">TOSHKENT OFFIS</option>
                            </select>
                            <button
                              onClick={() => handleSaveField('office')}
                              className="p-1 hover:bg-blue-700 rounded text-emerald-200 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEditing}
                              className="p-1 hover:bg-blue-700 rounded text-rose-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-extrabold tracking-wide uppercase">{selectedStudent.office || '—'}</span>
                        )}
                      </div>
                    </div>

                    {/* Student Balance Card (Solid Red/Green) */}
                    <div className={`rounded-lg p-3.5 text-white flex flex-col justify-between min-h-[72px] ${
                      selectedStudent.balance < 0 ? 'bg-red-650 bg-rose-600' : 'bg-emerald-650 bg-emerald-600'
                    }`} style={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-red-100 opacity-90 flex items-center gap-1">
                          <Landmark className="h-3 w-3" />
                          Student Balance
                        </span>
                        {editingField !== 'balance' && (
                          <button
                            onClick={() => handleStartEditing('balance', selectedStudent.balance)}
                            className="p-1 hover:bg-black/10 rounded transition-all cursor-pointer text-white/80 hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center min-h-[28px]">
                        {editingField === 'balance' ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="bg-black/20 text-sm text-white px-2 py-1 rounded border border-white/20 focus:outline-none w-full font-bold"
                            />
                            <button
                              onClick={() => handleSaveField('balance')}
                              className="p-1 hover:bg-black/10 rounded text-emerald-200 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEditing}
                              className="p-1 hover:bg-black/10 rounded text-rose-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-extrabold tracking-wide">
                            {formatCurrency(selectedStudent.balance)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Payments Done Card (Solid Green) */}
                    <div className="bg-emerald-600 rounded-lg p-3.5 text-white flex flex-col justify-between min-h-[72px]" style={{ boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)' }}>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 opacity-90 flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        Payments Done
                      </span>
                      <div className="mt-1 flex items-center min-h-[28px]">
                        <span className="text-sm font-extrabold tracking-wide">
                          {selectedStudent.balance < 0 
                            ? formatCurrency(Math.abs(selectedStudent.balance)) 
                            : formatCurrency(0)}
                        </span>
                      </div>
                    </div>

                    {/* Discount Card (Solid Amber) */}
                    <div className="bg-[#e67e22] rounded-lg p-3.5 text-white flex flex-col justify-between min-h-[72px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-100 opacity-90 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Discount
                        </span>
                        {editingField !== 'discount' && (
                          <button
                            onClick={() => handleStartEditing('discount', selectedStudent.discount)}
                            className="p-1 hover:bg-black/10 rounded transition-all cursor-pointer text-white/80 hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center min-h-[28px]">
                        {editingField === 'discount' ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="bg-black/20 text-sm text-white px-2 py-1 rounded border border-white/20 focus:outline-none w-full font-bold"
                            />
                            <button
                              onClick={() => handleSaveField('discount')}
                              className="p-1 hover:bg-black/10 rounded text-emerald-200 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEditing}
                              className="p-1 hover:bg-black/10 rounded text-rose-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-extrabold tracking-wide">
                            {formatCurrency(selectedStudent.discount || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Document Extraction Link Card */}
                    <div className="bg-[#1c1c1e] border border-gray-800 rounded-lg p-3.5 hover:bg-gray-800/50 transition-all cursor-pointer flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">
                          Fill By Document
                        </span>
                        <span className="text-xs font-bold text-gray-300 mt-0.5 block">
                          AI Document Extraction
                        </span>
                      </div>
                      <span className="text-gray-600 font-mono text-sm font-bold">&gt;</span>
                    </div>

                  </div>

                </div>
              </div>

              {/* Modal Bottom Bar */}
              <div className="pt-4 border-t border-gray-900 flex justify-end flex-shrink-0">
                <button
                  onClick={() => {
                    if (!editingField) setSelectedStudent(null)
                  }}
                  className="px-6 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm font-semibold tracking-wide cursor-pointer transition-all text-gray-300 hover:text-white"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
