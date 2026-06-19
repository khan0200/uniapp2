'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type Payment } from '@/types/database'
import {
  Users, Receipt, Plus, Minus, Search, ChevronDown, X, Loader2,
  Pencil, Trash2, Printer, CreditCard, Wallet
} from 'lucide-react'

const PAYMENT_METHODS = ['Karta J.A', 'Karta Abdulaziz', 'Naqd', 'Karta M.A', 'Bank', 'Discount']
const RECEIVED_BY_OPTIONS = ['ABDULAZIZ', 'MUSLIHIDDIN', 'BAXTIYOR', 'MUHAMMADALI', 'JASUR', 'ADMIN']
const NOTE_PILLS = ['Shartnoma uchun', 'Qarz', 'Elchixona uchun', 'Appfee', 'DISCOUNT']
const ITEMS_PER_PAGE = 12

function formatAmount(val: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(val))
}

function formatCurrency(val: number) {
  return formatAmount(val) + ' UZS'
}

function parseAmount(val: string) {
  const cleaned = val.replace(/[^\d.-]/g, '')
  return parseFloat(cleaned) || 0
}

export function PaymentsClient() {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students')

  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Students tab search/filter
  const [studentSearch, setStudentSearch] = useState('')
  const [tariffFilter, setTariffFilter] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'' | 'owing' | 'paid' | 'zero'>('')
  const [studentsPage, setStudentsPage] = useState(1)

  // History tab search/filter
  const [historySearch, setHistorySearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [receivedByFilter, setReceivedByFilter] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  // Add Payment modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [addMethod, setAddMethod] = useState('')
  const [addReceivedBy, setAddReceivedBy] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addStudentId, setAddStudentId] = useState('')
  const [addStudentSearch, setAddStudentSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Withdraw modal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawStudentId, setWithdrawStudentId] = useState('')
  const [withdrawStudentSearch, setWithdrawStudentSearch] = useState('')

  // Edit modal
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMethod, setEditMethod] = useState('')
  const [editReceivedBy, setEditReceivedBy] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [studentsRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('*').eq('is_deleted', false).order('full_name', { ascending: true }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (paymentsRes.error) throw paymentsRes.error

      setStudents(studentsRes.data || [])
      setPayments(paymentsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching payments data details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        error: err
      })
      const displayMessage = err.message 
        ? `${err.message}${err.hint ? ` (${err.hint})` : ''}`
        : 'Failed to load payments.'
      setError(displayMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ── Balance update helpers ────────────────────────────────
  // Convention: students.balance is negative when the student owes money.
  // A positive payment amount is ADDED to balance (reduces debt).
  const adjustStudentBalance = async (studentId: string, delta: number, discountDelta = 0) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    const newBalance = (student.balance || 0) + delta
    const newDiscount = (student.discount || 0) + discountDelta

    const { error: updateError } = await (supabase
      .from('students') as any)
      .update({ balance: newBalance, ...(discountDelta !== 0 ? { discount: newDiscount } : {}) })
      .eq('id', studentId)

    if (updateError) throw updateError

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, balance: newBalance, ...(discountDelta !== 0 ? { discount: newDiscount } : {}) } : s))
  }

  // ── Add Payment ───────────────────────────────────────────
  const resetAddForm = () => {
    setAddAmount('')
    setAddMethod('')
    setAddReceivedBy('')
    setAddNotes('')
    setAddStudentId('')
    setAddStudentSearch('')
  }

  const openAddModal = (studentId?: string) => {
    resetAddForm()
    if (studentId) setAddStudentId(studentId)
    setIsAddModalOpen(true)
  }

  const submitAddPayment = async () => {
    const amount = parseAmount(addAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount!')
      return
    }
    if (!addMethod) {
      alert('Please select a payment method!')
      return
    }
    if (!addReceivedBy) {
      alert('Please select who received the payment!')
      return
    }

    const isDiscount = addNotes.toUpperCase().includes('DISCOUNT')
    if (isDiscount && !addStudentId) {
      alert('Please select a student for the discount!')
      return
    }

    const student = students.find(s => s.id === addStudentId)

    setSubmitting(true)
    try {
      const { error: insertError } = await (supabase.from('payments') as any).insert({
        amount,
        method: addMethod,
        received_by: addReceivedBy,
        notes: addNotes.trim() || null,
        is_discount: isDiscount,
        is_withdrawal: false,
        student_id: addStudentId || null,
        student_name: student?.full_name || null,
      })
      if (insertError) throw insertError

      if (addStudentId) {
        await adjustStudentBalance(addStudentId, amount, isDiscount ? amount : 0)
      }

      setIsAddModalOpen(false)
      resetAddForm()
      await fetchData()
    } catch (err: any) {
      alert('Error saving payment: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Withdraw ──────────────────────────────────────────────
  const resetWithdrawForm = () => {
    setWithdrawAmount('')
    setWithdrawReason('')
    setWithdrawStudentId('')
    setWithdrawStudentSearch('')
  }

  const submitWithdrawal = async () => {
    const amount = parseAmount(withdrawAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount!')
      return
    }
    if (!withdrawReason.trim()) {
      alert('Please enter a reason for withdrawal!')
      return
    }

    const student = students.find(s => s.id === withdrawStudentId)

    setSubmitting(true)
    try {
      const { error: insertError } = await (supabase.from('payments') as any).insert({
        amount: -amount,
        method: 'Withdrawal',
        received_by: 'System',
        notes: `WITHDRAWAL: ${withdrawReason.trim().toUpperCase()}`,
        is_discount: false,
        is_withdrawal: true,
        student_id: withdrawStudentId || null,
        student_name: student?.full_name || null,
      })
      if (insertError) throw insertError

      if (withdrawStudentId) {
        await adjustStudentBalance(withdrawStudentId, -amount)
      }

      setIsWithdrawModalOpen(false)
      resetWithdrawForm()
      await fetchData()
    } catch (err: any) {
      alert('Error recording withdrawal: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit Payment ──────────────────────────────────────────
  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment)
    setEditAmount(formatAmount(Math.abs(payment.amount)))
    setEditMethod(payment.method)
    setEditReceivedBy(payment.received_by)
    setEditNotes(payment.notes || '')
  }

  const submitEditPayment = async () => {
    if (!editingPayment) return
    const isNegative = editingPayment.amount < 0
    const rawAmount = parseAmount(editAmount)
    if (!rawAmount || rawAmount <= 0) {
      alert('Please enter a valid amount!')
      return
    }
    if (!editMethod) {
      alert('Please select a payment method!')
      return
    }
    if (!editReceivedBy) {
      alert('Please select who received the payment!')
      return
    }

    const newAmount = isNegative ? -rawAmount : rawAmount
    const originalAmount = editingPayment.amount
    const amountDifference = newAmount - originalAmount

    setSubmitting(true)
    try {
      const { error: updateError } = await (supabase
        .from('payments') as any)
        .update({
          amount: newAmount,
          method: editMethod,
          received_by: editReceivedBy,
          notes: editNotes.trim() || null,
        })
        .eq('id', editingPayment.id)
      if (updateError) throw updateError

      if (editingPayment.student_id && amountDifference !== 0) {
        const discountDelta = editingPayment.is_discount ? amountDifference : 0
        await adjustStudentBalance(editingPayment.student_id, amountDifference, discountDelta)
      }

      setEditingPayment(null)
      await fetchData()
    } catch (err: any) {
      alert('Error updating payment: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete Payment ────────────────────────────────────────
  const deletePayment = async (payment: Payment) => {
    const confirmMsg = payment.student_name
      ? `Are you sure you want to delete this payment of ${formatCurrency(Math.abs(payment.amount))} for ${payment.student_name}?`
      : `Are you sure you want to delete this payment of ${formatCurrency(Math.abs(payment.amount))}?`
    if (!confirm(confirmMsg)) return

    try {
      const { error: deleteError } = await supabase.from('payments').delete().eq('id', payment.id)
      if (deleteError) throw deleteError

      if (payment.student_id) {
        const discountDelta = payment.is_discount ? -payment.amount : 0
        await adjustStudentBalance(payment.student_id, -payment.amount, discountDelta)
      }

      await fetchData()
    } catch (err: any) {
      alert('Error deleting payment: ' + err.message)
    }
  }

  // ── Print Receipt ─────────────────────────────────────────
  const printReceipt = (payment: Payment) => {
    const amount = payment.amount
    const isWithdrawal = amount < 0
    const absAmount = Math.abs(amount)
    const amountFormatted = formatAmount(absAmount) + ' UZS'
    const amountSign = isWithdrawal ? '-' : '+'
    const amountLabel = isWithdrawal ? 'WITHDRAWAL' : 'PAYMENT'

    const dateObj = payment.created_at ? new Date(payment.created_at) : new Date()
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    const receiptNo = payment.id ? payment.id.replace(/-/g, '').slice(-8).toUpperCase() : 'N/A'
    const studentLine = payment.student_id && payment.student_name
      ? `${payment.student_id} — ${payment.student_name}`
      : 'General Payment'
    const notesLine = payment.notes || ''
    const methodLine = payment.method || '—'
    const receiverLine = payment.received_by || '—'

    const receiptHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt #${receiptNo}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  html, body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 74mm; color: #000; background: #fff; }
  .receipt { padding: 3mm 3mm 4mm 3mm; }
  .company-name { font-size: 14px; font-weight: 900; letter-spacing: 2px; text-align: center; margin-bottom: 0.5mm; }
  .company-sub { font-size: 9px; text-align: center; margin-bottom: 2mm; letter-spacing: 1px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 1.5mm 0; }
  .divider-solid { border: none; border-top: 1px solid #000; margin: 1.5mm 0; }
  .row { display: flex; justify-content: space-between; margin: 1mm 0; font-size: 10.5px; }
  .row .label { color: #333; flex-shrink: 0; margin-right: 2mm; }
  .row .value { text-align: right; word-break: break-word; max-width: 50mm; }
  .row .bold { font-weight: 700; }
  .amount-box { border: 1px solid #000; padding: 2mm 2mm; text-align: center; margin: 2mm 0; }
  .amount-label { font-size: 9px; letter-spacing: 1px; margin-bottom: 0.5mm; }
  .amount-value { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .receipt-no { font-size: 9px; color: #555; text-align: center; margin-bottom: 1mm; }
  .footer { text-align: center; font-size: 9px; margin-top: 2mm; letter-spacing: 1px; }
  .notes-row { border: 1px dashed #555; padding: 1mm 2mm; margin: 1mm 0; font-size: 10px; word-break: break-word; }
</style>
</head>
<body>
<div class="receipt">
  <div class="company-name">UNIAPP</div>
  <div class="company-sub">UNIBRIDGE EDUCATIONAL SERVICES</div>
  <hr class="divider-solid">
  <div class="receipt-no">Receipt #${receiptNo}</div>
  <div class="row"><span class="label">Date:</span><span class="value bold">${dateStr}</span></div>
  <div class="row"><span class="label">Time:</span><span class="value">${timeStr}</span></div>
  <hr class="divider">
  <div class="row"><span class="label">Student:</span><span class="value bold">${studentLine}</span></div>
  <hr class="divider">
  <div class="amount-box">
    <div class="amount-label">${amountLabel}</div>
    <div class="amount-value">${amountSign}${amountFormatted}</div>
  </div>
  <hr class="divider">
  <div class="row"><span class="label">Method:</span><span class="value">${methodLine}</span></div>
  <div class="row"><span class="label">Received by:</span><span class="value">${receiverLine}</span></div>
  ${notesLine ? `<div class="notes-row"><span style="font-size:9px; letter-spacing:1px; color:#444;">NOTE: </span>${notesLine}</div>` : ''}
  <hr class="divider-solid">
  <div class="footer">★ RAHMAT! THANK YOU! ★<br><span style="font-size:8px; color:#555;">unibridge.uz</span></div>
</div>
</body>
</html>`

    const printWin = window.open('', '_blank', 'width=400,height=600,toolbar=0,location=0,menubar=0')
    if (!printWin) {
      alert('Please allow pop-ups to print the receipt!')
      return
    }
    printWin.document.write(receiptHTML)
    printWin.document.close()
    printWin.onload = () => {
      setTimeout(() => {
        printWin.focus()
        printWin.print()
        printWin.onafterprint = () => printWin.close()
      }, 300)
    }
  }

  // ── Derived data ──────────────────────────────────────────
  const tariffOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => { if (s.tariff) set.add(s.tariff) })
    return Array.from(set)
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (studentSearch) {
        const q = studentSearch.toLowerCase()
        const matches = s.id.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (tariffFilter && s.tariff !== tariffFilter) return false
      if (balanceFilter === 'owing' && !(s.balance < 0)) return false
      if (balanceFilter === 'paid' && !(s.balance >= 0 && s.balance !== 0)) return false
      if (balanceFilter === 'zero' && s.balance !== 0) return false
      return true
    })
  }, [students, studentSearch, tariffFilter, balanceFilter])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (historySearch) {
        const q = historySearch.toLowerCase()
        const matches =
          (p.student_name || '').toLowerCase().includes(q) ||
          (p.student_id || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (methodFilter && p.method !== methodFilter) return false
      if (receivedByFilter && p.received_by !== receivedByFilter) return false
      return true
    })
  }, [payments, historySearch, methodFilter, receivedByFilter])

  const studentsTotalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE))
  const paginatedStudents = filteredStudents.slice((studentsPage - 1) * ITEMS_PER_PAGE, studentsPage * ITEMS_PER_PAGE)

  const historyTotalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE))
  const paginatedPayments = filteredPayments.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)

  useEffect(() => { setStudentsPage(1) }, [studentSearch, tariffFilter, balanceFilter])
  useEffect(() => { setHistoryPage(1) }, [historySearch, methodFilter, receivedByFilter])

  const addModalStudentOptions = useMemo(() => {
    if (!addStudentSearch) return students.slice(0, 30)
    const q = addStudentSearch.toLowerCase()
    return students.filter(s => s.id.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q)).slice(0, 30)
  }, [students, addStudentSearch])

  const withdrawModalStudentOptions = useMemo(() => {
    if (!withdrawStudentSearch) return students.slice(0, 30)
    const q = withdrawStudentSearch.toLowerCase()
    return students.filter(s => s.id.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q)).slice(0, 30)
  }, [students, withdrawStudentSearch])

  const studentPaymentHistory = (studentId: string) => {
    return payments.filter(p => p.student_id === studentId).slice(0, 25)
  }

  const addSelectedStudent = students.find(s => s.id === addStudentId)
  const withdrawSelectedStudent = students.find(s => s.id === withdrawStudentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--surface)] p-6 text-center text-[var(--danger)] shadow-[var(--shadow-sm)]">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: tab switcher + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'students' ? 'bg-[var(--accent)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <Users className="h-4 w-4" /> Students
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[var(--accent)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <Receipt className="h-4 w-4" /> Payment History
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Payment
          </button>
          <button
            onClick={() => { resetWithdrawForm(); setIsWithdrawModalOpen(true) }}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer"
          >
            <Minus className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </div>

      {activeTab === 'students' ? (
        <div className="flex flex-col gap-4">
          {/* Filter bar */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] bg-[var(--background)] rounded-[var(--radius-md)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <select
              value={tariffFilter}
              onChange={e => setTariffFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] cursor-pointer"
            >
              <option value="">All Tariffs</option>
              {tariffOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={balanceFilter}
              onChange={e => setBalanceFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] cursor-pointer"
            >
              <option value="">All Balances</option>
              <option value="owing">Owing</option>
              <option value="paid">Paid / Credit</option>
              <option value="zero">Zero Balance</option>
            </select>
          </div>

          <div className="text-xs text-[var(--foreground-muted)] italic px-1">
            {filteredStudents.length} students
          </div>

          {/* Student cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedStudents.map(student => {
              const isOwing = student.balance < 0
              return (
                <button
                  key={student.id}
                  onClick={() => openAddModal(student.id)}
                  className="text-left rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-md hover:bg-[var(--surface-elevated)] transition-all cursor-pointer w-full"
                >
                  <div className="font-bold text-[13px] uppercase text-[var(--foreground)] truncate tracking-wide">
                    {student.full_name}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-[6px] bg-[#0066cc] text-white">
                      {student.id}
                    </span>
                    {student.tariff && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-[6px] bg-[#10b981] text-white">
                        {student.tariff}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-[6px] text-white ${isOwing ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`}>
                      {student.balance > 0 ? '+' : ''}{formatAmount(student.balance)}
                    </span>
                    {student.discount > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-[6px] bg-[#be185d] text-white">
                        {formatAmount(student.discount)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center text-sm text-[var(--foreground-muted)]">
              No students match your filters.
            </div>
          )}

          {studentsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={studentsPage === 1}
                onClick={() => setStudentsPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs text-[var(--foreground-muted)]">{studentsPage} / {studentsTotalPages}</span>
              <button
                disabled={studentsPage === studentsTotalPages}
                onClick={() => setStudentsPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Filter bar */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search by name, ID, or notes..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] bg-[var(--background)] rounded-[var(--radius-md)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] cursor-pointer"
            >
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="Withdrawal">Withdrawal</option>
            </select>
            <select
              value={receivedByFilter}
              onChange={e => setReceivedByFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-elevated)] text-[var(--foreground)] cursor-pointer"
            >
              <option value="">All Receivers</option>
              {RECEIVED_BY_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="text-xs text-[var(--foreground-muted)] italic px-1">
            {filteredPayments.length} payments
          </div>

          {/* Payment history cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedPayments.map(payment => {
              const isWithdrawal = payment.amount < 0
              const timestamp = payment.created_at
                ? new Date(payment.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <div key={payment.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-[var(--foreground)] truncate">
                      {payment.student_name || 'General Payment'}
                    </span>
                    <span className="text-[10px] text-[var(--foreground-subtle)]">{timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-extrabold px-2 py-0.5 rounded-full ${isWithdrawal ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isWithdrawal ? '-' : '+'}{formatAmount(Math.abs(payment.amount))} UZS
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                      {payment.method}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border)]">
                      {payment.received_by}
                    </span>
                  </div>
                  {payment.notes && (
                    <div className="text-[11px] text-[var(--foreground-muted)] italic truncate" title={payment.notes}>
                      {payment.notes}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => openEditModal(payment)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => deletePayment(payment)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                    <button
                      onClick={() => printReceipt(payment)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] cursor-pointer"
                    >
                      <Printer className="h-3 w-3" /> Print
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredPayments.length === 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center text-sm text-[var(--foreground-muted)]">
              No payments match your filters.
            </div>
          )}

          {historyTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs text-[var(--foreground-muted)]">{historyPage} / {historyTotalPages}</span>
              <button
                disabled={historyPage === historyTotalPages}
                onClick={() => setHistoryPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Add Payment Modal ────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[var(--accent)]" /> Add Payment
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Amount</label>
              <input
                type="text"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--foreground-muted)]">Method</label>
                <select
                  value={addMethod}
                  onChange={e => setAddMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] cursor-pointer"
                >
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--foreground-muted)]">Received By</label>
                <select
                  value={addReceivedBy}
                  onChange={e => setAddReceivedBy(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] cursor-pointer"
                >
                  <option value="">Select receiver</option>
                  {RECEIVED_BY_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Student (optional)</label>
              {addSelectedStudent ? (
                <div className="mt-1 flex items-center justify-between px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)]">
                  <span className="text-[var(--foreground)] truncate">{addSelectedStudent.id} — {addSelectedStudent.full_name}</span>
                  <button onClick={() => setAddStudentId('')} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={addStudentSearch}
                    onChange={e => setAddStudentSearch(e.target.value)}
                    placeholder="Search student by name or ID..."
                    className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  {addStudentSearch && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)]">
                      {addModalStudentOptions.map(s => (
                        <div
                          key={s.id}
                          onClick={() => { setAddStudentId(s.id); setAddStudentSearch('') }}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                        >
                          {s.id} — {s.full_name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Notes</label>
              <textarea
                value={addNotes}
                onChange={e => setAddNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {NOTE_PILLS.map(pill => (
                  <button
                    key={pill}
                    onClick={() => setAddNotes(prev => prev ? `${prev}, ${pill}` : pill)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer text-[var(--foreground-muted)]"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {addSelectedStudent && studentPaymentHistory(addSelectedStudent.id).length > 0 && (
              <div className="border-t border-[var(--border)] pt-3">
                <div className="text-xs font-semibold text-[var(--foreground-muted)] mb-2">Recent Payments</div>
                <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                  {studentPaymentHistory(addSelectedStudent.id).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
                      <span>{p.created_at ? new Date(p.created_at).toLocaleDateString('uz-UZ') : ''}</span>
                      <span className={p.amount < 0 ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                        {p.amount < 0 ? '-' : '+'}{formatAmount(Math.abs(p.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={submitAddPayment}
              disabled={submitting}
              className="mt-2 w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ───────────────────────────────── */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsWithdrawModalOpen(false)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Wallet className="h-4 w-4 text-rose-500" /> Withdraw Payment
              </h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Amount</label>
              <input
                type="text"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Student (optional)</label>
              {withdrawSelectedStudent ? (
                <div className="mt-1 flex items-center justify-between px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)]">
                  <span className="text-[var(--foreground)] truncate">{withdrawSelectedStudent.id} — {withdrawSelectedStudent.full_name}</span>
                  <button onClick={() => setWithdrawStudentId('')} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={withdrawStudentSearch}
                    onChange={e => setWithdrawStudentSearch(e.target.value)}
                    placeholder="Search student by name or ID..."
                    className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  {withdrawStudentSearch && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)]">
                      {withdrawModalStudentOptions.map(s => (
                        <div
                          key={s.id}
                          onClick={() => { setWithdrawStudentId(s.id); setWithdrawStudentSearch('') }}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                        >
                          {s.id} — {s.full_name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Reason</label>
              <textarea
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value)}
                rows={2}
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <button
              onClick={submitWithdrawal}
              disabled={submitting}
              className="mt-2 w-full py-2.5 rounded-[var(--radius-md)] bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Confirm Withdrawal'}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Payment Modal ───────────────────────────── */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingPayment(null)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[var(--accent)]" /> Edit Payment
              </h3>
              <button onClick={() => setEditingPayment(null)} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Student</label>
              <div className="mt-1 px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground-muted)]">
                {editingPayment.student_id && editingPayment.student_name
                  ? `${editingPayment.student_id} - ${editingPayment.student_name}`
                  : 'No student (General payment)'}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Amount</label>
              <input
                type="text"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--foreground-muted)]">Method</label>
                <select
                  value={editMethod}
                  onChange={e => setEditMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] cursor-pointer"
                >
                  <option value="">Select method</option>
                  {[...PAYMENT_METHODS, 'Withdrawal'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--foreground-muted)]">Received By</label>
                <select
                  value={editReceivedBy}
                  onChange={e => setEditReceivedBy(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] cursor-pointer"
                >
                  <option value="">Select receiver</option>
                  {[...RECEIVED_BY_OPTIONS, 'System'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground-muted)]">Notes</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <button
              onClick={submitEditPayment}
              disabled={submitting}
              className="mt-2 w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
