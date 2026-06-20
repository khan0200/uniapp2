'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, RefreshCw, Trash2, Loader2, Upload, FileText, CheckCircle2,
  AlertCircle, Edit, Copy, ChevronDown, ChevronUp, Cpu, Sliders, CheckSquare, Eye, EyeOff
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLanguageCertificate, type StudentLevel, type StudentTariff } from '@/types/database'

interface ExtractClientProps {
  studentId: string
}

interface ExtractedField {
  key: string
  value: string
}

const FIELD_MAPPING: Record<string, keyof Student> = {
  "FULL NAME": "full_name",
  "PASSPORT NUMBER": "passport",
  "DATE OF BIRTH": "birthday",
  "DATE OF ISSUE": "passport_issue_date",
  "DATE OF EXPIRATION": "passport_expire_date",
  "SEX": "gender",
  "EMAIL": "email",
  "PHONE NUMBER 1": "phone1",
  "PHONE NUMBER 2": "phone2",
  "PHONE 1": "phone1",
  "PHONE 2": "phone2",
  "ADDRESS": "address",
  "NAME OF SCHOOL / EDUCATIONAL INSTITUTION": "educational_background",
  "NAME OF SCHOOL OR EDUCATIONAL INSTITUTION": "educational_background",
  "NAME OF SCHOOL": "educational_background",
  "EDUCATIONAL INSTITUTION": "educational_background",
  "SCHOOL NAME": "educational_background"
}

