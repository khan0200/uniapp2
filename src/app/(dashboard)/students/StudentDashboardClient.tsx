'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
                    onClick={() => router.push(`/students/${student.id}`)}
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


    </PageShell>
  )
}
