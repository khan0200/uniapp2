'use client'

import {
  Sparkles, X, AlertCircle, CheckCircle2, Landmark, User, Building2,
  Award, GraduationCap, School, Users, UserCheck, ShieldCheck, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  officeOptions: string[]
  tariffOptions: string[]
  levelOptions: string[]
  groupOptions: string[]
  leadByOptions: string[]
  coordinatorOptions?: string[]
  universityOptions: string[]
  studentId: string
  setStudentId: (value: string) => void
  fullName: string
  setFullName: (value: string) => void
  office: string
  setOffice: (value: string) => void
  tariff: string
  setTariff: (value: string) => void
  level: string
  setLevel: (value: string) => void
  university1: string
  setUniversity1: (value: string) => void
  studentGroup: string
  setStudentGroup: (value: string) => void
  leadBy: string
  setLeadBy: (value: string) => void
  coordinator: string
  setCoordinator: (value: string) => void
  submitting: boolean
  modalError: string | null
  modalSuccess: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function AddStudentModal({
  isOpen,
  onClose,
  officeOptions = [],
  tariffOptions = [],
  levelOptions = [],
  groupOptions = [],
  leadByOptions = [],
  coordinatorOptions = [],
  universityOptions = [],
  studentId,
  setStudentId,
  fullName,
  setFullName,
  office,
  setOffice,
  tariff,
  setTariff,
  level,
  setLevel,
  university1,
  setUniversity1,
  studentGroup,
  setStudentGroup,
  leadBy,
  setLeadBy,
  coordinator,
  setCoordinator,
  submitting,
  modalError,
  modalSuccess,
  onSubmit,
}: AddStudentModalProps) {
  const { shouldRender, isVisible } = useCssTransition(isOpen, 220)
  if (!shouldRender) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Overlay */}
      <div
        onClick={() => {
          if (!submitting) onClose()
        }}
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-220 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Modal Dialog Panel */}
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] z-10',
          'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
        )}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              Add New Student
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Fill in the required information to register a new student in the CRM.
            </p>
          </div>
          <button
            disabled={submitting}
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Status Alerts */}
          {modalError && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-sm text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{modalError}</p>
            </div>
          )}

          {modalSuccess && (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3.5 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p>Student successfully registered!</p>
            </div>
          )}

          <form id="add-student-form" onSubmit={onSubmit} className="space-y-4">
            {/* Required Information Section */}
            <div className="bg-[var(--surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                1. Required Information *
              </span>

              <div className="flex items-center gap-3">
                {/* Student ID (Required - Compact width) */}
                <div className="w-32 shrink-0">
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Landmark className="h-3 w-3 text-[var(--accent)]" />
                      Student ID
                    </span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting || modalSuccess}
                    placeholder="e.g. F101"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-all font-mono font-bold text-sm"
                  />
                </div>

                {/* Student Name (Required - Expanded width) */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-[var(--accent)]" />
                      Student Name
                    </span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting || modalSuccess}
                    placeholder="BAXTIYOR"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent)] transition-all font-semibold text-sm"
                  />
                </div>
              </div>

              {/* Office Branch (Required) */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-[var(--accent)]" />
                    Office Branch
                  </span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  required
                  disabled={submitting || modalSuccess}
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm font-medium cursor-pointer"
                >
                  <option value="">Select Office Branch</option>
                  {officeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Academic & Contract Details Section */}
            <div className="bg-[var(--surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                2. Academic & Tariff Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tariff */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                    <Award className="h-3 w-3 text-[var(--accent)]" />
                    Tariff
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={tariff}
                    onChange={(e) => setTariff(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm cursor-pointer"
                  >
                    <option value="">Select Tariff (Optional)</option>
                    {tariffOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Level to Study */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 text-[var(--accent)]" />
                    Level to Study
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm cursor-pointer"
                  >
                    <option value="">Select Level (Optional)</option>
                    {levelOptions.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* University 1 */}
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  <School className="h-3 w-3 text-[var(--accent)]" />
                  University 1
                </label>
                <select
                  disabled={submitting || modalSuccess}
                  value={university1}
                  onChange={(e) => setUniversity1(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm font-medium cursor-pointer"
                >
                  <option value="">Select University 1 (Optional)</option>
                  {universityOptions.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Management & Group Assignment Section */}
            <div className="bg-[var(--surface)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                3. Group & Staff Assignment
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Group */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                    <Users className="h-3 w-3 text-[var(--accent)]" />
                    Group
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={studentGroup}
                    onChange={(e) => setStudentGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">Select Group</option>
                    {groupOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Lead By */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-[var(--accent)]" />
                    Lead By
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={leadBy}
                    onChange={(e) => setLeadBy(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">Select Lead By</option>
                    {leadByOptions.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Coordinator */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-[var(--accent)]" />
                    Coordinator
                  </label>
                  <select
                    disabled={submitting || modalSuccess}
                    value={coordinator}
                    onChange={(e) => setCoordinator(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">Select Coordinator</option>
                    {coordinatorOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--surface)]">
          <span className="text-xs text-[var(--foreground-muted)]">
            Fields marked with <span className="text-rose-500 font-bold">*</span> are required.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting || modalSuccess}
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] text-xs font-semibold transition-all active:scale-[0.96] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-student-form"
              disabled={submitting || modalSuccess}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-[var(--radius-md)] transition-all active:scale-[0.96] cursor-pointer select-none disabled:opacity-50"
              style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.25)' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Student...
                </>
              ) : (
                'Save Student'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
