'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { type Profile, type UserRole } from '@/types/database'
import { RestrictedAccess } from '@/components/ui/RestrictedAccess'
import {
  Users, Plus, Pencil, Trash2, X, Loader2, AlertCircle, 
  Shield, Mail, Key, User, CheckCircle2, Info
} from 'lucide-react'

export function UsersClient() {
  const supabase = createClient()
  const { profile: loggedInProfile, loading: authLoading } = useUser()

  // State
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dbMissing, setDbMissing] = useState(false)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  // Form values
  const [formEmail, setFormEmail] = useState('')
  const [formFullName, setFormFullName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('Admin')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch all users (profiles)
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to load users from database.')
    } finally {
      setLoading(false)
    }
  }

  // Probe database functions
  const probeDbFunctions = async () => {
    try {
      const { error: probeError } = await (supabase as any).rpc('create_new_user', {
        p_email: '',
        p_password: '',
        p_full_name: '',
        p_role: 'Admin'
      })

      if (probeError && probeError.code === '42883') {
        setDbMissing(true)
      }
    } catch (err) {
      console.error('Failed to probe DB functions:', err)
    }
  }

  useEffect(() => {
    if (loggedInProfile && (loggedInProfile.role === 'Manager' || loggedInProfile.role === 'Head Manager')) {
      fetchUsers()
      probeDbFunctions()
    }
  }, [loggedInProfile])

  // Access validation: Show loading skeleton first
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  // Restricted Access if not Manager or Head Manager
  if (!loggedInProfile || (loggedInProfile.role !== 'Manager' && loggedInProfile.role !== 'Head Manager')) {
    return <RestrictedAccess />
  }

  // Form controls
  const handleOpenAdd = () => {
    setModalMode('add')
    setEditingUserId(null)
    setFormEmail('')
    setFormFullName('')
    setFormPassword('')
    setFormRole('Admin')
    setModalError(null)
    setSuccessMessage(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user: Profile) => {
    setModalMode('edit')
    setEditingUserId(user.id)
    setFormEmail(user.email)
    setFormFullName(user.full_name || '')
    setFormPassword('') // Password remains empty unless changing
    setFormRole(user.role)
    setModalError(null)
    setSuccessMessage(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (user: Profile) => {
    if (user.id === loggedInProfile.id) {
      alert('You cannot delete your own account.')
      return
    }

    if (!confirm(`Are you sure you want to delete the user "${user.full_name || user.email}"? This will permanently remove their authentication credentials.`)) {
      return
    }

    try {
      setLoading(true)
      const { error: deleteError } = await (supabase as any).rpc('delete_existing_user', {
        p_user_id: user.id
      })

      if (deleteError) {
        if (deleteError.code === '42883') {
          setDbMissing(true)
          throw new Error('Database functions missing. Please execute the setup script.')
        }
        throw deleteError
      }

      await fetchUsers()
    } catch (err: any) {
      console.error('Error deleting user:', err)
      alert(err.message || 'Failed to delete user.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)
    setSuccessMessage(null)

    const emailTrim = formEmail.trim().toLowerCase()
    const fullNameTrim = formFullName.trim()

    if (!emailTrim || !fullNameTrim) {
      setModalError('Email and Full Name are required fields.')
      setSubmitting(false)
      return
    }

    if (modalMode === 'add' && !formPassword) {
      setModalError('Password is required for new users.')
      setSubmitting(false)
      return
    }

    try {
      if (modalMode === 'add') {
        const { data: newUserId, error: insertError } = await (supabase as any).rpc('create_new_user', {
          p_email: emailTrim,
          p_password: formPassword,
          p_full_name: fullNameTrim,
          p_role: formRole
        })

        if (insertError) {
          if (insertError.code === '42883') {
            setDbMissing(true)
            throw new Error('Database functions missing. Please execute the setup script.')
          }
          throw insertError
        }

        setSuccessMessage(`User "${fullNameTrim}" successfully created.`)
      } else {
        if (!editingUserId) return

        const { error: updateError } = await (supabase as any).rpc('update_existing_user', {
          p_user_id: editingUserId,
          p_email: emailTrim,
          p_password: formPassword || null,
          p_full_name: fullNameTrim,
          p_role: formRole
        })

        if (updateError) {
          if (updateError.code === '42883') {
            setDbMissing(true)
            throw new Error('Database functions missing. Please execute the setup script.')
          }
          throw updateError
        }

        setSuccessMessage(`User "${fullNameTrim}" successfully updated.`)
      }

      // Close modal on success after a short delay
      setTimeout(() => {
        setIsModalOpen(false)
      }, 1500)

      await fetchUsers()
    } catch (err: any) {
      console.error('Error saving user:', err)
      setModalError(err.message || 'An error occurred while saving the user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* DB setup missing banner */}
      {dbMissing && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--warning)] bg-[var(--surface)] p-5 text-left flex gap-3.5 shadow-[var(--shadow-sm)] animate-in fade-in duration-200">
          <AlertCircle className="h-6 w-6 text-[var(--warning)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-[var(--foreground)]">Database Setup Required</h4>
            <p className="mt-1 text-xs text-[var(--foreground-muted)] leading-relaxed">
              User management capabilities require security definer functions to manage the auth schema securely. Please execute the SQL setup script in your Supabase Dashboard SQL Editor:
            </p>
            <div className="mt-3.5 flex items-center gap-3">
              <code className="text-[10px] bg-[var(--border-subtle)] px-2 py-1 rounded font-mono border border-[var(--border)] select-all">
                supabase/users_setup.sql
              </code>
              <span className="text-xs text-[var(--foreground-subtle)]">file already created in your workspace.</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
          System Users ({users.length})
        </h3>
        <button
          onClick={handleOpenAdd}
          disabled={dbMissing}
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-4 py-2 transition-all shadow-sm cursor-pointer select-none border-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.2)' }}
        >
          <Plus className="h-4 w-4" />
          Add New User
        </button>
      </div>

      {/* Main List Box */}
      {loading ? (
        <div className="flex py-24 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            <p className="text-sm font-medium text-[var(--foreground-muted)]">Loading user directory...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--surface)] p-6 text-center text-[var(--danger)] shadow-[var(--shadow-sm)]">
          {error}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2c2c2e] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2c2c2e] bg-slate-50/50 dark:bg-[#151516]/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2c2c2e]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-xs text-slate-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === loggedInProfile.id
                    const isTargetHead = user.role === 'Head Manager'
                    const isCallerHead = loggedInProfile.role === 'Head Manager'
                    const canEdit = isCallerHead || !isTargetHead
                    const canDelete = !isSelf && (isCallerHead || !isTargetHead)
                    return (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50/30 dark:hover:bg-[#2c2c2e]/10 transition-colors ${
                          isSelf ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''
                        }`}
                      >
                        {/* Name and Email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-[#2c2c2e] flex items-center justify-center text-xs font-bold text-[var(--foreground)] border border-slate-200 dark:border-[#3c3c3e] select-none">
                              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-[var(--foreground)]">
                                  {user.full_name || 'No Name Set'}
                                </span>
                                {isSelf && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[var(--foreground-muted)] block mt-0.5">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* System Role Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                              user.role === 'Head Manager'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400'
                                : user.role === 'Manager'
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400'
                                  : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400'
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            {user.role}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--foreground-muted)] font-medium">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={!canEdit}
                              onClick={() => handleOpenEdit(user)}
                              className={`w-8 h-8 flex items-center justify-center border rounded-md transition-all ${
                                !canEdit
                                  ? 'border-slate-100 dark:border-[#1f1f21] text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                  : 'border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] text-blue-500 hover:text-blue-600 cursor-pointer'
                              }`}
                              title={!canEdit ? 'Only Head Managers can edit Head Manager accounts' : 'Edit User'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={!canDelete}
                              className={`w-8 h-8 flex items-center justify-center border rounded-md transition-all ${
                                !canDelete
                                  ? 'border-slate-100 dark:border-[#1f1f21] text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                  : 'border-slate-200 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e] text-red-500 hover:text-red-600 cursor-pointer'
                              }`}
                              title={
                                isSelf
                                  ? 'Cannot delete yourself'
                                  : !canDelete
                                    ? 'Only Head Managers can delete Head Manager accounts'
                                    : 'Delete User'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Users Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => { if (!submitting) setIsModalOpen(false) }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] z-10 animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-[var(--foreground-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Title */}
            <h2 className="text-base font-bold text-[var(--foreground)] mb-1 uppercase tracking-wide">
              {modalMode === 'add' ? 'Add System User' : 'Edit User Details'}
            </h2>
            <p className="text-[10px] text-[var(--foreground-muted)] mb-4">
              {modalMode === 'add'
                ? 'Create credentials and set permissions for a new CRM user.'
                : 'Modify email details, system permissions, or reset their account password.'}
            </p>

            {/* Error Message */}
            {modalError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{modalError}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <p>{successMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  <User className="h-3 w-3" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  placeholder="e.g. JOHN DOE"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs tracking-wide uppercase"
                />
              </div>

              {/* Email / Login */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email / Login
                </label>
                <input
                  type="email"
                  required
                  disabled={submitting}
                  placeholder="name@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs tracking-wide"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  <Key className="h-3 w-3" /> Password
                </label>
                <input
                  type="password"
                  required={modalMode === 'add'}
                  disabled={submitting}
                  placeholder={modalMode === 'add' ? '••••••••' : 'Leave empty to keep unchanged'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs tracking-wide"
                />
              </div>

              {/* System Role */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> System Role
                </label>
                <select
                  disabled={submitting || (modalMode === 'edit' && editingUserId === loggedInProfile.id)}
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] font-semibold text-xs tracking-wide cursor-pointer"
                >
                  <option value="Admin">Admin (Standard Access)</option>
                  <option value="Manager">Manager (Full Privilege Access)</option>
                  {loggedInProfile?.role === 'Head Manager' && (
                    <option value="Head Manager">Head Manager (Owner Access)</option>
                  )}
                </select>
                {modalMode === 'edit' && editingUserId === loggedInProfile.id && (
                  <span className="text-[9px] text-[var(--foreground-subtle)] flex items-center gap-1 mt-1 font-medium">
                    <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    You cannot change your own role to prevent self-lockout.
                  </span>
                )}
              </div>

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
                  {modalMode === 'add' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