export function ExtractClient({ studentId }: ExtractClientProps) {
  const supabase = createClient()
  const router = useRouter()

  // Student Profile details
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload & Extraction states
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/jpeg')
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  
  const [extractedData, setExtractedData] = useState<{
    document_type?: string
    fields?: Record<string, string>
    ocr_text?: string
  } | null>(null)

  const [extractedFieldsList, setExtractedFieldsList] = useState<ExtractedField[]>([])
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({})

  // Modal / Edits state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Layout states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOcrOpen, setIsOcrOpen] = useState(false)
  const [ocrSearchQuery, setOcrSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null)

  // Settings states (stored in localStorage)
  const [aiSettings, setAiSettings] = useState({
    provider: 'gemini',
    apiKey: '',
    openaiApiKey: '',
    model: 'gemini-1.5-flash',
    openaiModel: 'gpt-4o-mini',
    normalizeDates: true,
    mergeNames: true,
    extractStructured: true,
    includeOcr: true
  })
  
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load settings and student details
  useEffect(() => {
    // Load local storage AI settings
    try {
      const stored = localStorage.getItem('ai_settings')
      if (stored) {
        setAiSettings(prev => ({ ...prev, ...JSON.parse(stored) }))
      }
    } catch (e) {
      console.warn('Failed to parse ai_settings from local storage', e)
    }

    const fetchStudent = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error: fetchErr } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single()

        if (fetchErr) throw fetchErr
        setSelectedStudent(data)
      } catch (err: any) {
        console.error('Error fetching student details for extraction:', err)
        setError(err.message || 'Failed to load student details.')
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  // Save AI Settings helper
  const saveSettings = (updated: typeof aiSettings) => {
    setAiSettings(updated)
    try {
      localStorage.setItem('ai_settings', JSON.stringify(updated))
      showToast('AI settings saved successfully!', 'success')
    } catch (e) {
      console.error('Failed to save ai_settings', e)
    }
  }

  // Toast notification helper
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Client-side image compression
  const compressImage = (file: File): Promise<{ dataUrl: string; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxDimension = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          const base64 = dataUrl.split(',')[1]
          resolve({ dataUrl, base64 })
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          const file = items[i].getAsFile()
          if (file) {
            await processFile(file)
            showToast('Image pasted from clipboard!', 'success')
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [])

  const processFile = async (file: File) => {
    if (!file.type.match('image.*')) {
      showToast('Error: Only image files (JPG, PNG, WEBP) are supported.', 'danger')
      return
    }

    setUploading(true)
    try {
      const { dataUrl } = await compressImage(file)
      setUploadedImage(dataUrl)
      setUploadedMimeType(file.type)
      setUploadedFileName(file.name)
      // Reset past extraction state
      setExtractedData(null)
      setExtractedFieldsList([])
      setSavedFields({})
    } catch (err: any) {
      console.error('File compression error:', err)
      showToast('Failed to process image file.', 'danger')
    } finally {
      setUploading(false)
    }
  }

  const clearUploadedImage = () => {
    setUploadedImage(null)
    setUploadedFileName('')
    setExtractedData(null)
    setExtractedFieldsList([])
    setSavedFields({})
  }

  // AI Extraction runner
  const triggerExtraction = async () => {
    if (!uploadedImage) {
      showToast('Please upload or paste a document first.', 'info')
      return
    }

    setUploading(true)
    try {
      const base64Image = uploadedImage.split(',')[1]

      const payload = {
        image: base64Image,
        mimeType: 'image/jpeg', // Compressed to JPEG
        provider: aiSettings.provider,
        apiKey: aiSettings.provider === 'openai' ? aiSettings.openaiApiKey : aiSettings.apiKey,
        model: aiSettings.provider === 'openai' ? aiSettings.openaiModel : aiSettings.model,
        settings: {
          normalizeDates: aiSettings.normalizeDates,
          mergeNames: aiSettings.mergeNames,
          extractStructured: aiSettings.extractStructured,
          includeOcr: aiSettings.includeOcr
        }
      }

      const response = await fetch('/api/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract document information.')
      }

      // Success! Set data
      setExtractedData(data)
      showToast('Document analyzed successfully!', 'success')

      // Simulated progressive fields reveal
      const fieldsArray: ExtractedField[] = []
      if (data.fields) {
        Object.keys(data.fields).forEach((key) => {
          if (data.fields[key]) {
            fieldsArray.push({ key, value: data.fields[key] })
          }
        })
      }

      setExtractedFieldsList([])
      let delay = 0
      fieldsArray.forEach((field, index) => {
        setTimeout(() => {
          setExtractedFieldsList(prev => [...prev, field])
        }, delay)
        delay += 150
      })

    } catch (err: any) {
      console.error('Extraction failed:', err)
      showToast(err.message || 'AI Extraction failed.', 'danger')
    } finally {
      setUploading(false)
    }
  }

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!', 'success')
  }

  // Delete extracted field locally
  const handleDeleteField = (index: number) => {
    const key = extractedFieldsList[index].key
    if (confirm(`Are you sure you want to remove the field "${key.replace(/_/g, ' ')}"?`)) {
      setExtractedFieldsList(prev => prev.filter((_, i) => i !== index))
      showToast('Field removed locally.', 'info')
    }
  }

  // Edit extracted field modal openers
  const openEditModal = (index: number) => {
    setEditingIndex(index)
    setEditValue(extractedFieldsList[index].value)
    setIsEditModalOpen(true)
  }

  const saveEditedField = () => {
    if (editingIndex === null) return
    const updated = [...extractedFieldsList]
    updated[editingIndex].value = editValue
    setExtractedFieldsList(updated)
    setIsEditModalOpen(false)
    setEditingIndex(null)
    showToast('Field updated locally.', 'success')
  }

  // Database Save Field logic
  const handleSaveFieldToProfile = async (fieldLabel: string, value: string) => {
    const cleanLabel = fieldLabel.replace(/_/g, ' ').toUpperCase().trim()
    const dbField = FIELD_MAPPING[cleanLabel]

    if (!dbField) {
      showToast(`No database mapping found for field: ${fieldLabel}`, 'danger')
      return
    }

    if (!selectedStudent) return

    try {
      let finalValue: any = value.trim()

      // Normalization rules based on database constraints
      if (dbField === 'gender') {
        const char = finalValue.toUpperCase()[0]
        if (char === 'M') finalValue = 'MALE'
        else if (char === 'F') finalValue = 'FEMALE'
        else {
          alert('Gender value must be MALE or FEMALE. Please edit the field first.')
          return
        }
      }

      if (dbField === 'birthday' && finalValue) {
        const birthdayPattern = /^\d{4}-\d{2}-\d{2}$/
        if (!birthdayPattern.test(finalValue)) {
          alert('Birthday must be in format YYYY-MM-DD (e.g. 1999-05-15).')
          return
        }
      }

      if (dbField === 'passport' && finalValue) {
        // Enforce UPPERCASE alphanumeric without spaces
        finalValue = finalValue.replace(/\s/g, '').toUpperCase()
        const passportPattern = /^[A-Z]{2}[0-9]{7}$/
        if (!passportPattern.test(finalValue)) {
          alert('Passport must be formatted as TTDDDDDDD, for example FA1234545.')
          return
        }
      }

      // Convert other standard strings to uppercase if needed
      if (['full_name', 'address', 'educational_background'].includes(dbField as string)) {
        finalValue = finalValue.toUpperCase()
      }

      // Supabase update
      const updateData = {
        [dbField]: finalValue,
        updated_at: new Date().toISOString()
      }

      const { error: updateErr } = await (supabase
        .from('students') as any)
        .update(updateData)
        .eq('id', studentId)

      if (updateErr) throw updateErr

      // Successfully saved!
      showToast(`${cleanLabel} saved successfully!`, 'success')
      setSavedFields(prev => ({ ...prev, [fieldLabel]: true }))

      // Sync local student details state for header display
      setSelectedStudent(prev => prev ? { ...prev, ...updateData } : null)

    } catch (err: any) {
      console.error('Supabase save error:', err)
      showToast(err.message || 'Failed to save field to profile.', 'danger')
    }
  }

  // Highlight OCR Search matches
  const getHighlightedOcr = () => {
    if (!extractedData?.ocr_text) return ''
    if (!ocrSearchQuery) return extractedData.ocr_text

    const raw = extractedData.ocr_text
    const escaped = ocrSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return raw.replace(regex, `<mark class="bg-amber-400/40 text-white rounded px-0.5">$1</mark>`)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--foreground-muted)]">Loading student data...</p>
        </div>
      </div>
    )
  }

  if (error || !selectedStudent) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-[var(--danger)] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Error Loading Profile</h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">{error || 'Student profile not found.'}</p>
        <Link
          href={`/students/${studentId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-sm font-semibold transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-background text-[var(--foreground)] transition-colors flex flex-col gap-4 relative w-full">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-[99] px-4 py-2.5 rounded-lg shadow-lg border border-[var(--border)] flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
          toastMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
          toastMessage.type === 'danger' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
          'bg-blue-950/80 text-blue-300 border-blue-800'
        }`}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Back button & title bar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href={`/students/${studentId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-md text-xs font-semibold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)]"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
          Back to Details
        </Link>
        <button
          onClick={() => setIsSettingsOpen(prev => !prev)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer ${
            isSettingsOpen 
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]' 
              : 'bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border-[var(--border)] text-[var(--foreground)]'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          AI Settings
        </button>
      </div>

      {/* Student Banner Header */}
      <div className="py-3 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg flex items-center justify-between gap-3 shadow-[var(--shadow-sm)] transition-colors flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg flex items-center justify-center font-bold text-lg select-none shadow-[var(--shadow-sm)]">
            {selectedStudent.full_name?.substring(0, 2).toUpperCase() || 'ST'}
          </div>
          <div>
            <h1 className="text-[17.5px] font-bold uppercase tracking-wide text-[var(--foreground)] truncate">
              {selectedStudent.full_name}
            </h1>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mt-0.5">
              <span>ID: <span className="font-mono text-[var(--accent)] font-bold">{selectedStudent.id}</span></span>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <span>Passport: <span className="font-semibold text-[var(--foreground)]">{selectedStudent.passport || '—'}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex px-2 py-0.5 rounded bg-[var(--border-subtle)] text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">
            Model: {aiSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'}
          </span>
        </div>
      </div>

      {/* Collapsible Settings Panel */}
      {isSettingsOpen && (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-md)] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4 w-4" />
              AI Extraction Configuration
            </h3>
            <span className="text-[10px] text-[var(--foreground-muted)] font-mono">Changes sync locally</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-[var(--foreground-muted)]">Active Provider</label>
              <div className="flex gap-2">
                <button
                  onClick={() => saveSettings({ ...aiSettings, provider: 'gemini' })}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-bold transition-all ${
                    aiSettings.provider === 'gemini' 
                      ? 'bg-purple-600/10 border-purple-500/55 text-purple-400' 
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface)]'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  onClick={() => saveSettings({ ...aiSettings, provider: 'openai' })}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-bold transition-all ${
                    aiSettings.provider === 'openai' 
                      ? 'bg-emerald-600/10 border-emerald-500/55 text-emerald-400' 
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface)]'
                  }`}
                >
                  OpenAI GPT
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-extrabold tracking-wider text-[var(--foreground-muted)]">AI Model</label>
              {aiSettings.provider === 'openai' ? (
                <select
                  value={aiSettings.openaiModel}
                  onChange={(e) => saveSettings({ ...aiSettings, openaiModel: e.target.value })}
                  className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2 rounded-md focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer w-full"
                >
                  <option value="gpt-4o">GPT-4o (High Accuracy)</option>
                  <option value="gpt-4o-mini">GPT-4o-mini (Default Fast)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="o1-mini">o1-mini</option>
                  <option value="o3-mini">o3-mini</option>
                </select>
              ) : (
                <select
                  value={aiSettings.model}
                  onChange={(e) => saveSettings({ ...aiSettings, model: e.target.value })}
                  className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2 rounded-md focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer w-full"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              )}
            </div>

            {/* API Key Override (Gemini) */}
            {aiSettings.provider === 'gemini' && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-[var(--foreground-muted)]">Gemini API Key Override</label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={aiSettings.apiKey}
                    onChange={(e) => saveSettings({ ...aiSettings, apiKey: e.target.value })}
                    placeholder="Enter custom Gemini Key (if not using server environment variable)"
                    className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] py-2 pl-3 pr-10 rounded-md focus:outline-none focus:border-[var(--accent)] w-full"
                  />
                  <button
                    onClick={() => setShowGeminiKey(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  >
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* API Key Override (OpenAI) */}
            {aiSettings.provider === 'openai' && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-[var(--foreground-muted)]">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showOpenaiKey ? "text" : "password"}
                    value={aiSettings.openaiApiKey}
                    onChange={(e) => saveSettings({ ...aiSettings, openaiApiKey: e.target.value })}
                    placeholder="sk-proj-..."
                    className="bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] py-2 pl-3 pr-10 rounded-md focus:outline-none focus:border-[var(--accent)] w-full"
                  />
                  <button
                    onClick={() => setShowOpenaiKey(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Config Checkboxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={aiSettings.normalizeDates}
                  onChange={(e) => saveSettings({ ...aiSettings, normalizeDates: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-3.5 w-3.5 cursor-pointer"
                />
                Normalize Dates
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={aiSettings.mergeNames}
                  onChange={(e) => saveSettings({ ...aiSettings, mergeNames: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-3.5 w-3.5 cursor-pointer"
                />
                Merge Names
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={aiSettings.extractStructured}
                  onChange={(e) => saveSettings({ ...aiSettings, extractStructured: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-3.5 w-3.5 cursor-pointer"
                />
                Extract Structure
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={aiSettings.includeOcr}
                  onChange={(e) => saveSettings({ ...aiSettings, includeOcr: e.target.checked })}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] h-3.5 w-3.5 cursor-pointer"
                />
                Provide Raw OCR
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Upload Area on Left, Extracted Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 w-full items-start">
        
        {/* Upload Zone & Image Container */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-sm)] flex flex-col gap-3 min-h-[350px] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-1">
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-[var(--accent)]" />
              Document Upload
            </h3>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {!uploadedImage ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all min-h-[250px] ${
                dragActive 
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md' 
                  : 'border-[var(--border)] bg-[var(--surface-elevated)]/50 hover:bg-[var(--border-subtle)]/30'
              }`}
            >
              <Upload className="h-10 w-10 text-[var(--accent)]/60 mb-3 animate-pulse" />
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">Drag & Drop Scan Here</h4>
              <p className="text-xs text-[var(--foreground-muted)] max-w-xs mb-3">
                Drop passport/diploma image file, click to browse, or paste screenshot directly with <span className="font-mono font-bold text-[var(--foreground)] bg-[var(--border-subtle)] px-1 py-0.5 rounded">Ctrl+V</span>
              </p>
              <span className="inline-flex px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[9px] text-[var(--foreground-muted)] font-semibold uppercase">
                JPG, PNG, WEBP Supported
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span className="truncate pr-4 max-w-[200px] font-semibold font-mono">{uploadedFileName || 'pasted_screenshot.png'}</span>
                <button
                  onClick={clearUploadedImage}
                  className="inline-flex items-center gap-1 text-[var(--danger)] hover:bg-[var(--danger)]/10 px-2 py-1 rounded transition-colors text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="border border-[var(--border)] rounded-md overflow-hidden bg-[#111] max-h-[380px] flex items-center justify-center relative shadow-[var(--shadow-sm)]">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded Document scan" 
                  className="max-w-full max-h-[380px] object-contain"
                />
              </div>

              <button
                disabled={uploading}
                onClick={triggerExtraction}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 text-white font-bold py-2.5 rounded-md text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI analyzing document...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    Extract Information with AI
                  </>
                )}
              </button>
            </div>
          )}

          {/* Skeletons Processing Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-6 z-10 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 text-[var(--accent)] animate-spin mb-4" />
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">Analyzing Document scan</h4>
              <p className="text-xs text-[var(--foreground-muted)] text-center max-w-xs mb-3">
                Reading and extracting layout fields. This might take a few seconds...
              </p>
              <div className="w-[180px] h-[3px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* AI Extracted Fields Panel */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-sm)] flex flex-col gap-3 min-h-[350px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-1">
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              Extracted Fields
            </h3>
            {extractedData?.document_type && (
              <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider animate-in fade-in">
                Type: {extractedData.document_type}
              </span>
            )}
          </div>

          {/* Placeholder / Empty State */}
          {!extractedData && !uploading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--foreground-muted)]">
              <Cpu className="h-12 w-12 text-[var(--foreground-subtle)]/40 mb-3" />
              <h4 className="text-xs font-bold mb-1">Waiting for document</h4>
              <p className="text-xs max-w-xs">Upload a scan and click Extract to parse profile details.</p>
            </div>
          )}

          {/* Skeletons Shimmer Loader */}
          {uploading && (
            <div className="flex flex-col gap-2.5 flex-1 divide-y divide-[var(--border)]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 animate-pulse">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-1/4 bg-[var(--border-subtle)] rounded" />
                    <div className="h-4 w-2/3 bg-[var(--border-subtle)] rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 bg-[var(--border-subtle)] rounded" />
                    <div className="h-7 w-16 bg-[var(--border-subtle)] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extracted Fields List */}
          {extractedData && extractedFieldsList.length > 0 && (
            <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
              {extractedFieldsList.map((field, idx) => {
                const cleanKey = field.key.replace(/_/g, ' ').toUpperCase().trim()
                const dbField = FIELD_MAPPING[cleanKey]
                const isSaved = savedFields[field.key]
                
                // Pre-check if current record already matches the extracted value
                let isAlreadyMatching = false
                if (dbField && selectedStudent) {
                  const dbVal = selectedStudent[dbField] || ''
                  let formattedDbVal = String(dbVal).trim().toUpperCase()
                  let formattedNewVal = String(field.value).trim().toUpperCase()
                  
                  if (dbField === 'gender') {
                    const char = formattedNewVal[0]
                    formattedNewVal = char === 'M' ? 'MALE' : (char === 'F' ? 'FEMALE' : '')
                  }
                  if (dbField === 'passport') {
                    formattedNewVal = formattedNewVal.replace(/\s/g, '')
                  }
                  
                  isAlreadyMatching = formattedDbVal === formattedNewVal && formattedNewVal !== ''
                }

                return (
                  <div 
                    key={idx}
                    className={`p-2.5 rounded-lg border bg-[var(--surface-elevated)] flex items-center justify-between gap-3 shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/30 transition-all ${
                      isSaved || isAlreadyMatching 
                        ? 'border-emerald-500/20 bg-emerald-500/[0.02]' 
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider block">
                        {field.key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold text-[var(--foreground)] mt-0.5 block truncate max-w-xs" title={field.value}>
                        {field.value}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(field.value)}
                        className="p-1 hover:bg-[var(--border-subtle)] rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(idx)}
                        className="p-1 hover:bg-[var(--border-subtle)] rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Edit field value"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(idx)}
                        className="p-1 hover:bg-[var(--border-subtle)] rounded text-[var(--danger)]/80 hover:text-[var(--danger)] transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {dbField && (
                        <button
                          disabled={isSaved || isAlreadyMatching}
                          onClick={() => handleSaveFieldToProfile(field.key, field.value)}
                          className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                            isSaved || isAlreadyMatching
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[var(--shadow-sm)]'
                          }`}
                        >
                          {isSaved || isAlreadyMatching ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Saved
                            </>
                          ) : (
                            'Save To >>'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Raw OCR Text Panel */}
      {extractedData?.ocr_text && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <button
            onClick={() => setIsOcrOpen(prev => !prev)}
            className="flex items-center justify-between text-xs font-bold text-[var(--accent)] uppercase tracking-wider w-full select-none cursor-pointer border-none"
          >
            <span>Raw OCR Text Data</span>
            {isOcrOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {isOcrOpen && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-200 mt-2">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={ocrSearchQuery}
                  onChange={(e) => setOcrSearchQuery(e.target.value)}
                  placeholder="Search and highlight keywords..."
                  className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] py-1.5 px-3 rounded-md focus:outline-none focus:border-[var(--accent)] flex-1"
                />
                <button
                  onClick={() => handleCopy(extractedData.ocr_text || '')}
                  className="px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Full OCR
                </button>
              </div>

              <div 
                className="bg-[#151515] text-xs font-mono p-3 rounded border border-[var(--border)] whitespace-pre-wrap max-h-52 overflow-y-auto w-full leading-relaxed select-all"
                dangerouslySetInnerHTML={{ __html: getHighlightedOcr() }}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-sm w-full p-4 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                <Edit className="h-4 w-4" />
                Edit Extracted Field
              </h3>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Field Value</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2 rounded-md focus:outline-none focus:border-[var(--accent)] w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2 border border-[var(--border)] hover:bg-[var(--border-subtle)] text-xs font-bold rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedField}
                className="flex-1 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-md transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
