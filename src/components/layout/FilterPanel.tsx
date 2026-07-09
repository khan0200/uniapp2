'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Search, Check,
  Tag, Layers, Users, Award, Bookmark, UserCheck, Hash
} from 'lucide-react'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'
import { type Student } from '@/types/database'
import { cn } from '@/lib/utils'

interface CategoryDef {
  id: string
  label: string
  icon: React.ReactNode
  drafts: string[]
  setDrafts: React.Dispatch<React.SetStateAction<string[]>>
  fullOpts: string[]
  labelMapping: (opt: string) => string
}

export function FilterPanel() {
  const {
    students,
    searchQuery,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    
    // Applied states
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

    // Options from DB/Context
    tariffOptions,
    levelOptions,
    groupOptions,
    leadByOptions,
    customTagsRegistry,
    activeFolder
  } = useStudentDashboard()

  // Draft local states (unapplied changes)
  const [draftTariffs, setDraftTariffs] = useState<string[]>([])
  const [draftLevels, setDraftLevels] = useState<string[]>([])
  const [draftGroups, setDraftGroups] = useState<string[]>([])
  const [draftCerts, setDraftCerts] = useState<string[]>([])
  const [draftScores, setDraftScores] = useState<string[]>([])
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [draftLeads, setDraftLeads] = useState<string[]>([])

  // Category navigation state (defaulting to first category)
  const [activeCategory, setActiveCategory] = useState<string>('tariff')

  // Synchronize drafts with applied filters when the panel is opened
  useEffect(() => {
    if (isFilterPanelOpen) {
      setDraftTariffs([...selectedTariffs])
      setDraftLevels([...selectedLevels])
      setDraftGroups([...selectedGroups])
      setDraftCerts([...selectedCerts])
      setDraftScores([...selectedScores])
      setDraftTags([...selectedTags])
      setDraftLeads([...selectedLeads])
      setActiveCategory('tariff')
    }
  }, [isFilterPanelOpen, selectedTariffs, selectedLevels, selectedGroups, selectedCerts, selectedScores, selectedTags, selectedLeads])


  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterPanelOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsFilterPanelOpen])

  // Option calculations
  const uniqueGroups = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.student_group).filter(Boolean))) as string[]
    const combined = Array.from(new Set([...list, ...groupOptions]))
    return combined
  }, [students, groupOptions])

  const certOptions = ['NO CERTIFICATE', 'EXPECTED', 'TOPIK', 'SKA', 'IELTS', 'TOEFL', 'SAT', 'CEFR']

  // Score Filter conditions
  const showScoreFilter = draftCerts.length === 1 && (draftCerts[0] === 'TOPIK' || draftCerts[0] === 'IELTS')
  const activeCertForScore = showScoreFilter ? draftCerts[0] : null

  const scoreOptions = useMemo(() => {
    if (activeCertForScore === 'TOPIK') {
      return ['EXPECTED', '1', '2', '3', '4', '5', '6']
    }
    if (activeCertForScore === 'IELTS') {
      return ['EXPECTED', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0']
    }
    return []
  }, [activeCertForScore])

  const uniqueTags = useMemo(() => {
    return Array.from(new Set(students.flatMap(s => s.task_tags || []).filter(Boolean))) as string[]
  }, [students])

  const tagOptions = useMemo(() => {
    const predefined = ['Call', 'Apply', 'Documents', 'Payment', 'Custom']
    const customs = uniqueTags.filter(t => !predefined.includes(t))
    return [...predefined, ...customs]
  }, [uniqueTags])

  const getCustomTagIcon = (tagName: string) => {
    if (tagName === 'Call') return '📞'
    if (tagName === 'Apply') return '🎓'
    if (tagName === 'Documents') return '📄'
    if (tagName === 'Payment') return '💰'
    const entry = customTagsRegistry.find(t => t.name === tagName)
    return entry ? (entry.icon || '🏷️') : '🏷️'
  }

  const uniqueLeadBys = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.lead_by).filter(Boolean))) as string[]
    const combined = Array.from(new Set([...list, ...leadByOptions]))
    return combined
  }, [students, leadByOptions])

  // Clear score filter when active certificate switches
  useEffect(() => {
    if (isFilterPanelOpen && !showScoreFilter) {
      setDraftScores([])
    }
  }, [showScoreFilter, isFilterPanelOpen])

  // If score is active but becomes invalid, revert category selection
  useEffect(() => {
    if (!showScoreFilter && activeCategory === 'score') {
      setActiveCategory('cert')
    }
  }, [showScoreFilter, activeCategory])

  // Category Configuration list
  const categories: CategoryDef[] = [
    {
      id: 'tariff',
      label: 'Tariff',
      icon: <Tag className="h-4 w-4" />,
      drafts: draftTariffs,
      setDrafts: setDraftTariffs,
      fullOpts: useMemo(() => ['NO_TARIFF', ...tariffOptions], [tariffOptions]),
      labelMapping: (opt) => opt === 'NO_TARIFF' ? 'No Tariff' : opt
    },
    {
      id: 'level',
      label: 'Level',
      icon: <Layers className="h-4 w-4" />,
      drafts: draftLevels,
      setDrafts: setDraftLevels,
      fullOpts: useMemo(() => ['NO_LEVEL', ...levelOptions], [levelOptions]),
      labelMapping: (opt) => opt === 'NO_LEVEL' ? 'No Level' : opt
    },
    {
      id: 'group',
      label: 'Group',
      icon: <Users className="h-4 w-4" />,
      drafts: draftGroups,
      setDrafts: setDraftGroups,
      fullOpts: useMemo(() => ['NO_GROUP', ...uniqueGroups], [uniqueGroups]),
      labelMapping: (opt) => opt === 'NO_GROUP' ? 'No Group' : opt
    },
    {
      id: 'cert',
      label: 'Certificate',
      icon: <Award className="h-4 w-4" />,
      drafts: draftCerts,
      setDrafts: setDraftCerts,
      fullOpts: certOptions,
      labelMapping: (opt) => opt
    },
    ...(showScoreFilter ? [{
      id: 'score',
      label: `${activeCertForScore} Score`,
      icon: <Hash className="h-4 w-4" />,
      drafts: draftScores,
      setDrafts: setDraftScores,
      fullOpts: scoreOptions,
      labelMapping: (opt: string) => opt === 'EXPECTED' ? 'Expected' : `${activeCertForScore} ${opt}`
    }] : []),
    {
      id: 'tag',
      label: 'Tasks / Tags',
      icon: <Bookmark className="h-4 w-4" />,
      drafts: draftTags,
      setDrafts: setDraftTags,
      fullOpts: tagOptions,
      labelMapping: (opt) => `${getCustomTagIcon(opt)} ${opt}`
    },
    {
      id: 'lead',
      label: 'Lead By',
      icon: <UserCheck className="h-4 w-4" />,
      drafts: draftLeads,
      setDrafts: setDraftLeads,
      fullOpts: useMemo(() => ['NO_LEADBY', ...uniqueLeadBys], [uniqueLeadBys]),
      labelMapping: (opt) => opt === 'NO_LEADBY' ? 'No Lead by' : opt
    }
  ]

  // Identify current category
  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0]

  // Real-time draft filtering logic for the student count display
  const matchingStudentsCount = useMemo(() => {
    return students.filter(student => {
      // 1. Folder filtering
      if (activeFolder === 'deleted') {
        if (student.is_deleted !== true) return false
      } else if (activeFolder === 'all') {
        if (student.is_deleted === true) return false
      } else {
        if (student.is_deleted === true) return false
        if (student.folder_id !== activeFolder) return false
      }

      // 2. Search query matching
      const matchesSearch =
        student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.phone1 && student.phone1.includes(searchQuery)) ||
        (student.phone2 && student.phone2.includes(searchQuery))
      if (!matchesSearch) return false

      // 3. Tariff filter
      let matchesTariff = false
      if (draftTariffs.length === 0) {
        matchesTariff = true
      } else {
        if (draftTariffs.includes('NO_TARIFF') && !student.tariff) {
          matchesTariff = true
        }
        if (student.tariff && draftTariffs.includes(student.tariff)) {
          matchesTariff = true
        }
      }
      if (!matchesTariff) return false

      // 4. Level filter
      const activeLevels = draftLevels.filter(l => l !== 'DELETED')
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
      if (draftGroups.length === 0) {
        matchesGroup = true
      } else {
        if (draftGroups.includes('NO_GROUP') && !student.student_group) {
          matchesGroup = true
        }
        if (student.student_group && draftGroups.includes(student.student_group)) {
          matchesGroup = true
        }
      }
      if (!matchesGroup) return false

      // 6. Certificate filter
      let matchesCertificate = false
      if (draftCerts.length === 0) {
        matchesCertificate = true
      } else {
        if (draftCerts.includes("NO CERTIFICATE")) {
          const hasNoCert = !student.language_certificate || student.language_certificate === "NO CERTIFICATE"
          if (hasNoCert) matchesCertificate = true
        }
        if (draftCerts.includes("EXPECTED")) {
          const hasExpected = (student.certificate_score && student.certificate_score.toUpperCase() === "EXPECTED") ||
            (student.certificate_score_2 && student.certificate_score_2.toUpperCase() === "EXPECTED") ||
            (student.certificate_score_3 && student.certificate_score_3.toUpperCase() === "EXPECTED")
          if (hasExpected) matchesCertificate = true
        }
        const hasAnySelected = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
          .some(cert => cert && cert !== "NO CERTIFICATE" && draftCerts.includes(cert))
        if (hasAnySelected) matchesCertificate = true
      }
      if (!matchesCertificate) return false

      // 7. Score sub-filter
      if (draftScores.length > 0 && draftCerts.length === 1) {
        const cert = draftCerts[0] || ""
        const scores = [student.certificate_score, student.certificate_score_2, student.certificate_score_3]
        const certs = [student.language_certificate, student.language_certificate_2, student.language_certificate_3]
        const matchesScore = certs.some((c, i) => {
          if (!c || c === "NO CERTIFICATE") return false
          if (c.toUpperCase() !== cert.toUpperCase()) return false
          const score = (scores[i] || "").trim().toUpperCase()
          return draftScores.some(f => f.toUpperCase() === score)
        })
        if (!matchesScore) return false
      }

      // 8. Tags filter
      let matchesTag = false
      if (draftTags.length === 0) {
        matchesTag = true
      } else {
        matchesTag = draftTags.some(tag => {
          if (tag === 'Custom') {
            const predefined = ['Call', 'Apply', 'Documents', 'Payment']
            return student.task_tags && student.task_tags.some(t => !predefined.includes(t))
          } else {
            return student.task_tags && student.task_tags.includes(tag)
          }
        })
      }
      if (!matchesTag) return false

      // 9. Lead By filter
      let matchesLeadBy = false
      if (draftLeads.length === 0) {
        matchesLeadBy = true
      } else {
        if (draftLeads.includes('NO_LEADBY') && !student.lead_by) {
          matchesLeadBy = true
        }
        if (student.lead_by && draftLeads.includes(student.lead_by)) {
          matchesLeadBy = true
        }
      }
      if (!matchesLeadBy) return false

      return true
    }).length
  }, [students, searchQuery, draftTariffs, draftLevels, draftGroups, draftCerts, draftScores, draftTags, draftLeads])

  // Category selection helpers
  const toggleDraftSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setList(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  // Handle Apply / Show
  const handleApplyFilters = () => {
    setSelectedTariffs(draftTariffs)
    setSelectedLevels(draftLevels)
    setSelectedGroups(draftGroups)
    setSelectedCerts(draftCerts)
    setSelectedScores(draftScores)
    setSelectedTags(draftTags)
    setSelectedLeads(draftLeads)
    setIsFilterPanelOpen(false)
  }

  if (!isFilterPanelOpen) return null

  return (
    <>
      {/* Click Outside Overlay Backdrop for Desktop Popover */}
      <div 
        className="fixed inset-0 z-40 bg-transparent hidden md:block cursor-default" 
        onClick={() => setIsFilterPanelOpen(false)}
      />

      {/* Backdrop for Mobile Bottom Sheet */}
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden cursor-default" 
        onClick={() => setIsFilterPanelOpen(false)}
      />

      {/* Responsive Filter Panel Container */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`
            fixed z-50 rounded-t-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)]
            bottom-0 inset-x-0 max-h-[85vh] flex flex-col
            md:absolute md:top-full md:bottom-auto md:left-0 md:right-auto md:w-[680px] md:h-[480px] md:mt-2.5 md:rounded-[var(--radius-lg)]
          `}
        >
          {/* Mobile Drag Handle */}
          <div className="h-6 flex items-center justify-center shrink-0 md:hidden cursor-pointer" onClick={() => setIsFilterPanelOpen(false)}>
            <div className="w-12 h-1 bg-[var(--border)] rounded-full" />
          </div>

          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Filter Students</h3>
              <p className="text-[11px] text-[var(--foreground-muted)] font-medium">Refine your active student registry list</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Reset All */}
              {(draftTariffs.length > 0 || draftLevels.length > 0 || draftGroups.length > 0 || draftCerts.length > 0 || draftScores.length > 0 || draftTags.length > 0 || draftLeads.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftTariffs([])
                    setDraftLevels([])
                    setDraftGroups([])
                    setDraftCerts([])
                    setDraftScores([])
                    setDraftTags([])
                    setDraftLeads([])
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer select-none"
                >
                  Clear All
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="p-1 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer h-7 w-7 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Master-Detail Roster Pane Body */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Desktop Left Side Navigation */}
            <div className="hidden md:flex flex-col w-[210px] border-r border-[var(--border)] dark:border-border/60 overflow-y-auto bg-[var(--surface-elevated)]/10 py-2">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                const selectCount = cat.drafts.length
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center justify-between px-4.5 py-3 text-xs font-semibold select-none text-left cursor-pointer transition-all border-l-3",
                      isActive
                        ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500"
                        : "text-[var(--foreground)] border-transparent hover:bg-[var(--surface-hover)]/30 hover:text-[var(--foreground-muted)]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn(isActive ? "text-blue-600 dark:text-blue-400" : "text-[var(--foreground-muted)]")}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                    </div>
                    {selectCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full leading-none">
                        {selectCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Mobile Top Horizontal Scroll Navigation */}
            <div className="flex md:hidden overflow-x-auto border-b border-[var(--border)] dark:border-border/60 scrollbar-none px-4 py-2.5 gap-2 shrink-0 bg-[var(--surface-elevated)]/15">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id
                const selectCount = cat.drafts.length
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer whitespace-nowrap transition-all border",
                      isActive
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-blue-400"
                        : "bg-[var(--surface-elevated)]/60 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    <span>{cat.label}</span>
                    {selectCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white dark:bg-blue-500 dark:text-black rounded-full leading-none">
                        {selectCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right Pane / Options List Pane */}
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col min-h-0 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] select-none">
                      {currentCategory.label} Options
                    </h4>
                  </div>

                  {/* Selected draft chips */}
                  {currentCategory.drafts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pb-2 border-b border-[var(--border-subtle)] dark:border-border/30">
                      {currentCategory.drafts.map((val) => (
                        <div
                          key={val}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--surface-elevated)] dark:bg-[var(--surface-interactive)] text-[10px] font-semibold text-[var(--foreground)] rounded-full border border-[var(--border)] shadow-xs animate-none"
                        >
                          <span className="truncate max-w-[120px]">
                            {currentCategory.labelMapping(val)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              toggleDraftSelection(
                                currentCategory.drafts,
                                currentCategory.setDrafts,
                                val
                              )
                            }
                            className="hover:bg-red-500/10 text-[var(--foreground-muted)] hover:text-red-500 rounded-full h-3.5 w-3.5 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Options Checkbox List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                    {currentCategory.fullOpts.length === 0 ? (
                      <div className="text-xs text-[var(--foreground-muted)] italic text-center py-8 select-none">
                        No options available
                      </div>
                    ) : (
                      currentCategory.fullOpts.map((opt) => {
                        const isChecked = currentCategory.drafts.includes(opt)
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]/40 transition-colors select-none text-xs text-[var(--foreground)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                toggleDraftSelection(
                                  currentCategory.drafts,
                                  currentCategory.setDrafts,
                                  opt
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="font-semibold text-[var(--foreground)]">
                              {currentCategory.labelMapping(opt)}
                            </span>
                            {isChecked && (
                              <Check className="ml-auto h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                          </label>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Panel Footer Buttons */}
          <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-elevated)]/60 flex items-center gap-3 shrink-0 rounded-b-[20px] md:rounded-b-[var(--radius-lg)]">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="flex-1 md:flex-initial flex items-center justify-center px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--foreground)] text-xs font-bold transition-all cursor-pointer shadow-xs select-none h-10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex-2 md:flex-initial flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 select-none h-10 md:ml-auto"
            >
              Show {matchingStudentsCount} Students
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
