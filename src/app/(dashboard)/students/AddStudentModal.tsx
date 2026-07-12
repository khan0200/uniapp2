'use client'

import {
  Sparkles, X, AlertCircle, CheckCircle2, Landmark, User, Building2, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCssTransition } from '@/hooks/useCssTransition'

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  officeOptions: string[]
  studentId: string
  setStudentId: (value: string) => void
  fullName: string
  setFullName: (value: string) => void
  office: string
  setOffice: (value: string) => void
  submitting: boolean
  modalError: string | null
  modalSuccess: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function AddStudentModal({
  isOpen,
  onClose,
  officeOptions,
  studentId,
  setStudentId,
  fullName,
  setFullName,
  office,
  setOffice,
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
          'relative w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10',
          'transition-all duration-220 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[15px]'
        )}
      >
        {/* Close Button */}
        <button
          disabled={submitting}
          onClick={onClose}
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
        <form onSubmit={onSubmit} className="space-y-4">
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
              onChange={(e) => setOffice(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm cursor-pointer"
            >
              {officeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting || modalSuccess}
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] text-sm font-semibold transition-all active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || modalSuccess}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-[var(--radius-md)] transition-all active:scale-[0.96] cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  )
}
