'use client'

import { useState, useEffect } from 'react'
import { PageShell } from '@/components/ui/PageShell'
import { createClient } from '@/lib/supabase/client'
import { 
  Tag, GraduationCap, Users, Contact, PlusCircle, Pencil, Trash2, X, Loader2, AlertCircle, School, Bookmark, Search, Folder,
  Building2, CreditCard
} from 'lucide-react'
import { CUSTOM_TAG_ICONS, type CustomTag } from '@/app/(dashboard)/students/StudentDashboardClient'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'

interface TariffOption {
  id: number
  name: string
  price: number
}

interface GeneralOption {
  id: number | string
  name: string
}

// ── Tab Configurations for Accent Systems and Visual Labels ──────────────────
const TABS_CONFIG = {
  tariff: {
    id: 'tariff',
    label: 'Tariff Options',
    subLabel: 'Pricing plans',
    description: 'Configure student pricing structures and subscription package options.',
    icon: Tag,
    colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
    activeColorClass: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
    btnBgClass: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-blue-500/20',
    addText: 'Add Tariff',
    placeholder: 'Configure tariff structures with set pricing plans.'
  },
  level: {
    id: 'level',
    label: 'Education Levels',
    subLabel: 'Academic levels',
    description: 'Configure available academic levels of study (e.g. BACHELOR, MASTER, LANGUAGE).',
    icon: GraduationCap,
    colorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30',
    activeColorClass: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
    btnBgClass: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 focus:ring-purple-500/20',
    addText: 'Add Level',
    placeholder: 'Define education levels like bachelor or master programmes.'
  },
  group: {
    id: 'group',
    label: 'Student Groups',
    subLabel: 'Cohort groups',
    description: 'Organize students into intake cohorts or study groups for bulk tracking.',
    icon: Users,
    colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
    activeColorClass: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
    btnBgClass: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 focus:ring-emerald-500/20',
    addText: 'Add Group',
    placeholder: 'Set up intake groups (e.g. 2026 SPRING) to organize student cohorts.'
  },
  lead: {
    id: 'lead',
    label: 'Lead Sources',
    subLabel: 'Marketing channels',
    description: 'Track acquisition campaigns and external platforms referring potential students.',
    icon: Contact,
    colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
    activeColorClass: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20',
    btnBgClass: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 focus:ring-amber-500/20',
    addText: 'Add Lead Source',
    placeholder: 'Trace acquisition channels like Telegram, Instagram, or referrals.'
  },
  coordinator: {
    id: 'coordinator',
    label: 'Kordinators',
    subLabel: 'Staff advisors',
    description: 'Manage counselor staff and regional advisors assigned to student dossiers.',
    icon: Users,
    colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
    activeColorClass: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20',
    btnBgClass: 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 focus:ring-rose-500/20',
    addText: 'Add Kordinator',
    placeholder: 'Register advising managers to supervise student applications.'
  },
  tag: {
    id: 'tag',
    label: 'Custom Tags',
    subLabel: 'Workflow labels',
    description: 'Manage workflow tags with colored emoji badges to mark student pipeline stages.',
    icon: Bookmark,
    colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30',
    activeColorClass: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20',
    btnBgClass: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:ring-indigo-500/20',
    addText: 'Add Custom Tag',
    placeholder: 'Define custom workflow tags to apply onto student listings.'
  },
  university: {
    id: 'university',
    label: 'Universities',
    subLabel: 'Partner institutions',
    description: 'Catalog partner universities, language academies, and global colleges.',
    icon: School,
    colorClass: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30',
    activeColorClass: 'bg-sky-500/10 text-sky-500 dark:bg-sky-500/20',
    btnBgClass: 'bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 focus:ring-sky-500/20',
    addText: 'Add University',
    placeholder: 'Register partner universities and global study academies.'
  },
  folder: {
    id: 'folder',
    label: 'Student Folders',
    subLabel: 'Workflow Folders',
    description: 'Create custom folders to organize students. Students can be reassigned between folders under quick actions.',
    icon: Folder,
    colorClass: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
    activeColorClass: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20',
    btnBgClass: 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 focus:ring-rose-500/20',
    addText: 'Add Folder',
    placeholder: 'Define custom folders (e.g. Korea Spring) to group students.'
  },
  office: {
    id: 'office',
    label: 'Office Branches',
    subLabel: 'Offices',
    description: 'Configure branch locations for client intake (e.g. Andijon, Toshkent).',
    icon: Building2,
    colorClass: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30',
    activeColorClass: 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20',
    btnBgClass: 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 focus:ring-cyan-500/20',
    addText: 'Add Office',
    placeholder: 'Define office locations for student registration.'
  },
  payment_setting: {
    id: 'payment_setting',
    label: 'Payments Settings',
    subLabel: 'Payment options',
    description: 'Configure payment methods, transaction receivers, and note templates.',
    icon: CreditCard,
    colorClass: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30',
    activeColorClass: 'bg-orange-500/10 text-orange-500 dark:bg-orange-500/20',
    btnBgClass: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 focus:ring-orange-500/20',
    addText: 'Add Option',
    placeholder: 'Configure billing parameters.'
  },
  university_status: {
    id: 'university_status',
    label: 'University Statuses',
    subLabel: 'Status stages',
    description: 'Define student pipeline statuses for university admissions (e.g. Chosen, Accepted).',
    icon: Bookmark,
    colorClass: 'text-pink-500 bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30',
    activeColorClass: 'bg-pink-500/10 text-pink-500 dark:bg-pink-500/20',
    btnBgClass: 'bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 focus:ring-pink-500/20',
    addText: 'Add Status',
    placeholder: 'Define custom progress statuses.'
  }
}

