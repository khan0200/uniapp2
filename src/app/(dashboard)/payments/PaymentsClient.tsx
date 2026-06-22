'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type Payment } from '@/types/database'
import { sendTelegramNotification } from '@/lib/telegram'
import {
  Users, Receipt, Plus, Minus, Search, ChevronDown, ChevronUp, X, Loader2,
  Pencil, Trash2, Printer, CreditCard, Wallet, LayoutGrid, Table, FileSpreadsheet
} from 'lucide-react'
import * as XLSX from 'xlsx-js-style'

const PAYMENT_METHODS = ['Karta J.A', 'Karta Abdulaziz', 'Naqd', 'Karta M.A', 'Bank', 'Discount']
const RECEIVED_BY_OPTIONS = ['ABDULAZIZ', 'MUSLIHIDDIN', 'BAXTIYOR', 'MUHAMMADALI', 'JASUR', 'ADMIN', 'Discount']
const NOTE_PILLS = ['Shartnoma uchun', 'Qarz', 'Elchixona uchun', 'Appfee', 'DISCOUNT']
const ITEMS_PER_PAGE = 30

const TARIFF_FILTER_OPTIONS = [
  'E-VISA (TIL SERTIFIKATISIZ)',
  'E-VISA (TIL SERTIFIKATLI)',
  'PREMIUM',
  'REGIONAL VISA',
  'STANDART',
  'VISA PLUS',
  'ZERO RISK',
  'No Tariff'
]

const BALANCE_FILTER_OPTIONS = [
  'Balance < 0 (Debt)',
  'Balance = 0 (Fully Paid)',
  'Balance > 500,000',
  'Balance > 1,000,000',
  'Balance > 2,000,000',
  'Balance > 5,000,000',
  'Balance > 10,000,000'
]

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

// Live-formats a raw amount input with thousands separators as the user types.
function formatAmountInput(val: string) {
  const cleaned = val.replace(/[^\d.]/g, '')
  if (!cleaned) return ''
  const [intPart, ...rest] = cleaned.split('.')
  const formattedInt = intPart === '' ? '' : new Intl.NumberFormat('uz-UZ').format(Number(intPart))
  return rest.length > 0 ? `${formattedInt}.${rest.join('').slice(0, 2)}` : formattedInt
}

const compareStudentIds = (a: Student, b: Student, order: 'asc' | 'desc' = 'asc') => {
  const idA = a.id || ""
  const idB = b.id || ""

  const parseId = (idStr: string) => {
    const str = idStr.trim()
    const match = str.match(/^([A-Za-z\s_-]*)(\d*)$/)
    if (match) {
      return {
        prefix: match[1] || "",
        num: match[2] ? parseInt(match[2], 10) : null
      }
    }
    return { prefix: str, num: null }
  }

  const valA = parseId(idA)
  const valB = parseId(idB)

  const prefixComp = valA.prefix.localeCompare(valB.prefix, undefined, { sensitivity: 'base' })
  if (prefixComp !== 0) {
    return order === 'asc' ? prefixComp : -prefixComp
  }

  if (valA.num !== null && valB.num !== null) {
    return order === 'asc' ? valA.num - valB.num : valB.num - valA.num
  } else if (valA.num !== null) {
    return order === 'asc' ? 1 : -1
  } else if (valB.num !== null) {
    return order === 'asc' ? -1 : 1
  }

  return order === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA)
}

