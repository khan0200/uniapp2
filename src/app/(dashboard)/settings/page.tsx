'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageShell } from '@/components/ui/PageShell'
import { createClient } from '@/lib/supabase/client'
import { 
  Tag, GraduationCap, Users, Contact, PlusCircle, Pencil, Trash2, X, Loader2, AlertCircle, School, Bookmark, Search, Folder
} from 'lucide-react'
import { CUSTOM_TAG_ICONS, type CustomTag } from '@/app/(dashboard)/students/StudentDashboardClient'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'

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
  const [isExpanded, setIsExpanded] = useState(false)

  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder'>('tariff')
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | string | null>(null)
  
  // Form values
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // ── Custom Tags State ────────────────────────────────────────────────────
  const [customTagsRegistry, setCustomTagsRegistry] = useState<CustomTag[]>([])
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [tagModalMode, setTagModalMode] = useState<'add' | 'edit'>('add')
  const [editingTagEntry, setEditingTagEntry] = useState<CustomTag | null>(null)
  const [tagFormName, setTagFormName] = useState('')
  const [tagFormEmoji, setTagFormEmoji] = useState(CUSTOM_TAG_ICONS[0].emoji)
  const [isTagEmojiPickerOpen, setIsTagEmojiPickerOpen] = useState(false)
  const [tagSubmitting, setTagSubmitting] = useState(false)
  const [tagModalError, setTagModalError] = useState<string | null>(null)

  // ── Custom Tags: load / save via localStorage ───────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customTagsRegistry')
      if (saved) setCustomTagsRegistry(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to parse customTagsRegistry:', e)
    }
  }, [])

  const persistTagRegistry = (updated: CustomTag[]) => {
    setCustomTagsRegistry(updated)
    localStorage.setItem('customTagsRegistry', JSON.stringify(updated))
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

      const [tariffsRes, levelsRes, groupsRes, leadsRes, universitiesRes, coordinatorsRes, foldersRes] = await Promise.all([
        supabase.from('tariff_options').select('*').order('name'),
        supabase.from('education_levels').select('*').order('name'),
        supabase.from('student_groups').select('*').order('name'),
        supabase.from('lead_sources').select('*').order('name'),
        supabase.from('universities').select('*').order('name'),
        supabase.from('coordinators').select('*').order('name'),
        supabase.from('folders').select('*').order('name')
      ])

      // If database tables are not set up yet, show a helpful setup banner
      if (
        (tariffsRes.error && tariffsRes.error.code === '42P01') ||
        (universitiesRes.error && universitiesRes.error.code === '42P01') ||
        (coordinatorsRes && coordinatorsRes.error && coordinatorsRes.error.code === '42P01') ||
        (foldersRes && foldersRes.error && foldersRes.error.code === '42P01')
      ) {
        throw new Error('Database tables not initialized. Please execute the settings_setup.sql, add_coordinator.sql, and add_folders.sql scripts in the Supabase SQL editor.')
      }

      if (tariffsRes.error) throw tariffsRes.error
      if (levelsRes.error) throw levelsRes.error
      if (groupsRes.error) throw groupsRes.error
      if (leadsRes.error) throw leadsRes.error
      if (universitiesRes.error) throw universitiesRes.error
      if (coordinatorsRes.error) throw coordinatorsRes.error

      setTariffs(tariffsRes.data || [])
      setLevels(levelsRes.data || [])
      setGroups(groupsRes.data || [])
      setLeads(leadsRes.data || [])
      setUniversities(universitiesRes.data || [])
      setCoordinators(coordinatorsRes.data || [])
      setFolders(foldersRes.data || [])
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(err.message || 'Failed to load settings from Supabase. Ensure tables are created.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllOptions()
  }, [])

  // Format currency
  const formatCurrency = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' UZS'
  }

  // Open modal for adding
  const handleOpenAdd = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder') => {
    setModalType(type)
    setModalMode('add')
    setEditingId(null)
    setFormName('')
    setFormPrice('')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder', item: any) => {
    setModalType(type)
    setModalMode('edit')
    setEditingId(item.id)
    setFormName(item.name)
    setFormPrice(type === 'tariff' ? String(item.price) : '')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator' | 'folder', id: number | string, name: string) => {
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

      const { error: deleteError } = await (supabase
        .from(table) as any)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchAllOptions()
      if (type === 'folder') {
        fetchFilterOptions()
      }
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

      let payload: any = { name: formName.trim() }
      if (modalType === 'tariff') {
        const parsedPrice = Number(formPrice.replace(/[^0-9.-]+/g, ''))
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          throw new Error('Price must be a positive number.')
        }
        payload.price = parsedPrice
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
      if (modalType === 'folder') {
        fetchFilterOptions()
      }
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

  // ── Sub-component Renderers ──────────────────────────────────────────────
  const renderTariffRow = (item: TariffOption) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={item.id}
      className="group flex items-center justify-between gap-3 p-4 bg-surface border border-border hover:border-blue-400 dark:hover:border-blue-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="min-w-0">
        <div className="text-xs font-bold text-foreground uppercase tracking-wide truncate">{item.name}</div>
        <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 rounded">
          {formatCurrency(item.price)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEdit('tariff', item)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleDelete('tariff', item.id, item.name)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-650 transition-all cursor-pointer bg-transparent"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )

  const renderGeneralRow = (item: GeneralOption, type: 'level' | 'group' | 'lead' | 'coordinator' | 'folder') => {
    const config = TABS_CONFIG[type]
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        key={item.id}
        className="group flex items-center justify-between gap-3 p-4 bg-surface border border-border hover:border-accent/40 rounded-lg shadow-sm hover:shadow transition-all duration-200"
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-transparent ${config.colorClass}`}>
            <config.icon className="h-4 w-4" />
          </div>
          <div className={`text-xs font-bold text-foreground truncate ${type !== 'lead' && type !== 'coordinator' ? 'uppercase tracking-wide' : ''}`}>
            {item.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleOpenEdit(type, item)}
            className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer bg-transparent"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(type, item.id, item.name)}
            className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-650 transition-all cursor-pointer bg-transparent"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    )
  }

  const renderTagRow = (tag: CustomTag) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={tag.name}
      className="group flex items-center justify-between gap-3 p-4 bg-surface border border-border hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-xl shrink-0 leading-none">
          {tag.icon}
        </div>
        <span className="text-xs font-bold text-foreground truncate">{tag.name}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEditTag(tag)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleDeleteTag(tag.name)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-650 transition-all cursor-pointer bg-transparent"
          title="Delete globally"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )

  const renderUniversityRow = (item: GeneralOption) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={item.id}
      className="group flex items-center justify-between gap-3 p-4 bg-surface border border-border hover:border-sky-400 dark:hover:border-sky-500/50 rounded-lg shadow-sm hover:shadow transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 flex items-center justify-center text-sky-500 shrink-0">
          <School className="h-4.5 w-4.5" />
        </div>
        <div className="text-xs font-bold text-foreground uppercase truncate tracking-wide" title={item.name}>
          {item.name}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => handleOpenEdit('university', item)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer bg-transparent"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleDelete('university', item.id, item.name)}
          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-surface-hover rounded-md text-red-500 hover:text-red-650 transition-all cursor-pointer bg-transparent"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )

  const renderActiveTabContent = () => {
    const config = TABS_CONFIG[activeTab]
    const Icon = config.icon
    
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
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleAddAction}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow cursor-pointer select-none border-none hover:scale-[1.02] shrink-0 self-start sm:self-center ${config.btnBgClass}`}
          >
            <PlusCircle className="h-4 w-4" />
            {config.addText}
          </motion.button>
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
          <AnimatePresence mode="popLayout">
            {itemsCount === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 text-center px-4"
              >
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
              </motion.div>
            ) : filteredCount === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center px-4"
              >
                <div className="p-3 bg-border-subtle text-foreground-subtle rounded-full mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-foreground">No matches for "{searchQuery}"</h4>
                <p className="text-[10px] text-foreground-subtle mt-0.5">Try refining your search terms or clear the filter.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3.5 text-xs text-accent hover:underline font-semibold cursor-pointer border-none bg-transparent"
                >
                  Clear search
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <motion.div
                  layout
                  className={`grid gap-3 ${['university', 'tariff', 'lead', 'tag', 'folder'].includes(activeTab) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
                >
                  {activeTab === 'tariff' && filteredTariffs.map(item => renderTariffRow(item))}
                  {activeTab === 'level' && filteredLevels.map(item => renderGeneralRow(item, 'level'))}
                  {activeTab === 'group' && filteredGroups.map(item => renderGeneralRow(item, 'group'))}
                  {activeTab === 'lead' && filteredLeads.map(item => renderGeneralRow(item, 'lead'))}
                  {activeTab === 'coordinator' && filteredCoordinators.map(item => renderGeneralRow(item, 'coordinator'))}
                  {activeTab === 'tag' && filteredTags.map(item => renderTagRow(item))}
                  {activeTab === 'university' && displayedUniversities.map(item => renderUniversityRow(item))}
                  {activeTab === 'folder' && filteredFolders.map(item => renderGeneralRow(item, 'folder'))}
                </motion.div>

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
          </AnimatePresence>
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
            <div className="lg:col-span-1 flex flex-col gap-1.5 bg-surface-elevated border border-border rounded-xl p-3 shadow-sm lg:sticky lg:top-4 overflow-hidden">
              <div className="px-2.5 py-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-subtle">Configuration Settings</span>
              </div>
              
              {/* Sidebar Tabs List */}
              <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2.5 lg:pb-0 gap-1 scrollbar-none">
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
                      className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer select-none shrink-0 lg:shrink border ${
                        isActive
                          ? 'bg-surface-interactive border-accent/20 text-accent font-semibold shadow-sm'
                          : 'hover:bg-surface-hover text-foreground-muted hover:text-foreground border-transparent'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md shrink-0 transition-colors ${
                        isActive ? tab.activeColorClass : 'bg-border-subtle text-foreground-subtle'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 pr-1 hidden sm:block lg:block">
                        <div className="text-xs font-bold leading-none">{tab.label}</div>
                        <div className="text-[9px] text-foreground-subtle leading-none mt-1 truncate max-w-[130px]">{tab.subLabel}</div>
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
      <AnimatePresence>
        {isTagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!tagSubmitting) setIsTagModalOpen(false) }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-surface-elevated p-6 shadow-2xl z-10 glass"
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
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    disabled={tagSubmitting}
                    onClick={() => setIsTagModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSaveTag}
                    disabled={tagSubmitting}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer select-none border-none"
                  >
                    {tagSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {tagModalMode === 'add' ? 'Create Tag' : 'Save Changes'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit General Registry Options Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!submitting) setIsModalOpen(false) }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-surface-elevated p-6 shadow-2xl z-10 glass"
            >
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-md p-1.5 text-foreground-muted hover:bg-border-subtle hover:text-foreground cursor-pointer bg-transparent border-none"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">
                {modalMode === 'add' ? 'Add New' : 'Edit'} {modalType === 'tariff' ? 'Tariff' : modalType === 'level' ? 'Education Level' : modalType === 'group' ? 'Student Group' : modalType === 'lead' ? 'Lead Source' : modalType === 'university' ? 'University' : modalType === 'folder' ? 'Student Folder' : 'Kordinator'}
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
                    placeholder={modalType === 'tariff' ? 'E-VISA (TIL SERTIFIKATISIZ)' : modalType === 'level' ? 'BACHELOR' : modalType === 'group' ? '2026 BAHOR' : modalType === 'university' ? 'AJOU UNIVERSITY (SUWON, GYEONGGI)' : modalType === 'coordinator' ? 'Kordinator Name' : modalType === 'folder' ? 'Korea Spring' : 'SeoulStudy'}
                    value={formName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormName(modalType === 'lead' || modalType === 'coordinator' || modalType === 'folder' ? val : val.toUpperCase());
                    }}
                    className={`w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-semibold text-xs tracking-wide placeholder:text-foreground-subtle ${modalType !== 'lead' && modalType !== 'coordinator' && modalType !== 'folder' ? 'uppercase' : ''}`}
                  />
                </div>

                {/* Price input field (Tariff Options only) */}
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
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer select-none border-none"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {modalMode === 'add' ? 'Create' : 'Save Changes'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