type TabType = keyof typeof TABS_CONFIG

export default function SettingsPage() {
  const supabase = createClient()
  const { fetchFilterOptions } = useStudentDashboard()

  // State for active view and filter search
  const [activeTab, setActiveTab] = useState<TabType>('tariff')
  const [searchQuery, setSearchQuery] = useState('')

  // State for options
  const [tariffs, setTariffs] = useState<TariffOption[]>([])
  const [levels, setLevels] = useState<GeneralOption[]>([])
  const [groups, setGroups] = useState<GeneralOption[]>([])
  const [leads, setLeads] = useState<GeneralOption[]>([])
  const [universities, setUniversities] = useState<GeneralOption[]>([])
  const [coordinators, setCoordinators] = useState<GeneralOption[]>([])
  const [folders, setFolders] = useState<GeneralOption[]>([])
  const [offices, setOffices] = useState<GeneralOption[]>([])
  const [paymentMethods, setPaymentMethods] = useState<GeneralOption[]>([])
  const [paymentReceivers, setPaymentReceivers] = useState<GeneralOption[]>([])
  const [paymentNoteTemplates, setPaymentNoteTemplates] = useState<GeneralOption[]>([])
  const [universityStatuses, setUniversityStatuses] = useState<{ id: number | string; name: string; color_class: string }[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const modalTransition = useCssTransition(isModalOpen, 220)
  const [modalType, setModalType] = useState<'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder' | 'office' | 'payment_method' | 'payment_receiver' | 'payment_note_template' | 'university_status'>('tariff')
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | string | null>(null)
  
  // Form values
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState<string>('')
  const [formColorClass, setFormColorClass] = useState<string>('text-blue-500')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const { profile: loggedInProfile } = useUser()

  // ── Custom Tags State ────────────────────────────────────────────────────
  const [customTagsRegistry, setCustomTagsRegistry] = useState<CustomTag[]>([])
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const tagModalTransition = useCssTransition(isTagModalOpen, 220)
  const [tagModalMode, setTagModalMode] = useState<'add' | 'edit'>('add')
  const [editingTagEntry, setEditingTagEntry] = useState<CustomTag | null>(null)
  const [tagFormName, setTagFormName] = useState('')
  const [tagFormEmoji, setTagFormEmoji] = useState(CUSTOM_TAG_ICONS[0].emoji)
  const [isTagEmojiPickerOpen, setIsTagEmojiPickerOpen] = useState(false)
  const [tagSubmitting, setTagSubmitting] = useState(false)
  const [tagModalError, setTagModalError] = useState<string | null>(null)

  // ── Custom Tags: load / save via localStorage ───────────────────────────
  useEffect(() => {
    if (!loggedInProfile) return
    try {
      const key = `customTagsRegistry_${loggedInProfile.tenant_id || 'unibridge'}`
      const saved = localStorage.getItem(key)
      if (saved) {
        setCustomTagsRegistry(JSON.parse(saved))
      } else {
        const oldSaved = localStorage.getItem('customTagsRegistry')
        if (oldSaved && (loggedInProfile.tenant_id === 'unibridge' || !loggedInProfile.tenant_id)) {
          setCustomTagsRegistry(JSON.parse(oldSaved))
          localStorage.setItem(key, oldSaved)
        } else {
          setCustomTagsRegistry([])
        }
      }
    } catch (e) {
      console.error('Failed to parse customTagsRegistry:', e)
    }
  }, [loggedInProfile])

  const persistTagRegistry = (updated: CustomTag[]) => {
    setCustomTagsRegistry(updated)
    const key = `customTagsRegistry_${(loggedInProfile && loggedInProfile.tenant_id) || 'unibridge'}`
    localStorage.setItem(key, JSON.stringify(updated))
  }

  const handleOpenAddTag = () => {
    setTagModalMode('add')
    setEditingTagEntry(null)
    setTagFormName('')
    setTagFormEmoji(CUSTOM_TAG_ICONS[0].emoji)
    setIsTagEmojiPickerOpen(false)
    setTagModalError(null)
    setIsTagModalOpen(true)
  }

  const handleOpenEditTag = (tag: CustomTag) => {
    setTagModalMode('edit')
    setEditingTagEntry(tag)
    setTagFormName(tag.name)
    setTagFormEmoji(tag.icon)
    setIsTagEmojiPickerOpen(false)
    setTagModalError(null)
    setIsTagModalOpen(true)
  }

  const handleSaveTag = async () => {
    const name = tagFormName.trim()
    if (!name) {
      setTagModalError('Tag name is required.')
      return
    }
    setTagSubmitting(true)
    setTagModalError(null)

    if (tagModalMode === 'add') {
      if (customTagsRegistry.some(t => t.name === name)) {
        setTagModalError('A tag with this name already exists.')
        setTagSubmitting(false)
        return
      }
      persistTagRegistry([...customTagsRegistry, { name, icon: tagFormEmoji }])
    } else if (tagModalMode === 'edit' && editingTagEntry) {
      const originalName = editingTagEntry.name
      const updated = customTagsRegistry.map(t =>
        t.name === originalName ? { name, icon: tagFormEmoji } : t
      )
      persistTagRegistry(updated)

      // Bulk rename in Supabase if the name changed
      if (originalName !== name) {
        const { data: affected } = await (supabase
          .from('students') as any)
          .select('id, task_tags')
          .contains('task_tags', [originalName])
        if (affected && affected.length > 0) {
          await Promise.all(affected.map(async (s: any) => {
            const newTags = (s.task_tags as string[]).map((t: string) => t === originalName ? name : t)
            await (supabase.from('students') as any)
              .update({ task_tags: newTags })
              .eq('id', s.id)
          }))
        }
      }
    }

    setTagSubmitting(false)
    setIsTagModalOpen(false)
  }

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`Delete tag "${tagName}" globally? It will be removed from all students.`)) return
    const updated = customTagsRegistry.filter(t => t.name !== tagName)
    persistTagRegistry(updated)

    // Bulk remove from Supabase
    const { data: affected } = await (supabase
      .from('students') as any)
      .select('id, task_tags')
      .contains('task_tags', [tagName])
    if (affected && affected.length > 0) {
      await Promise.all(affected.map(async (s: any) => {
        const newTags = (s.task_tags as string[]).filter((t: string) => t !== tagName)
        await (supabase.from('students') as any)
          .update({ task_tags: newTags })
          .eq('id', s.id)
      }))
    }
  }

  // ── Fetch all options on mount ────────────────────────────────────────────
  const fetchAllOptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        tariffsRes, 
        levelsRes, 
        groupsRes, 
        leadsRes, 
        universitiesRes, 
        coordinatorsRes, 
        foldersRes,
        officesRes,
        methodsRes,
        receiversRes,
        notesRes,
        statusesRes
      ] = await Promise.all([
        supabase.from('tariff_options').select('*').order('name'),
        supabase.from('education_levels').select('*').order('name'),
        supabase.from('student_groups').select('*').order('name'),
        supabase.from('lead_sources').select('*').order('name'),
        supabase.from('universities').select('*').order('name'),
        supabase.from('coordinators').select('*').order('name'),
        supabase.from('folders').select('*').order('name'),
        supabase.from('offices').select('*').order('name'),
        supabase.from('payment_methods').select('*').order('name'),
        supabase.from('payment_receivers').select('*').order('name'),
        supabase.from('payment_note_templates').select('*').order('name'),
        supabase.from('university_statuses').select('*').order('name')
      ])

      // If database tables are not set up yet, show a helpful setup banner
      if (
        (tariffsRes.error && tariffsRes.error.code === '42P01') ||
        (universitiesRes.error && universitiesRes.error.code === '42P01') ||
        (coordinatorsRes && coordinatorsRes.error && coordinatorsRes.error.code === '42P01') ||
        (foldersRes && foldersRes.error && foldersRes.error.code === '42P01') ||
        (officesRes && officesRes.error && officesRes.error.code === '42P01') ||
        (methodsRes && methodsRes.error && methodsRes.error.code === '42P01') ||
        (receiversRes && receiversRes.error && receiversRes.error.code === '42P01') ||
        (notesRes && notesRes.error && notesRes.error.code === '42P01') ||
        (statusesRes && statusesRes.error && statusesRes.error.code === '42P01')
      ) {
        throw new Error('Database tables not initialized. Please execute the settings_setup.sql and new dynamic settings SQL scripts in the Supabase SQL editor.')
      }

      if (tariffsRes.error) throw tariffsRes.error
      if (levelsRes.error) throw levelsRes.error
      if (groupsRes.error) throw groupsRes.error
      if (leadsRes.error) throw leadsRes.error
      if (universitiesRes.error) throw universitiesRes.error
      if (coordinatorsRes.error) throw coordinatorsRes.error
      if (foldersRes.error) throw foldersRes.error
      if (officesRes.error) throw officesRes.error
      if (methodsRes.error) throw methodsRes.error
      if (receiversRes.error) throw receiversRes.error
      if (notesRes.error) throw notesRes.error
      if (statusesRes.error) throw statusesRes.error

      setTariffs(tariffsRes.data || [])
      setLevels(levelsRes.data || [])
      setGroups(groupsRes.data || [])
      setLeads(leadsRes.data || [])
      setUniversities(universitiesRes.data || [])
      setCoordinators(coordinatorsRes.data || [])
      setFolders(foldersRes.data || [])
      setOffices(officesRes.data || [])
      setPaymentMethods(methodsRes.data || [])
      setPaymentReceivers(receiversRes.data || [])
      setPaymentNoteTemplates(notesRes.data || [])
      setUniversityStatuses(statusesRes.data || [])
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(err.message || 'Failed to load settings from Supabase. Ensure tables are created.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Format currency
  const formatCurrency = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' UZS'
  }

  // Open modal for adding
  const handleOpenAdd = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder' | 'office' | 'payment_method' | 'payment_receiver' | 'payment_note_template' | 'university_status') => {
    setModalType(type)
    setModalMode('add')
    setEditingId(null)
    setFormName('')
    setFormPrice('')
    setFormColorClass('text-blue-500')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder' | 'office' | 'payment_method' | 'payment_receiver' | 'payment_note_template' | 'university_status', item: any) => {
    setModalType(type)
    setModalMode('edit')
    setEditingId(item.id)
    setFormName(item.name)
    setFormPrice(type === 'tariff' ? String(item.price) : '')
    setFormColorClass(type === 'university_status' ? (item.color_class || 'text-blue-500') : 'text-blue-500')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder' | 'office' | 'payment_method' | 'payment_receiver' | 'payment_note_template' | 'university_status', id: number | string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      let table = ''
      if (type === 'tariff') table = 'tariff_options'
      else if (type === 'level') table = 'education_levels'
      else if (type === 'group') table = 'student_groups'
      else if (type === 'lead') table = 'lead_sources'
      else if (type === 'university') table = 'universities'
      else if (type === 'coordinator') table = 'coordinators'
      else if (type === 'folder') table = 'folders'
      else if (type === 'office') table = 'offices'
      else if (type === 'payment_method') table = 'payment_methods'
      else if (type === 'payment_receiver') table = 'payment_receivers'
      else if (type === 'payment_note_template') table = 'payment_note_templates'
      else if (type === 'university_status') table = 'university_statuses'

      const { error: deleteError } = await (supabase
        .from(table) as any)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchAllOptions()
      fetchFilterOptions()
    } catch (err: any) {
      console.error('Error deleting item:', err)
      alert(err.message || 'Failed to delete item.')
    }
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)

    if (!formName.trim()) {
      setModalError('Name is required.')
      setSubmitting(false)
      return
    }

    try {
      let table = ''
      if (modalType === 'tariff') table = 'tariff_options'
      else if (modalType === 'level') table = 'education_levels'
      else if (modalType === 'group') table = 'student_groups'
      else if (modalType === 'lead') table = 'lead_sources'
      else if (modalType === 'university') table = 'universities'
      else if (modalType === 'coordinator') table = 'coordinators'
      else if (modalType === 'folder') table = 'folders'
      else if (modalType === 'office') table = 'offices'
      else if (modalType === 'payment_method') table = 'payment_methods'
      else if (modalType === 'payment_receiver') table = 'payment_receivers'
      else if (modalType === 'payment_note_template') table = 'payment_note_templates'
      else if (modalType === 'university_status') table = 'university_statuses'

      let payload: any = { name: formName.trim() }
      if (modalType === 'tariff') {
        const parsedPrice = Number(formPrice.replace(/[^0-9.-]+/g, ''))
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          throw new Error('Price must be a positive number.')
        }
        payload.price = parsedPrice
      } else if (modalType === 'university_status') {
        payload.color_class = formColorClass
      }

      if (modalMode === 'add') {
        const { error: insertError } = await (supabase
          .from(table) as any)
          .insert(payload)

        if (insertError) {
          if (insertError.code === '23505') throw new Error('An item with this name already exists.')
          throw insertError
        }
      } else {
        const { error: updateError } = await (supabase
          .from(table) as any)
          .update(payload)
          .eq('id', editingId)

        if (updateError) {
          if (updateError.code === '23505') throw new Error('An item with this name already exists.')
          throw updateError
        }
      }

      setIsModalOpen(false)
      await fetchAllOptions()
      fetchFilterOptions()
    } catch (err: any) {
      console.error('Error saving settings item:', err)
      setModalError(err.message || 'Failed to save item.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Search & Filter Logic ────────────────────────────────────────────────
  const query = searchQuery.trim().toLowerCase()
  const filteredTariffs = tariffs.filter(t => t.name.toLowerCase().includes(query))
  const filteredLevels = levels.filter(l => l.name.toLowerCase().includes(query))
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(query))
  const filteredLeads = leads.filter(l => l.name.toLowerCase().includes(query))
  const filteredCoordinators = coordinators.filter(c => c.name.toLowerCase().includes(query))
  const filteredTags = customTagsRegistry.filter(t => t.name.toLowerCase().includes(query))
  const filteredUniversities = universities.filter(u => u.name.toLowerCase().includes(query))
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(query))
  const filteredOffices = offices.filter(o => o.name.toLowerCase().includes(query))
  const filteredPaymentMethods = paymentMethods.filter(pm => pm.name.toLowerCase().includes(query))
  const filteredPaymentReceivers = paymentReceivers.filter(pr => pr.name.toLowerCase().includes(query))
  const filteredPaymentNoteTemplates = paymentNoteTemplates.filter(pnt => pnt.name.toLowerCase().includes(query))
  const filteredUniversityStatuses = universityStatuses.filter(us => us.name.toLowerCase().includes(query))

  // ── Sub-component Renderers ──────────────────────────────────────────────
  const renderTariffRow = (item: TariffOption) => (
    <div
      key={item.id}
      className="animate-page-in group flex items-center justify-between gap-3 p-2 px-3.5 bg-surface border border-border hover:border-blue-400 dark:hover:border-blue-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="min-w-0">
        <div className="text-xs font-bold text-foreground uppercase tracking-wide truncate">{item.name}</div>
        <div className="inline-flex items-center gap-1 mt-0.5 text-[9.5px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 rounded">
          {formatCurrency(item.price)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEdit('tariff', item)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-650 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleDelete('tariff', item.id, item.name)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-655 transition-all cursor-pointer bg-transparent"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )

  const renderGeneralRow = (item: GeneralOption, type: 'level' | 'group' | 'lead' | 'coordinator' | 'folder' | 'office') => {
    const config = TABS_CONFIG[type]
    return (
      <div
        key={item.id}
        className="animate-page-in group flex items-center justify-between gap-3 p-2 px-3.5 bg-surface border border-border hover:border-accent/40 rounded-lg shadow-sm hover:shadow transition-all duration-200"
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-transparent ${config.colorClass}`}>
            <config.icon className="h-3.5 w-3.5" />
          </div>
          <div className={`text-xs font-bold text-foreground truncate ${type !== 'lead' && type !== 'coordinator' ? 'uppercase tracking-wide' : ''}`}>
            {item.name}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleOpenEdit(type, item)}
            className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-650 transition-all cursor-pointer bg-transparent"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleDelete(type, item.id, item.name)}
            className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-655 transition-all cursor-pointer bg-transparent"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    )
  }

  const renderTagRow = (tag: CustomTag) => (
    <div
      key={tag.name}
      className="animate-page-in group flex items-center justify-between gap-3 p-2 px-3.5 bg-surface border border-border hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-base shrink-0 leading-none">
          {tag.icon}
        </div>
        <span className="text-xs font-bold text-foreground truncate">{tag.name}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEditTag(tag)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-650 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleDeleteTag(tag.name)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-655 transition-all cursor-pointer bg-transparent"
          title="Delete globally"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )

  const renderUniversityRow = (item: GeneralOption) => (
    <div
      key={item.id}
      className="animate-page-in group flex items-center justify-between gap-3 p-2 px-3.5 bg-surface border border-border hover:border-sky-400 dark:hover:border-sky-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 flex items-center justify-center text-sky-500 shrink-0">
          <School className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs font-bold text-foreground uppercase truncate tracking-wide" title={item.name}>
          {item.name}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEdit('university', item)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-650 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleDelete('university', item.id, item.name)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-655 transition-all cursor-pointer bg-transparent"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )

  const renderUniversityStatusRow = (item: { id: number | string; name: string; color_class: string }) => (
    <div
      key={item.id}
      className="animate-page-in group flex items-center justify-between gap-3 p-2 px-3.5 bg-surface border border-border hover:border-pink-400 dark:hover:border-pink-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`h-2 w-2 rounded-full bg-current shrink-0 ${item.color_class || 'text-blue-500'}`} />
        <div className="text-xs font-bold text-foreground truncate uppercase tracking-wide">
          {item.name}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEdit('university_status', item)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-650 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleDelete('university_status', item.id, item.name)}
          className="w-7 h-7 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-655 transition-all cursor-pointer bg-transparent"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )

  const renderActiveTabContent = () => {
    const config = TABS_CONFIG[activeTab]
    const Icon = config.icon

    if (activeTab === 'payment_setting') {
      return (
        <div className="flex flex-col flex-1 h-full">
          {/* Section Header */}
          <div className="border-b border-border pb-5 mb-5 flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${config.colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">{config.label}</h3>
              <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed max-w-xl">{config.description}</p>
            </div>
          </div>

          {/* Three-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Column 1: Payment Methods */}
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Payment Methods</span>
                <button
                  onClick={() => handleOpenAdd('payment_method')}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-500 hover:text-orange-600 bg-transparent border-none cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                {filteredPaymentMethods.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-surface-elevated border border-border rounded-lg text-xs font-semibold group">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleOpenEdit('payment_method', item)} className="p-1 text-blue-500 hover:text-blue-650 cursor-pointer bg-transparent border-none"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete('payment_method', item.id, item.name)} className="p-1 text-red-500 hover:text-red-650 cursor-pointer bg-transparent border-none"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                {filteredPaymentMethods.length === 0 && <div className="text-center py-6 text-[10.5px] text-foreground-subtle italic">No payment methods configured.</div>}
              </div>
            </div>

            {/* Column 2: Payment Receivers */}
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Payment Receivers</span>
                <button
                  onClick={() => handleOpenAdd('payment_receiver')}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-500 hover:text-orange-600 bg-transparent border-none cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                {filteredPaymentReceivers.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-surface-elevated border border-border rounded-lg text-xs font-semibold group">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleOpenEdit('payment_receiver', item)} className="p-1 text-blue-500 hover:text-blue-650 cursor-pointer bg-transparent border-none"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete('payment_receiver', item.id, item.name)} className="p-1 text-red-500 hover:text-red-650 cursor-pointer bg-transparent border-none"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                {filteredPaymentReceivers.length === 0 && <div className="text-center py-6 text-[10.5px] text-foreground-subtle italic">No payment receivers configured.</div>}
              </div>
            </div>

            {/* Column 3: Payment Note Templates */}
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">Quick Note Templates</span>
                <button
                  onClick={() => handleOpenAdd('payment_note_template')}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-500 hover:text-orange-600 bg-transparent border-none cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                {filteredPaymentNoteTemplates.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-surface-elevated border border-border rounded-lg text-xs font-semibold group">
                    <span className="truncate max-w-[140px]" title={item.name}>{item.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleOpenEdit('payment_note_template', item)} className="p-1 text-blue-500 hover:text-blue-650 cursor-pointer bg-transparent border-none"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete('payment_note_template', item.id, item.name)} className="p-1 text-red-500 hover:text-red-650 cursor-pointer bg-transparent border-none"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                {filteredPaymentNoteTemplates.length === 0 && <div className="text-center py-6 text-[10.5px] text-foreground-subtle italic">No note templates configured.</div>}
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Determine target lists and actions dynamically
    let itemsCount = 0
    let filteredCount = 0
    let handleAddAction = () => {}
    
    if (activeTab === 'tariff') {
      itemsCount = tariffs.length
      filteredCount = filteredTariffs.length
      handleAddAction = () => handleOpenAdd('tariff')
    } else if (activeTab === 'level') {
      itemsCount = levels.length
      filteredCount = filteredLevels.length
      handleAddAction = () => handleOpenAdd('level')
    } else if (activeTab === 'group') {
      itemsCount = groups.length
      filteredCount = filteredGroups.length
      handleAddAction = () => handleOpenAdd('group')
    } else if (activeTab === 'lead') {
      itemsCount = leads.length
      filteredCount = filteredLeads.length
      handleAddAction = () => handleOpenAdd('lead')
    } else if (activeTab === 'coordinator') {
      itemsCount = coordinators.length
      filteredCount = filteredCoordinators.length
      handleAddAction = () => handleOpenAdd('coordinator')
    } else if (activeTab === 'tag') {
      itemsCount = customTagsRegistry.length
      filteredCount = filteredTags.length
      handleAddAction = handleOpenAddTag
    } else if (activeTab === 'university') {
      itemsCount = universities.length
      filteredCount = filteredUniversities.length
      handleAddAction = () => handleOpenAdd('university')
    } else if (activeTab === 'folder') {
      itemsCount = folders.length
      filteredCount = filteredFolders.length
      handleAddAction = () => handleOpenAdd('folder')
    } else if (activeTab === 'office') {
      itemsCount = offices.length
      filteredCount = filteredOffices.length
      handleAddAction = () => handleOpenAdd('office')
    } else if (activeTab === 'university_status') {
      itemsCount = universityStatuses.length
      filteredCount = filteredUniversityStatuses.length
      handleAddAction = () => handleOpenAdd('university_status')
    }

    // Specially handle pagination/limit slice for universities list
    const displayedUniversities = searchQuery.trim()
      ? filteredUniversities
      : (isExpanded ? filteredUniversities : filteredUniversities.slice(0, 12))

    return (
      <div className="flex flex-col flex-1 h-full">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5 mb-5">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${config.colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-foreground leading-tight">{config.label}</h3>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-border-subtle border border-border text-foreground-muted rounded-full">
                  {itemsCount} items
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed max-w-xl">{config.description}</p>
            </div>
          </div>
          <button
            onClick={handleAddAction}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.96] shadow-sm hover:shadow cursor-pointer select-none border-none hover:scale-[1.02] shrink-0 self-start sm:self-center ${config.btnBgClass}`}
          >
            <PlusCircle className="h-4 w-4" />
            {config.addText}
          </button>
        </div>

        {/* Search Bar filter */}
        {itemsCount > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
            <input
              type="text"
              placeholder={`Search ${config.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-border rounded-lg bg-surface text-foreground font-semibold text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground p-0.5 rounded-full hover:bg-border-subtle cursor-pointer border-none bg-transparent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic List Content */}
        <div className="flex-1">
            {itemsCount === 0 ? (
              <div className="animate-page-in flex flex-col items-center justify-center py-20 text-center px-4">
                <div className={`p-4 rounded-full border mb-4 ${config.colorClass}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-bold text-foreground">No Items Found</h4>
                <p className="text-xs text-foreground-muted mt-1.5 max-w-[280px] leading-normal">{config.placeholder}</p>
                <button
                  onClick={handleAddAction}
                  className="mt-4.5 inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-xs font-bold py-1.5 px-3 rounded-md hover:bg-accent/15 border border-transparent transition-all cursor-pointer bg-transparent"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add First Item
                </button>
              </div>
            ) : filteredCount === 0 ? (
              <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="p-3 bg-border-subtle text-foreground-subtle rounded-full mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-foreground">No matches for &quot;{searchQuery}&quot;</h4>
                <p className="text-[10px] text-foreground-subtle mt-0.5">Try refining your search terms or clear the filter.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3.5 text-xs text-accent hover:underline font-semibold cursor-pointer border-none bg-transparent"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div
                  className={`grid gap-2 ${['university', 'tariff', 'lead', 'tag', 'folder', 'office', 'university_status'].includes(activeTab) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
                >
                  {activeTab === 'tariff' && filteredTariffs.map(item => renderTariffRow(item))}
                  {activeTab === 'level' && filteredLevels.map(item => renderGeneralRow(item, 'level'))}
                  {activeTab === 'group' && filteredGroups.map(item => renderGeneralRow(item, 'group'))}
                  {activeTab === 'lead' && filteredLeads.map(item => renderGeneralRow(item, 'lead'))}
                  {activeTab === 'coordinator' && filteredCoordinators.map(item => renderGeneralRow(item, 'coordinator'))}
                  {activeTab === 'tag' && filteredTags.map(item => renderTagRow(item))}
                  {activeTab === 'university' && displayedUniversities.map(item => renderUniversityRow(item))}
                  {activeTab === 'folder' && filteredFolders.map(item => renderGeneralRow(item, 'folder'))}
                  {activeTab === 'office' && filteredOffices.map(item => renderGeneralRow(item, 'office'))}
                  {activeTab === 'university_status' && filteredUniversityStatuses.map(item => renderUniversityStatusRow(item))}
                </div>

                {/* Universities pagination footer */}
                {activeTab === 'university' && filteredUniversities.length > 12 && !searchQuery.trim() && (
                  <div className="mt-6 pt-4 border-t border-border flex justify-center">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover font-bold text-xs py-2 px-4 rounded-full border border-border bg-surface hover:bg-surface-hover transition-all cursor-pointer select-none"
                    >
                      {isExpanded ? (
                        <>Show Less</>
                      ) : (
                        <>Show All ({filteredUniversities.length} Universities)</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    )
  }

  return (
    <PageShell
      title="Settings"
      description="Configure workspace parameters: tariffs, education levels, groups, coordinators, tags, and universities."
    >
      <div className="flex flex-col gap-5">
        {/* Setup instruction banner if database tables are missing */}
        {error && error.includes('Database tables not initialized') && (
          <div className="rounded-xl border border-[var(--warning)] bg-surface p-5 text-left flex gap-3.5 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="h-6 w-6 text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Database Setup Required</h4>
              <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
                Settings dynamic options are stored in separate Supabase tables. To enable this features, execute the setup SQL scripts in your Supabase Dashboard:
              </p>
              <div className="mt-3.5 flex items-center gap-3">
                <code className="text-[10px] bg-border-subtle px-2 py-1 rounded font-mono border border-border select-all">
                  supabase/settings_setup.sql
                </code>
                <span className="text-xs text-foreground-subtle">file created in your repository.</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex py-32 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm font-semibold text-foreground-muted">Loading settings registry...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar Navigation - Sticky on desktop */}
            <div className="lg:col-span-1 flex flex-col gap-1 bg-surface-elevated border border-border rounded-xl p-2.5 shadow-sm lg:sticky lg:top-4 overflow-hidden">
              <div className="px-2 py-1 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-900/60 dark:text-blue-200/50">Configuration Settings</span>
              </div>
              
              {/* Sidebar Tabs List */}
              <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-0.5 scrollbar-none">
                {Object.values(TABS_CONFIG).map((tab) => {
                  const isActive = activeTab === tab.id
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as TabType)
                        setSearchQuery('')
                      }}
                      className={`flex items-center gap-2.5 text-left px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none shrink-0 lg:shrink border ${
                        isActive
                          ? 'bg-surface-interactive border-accent/20 text-accent font-bold shadow-sm'
                          : 'hover:bg-surface-hover text-blue-900/80 dark:text-blue-200/80 hover:text-blue-600 dark:hover:text-blue-400 border-transparent'
                      }`}
                    >
                      <div className={`p-1 rounded-md shrink-0 transition-colors ${
                        isActive ? tab.activeColorClass : 'bg-border-subtle text-blue-950/45 dark:text-blue-300/40'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 pr-1 hidden sm:block lg:block">
                        <div className={`text-xs font-bold leading-none ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-blue-900/85 dark:text-blue-200/85'}`}>{tab.label}</div>
                        <div className="text-[9px] text-blue-950/50 dark:text-blue-300/40 leading-none mt-1 truncate max-w-[130px]">{tab.subLabel}</div>
                      </div>
                      <div className="sm:hidden text-xs font-bold shrink-0">{tab.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Active Panel Card */}
            <div className="lg:col-span-3 bg-surface-elevated border border-border rounded-xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
              {renderActiveTabContent()}
            </div>
          </div>
        )}
      </div>

      {/* ── Custom Tag Add / Edit Modal ────────────────────────────────── */}
      {tagModalTransition.shouldRender && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => { if (!tagSubmitting) setIsTagModalOpen(false) }}
              className={cn(
                'fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out',
                tagModalTransition.isVisible ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div
              className={cn(
                'relative w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-surface-elevated p-6 shadow-2xl z-10 glass',
                'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                tagModalTransition.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
              )}
            >
              <button
                disabled={tagSubmitting}
                onClick={() => setIsTagModalOpen(false)}
                className="absolute right-4 top-4 rounded-md p-1.5 text-foreground-muted hover:bg-border-subtle hover:text-foreground cursor-pointer bg-transparent border-none"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">
                {tagModalMode === 'add' ? 'Create' : 'Edit'} Custom Tag
              </h2>
              <p className="text-[10px] text-foreground-muted mb-5">
                Pick a workflow emoji icon and define a descriptor name.
              </p>

              {tagModalError && (
                <div className="mb-4.5 flex items-start gap-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-xs text-rose-800 dark:text-rose-350">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-tight">{tagModalError}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Form Tag inputs */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsTagEmojiPickerOpen(v => !v)}
                    className="w-12 h-12 shrink-0 rounded-lg border border-border bg-surface flex items-center justify-center text-xl cursor-pointer hover:bg-surface-hover hover:border-accent/40 transition-all shadow-sm"
                    title="Select emoji"
                  >
                    {tagFormEmoji}
                  </button>
                  <input
                    type="text"
                    autoFocus
                    disabled={tagSubmitting}
                    placeholder="Tag Name (e.g. URGENT, PAID)"
                    value={tagFormName}
                    onChange={(e) => setTagFormName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTag() }}
                    className="flex-1 h-12 px-3.5 border border-border rounded-lg bg-surface text-foreground font-semibold text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-foreground-subtle"
                  />
                </div>

                {/* Grid Emoji selector */}
                {isTagEmojiPickerOpen && (
                  <div
                    className="grid gap-1.5 border border-border bg-surface rounded-lg p-3 shadow-inner animate-in fade-in zoom-in duration-100 max-h-48 overflow-y-auto"
                    style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
                  >
                    {CUSTOM_TAG_ICONS.map((icon) => {
                      const isSelected = tagFormEmoji === icon.emoji
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => {
                            setTagFormEmoji(icon.emoji)
                            setIsTagEmojiPickerOpen(false)
                          }}
                          title={icon.label}
                          className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg cursor-pointer transition-all select-none border-none ${
                            isSelected
                              ? 'bg-accent text-white ring-2 ring-accent/30 ring-offset-2 ring-offset-surface scale-105'
                              : 'hover:bg-surface-hover hover:scale-105 text-foreground bg-transparent'
                          }`}
                        >
                          <span className="text-lg leading-none">{icon.emoji}</span>
                          <span className={`text-[7px] font-semibold leading-tight text-center truncate w-full ${
                            isSelected ? 'text-white' : 'text-foreground-muted'
                          }`} style={{ maxWidth: 36 }}>{icon.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={tagSubmitting}
                    onClick={() => setIsTagModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground text-xs font-bold active:scale-[0.96] transition-transform cursor-pointer"
                  >
                    Cancel
                  </button>
                   <button
                    onClick={handleSaveTag}
                    disabled={tagSubmitting}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg active:scale-[0.96] transition-transform cursor-pointer select-none border-none"
                  >
                    {tagSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {tagModalMode === 'add' ? 'Create Tag' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Add / Edit General Registry Options Modal */}
      {modalTransition.shouldRender && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => { if (!submitting) setIsModalOpen(false) }}
              className={cn(
                'fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out',
                modalTransition.isVisible ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div
              className={cn(
                'relative w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-surface-elevated p-6 shadow-2xl z-10 glass',
                'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                modalTransition.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
              )}
            >
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-md p-1.5 text-foreground-muted hover:bg-border-subtle hover:text-foreground cursor-pointer bg-transparent border-none"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">
                {modalMode === 'add' ? 'Add New' : 'Edit'} {modalType === 'tariff' ? 'Tariff' : modalType === 'level' ? 'Education Level' : modalType === 'group' ? 'Student Group' : modalType === 'lead' ? 'Lead Source' : modalType === 'university' ? 'University' : modalType === 'folder' ? 'Student Folder' : modalType === 'office' ? 'Office Branch' : modalType === 'payment_method' ? 'Payment Method' : modalType === 'payment_receiver' ? 'Payment Receiver' : modalType === 'payment_note_template' ? 'Note Template' : modalType === 'university_status' ? 'University Status' : 'Kordinator'}
              </h2>
              <p className="text-[10px] text-foreground-muted mb-5">
                Configure parameter descriptors for this workspace registry.
              </p>

              {modalError && (
                <div className="mb-4.5 flex items-start gap-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-xs text-rose-800 dark:text-rose-350">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-tight">{modalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier Name field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-1.5">
                    Name / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    placeholder={modalType === 'tariff' ? 'E-VISA (TIL SERTIFIKATISIZ)' : modalType === 'level' ? 'BACHELOR' : modalType === 'group' ? '2026 BAHOR' : modalType === 'university' ? 'AJOU UNIVERSITY (SUWON, GYEONGGI)' : modalType === 'coordinator' ? 'Kordinator Name' : modalType === 'folder' ? 'Korea Spring' : modalType === 'office' ? 'Office Location' : modalType === 'payment_method' ? 'Karta J.A' : modalType === 'payment_receiver' ? 'ABDULAZIZ' : modalType === 'payment_note_template' ? 'Shartnoma uchun' : modalType === 'university_status' ? 'Chosen' : 'SeoulStudy'}
                    value={formName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isMixed = ['lead', 'coordinator', 'folder', 'payment_note_template', 'university_status'].includes(modalType)
                      setFormName(isMixed ? val : val.toUpperCase());
                    }}
                    className={`w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-semibold text-xs tracking-wide placeholder:text-foreground-subtle ${!['lead', 'coordinator', 'folder', 'payment_note_template', 'university_status'].includes(modalType) ? 'uppercase' : ''}`}
                  />
                </div>

                {/* Color class dropdown (University Statuses only) */}
                {modalType === 'university_status' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-1.5">
                      Badge Color
                    </label>
                    <select
                      value={formColorClass}
                      onChange={(e) => setFormColorClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-semibold text-xs tracking-wide cursor-pointer"
                    >
                      <option value="text-blue-500">Blue</option>
                      <option value="text-amber-500">Amber (Yellow)</option>
                      <option value="text-emerald-500">Emerald (Green)</option>
                      <option value="text-rose-500">Rose (Red)</option>
                      <option value="text-indigo-500">Indigo</option>
                      <option value="text-purple-500">Purple</option>
                      <option value="text-pink-500">Pink</option>
                      <option value="text-cyan-500">Cyan</option>
                    </select>
                  </div>
                )}
                {modalType === 'tariff' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted mb-1.5">
                      Price (UZS)
                    </label>
                    <input
                      type="number"
                      required
                      disabled={submitting}
                      placeholder="24000000"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-semibold text-xs tracking-wider"
                    />
                  </div>
                )}

                {/* Actions submit */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground text-xs font-bold active:scale-[0.96] transition-transform cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg active:scale-[0.96] transition-transform cursor-pointer select-none border-none"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {modalMode === 'add' ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}
    </PageShell>
  )
}