export function PaymentsClient() {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Students tab search/filter
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([])
  const [selectedBalances, setSelectedBalances] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  const [isTariffDropdownOpen, setIsTariffDropdownOpen] = useState(false)
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false)
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)

  const tariffRef = useRef<HTMLDivElement>(null)
  const balanceRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
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
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tariffRef.current && !tariffRef.current.contains(event.target as Node)) {
        setIsTariffDropdownOpen(false)
      }
      if (balanceRef.current && !balanceRef.current.contains(event.target as Node)) {
        setIsBalanceDropdownOpen(false)
      }
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggleTariff = (val: string) => {
    setSelectedTariffs(prev =>
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    )
  }

  const handleToggleAllTariffs = () => {
    if (selectedTariffs.length === TARIFF_FILTER_OPTIONS.length) {
      setSelectedTariffs([])
    } else {
      setSelectedTariffs([...TARIFF_FILTER_OPTIONS])
    }
  }

  const handleToggleBalance = (val: string) => {
    setSelectedBalances(prev =>
      prev.includes(val) ? prev.filter(b => b !== val) : [...prev, val]
    )
  }

  const handleToggleAllBalances = () => {
    if (selectedBalances.length === BALANCE_FILTER_OPTIONS.length) {
      setSelectedBalances([])
    } else {
      setSelectedBalances([...BALANCE_FILTER_OPTIONS])
    }
  }

  const groupOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => { if (s.student_group) set.add(s.student_group) })
    const list = Array.from(set)
    if (!list.includes('2026 BAHOR')) list.push('2026 BAHOR')
    if (!list.includes('2026 KUZ')) list.push('2026 KUZ')
    if (!list.includes('2027 BAHOR')) list.push('2027 BAHOR')
    return list.sort()
  }, [students])

  const ALL_GROUP_OPTIONS = useMemo(() => {
    return ['No Group', ...groupOptions]
  }, [groupOptions])

  const handleToggleGroup = (val: string) => {
    setSelectedGroups(prev =>
      prev.includes(val) ? prev.filter(g => g !== val) : [...prev, val]
    )
  }

  const handleToggleAllGroups = () => {
    if (selectedGroups.length === ALL_GROUP_OPTIONS.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups([...ALL_GROUP_OPTIONS])
    }
  }

  const matchesBalanceOption = (studentBalance: number, option: string) => {
    switch (option) {
      case 'Balance < 0 (Debt)':
        return studentBalance < 0
      case 'Balance = 0 (Fully Paid)':
        return studentBalance === 0
      case 'Balance > 500,000':
        return studentBalance > 500000
      case 'Balance > 1,000,000':
        return studentBalance > 1000000
      case 'Balance > 2,000,000':
        return studentBalance > 2000000
      case 'Balance > 5,000,000':
        return studentBalance > 5000000
      case 'Balance > 10,000,000':
        return studentBalance > 10000000
      default:
        return false
    }
  }

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

      // Send Telegram Notification
      const safeName = student?.full_name 
        ? student.full_name.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') 
        : (addStudentId ? 'Unknown' : 'General Payment')
      const amountFormatted = new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS'
      const newBalance = student ? (student.balance || 0) + amount : 0
      const balanceFormatted = student ? new Intl.NumberFormat('uz-UZ').format(newBalance) + ' UZS' : '-'
      const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const safeNotes = addNotes.trim() ? addNotes.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'None'

      let notifMsg = ''
      if (isDiscount) {
        notifMsg = `🟨 <b>Discount Added</b>\n\n🆔 <b>ID:</b> ${addStudentId || '-'}\n👤 <b>Student:</b> ${safeName}\n💰 <b>Amount:</b> ${amountFormatted}\n💼 <b>Balance:</b> ${balanceFormatted}\n📝 <b>Note:</b> ${safeNotes}\n\n📅 <b>Date:</b> ${curDate}`
      } else {
        let tariffName = '-'
        if (student?.tariff) {
          tariffName = student.tariff
          if (student.tariff === 'E-VISA') {
            tariffName += (student.language_certificate && student.language_certificate !== 'NO CERTIFICATE')
              ? ' (TIL SERTIFIKATLI)'
              : ' (TIL SERTIFIKATISIZ)'
          }
        }
        notifMsg = `🟩 <b>Payment Received</b>\n\n🆔 <b>ID:</b> ${addStudentId || '-'}\n👤 <b>Name:</b> ${safeName}\n\n📰 <b>Tariff:</b> ${tariffName}\n💰 <b>Amount:</b> ${amountFormatted}\n💼 <b>Balance:</b> ${balanceFormatted}\n💳 <b>Payment Type:</b> ${addMethod || '-'}\n🧾 <b>Received by:</b> ${addReceivedBy || '-'}\n\n📝 <b>Note:</b> ${safeNotes}\n\n📅 <b>Date:</b> ${curDate}`
      }
      sendTelegramNotification(notifMsg)

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

      // Send Telegram Notification
      const safeName = student?.full_name 
        ? student.full_name.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') 
        : (withdrawStudentId ? 'Unknown' : 'General Withdrawal')
      const amountFormatted = new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS'
      const newBalance = student ? (student.balance || 0) - amount : 0
      const balanceFormatted = student ? new Intl.NumberFormat('uz-UZ').format(newBalance) + ' UZS' : '-'
      const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const safeNotes = `WITHDRAWAL: ${withdrawReason.trim().toUpperCase()}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const notifMsg = `🟥 <b>Withdrawal</b>\n\n🆔 <b>Student ID:</b> ${withdrawStudentId || '-'}\n👤 <b>Student:</b> ${safeName}\n💰 <b>Amount:</b> -${amountFormatted}\n💼 <b>Balance:</b> ${balanceFormatted}\n📝 <b>Note:</b> ${safeNotes}\n\n📅 <b>Date:</b> ${curDate}`
      sendTelegramNotification(notifMsg)

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

      // Send Telegram Notification
      const student = payment.student_id ? students.find(s => s.id === payment.student_id) : null
      const safeName = student?.full_name 
        ? student.full_name.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') 
        : (payment.student_name 
          ? payment.student_name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') 
          : 'Unknown')
      const amountFormatted = new Intl.NumberFormat('uz-UZ').format(Math.abs(payment.amount)) + ' UZS'
      const newBalance = student ? (student.balance || 0) - payment.amount : 0
      const balanceFormatted = student ? new Intl.NumberFormat('uz-UZ').format(newBalance) + ' UZS' : '-'

      const notifMsg = `🟥 <b>Payment Deleted</b>\n\n🆔 <b>ID:</b> ${payment.student_id || '-'}\n👤 <b>Student:</b> ${safeName}\n💰 <b>Amount:</b> -${amountFormatted}\n💼 <b>Balance:</b> ${balanceFormatted}`
      sendTelegramNotification(notifMsg)

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
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (studentSearch) {
        const q = studentSearch.toLowerCase()
        const matches = s.id.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q)
        if (!matches) return false
      }

      if (selectedTariffs.length > 0) {
        let matchesTariff = false
        for (const selected of selectedTariffs) {
          if (selected === 'No Tariff' && !s.tariff) {
            matchesTariff = true
            break
          } else if (selected === 'E-VISA (TIL SERTIFIKATLI)' && s.tariff === 'E-VISA' && s.language_certificate && s.language_certificate !== 'NO CERTIFICATE') {
            matchesTariff = true
            break
          } else if (selected === 'E-VISA (TIL SERTIFIKATISIZ)' && s.tariff === 'E-VISA' && (!s.language_certificate || s.language_certificate === 'NO CERTIFICATE')) {
            matchesTariff = true
            break
          } else if (s.tariff === selected) {
            matchesTariff = true
            break
          }
        }
        if (!matchesTariff) return false
      }

      if (selectedBalances.length > 0) {
        let matchesBalance = false
        for (const selected of selectedBalances) {
          if (matchesBalanceOption(s.balance, selected)) {
            matchesBalance = true
            break
          }
        }
        if (!matchesBalance) return false
      }

      if (selectedGroups.length > 0) {
        let matchesGroup = false
        for (const selected of selectedGroups) {
          if (selected === 'No Group' && !s.student_group) {
            matchesGroup = true
            break
          } else if (s.student_group === selected) {
            matchesGroup = true
            break
          }
        }
        if (!matchesGroup) return false
      }

      return true
    })
  }, [students, studentSearch, selectedTariffs, selectedBalances, selectedGroups])

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

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => compareStudentIds(a, b, sortOrder))
  }, [filteredStudents, sortOrder])

  const studentsTotalPages = Math.max(1, Math.ceil(sortedStudents.length / ITEMS_PER_PAGE))
  const paginatedStudents = sortedStudents.slice((studentsPage - 1) * ITEMS_PER_PAGE, studentsPage * ITEMS_PER_PAGE)

  const historyTotalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE))
  const paginatedPayments = filteredPayments.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)

  useEffect(() => { setStudentsPage(1) }, [studentSearch, selectedTariffs, selectedBalances, selectedGroups, sortOrder])
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

  // Helper to style SheetJS worksheets beautifully for Payment History
  const styleWorksheet = (ws: any) => {
    if (!ws) return

    const ref = ws['!ref']
    if (!ref) return
    
    const decodeRange = (rangeStr: string) => {
      const parts = rangeStr.split(':')
      const start = parts[0]
      const end = parts[1] || parts[0]
      
      const parseCell = (cellStr: string) => {
        const match = cellStr.match(/^([A-Z]+)([0-9]+)$/)
        if (!match) return { c: 0, r: 0 }
        
        let c = 0
        const colStr = match[1]
        for (let i = 0; i < colStr.length; i++) {
          c = c * 26 + (colStr.charCodeAt(i) - 64)
        }
        return { c: c - 1, r: parseInt(match[2], 10) - 1 }
      }
      
      return { s: parseCell(start), e: parseCell(end) }
    }

    const encodeCell = (cell: { c: number; r: number }) => {
      let colStr = ''
      let temp = cell.c
      while (temp >= 0) {
        colStr = String.fromCharCode((temp % 26) + 65) + colStr
        temp = Math.floor(temp / 26) - 1
      }
      return colStr + (cell.r + 1)
    }

    const range = decodeRange(ref)

    const headerStyle = {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F497D' } }, // Premium Deep Navy Blue
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '1F497D' } },
        bottom: { style: 'medium', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '1F497D' } },
        right: { style: 'thin', color: { rgb: '1F497D' } }
      }
    }

    const centerStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } }, // Subtle light blue-gray for zebra striping
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const centerStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const leftStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const leftStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const rightStyleEven = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'F2F6FB' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    const rightStyleOdd = {
      font: { name: 'Segoe UI', sz: 10 },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }

    // Loop through all cell coordinates in range
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = encodeCell({ r: R, c: C })
        let cell = ws[cellRef]
        if (!cell) {
          cell = { t: 's', v: '' }
          ws[cellRef] = cell
        }

        if (R === 0) {
          cell.s = headerStyle
          continue
        }

        const isEven = R % 2 === 0
        let style = isEven ? leftStyleEven : leftStyleOdd

        const colHeaderCell = ws[encodeCell({ r: 0, c: C })]
        const headerName = colHeaderCell ? String(colHeaderCell.v).toUpperCase() : ''

        if (
          headerName === 'NO' ||
          headerName === 'PAYMENT ID' ||
          headerName === 'STUDENT ID' ||
          headerName === 'TRANSACTION TYPE' ||
          headerName === 'PAYMENT METHOD' ||
          headerName === 'RECEIVED BY' ||
          headerName === 'DATE & TIME'
        ) {
          style = isEven ? centerStyleEven : centerStyleOdd
        } else if (headerName.includes('UZS') || headerName.includes('AMOUNT') || headerName.includes('BALANCE')) {
          style = isEven ? rightStyleEven : rightStyleOdd
          if (cell.v !== '' && cell.v !== null && cell.v !== undefined) {
            const num = parseFloat(String(cell.v).replace(/,/g, ''))
            if (!isNaN(num)) {
              cell.t = 'n'
              cell.v = num
              cell.z = '#,##0'
            }
          }
        }

        cell.s = style
      }
    }

    const rowHeights = []
    rowHeights.push({ hpx: 28 }) // Header
    for (let R = 1; R <= range.e.r; ++R) {
      rowHeights.push({ hpx: 22 })
    }
    ws['!rows'] = rowHeights
  }

  // Export current filtered payment history to Excel
  const exportPaymentHistoryToExcel = () => {
    if (filteredPayments.length === 0) {
      alert('No payments to export!')
      return
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }

    const excelData = filteredPayments.map((p, index) => {
      let txType = 'Standard Payment'
      if (p.is_withdrawal) {
        txType = 'Withdrawal'
      } else if (p.is_discount) {
        txType = 'Discount'
      }

      return {
        No: index + 1,
        'Payment ID': p.id ? p.id.toUpperCase() : '',
        'Student ID': p.student_id || '—',
        'Student Name': p.student_name || 'General Payment',
        'Amount (UZS)': p.amount !== undefined ? p.amount : '',
        'Transaction Type': txType,
        'Payment Method': p.method || '',
        'Received By': p.received_by || '',
        'Date & Time': formatDate(p.created_at),
        Notes: p.notes || ''
      }
    })

    const colWidths = [
      { wch: 5 },   // No
      { wch: 20 },  // Payment ID
      { wch: 15 },  // Student ID
      { wch: 30 },  // Student Name
      { wch: 18 },  // Amount (UZS)
      { wch: 18 },  // Transaction Type
      { wch: 18 },  // Payment Method
      { wch: 18 },  // Received By
      { wch: 22 },  // Date & Time
      { wch: 35 }   // Notes
    ]

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payment History')
    ws['!cols'] = colWidths

    styleWorksheet(ws)

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `Payment_History_Export_${dateStr}.xlsx`

    XLSX.writeFile(wb, filename)
  }

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
            {/* Tariff Filter Dropdown */}
            <div className="relative" ref={tariffRef}>
              <button
                type="button"
                onClick={() => {
                  setIsTariffDropdownOpen(prev => !prev)
                  setIsBalanceDropdownOpen(false)
                  setIsGroupDropdownOpen(false)
                }}
                className={`px-4 py-2 text-sm border rounded-full text-[var(--foreground)] cursor-pointer flex items-center justify-between gap-2 min-w-[140px] focus:outline-none select-none transition-all ${
                  isTariffDropdownOpen ? 'border-blue-600 bg-[var(--surface-elevated)] ring-1 ring-blue-600' : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-400'
                }`}
              >
                <span className="truncate max-w-[150px]">
                  {selectedTariffs.length === 0 || selectedTariffs.length === TARIFF_FILTER_OPTIONS.length
                    ? 'All Tariffs'
                    : selectedTariffs.join(', ')}
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--foreground-muted)] transition-transform duration-200 ${isTariffDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {isTariffDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-2.5 z-40 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
                  <div
                    onClick={handleToggleAllTariffs}
                    className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-bold text-[var(--foreground)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTariffs.length === TARIFF_FILTER_OPTIONS.length}
                      readOnly
                      className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Select All</span>
                  </div>
                  <div className="h-px bg-[var(--border)] my-1.5" />
                  {TARIFF_FILTER_OPTIONS.map(opt => {
                    const isChecked = selectedTariffs.includes(opt)
                    return (
                      <div
                        key={opt}
                        onClick={() => handleToggleTariff(opt)}
                        className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-medium text-[var(--foreground)]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{opt}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Balance Filter Dropdown */}
            <div className="relative" ref={balanceRef}>
              <button
                type="button"
                onClick={() => {
                  setIsBalanceDropdownOpen(prev => !prev)
                  setIsTariffDropdownOpen(false)
                  setIsGroupDropdownOpen(false)
                }}
                className={`px-4 py-2 text-sm border rounded-full text-[var(--foreground)] cursor-pointer flex items-center justify-between gap-2 min-w-[140px] focus:outline-none select-none transition-all ${
                  isBalanceDropdownOpen ? 'border-blue-600 bg-[var(--surface-elevated)] ring-1 ring-blue-600' : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-400'
                }`}
              >
                <span className="truncate max-w-[150px]">
                  {selectedBalances.length === 0 || selectedBalances.length === BALANCE_FILTER_OPTIONS.length
                    ? 'All Balances'
                    : selectedBalances.join(', ')}
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--foreground-muted)] transition-transform duration-200 ${isBalanceDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {isBalanceDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-2.5 z-40 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
                  <div
                    onClick={handleToggleAllBalances}
                    className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-bold text-[var(--foreground)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBalances.length === BALANCE_FILTER_OPTIONS.length}
                      readOnly
                      className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Select All</span>
                  </div>
                  <div className="h-px bg-[var(--border)] my-1.5" />
                  {BALANCE_FILTER_OPTIONS.map(opt => {
                    const isChecked = selectedBalances.includes(opt)
                    return (
                      <div
                        key={opt}
                        onClick={() => handleToggleBalance(opt)}
                        className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-medium text-[var(--foreground)]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{opt}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Group Filter Dropdown */}
            <div className="relative" ref={groupRef}>
              <button
                type="button"
                onClick={() => {
                  setIsGroupDropdownOpen(prev => !prev)
                  setIsTariffDropdownOpen(false)
                  setIsBalanceDropdownOpen(false)
                }}
                className={`px-4 py-2 text-sm border rounded-full text-[var(--foreground)] cursor-pointer flex items-center justify-between gap-2 min-w-[140px] focus:outline-none select-none transition-all ${
                  isGroupDropdownOpen ? 'border-blue-600 bg-[var(--surface-elevated)] ring-1 ring-blue-600' : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-400'
                }`}
              >
                <span className="truncate max-w-[150px]">
                  {selectedGroups.length === 0 || selectedGroups.length === ALL_GROUP_OPTIONS.length
                    ? 'All Groups'
                    : selectedGroups.map(g => g === 'No Group' ? 'No Group' : g).join(', ')}
                </span>
                <ChevronDown className={`h-4 w-4 text-[var(--foreground-muted)] transition-transform duration-200 ${isGroupDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {isGroupDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-2.5 z-40 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
                  <div
                    onClick={handleToggleAllGroups}
                    className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-bold text-[var(--foreground)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.length === ALL_GROUP_OPTIONS.length}
                      readOnly
                      className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Select All</span>
                  </div>
                  <div className="h-px bg-[var(--border)] my-1.5" />
                  {ALL_GROUP_OPTIONS.map(opt => {
                    const isChecked = selectedGroups.includes(opt)
                    return (
                      <div
                        key={opt}
                        onClick={() => handleToggleGroup(opt)}
                        className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors select-none text-xs font-medium text-[var(--foreground)]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{opt}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] p-1 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[var(--accent)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
                }`}
                title="Grid View (Cards)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-[var(--accent)] text-white' : 'text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
                }`}
                title="Table View"
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-xs text-[var(--foreground-muted)] italic px-1">
            {filteredStudents.length} students
          </div>

          {/* Student list grid/table */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedStudents.map(student => {
                const isOwing = student.balance < 0
                return (
                  <button
                    key={student.id}
                    onClick={() => openAddModal(student.id)}
                    className="text-left rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-md hover:bg-[var(--surface-elevated)] transition-all cursor-pointer w-full"
                  >
                    <div className="font-bold text-[17px] uppercase text-[var(--foreground)] truncate tracking-wide">
                      {student.full_name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-[13px] font-bold px-2 py-1 rounded-[6px] bg-[#0066cc] text-white">
                        {student.id}
                      </span>
                      {student.tariff && (
                        <span className="text-[13px] font-bold px-2.5 py-1 rounded-[6px] bg-[#10b981] text-white">
                          {student.tariff}
                          {student.tariff === 'E-VISA' && (
                            student.language_certificate && student.language_certificate !== 'NO CERTIFICATE'
                              ? ' (TIL SERTIFIKATLI)'
                              : ' (TIL SERTIFIKATISIZ)'
                          )}
                        </span>
                      )}
                      <span className={`text-[13px] font-bold px-2.5 py-1 rounded-[6px] text-white ${isOwing ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`}>
                        {student.balance > 0 ? '+' : ''}{formatAmount(student.balance)}
                      </span>
                      {student.discount !== null && student.discount !== undefined && (
                        <span className="text-[13px] font-bold px-2.5 py-1 rounded-[6px] bg-[#be185d] text-white">
                          {formatAmount(student.discount)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[14px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)] select-none">
                      <th 
                        className="px-6 py-3.5 w-28 cursor-pointer select-none hover:bg-[var(--surface-elevated)] transition-colors rounded-tl-[var(--radius-lg)]"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      >
                        <span className="flex items-center gap-1 font-bold text-[14px] uppercase tracking-wider text-[var(--foreground-muted)] dark:text-[var(--foreground)]">
                          ID
                          {sortOrder === 'asc' ? (
                            <ChevronDown className="h-3 w-3 text-[var(--accent)]" />
                          ) : (
                            <ChevronUp className="h-3 w-3 text-[var(--accent)]" />
                          )}
                        </span>
                      </th>
                      <th className="px-6 py-3.5">Full Name</th>
                      <th className="px-6 py-3.5">Group</th>
                      <th className="px-6 py-3.5">Tariff</th>
                      <th className="px-6 py-3.5">Balance</th>
                      <th className="px-6 py-3.5">Discount</th>
                      <th className="px-6 py-3.5 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {paginatedStudents.map((student) => {
                      const isOwing = student.balance < 0
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-[var(--surface-elevated)] transition-colors text-[15.5px] text-[var(--foreground)]"
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[14px] font-bold bg-[#0066cc] text-white rounded-[4px] shadow-sm select-all">
                              {student.id}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold uppercase tracking-wide text-[15.5px]">
                            {student.full_name}
                          </td>
                          <td className="px-6 py-4 text-[15.5px] font-medium text-[var(--foreground-muted)]">
                            {student.student_group || '—'}
                          </td>
                          <td className="px-6 py-4">
                            {student.tariff ? (
                              <span className="inline-flex px-2 py-0.5 rounded-[4px] text-[13px] font-bold bg-[#10b981] text-white uppercase">
                                {student.tariff}
                                {student.tariff === 'E-VISA' && (
                                  student.language_certificate && student.language_certificate !== 'NO CERTIFICATE'
                                    ? ' (TIL SERTIFIKATLI)'
                                    : ' (TIL SERTIFIKATISIZ)'
                                )}
                              </span>
                            ) : (
                              <span className="text-[15.5px] text-[var(--foreground-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[13px] font-bold text-white ${isOwing ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`}>
                              {student.balance > 0 ? '+' : ''}{formatAmount(student.balance)} UZS
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {student.discount !== null && student.discount !== undefined ? (
                              <span className="inline-flex px-2 py-0.5 rounded-[4px] text-[13px] font-bold bg-[#be185d] text-white">
                                {formatAmount(student.discount)} UZS
                              </span>
                            ) : (
                              <span className="text-[15.5px] text-[var(--foreground-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openAddModal(student.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-semibold rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-all cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Pay
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
            <button
              onClick={exportPaymentHistoryToExcel}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-all cursor-pointer"
              title="Download Payment History as Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" /> Export Excel
            </button>
          </div>

          <div className="text-xs text-[var(--foreground-muted)] italic px-1">
            {filteredPayments.length} payments
          </div>

          {/* Payment history cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {paginatedPayments.map(payment => {
              const isWithdrawal = payment.amount < 0
              const timestamp = payment.created_at
                ? new Date(payment.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <div
                  key={payment.id}
                  onClick={() => setViewingPayment(payment)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border-subtle)] transition-all duration-200 cursor-pointer flex flex-col justify-between h-full gap-4 group"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-[14.5px] uppercase tracking-wide text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors" title={payment.student_name || 'General Payment'}>
                        {payment.student_name || 'General Payment'}
                      </span>
                      <span className="text-[10px] font-medium text-[var(--foreground-subtle)] whitespace-nowrap pt-0.5">
                        {timestamp}
                      </span>
                    </div>

                    {/* Amount & Badges Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-[6px] text-[13.5px] font-extrabold ${isWithdrawal ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'}`}>
                        {isWithdrawal ? '-' : '+'}{formatAmount(Math.abs(payment.amount))} UZS
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider bg-[var(--surface-interactive)] text-[var(--foreground-muted)] border border-[var(--border)]">
                        {payment.method}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider bg-[var(--surface-interactive)] text-[var(--foreground-muted)] border border-[var(--border)]">
                        {payment.received_by}
                      </span>
                    </div>

                    {/* Notes Section */}
                    {payment.notes && (
                      <div className="pt-2.5 border-t border-[var(--border-subtle)]">
                        <div className="text-[11.5px] text-[var(--foreground-muted)] leading-relaxed italic line-clamp-2" title={payment.notes}>
                          {payment.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 pt-3.5 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(payment); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePayment(payment); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] border border-rose-200 bg-rose-50/50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer dark:bg-rose-500/5 dark:border-rose-500/20 dark:hover:bg-rose-500 dark:hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); printReceipt(payment); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
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
                onChange={e => setAddAmount(formatAmountInput(e.target.value))}
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
                    onClick={() => {
                      setAddNotes(prev => {
                        const newNotes = prev ? `${prev}, ${pill}` : pill
                        if (pill === 'DISCOUNT') {
                          setAddMethod('Discount')
                          setAddReceivedBy('Discount')
                        }
                        return newNotes
                      })
                    }}
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
                onChange={e => setWithdrawAmount(formatAmountInput(e.target.value))}
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
                onChange={e => setEditAmount(formatAmountInput(e.target.value))}
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

      {/* ── Payment Details Modal ───────────────────────── */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingPayment(null)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[var(--accent)]" /> Payment Details
              </h3>
              <button onClick={() => setViewingPayment(null)} className="cursor-pointer text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Payment ID */}
              <div className="flex items-center justify-between text-xs border-b border-[var(--border)] pb-2">
                <span className="text-[var(--foreground-muted)] font-semibold">Payment ID</span>
                <span className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)] select-all uppercase">
                  {viewingPayment.id}
                </span>
              </div>

              {/* Student Details */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--foreground-muted)]">Student</span>
                <div className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-0.5">
                  {viewingPayment.student_id ? (
                    <>
                      <span className="text-sm font-bold text-[var(--foreground)] uppercase">
                        {viewingPayment.student_name}
                      </span>
                      <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                        ID: <span className="text-[var(--accent)] font-mono font-bold">{viewingPayment.student_id}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--foreground-muted)] italic">General Payment (No Student Linked)</span>
                  )}
                </div>
              </div>

              {/* Amount and Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)]">Amount</span>
                  <div className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
                    <span className={`text-base font-extrabold ${viewingPayment.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {viewingPayment.amount < 0 ? '-' : '+'}{formatAmount(Math.abs(viewingPayment.amount))} UZS
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)]">Transaction Type</span>
                  <div className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] flex items-center">
                    {viewingPayment.is_withdrawal ? (
                      <span className="inline-flex px-2.5 py-1 rounded-[6px] text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 uppercase">
                        Withdrawal
                      </span>
                    ) : viewingPayment.is_discount ? (
                      <span className="inline-flex px-2.5 py-1 rounded-[6px] text-xs font-bold bg-pink-500/15 text-pink-600 dark:text-pink-400 uppercase">
                        Discount
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-[6px] text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                        Standard Payment
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Method and Receiver */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)]">Payment Method</span>
                  <div className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)]">
                    {viewingPayment.method}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--foreground-muted)]">Received By</span>
                  <div className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)]">
                    {viewingPayment.received_by}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--foreground-muted)]">Timestamp</span>
                <div className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--foreground)]">
                  {viewingPayment.created_at
                    ? new Date(viewingPayment.created_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '—'}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--foreground-muted)]">Notes / Description</span>
                <div className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--foreground)] min-h-[50px] whitespace-pre-wrap">
                  {viewingPayment.notes || (
                    <span className="text-[var(--foreground-muted)] italic">No notes attached.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  setViewingPayment(null);
                  openEditModal(viewingPayment);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface)] transition-all cursor-pointer text-[var(--foreground)]"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={() => {
                  printReceipt(viewingPayment);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface)] transition-all cursor-pointer text-[var(--foreground)]"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={() => setViewingPayment(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
