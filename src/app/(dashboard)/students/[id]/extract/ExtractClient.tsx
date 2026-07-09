'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, RefreshCw, Trash2, Loader2, Upload, FileText, CheckCircle2,
  AlertCircle, Edit, Copy, ChevronDown, ChevronUp, Cpu, Sliders, CheckSquare, Eye, EyeOff
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLanguageCertificate, type StudentLevel, type StudentTariff } from '@/types/database'
import { syncMissingDocuments } from '@/lib/validation'

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

const KNOWN_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-pro",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.5-flash-lite"
]

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
    model: 'gemini-3.5-flash',
    openaiModel: 'gpt-4o-mini',
    normalizeDates: true,
    mergeNames: true,
    extractStructured: true,
    includeOcr: true
  })

  const [tempSettings, setTempSettings] = useState({
    provider: 'gemini',
    apiKey: '',
    openaiApiKey: '',
    model: 'gemini-3.5-flash',
    openaiModel: 'gpt-4o-mini',
    normalizeDates: true,
    mergeNames: true,
    extractStructured: true,
    includeOcr: true
  })
  
  const [geminiModelSelect, setGeminiModelSelect] = useState('gemini-3.5-flash')
  const [customModelId, setCustomModelId] = useState('')
  
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [isValidatingKey, setIsValidatingKey] = useState(false)

  // Whether server-side env keys are configured
  const [serverKeys, setServerKeys] = useState({ gemini: false, openai: false })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load settings and student details
  useEffect(() => {
    // Check which providers have server-side keys
    fetch('/api/ai-config')
      .then(r => r.json())
      .then(data => setServerKeys({ gemini: !!data.gemini, openai: !!data.openai }))
      .catch(() => {})

    // Load local storage AI settings
    try {
      const stored = localStorage.getItem('ai_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        setAiSettings(prev => ({ ...prev, ...parsed }))
        setTempSettings(prev => ({ ...prev, ...parsed }))
        if (parsed.model) {
          if (KNOWN_GEMINI_MODELS.includes(parsed.model)) {
            setGeminiModelSelect(parsed.model)
          } else {
            setGeminiModelSelect('custom')
            setCustomModelId(parsed.model)
          }
        }
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

  // Sync tempSettings when config panel opens
  useEffect(() => {
    if (isSettingsOpen) {
      setTempSettings({ ...aiSettings })
      if (aiSettings.model) {
        if (KNOWN_GEMINI_MODELS.includes(aiSettings.model)) {
          setGeminiModelSelect(aiSettings.model)
        } else {
          setGeminiModelSelect('custom')
          setCustomModelId(aiSettings.model)
        }
      }
    }
  }, [isSettingsOpen, aiSettings])

  // Save AI Settings helper
  const handleSaveSettings = () => {
    setAiSettings(tempSettings)
    try {
      localStorage.setItem('ai_settings', JSON.stringify(tempSettings))
      showToast('AI settings saved successfully!', 'success')
    } catch (e) {
      console.error('Failed to save ai_settings', e)
      showToast('Failed to save settings.', 'danger')
    }
  }

  // Validate API Key helper
  const handleValidateKey = async () => {
    const key = tempSettings.provider === 'openai' ? tempSettings.openaiApiKey : tempSettings.apiKey
    if (!key) {
      showToast('Please enter an API key first!', 'danger')
      return
    }

    setIsValidatingKey(true)
    showToast('Validating API key...', 'info')
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: tempSettings.provider,
          apiKey: key
        })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        showToast(`${tempSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} API Key is valid! ✓`, 'success')
      } else {
        showToast(`Validation failed: ${data.error || 'Invalid key'}`, 'danger')
      }
    } catch (error: any) {
      console.error('Validation error:', error)
      showToast('Network error validating API key.', 'danger')
    } finally {
      setIsValidatingKey(false)
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
    } catch (err: any) {
      console.error('File compression error:', err)
      showToast('Failed to process image file.', 'danger')
    } finally {
      setUploading(false)
    }
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
    setExtractedData(null)
    setExtractedFieldsList([])
    setSavedFields({}) // Clear checkpoints as we start new extraction
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
      const nextStudent = { ...selectedStudent!, [dbField]: finalValue }
      const syncedPick = syncMissingDocuments(nextStudent)

      const updateData = {
        [dbField]: finalValue,
        pick_needed: syncedPick,
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
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[var(--radius-md)] text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-background text-[var(--foreground)] transition-colors flex flex-col gap-6 relative w-full">
      <style>{`
        @keyframes ios-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-ios-progress {
          animation: ios-progress 1.5s infinite ease-in-out;
        }
      `}</style>
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[99] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
          toastMessage.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80 backdrop-blur-md' :
          toastMessage.type === 'danger' ? 'bg-rose-950/90 text-rose-300 border-rose-800/80 backdrop-blur-md' :
          'bg-blue-950/90 text-blue-300 border-blue-800/80 backdrop-blur-md'
        }`}>
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">{toastMessage.text}</span>
        </div>
      )}

      {/* Back button & title bar */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href={`/students/${studentId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--foreground)] transition-all shadow-[var(--shadow-sm)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--accent)]" />
          Back to Details
        </Link>
        <button
          onClick={() => setIsSettingsOpen(prev => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-[var(--shadow-sm)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
            isSettingsOpen 
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]' 
              : 'bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border-[var(--border)] text-[var(--foreground)]'
          }`}
        >
          <Sliders className="h-4 w-4" />
          AI Settings
        </button>
      </div>

      {/* Student Banner Header */}
      <div className="py-4 px-5 bg-[var(--surface)] border border-[var(--border)]/70 rounded-2xl flex items-center justify-between gap-4 shadow-[var(--shadow-sm)] transition-colors flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl flex items-center justify-center font-extrabold text-xl select-none border border-[var(--accent)]/20 shadow-inner">
            {selectedStudent.full_name?.substring(0, 2).toUpperCase() || 'ST'}
          </div>
          <div>
            <h1 className="text-[19px] font-extrabold uppercase tracking-wide text-[var(--foreground)]">
              {selectedStudent.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[var(--foreground-muted)] mt-1">
              <span>ID: <span className="font-mono text-[var(--accent)] font-bold">{selectedStudent.id}</span></span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
              <span>Passport: <span className="font-bold text-[var(--foreground)]">{selectedStudent.passport || '—'}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <span className="inline-flex px-3 py-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider shadow-sm">
            Model: {aiSettings.provider === 'openai' ? `OpenAI (${aiSettings.openaiModel})` : `Gemini (${aiSettings.model})`}
          </span>
        </div>
      </div>

      {/* Collapsible Settings Panel */}
      {isSettingsOpen && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-md)] flex flex-col gap-5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5" />
              AI Extraction Configuration
            </h3>
            <span className="text-[10px] text-[var(--foreground-muted)] font-mono font-semibold">Changes sync locally</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">Active Provider</label>
              <div className="bg-[var(--surface-elevated)] p-1 rounded-xl border border-[var(--border)] flex h-10 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTempSettings(prev => ({ ...prev, provider: 'gemini' }))}
                  className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                    tempSettings.provider === 'gemini' 
                      ? 'bg-[var(--surface)] text-purple-600 dark:text-purple-400 shadow-sm border border-[var(--border)]/30' 
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setTempSettings(prev => ({ ...prev, provider: 'openai' }))}
                  className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                    tempSettings.provider === 'openai' 
                      ? 'bg-[var(--surface)] text-emerald-600 dark:text-emerald-400 shadow-sm border border-[var(--border)]/30' 
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  OpenAI GPT
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">AI Model</label>
              {tempSettings.provider === 'openai' ? (
                <select
                  value={tempSettings.openaiModel}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, openaiModel: e.target.value }))}
                  className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2.5 rounded-xl focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer w-full h-10 shadow-sm"
                >
                  <optgroup label="💰 Budget (Vision-Capable)">
                    <option value="gpt-4o-mini">GPT-4o Mini (Recommended) — Cheapest</option>
                    <option value="gpt-4o">GPT-4o — Better accuracy</option>
                  </optgroup>
                  <optgroup label="🚀 GPT-5 Series (Premium)">
                    <option value="gpt-5.4-mini">GPT-5.4-mini — Fast & Smart</option>
                    <option value="gpt-5.4">GPT-5.4 — Professional</option>
                    <option value="gpt-5.5">GPT-5.5 — Most Intelligent</option>
                  </optgroup>
                  <optgroup label="Legacy">
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="o1-mini">o1 Mini</option>
                    <option value="o3-mini">o3 Mini</option>
                  </optgroup>
                </select>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <select
                    value={geminiModelSelect}
                    onChange={(e) => {
                      const val = e.target.value
                      setGeminiModelSelect(val)
                      if (val === 'custom') {
                        setTempSettings(prev => ({ ...prev, model: customModelId || 'gemini-3.5-flash' }))
                      } else {
                        setTempSettings(prev => ({ ...prev, model: val }))
                      }
                    }}
                    className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2.5 rounded-xl focus:outline-none focus:border-[var(--accent)] font-semibold cursor-pointer w-full h-10 shadow-sm"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
                    <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">Gemini Flash Lite</option>
                    <option value="custom">Custom Model ID...</option>
                  </select>
                  
                  {geminiModelSelect === 'custom' && (
                    <input
                      type="text"
                      value={customModelId}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomModelId(val)
                        setTempSettings(prev => ({ ...prev, model: val }))
                      }}
                      placeholder="Enter custom model ID (e.g. gemini-2.5-flash-lite)..."
                      className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2.5 rounded-xl focus:outline-none focus:border-[var(--accent)] w-full shadow-sm mt-1"
                    />
                  )}
                </div>
              )}
            </div>

            {/* API Key Override (Gemini) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">Gemini API Key Override</label>
                {serverKeys.gemini && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> Server Key Active
                  </span>
                )}
              </div>
              {serverKeys.gemini ? (
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed md:h-8">
                  A Gemini API key is already configured on the server — no key needed. You can enter one below to override it.
                </p>
              ) : (
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed md:h-8">
                  No server key set. Enter a Gemini API key override below to enable this provider.
                </p>
              )}
              <div className="relative">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  value={tempSettings.apiKey}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={serverKeys.gemini ? "(Using server key — leave blank to keep using it)" : "Enter custom Gemini Key"}
                  autoComplete="new-password"
                  className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] py-2.5 pl-4 pr-11 rounded-xl focus:outline-none focus:border-[var(--accent)] w-full shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* API Key Override (OpenAI) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">OpenAI API Key Override</label>
                {serverKeys.openai && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> Server Key Active
                  </span>
                )}
              </div>
              {serverKeys.openai ? (
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed md:h-8">
                  An OpenAI API key is already configured on the server — no key needed. You can enter one below to override it.
                </p>
              ) : (
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed md:h-8">
                  No server key set. Enter an OpenAI API key override below to enable this provider.
                </p>
              )}
              <div className="relative">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  value={tempSettings.openaiApiKey}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  placeholder={serverKeys.openai ? "(Using server key — leave blank to keep using it)" : "sk-proj-..."}
                  autoComplete="new-password"
                  className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] py-2.5 pl-4 pr-11 rounded-xl focus:outline-none focus:border-[var(--accent)] w-full shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Config Checkboxes - Styled as native iOS switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 md:col-span-2 mt-2">
              {/* Normalize Dates Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]/70 shadow-sm">
                <span className="text-xs font-bold text-[var(--foreground)]">Normalize Dates</span>
                <button
                  type="button"
                  onClick={() => setTempSettings(prev => ({ ...prev, normalizeDates: !prev.normalizeDates }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    tempSettings.normalizeDates ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      tempSettings.normalizeDates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Merge Names Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]/70 shadow-sm">
                <span className="text-xs font-bold text-[var(--foreground)]">Merge Names</span>
                <button
                  type="button"
                  onClick={() => setTempSettings(prev => ({ ...prev, mergeNames: !prev.mergeNames }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    tempSettings.mergeNames ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      tempSettings.mergeNames ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Extract Structure Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)]/70 shadow-sm">
                <span className="text-xs font-bold text-[var(--foreground)]">Extract Structure</span>
                <button
                  type="button"
                  onClick={() => setTempSettings(prev => ({ ...prev, extractStructured: !prev.extractStructured }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    tempSettings.extractStructured ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      tempSettings.extractStructured ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 md:col-span-2 border-t border-[var(--border)] pt-4 mt-2">
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-[var(--shadow-sm)] flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                Save Settings
              </button>
              <button
                disabled={isValidatingKey}
                onClick={handleValidateKey}
                className="px-5 py-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isValidatingKey ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <CheckSquare className="h-4.5 w-4.5 text-[var(--accent)]" />
                )}
                Validate {tempSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Upload Area on Left, Extracted Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_1fr] gap-6 w-full items-start">
        
        {/* Upload Zone & Image Container */}
        <div className="bg-[var(--surface)] border border-[var(--border)]/70 rounded-2xl p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4 min-h-[400px] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-1">
            <h3 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4.5 w-4.5 text-[var(--accent)]" />
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
              className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-all min-h-[300px] gap-4 ${
                dragActive 
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md scale-[0.99]' 
                  : 'border-[var(--border)] bg-[var(--surface-elevated)]/30 hover:bg-[var(--border-subtle)]/20'
              }`}
            >
              <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm text-[var(--accent)]/80">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[var(--foreground)] mb-1">Drag & Drop Scan Here</h4>
                <p className="text-xs text-[var(--foreground-muted)] max-w-sm leading-relaxed px-4">
                  Drop passport/diploma image file, click to browse, or paste screenshot directly with <span className="font-mono font-bold text-[var(--foreground)] bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.5 rounded-md shadow-sm">Ctrl+V</span>
                </p>
              </div>
              <span className="inline-flex px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[9px] text-[var(--foreground-muted)] font-extrabold uppercase tracking-wide shadow-sm">
                JPG, PNG, WEBP Supported
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-end text-xs text-[var(--foreground-muted)] px-1">
                <button
                  onClick={clearUploadedImage}
                  className="inline-flex items-center gap-1.5 text-[var(--danger)] hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-all text-xs font-bold cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="border border-[var(--border)]/70 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 max-h-[380px] flex items-center justify-center relative shadow-inner p-3">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded Document scan" 
                  className="max-w-full max-h-[354px] object-contain rounded-xl shadow-md border border-[var(--border)]/20"
                />
              </div>

              <button
                disabled={uploading}
                onClick={triggerExtraction}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.2)' }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    AI analyzing document...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4.5 w-4.5" />
                    Extract Information with AI
                  </>
                )}
              </button>
            </div>
          )}

          {/* Skeletons Processing Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10 animate-in fade-in duration-300">
              <div className="p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-sm text-[var(--accent)] mb-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h4 className="text-sm font-extrabold text-[var(--foreground)] mb-1">Analyzing Document Scan</h4>
              <p className="text-xs text-[var(--foreground-muted)] text-center max-w-xs leading-relaxed mb-4">
                Reading document text layout & extracting profile fields. This might take a few seconds...
              </p>
              <div className="w-[240px] h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden relative shadow-inner">
                <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-[var(--accent)] via-blue-400 to-[var(--accent)] rounded-full animate-ios-progress" />
              </div>
            </div>
          )}
        </div>

        {/* AI Extracted Fields Panel */}
        <div className="bg-[var(--surface)] border border-[var(--border)]/70 rounded-2xl p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4 min-h-[400px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-1">
            <h3 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-[var(--accent)]" />
              Extracted Fields
            </h3>
            {extractedData?.document_type && (
              <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-extrabold tracking-wider animate-in fade-in">
                Type: {extractedData.document_type}
              </span>
            )}
          </div>

          {/* Placeholder / Empty State */}
          {!extractedData && !uploading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[var(--foreground-muted)] gap-3">
              <div className="p-4 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-sm text-[var(--foreground-muted)]/30">
                <Cpu className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-xs font-bold mb-1 text-[var(--foreground)]">Waiting for document</h4>
                <p className="text-[11px] max-w-xs leading-relaxed">Upload a scan and click Extract to parse profile details.</p>
              </div>
            </div>
          )}

          {/* Skeletons Shimmer Loader */}
          {uploading && (
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2 px-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Extracting New Data...
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4 animate-pulse">
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-1/4 bg-[var(--border-subtle)] rounded" />
                      <div className="h-4 w-2/3 bg-[var(--border-subtle)] rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-[var(--border-subtle)] rounded-lg" />
                      <div className="h-8 w-20 bg-[var(--border-subtle)] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Fields List */}
          {extractedData && extractedFieldsList.length > 0 && !uploading && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 transition-all duration-300 animate-in fade-in">
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
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 shadow-sm hover:scale-[1.005] transition-all ${
                        isSaved || isAlreadyMatching 
                          ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' 
                          : 'border-[var(--border)] bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold text-[var(--accent)] uppercase tracking-wider block">
                          {field.key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-[var(--foreground)] mt-1 block truncate max-w-xs" title={field.value}>
                          {field.value}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleCopy(field.value)}
                          className="p-1.5 hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] rounded-xl text-[var(--foreground-muted)] transition-all cursor-pointer"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(idx)}
                          className="p-1.5 hover:bg-[var(--border-subtle)] hover:text-[var(--foreground)] rounded-xl text-[var(--foreground-muted)] transition-all cursor-pointer"
                          title="Edit field value"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(idx)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-xl text-[var(--danger)]/80 hover:text-[var(--danger)] transition-all cursor-pointer"
                          title="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {dbField && (
                          <motion.button
                            whileTap={isSaved || isAlreadyMatching ? undefined : { scale: 0.94 }}
                            disabled={isSaved || isAlreadyMatching}
                            onClick={() => handleSaveFieldToProfile(field.key, field.value)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 cursor-pointer select-none border ${
                              isSaved || isAlreadyMatching
                                ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 hover:border-emerald-500 text-white shadow-sm'
                            }`}
                          >
                            {isSaved || isAlreadyMatching ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Saved
                              </>
                            ) : (
                              'Save to >>'
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw OCR Panel Removed */}

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-sm w-full p-5 flex flex-col gap-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
                <Edit className="h-4.5 w-4.5" />
                Edit Extracted Field
              </h3>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Field Value</label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground)] p-2.5 rounded-xl focus:outline-none focus:border-[var(--accent)] w-full shadow-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 border border-[var(--border)] hover:bg-[var(--border-subtle)] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={saveEditedField}
                className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Save
              </motion.button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
