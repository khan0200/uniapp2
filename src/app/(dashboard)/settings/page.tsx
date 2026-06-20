'use client'

import { useState, useEffect } from 'react'
import { PageShell } from '@/components/ui/PageShell'
import { createClient } from '@/lib/supabase/client'
import { 
  Tag, GraduationCap, Users, Contact, PlusCircle, Pencil, Trash2, X, Loader2, AlertCircle, CheckCircle2, School
} from 'lucide-react'

interface TariffOption {
  id: number
  name: string
  price: number
}

interface GeneralOption {
  id: number
  name: string
}

export default function SettingsPage() {
  const supabase = createClient()

  // State for options
  const [tariffs, setTariffs] = useState<TariffOption[]>([])
  const [levels, setLevels] = useState<GeneralOption[]>([])
  const [groups, setGroups] = useState<GeneralOption[]>([])
  const [leads, setLeads] = useState<GeneralOption[]>([])
  const [universities, setUniversities] = useState<GeneralOption[]>([])
  const [coordinators, setCoordinators] = useState<GeneralOption[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator'>('tariff')
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form values
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Fetch all options on mount
  const fetchAllOptions = async () => {
    try {
      setLoading(true)
      setError(null)

      const [tariffsRes, levelsRes, groupsRes, leadsRes, universitiesRes, coordinatorsRes] = await Promise.all([
        supabase.from('tariff_options').select('*').order('name'),
        supabase.from('education_levels').select('*').order('name'),
        supabase.from('student_groups').select('*').order('name'),
        supabase.from('lead_sources').select('*').order('name'),
        supabase.from('universities').select('*').order('name'),
        supabase.from('coordinators').select('*').order('name')
      ])

      // If database tables are not set up yet, show a helpful setup banner
      if (
        (tariffsRes.error && tariffsRes.error.code === '42P01') ||
        (universitiesRes.error && universitiesRes.error.code === '42P01') ||
        (coordinatorsRes && coordinatorsRes.error && coordinatorsRes.error.code === '42P01')
      ) {
        throw new Error('Database tables not initialized. Please execute the settings_setup.sql and add_coordinator.sql scripts in the Supabase SQL editor.')
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
  const handleOpenAdd = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator') => {
    setModalType(type)
    setModalMode('add')
    setEditingId(null)
    setFormName('')
    setFormPrice('')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator', item: any) => {
    setModalType(type)
    setModalMode('edit')
    setEditingId(item.id)
    setFormName(item.name)
    setFormPrice(type === 'tariff' ? String(item.price) : '')
    setModalError(null)
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (type: 'tariff' | 'level' | 'group' | 'lead' | 'university' | 'coordinator', id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      let table = ''
      if (type === 'tariff') table = 'tariff_options'
      else if (type === 'level') table = 'education_levels'
      else if (type === 'group') table = 'student_groups'
      else if (type === 'lead') table = 'lead_sources'
      else if (type === 'university') table = 'universities'
      else if (type === 'coordinator') table = 'coordinators'

      const { error: deleteError } = await (supabase
        .from(table) as any)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchAllOptions()
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
    } catch (err: any) {
      console.error('Error saving settings item:', err)
      setModalError(err.message || 'Failed to save item.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Settings"
      description="Configure workspace parameters: tariffs, education levels, groups, and lead source referrers."
    >
      <div className="flex flex-col gap-4">
        {/* Setup instruction banner if database tables are missing */}
        {error && error.includes('Database tables not initialized') && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--warning)] bg-[var(--surface)] p-5 text-left flex gap-3.5 shadow-[var(--shadow-sm)] animate-in fade-in duration-200">
            <AlertCircle className="h-6 w-6 text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">Database Setup Required</h4>
              <p className="mt-1 text-xs text-[var(--foreground-muted)] leading-relaxed">
                Settings dynamic options are stored in separate Supabase tables. To enable this features, execute the setup SQL scripts in your Supabase Dashboard:
              </p>
              <div className="mt-3.5 flex items-center gap-3">
                <code className="text-[10px] bg-[var(--border-subtle)] px-2 py-1 rounded font-mono border border-[var(--border)] select-all">
                  supabase/settings_setup.sql
                </code>
                <span className="text-xs text-[var(--foreground-subtle)]">file created in your repository.</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex py-24 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--foreground-muted)]">Loading settings panels...</p>
            </div>
          </div>
        ) : (
          <>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            
            {/* 1. Tariff Options */}
            <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm flex flex-col min-h-[450px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                  <Tag className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Tariff Options</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage pricing plans</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdd('tariff')}
                  className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm cursor-pointer select-none border-none"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {tariffs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">No tariffs added yet.</p>
                ) : (
                  tariffs.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-blue-400 dark:border-blue-500/40 rounded-lg shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">{formatCurrency(item.price)}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit('tariff', item)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('tariff', item.id, item.name)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-red-500 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Education Levels */}
            <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm flex flex-col min-h-[450px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                  <GraduationCap className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Education Levels</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage education level options</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdd('level')}
                  className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm cursor-pointer select-none border-none"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {levels.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">No levels added yet.</p>
                ) : (
                  levels.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-blue-400 dark:border-blue-500/40 rounded-lg shadow-sm"
                    >
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit('level', item)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('level', item.id, item.name)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-red-500 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Student Groups */}
            <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm flex flex-col min-h-[450px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                  <Users className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Student Groups</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage student groups</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdd('group')}
                  className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm cursor-pointer select-none border-none"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {groups.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">No groups added yet.</p>
                ) : (
                  groups.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-blue-400 dark:border-blue-500/40 rounded-lg shadow-sm"
                    >
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit('group', item)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('group', item.id, item.name)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-red-500 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Lead by */}
            <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm flex flex-col min-h-[450px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                  <Contact className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Lead by</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage lead source options</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdd('lead')}
                  className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm cursor-pointer select-none border-none"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {leads.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">No lead sources added yet.</p>
                ) : (
                  leads.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-blue-400 dark:border-blue-500/40 rounded-lg shadow-sm"
                    >
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit('lead', item)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('lead', item.id, item.name)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-red-500 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Kordinators */}
            <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm flex flex-col min-h-[450px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                  <Users className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Kordinators</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage coordinator options</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAdd('coordinator')}
                  className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm cursor-pointer select-none border-none"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {coordinators.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">No coordinators added yet.</p>
                ) : (
                  coordinators.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-blue-400 dark:border-blue-500/40 rounded-lg shadow-sm"
                    >
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit('coordinator', item)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('coordinator', item.id, item.name)}
                          className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-md text-red-500 hover:text-red-600 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Universities Accordion Panel */}
          <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl p-5 shadow-sm mt-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-2.5">
                <School className="h-5 w-5 text-slate-700 dark:text-slate-200 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Universities</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage university options by education level</p>
                </div>
              </div>
              <button
                onClick={() => handleOpenAdd('university')}
                className="inline-flex items-center gap-1 bg-[#0070F3] hover:bg-[#0051C3] text-white text-xs font-semibold px-4.5 py-2 rounded-full transition-all shadow-sm cursor-pointer select-none border-none animate-in fade-in duration-200"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add University
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {universities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No universities added yet.</p>
              ) : (
                (isExpanded ? universities : universities.slice(0, 10)).map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] rounded-lg shadow-sm animate-in fade-in duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500 shrink-0">
                        <School className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase truncate" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit('university', item)}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-full text-blue-500 hover:text-blue-600 transition-all cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('university', item.id, item.name)}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] rounded-full text-red-500 hover:text-red-600 transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {universities.length > 10 && (
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-center">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1.5 text-[#0070F3] hover:text-[#0051C3] dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs py-1.5 px-4 rounded-full border border-blue-100 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer select-none"
                >
                  {isExpanded ? (
                    <>Show Less</>
                  ) : (
                    <>Show All ({universities.length} Universities)</>
                  )}
                </button>
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* Add / Edit Options Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => { if (!submitting) setIsModalOpen(false) }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10 animate-in zoom-in-95 duration-150">
            
            <button
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h2 className="text-base font-bold text-[var(--foreground)] mb-1 uppercase tracking-wide">
              {modalMode === 'add' ? 'Add New' : 'Edit'} {modalType === 'tariff' ? 'Tariff' : modalType === 'level' ? 'Education Level' : modalType === 'group' ? 'Student Group' : modalType === 'lead' ? 'Lead Source' : modalType === 'university' ? 'University' : 'Kordinator'}
            </h2>
            <p className="text-[10px] text-[var(--foreground-muted)] mb-4">
              Configure parameters for this configuration item.
            </p>

            {modalError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{modalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  placeholder={modalType === 'tariff' ? 'E-VISA (TIL SERTIFIKATISIZ)' : modalType === 'level' ? 'BACHELOR' : modalType === 'group' ? '2026 BAHOR' : modalType === 'university' ? 'AJOU UNIVERSITY (SUWON, GYEONGGI)' : modalType === 'coordinator' ? 'Kordinator Name' : 'SeoulStudy'}
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(modalType === 'lead' || modalType === 'coordinator' ? val : val.toUpperCase());
                  }}
                  className={`w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs tracking-wide ${modalType !== 'lead' && modalType !== 'coordinator' ? 'uppercase' : ''}`}
                />
              </div>

              {/* Price Field (Tariff Only) */}
              {modalType === 'tariff' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">
                    Price (UZS)
                  </label>
                  <input
                    type="number"
                    required
                    disabled={submitting}
                    placeholder="24000000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs text-[var(--accent)]"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[var(--border)] rounded-[var(--radius-md)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-1 px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold rounded-[var(--radius-md)] cursor-pointer select-none"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {modalMode === 'add' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
