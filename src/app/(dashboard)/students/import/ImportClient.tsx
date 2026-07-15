'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Database, FileSpreadsheet, ArrowLeft, Play, Settings, AlertTriangle, 
  CheckCircle2, RefreshCw, Sliders, HelpCircle, Loader2, Check, FileDown, 
  Trash2, X, ChevronRight, AlertCircle, Terminal
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type StudentLevel, type StudentTariff, type StudentLanguageCertificate } from '@/types/database'
import { useUser } from '@/contexts/UserContext'

// Pre-fill with the legacy configuration found in the codebase
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDbtscTvtaAj2UKxCddU-0OeUPoAMhc60c",
  authDomain: "unibridge-7d530.firebaseapp.com",
  projectId: "unibridge-7d530",
  storageBucket: "unibridge-7d530.firebasestorage.app",
  messagingSenderId: "562821836520",
  appId: "1:562821836520:web:2f4acaff9428ec3f18235d"
}

// Validation Schema rules based on Supabase DB constraints
const GENDER_VALUES = ['MALE', 'FEMALE']
const TARIFF_VALUES = ['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA', 'E-VISA (TIL SERTIFIKATLI)', 'E-VISA (TIL SERTIFIKATISIZ)', 'ZERO RISK']
const LEVEL_VALUES = ['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE']
const CERT_VALUES = ['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA', 'NO CERTIFICATE']

interface ValidationMessage {
  field: string
  severity: 'warning' | 'error'
  message: string
}

interface ParsedRecord {
  raw: any
  mapped: Partial<Student>
  isValid: boolean
  errors: ValidationMessage[]
}

export function ImportClient() {
  const router = useRouter()
  const supabase = createClient()
  const { profile: loggedInProfile } = useUser()

  // Tab State
  const [activeTab, setActiveTab] = useState<'firestore' | 'excel'>('firestore')

  // Loading States
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false)
  const [isExcelLoading, setIsExcelLoading] = useState(false)

  // Firestore Form State
  const [fbConfig, setFbConfig] = useState(DEFAULT_FIREBASE_CONFIG)
  const [fbCollection, setFbCollection] = useState('students')
  const [fbConnected, setFbConnected] = useState(false)
  const [fbError, setFbError] = useState<string | null>(null)
  
  // Excel File State
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [excelRows, setExcelRows] = useState<any[]>([])
  const [excelMapping, setExcelMapping] = useState<Record<string, string>>({})
  
  // Parsed and Validated Data State
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([])
  const [previewLimit, setPreviewLimit] = useState(10)
  
  // Import Execution State
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [importLogs, setImportLogs] = useState<string[]>([])
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite'>('overwrite')
  const [importComplete, setImportComplete] = useState(false)

  // Load SDKs on demand
  const loadFirebaseSDK = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).firebase) {
        resolve((window as any).firebase)
        return
      }
      const scriptApp = document.createElement('script')
      scriptApp.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js'
      scriptApp.onload = () => {
        const scriptFirestore = document.createElement('script')
        scriptFirestore.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
        scriptFirestore.onload = () => resolve((window as any).firebase)
        scriptFirestore.onerror = reject
        document.head.appendChild(scriptFirestore)
      }
      scriptApp.onerror = reject
      document.head.appendChild(scriptApp)
    })
  }

  const loadSheetJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
      script.onload = () => resolve((window as any).XLSX)
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // Helper: Uzbek phone number cleaner & formatter
  // Target format: "XX-XXX-XX-XX"
  const cleanUzbekPhone = (phoneStr: any): string | null => {
    if (!phoneStr) return null
    const cleaned = String(phoneStr).replace(/\D/g, '')
    if (!cleaned) return null

    // Handing different lengths:
    // If 9 digits: "991234567"
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 9)}`
    }
    // If 12 digits (starting with 998): "998991234567"
    if (cleaned.length === 12 && cleaned.startsWith('998')) {
      const main = cleaned.slice(3)
      return `${main.slice(0, 2)}-${main.slice(2, 5)}-${main.slice(5, 7)}-${main.slice(7, 9)}`
    }
    // Fallback: If it's shorter/longer, try to take the last 9 digits if length is >= 9
    if (cleaned.length > 9) {
      const main = cleaned.slice(-9)
      return `${main.slice(0, 2)}-${main.slice(2, 5)}-${main.slice(5, 7)}-${main.slice(7, 9)}`
    }

    return null // Too short to fit format "XX-XXX-XX-XX"
  }

  // Data Sanitizer / Mapper to fit check constraints
  const sanitizeRecord = (raw: any, isFirestore: boolean = true): ParsedRecord => {
    const errors: ValidationMessage[] = []
    const mapped: Partial<Student> = {}

    // 1. Fetch raw fields (Firestore uses camelCase, Excel can be mapped)
    const getVal = (fields: string[]): any => {
      for (const field of fields) {
        if (raw[field] !== undefined && raw[field] !== null) {
          return raw[field]
        }
      }
      return undefined
    }

    // ID Map & Constraints
    const rawId = isFirestore ? getVal(['id', 'firestoreId']) : getVal([excelMapping['id']])
    if (!rawId) {
      errors.push({ field: 'id', severity: 'error', message: 'ID is missing.' })
    } else {
      mapped.id = String(rawId).trim().toUpperCase()
    }

    // Full Name Map & Constraints
    const rawName = isFirestore ? getVal(['fullName', 'full_name']) : getVal([excelMapping['full_name']])
    if (!rawName) {
      errors.push({ field: 'full_name', severity: 'error', message: 'Full Name is missing.' })
    } else {
      mapped.full_name = String(rawName).trim().toUpperCase()
    }

    // Passport
    const rawPassport = isFirestore ? getVal(['passport']) : getVal([excelMapping['passport']])
    mapped.passport = rawPassport ? String(rawPassport).trim().toUpperCase() : null

    // Dates
    const rawPassportIssue = isFirestore ? getVal(['passportIssueDate', 'passport_issue_date']) : getVal([excelMapping['passport_issue_date']])
    mapped.passport_issue_date = rawPassportIssue ? String(rawPassportIssue).trim() : null

    const rawPassportExpire = isFirestore ? getVal(['passportExpireDate', 'passport_expire_date']) : getVal([excelMapping['passport_expire_date']])
    mapped.passport_expire_date = rawPassportExpire ? String(rawPassportExpire).trim() : null

    // Gender check constraint: 'MALE' | 'FEMALE' | null
    let rawGender = isFirestore ? getVal(['sex', 'gender']) : getVal([excelMapping['gender']])
    if (rawGender) {
      const gClean = String(rawGender).trim().toUpperCase()
      if (gClean === 'MALE' || gClean === 'M' || gClean === 'ERKAK') {
        mapped.gender = 'MALE'
      } else if (gClean === 'FEMALE' || gClean === 'F' || gClean === 'AYOL') {
        mapped.gender = 'FEMALE'
      } else {
        mapped.gender = null
        errors.push({ field: 'gender', severity: 'warning', message: `Invalid gender "${rawGender}". Cleared to null.` })
      }
    } else {
      mapped.gender = null
    }

    // Birthday constraint: YYYY-MM-DD and range 1980-01-01 to 2010-12-31
    const rawBday = isFirestore ? getVal(['birthday']) : getVal([excelMapping['birthday']])
    if (rawBday) {
      let bdayStr = String(rawBday).trim()
      // If epoch number from Excel
      if (/^\d{5}$/.test(bdayStr)) {
        const dateObj = new Date((Number(bdayStr) - 25569) * 86400 * 1000)
        bdayStr = dateObj.toISOString().split('T')[0]
      }
      
      const bdayRegex = /^\d{4}-\d{2}-\d{2}$/
      if (bdayRegex.test(bdayStr)) {
        const year = parseInt(bdayStr.split('-')[0])
        if (year >= 1980 && year <= 2010) {
          mapped.birthday = bdayStr
        } else {
          mapped.birthday = null
          errors.push({ field: 'birthday', severity: 'warning', message: `Birthday year ${year} out of bounds (1980-2010). Cleared.` })
        }
      } else {
        // Try parsing JS Date
        try {
          const parsedDate = new Date(bdayStr)
          if (!isNaN(parsedDate.getTime())) {
            const cleanDateStr = parsedDate.toISOString().split('T')[0]
            const year = parsedDate.getFullYear()
            if (year >= 1980 && year <= 2010) {
              mapped.birthday = cleanDateStr
            } else {
              mapped.birthday = null
              errors.push({ field: 'birthday', severity: 'warning', message: `Birthday ${cleanDateStr} out of bounds. Cleared.` })
            }
          } else {
            mapped.birthday = null
            errors.push({ field: 'birthday', severity: 'warning', message: `Invalid birthday format "${bdayStr}". Cleared.` })
          }
        } catch {
          mapped.birthday = null
          errors.push({ field: 'birthday', severity: 'warning', message: `Failed to parse birthday "${bdayStr}". Cleared.` })
        }
      }
    } else {
      mapped.birthday = null
    }

    // Phone numbers (cleaned to Uzbek format)
    const rawPhone1 = isFirestore ? getVal(['phone1']) : getVal([excelMapping['phone1']])
    const cleanedPhone1 = cleanUzbekPhone(rawPhone1)
    if (rawPhone1 && !cleanedPhone1) {
      errors.push({ field: 'phone1', severity: 'warning', message: `Phone number "${rawPhone1}" format invalid (expects XX-XXX-XX-XX). Cleared to null.` })
      mapped.phone1 = null
    } else {
      mapped.phone1 = cleanedPhone1
    }

    const rawPhone2 = isFirestore ? getVal(['phone2']) : getVal([excelMapping['phone2']])
    mapped.phone2 = rawPhone2 ? String(rawPhone2).trim() : null

    // Parents Information
    mapped.father_name = isFirestore ? (getVal(['fatherName', 'father_name']) || null) : (getVal([excelMapping['father_name']]) || null)
    mapped.father_phone = isFirestore ? (getVal(['fatherPhone', 'father_phone']) || null) : (getVal([excelMapping['father_phone']]) || null)
    mapped.father_job = isFirestore ? (getVal(['fatherJob', 'father_job']) || null) : (getVal([excelMapping['father_job']]) || null)
    mapped.mother_name = isFirestore ? (getVal(['motherName', 'mother_name']) || null) : (getVal([excelMapping['mother_name']]) || null)
    mapped.mother_phone = isFirestore ? (getVal(['motherPhone', 'mother_phone']) || null) : (getVal([excelMapping['mother_phone']]) || null)
    mapped.mother_job = isFirestore ? (getVal(['motherJob', 'mother_job']) || null) : (getVal([excelMapping['mother_job']]) || null)

    // Address
    const rawAddr = isFirestore ? getVal(['address']) : getVal([excelMapping['address']])
    mapped.address = rawAddr ? String(rawAddr).trim().toUpperCase() : null
    mapped.email = isFirestore ? (getVal(['email']) || null) : (getVal([excelMapping['email']]) || null)

    // Level check constraints: 'COLLEGE' | 'BACHELOR' | 'MASTERS' | 'MASTER NO CERTIFICATE' | 'LANGUAGE COURSE' | null
    const rawLevel = isFirestore ? getVal(['level']) : getVal([excelMapping['level']])
    if (rawLevel) {
      const levelClean = String(rawLevel).trim().toUpperCase()
      if (LEVEL_VALUES.includes(levelClean)) {
        mapped.level = levelClean as StudentLevel
      } else {
        mapped.level = null
        errors.push({ field: 'level', severity: 'warning', message: `Invalid level "${rawLevel}". Set to null.` })
      }
    } else {
      mapped.level = null
    }

    const rawLevel2 = isFirestore ? getVal(['level2']) : getVal([excelMapping['level2']])
    if (rawLevel2) {
      const levelClean2 = String(rawLevel2).trim().toUpperCase()
      if (LEVEL_VALUES.includes(levelClean2)) {
        mapped.level2 = levelClean2 as StudentLevel
      } else {
        mapped.level2 = null
        errors.push({ field: 'level2', severity: 'warning', message: `Invalid level2 "${rawLevel2}". Set to null.` })
      }
    } else {
      mapped.level2 = null
    }

    mapped.educational_background = isFirestore ? (getVal(['educationalBackground', 'educational_background']) || null) : (getVal([excelMapping['educational_background']]) || null)
    mapped.major = isFirestore ? (getVal(['major']) || null) : (getVal([excelMapping['major']]) || null)

    // Tariff check constraints
    const rawTariff = isFirestore ? getVal(['tariff']) : getVal([excelMapping['tariff']])
    if (rawTariff) {
      const tariffClean = String(rawTariff).trim().toUpperCase()
      if (TARIFF_VALUES.includes(tariffClean)) {
        mapped.tariff = tariffClean as StudentTariff
      } else {
        mapped.tariff = null
        errors.push({ field: 'tariff', severity: 'warning', message: `Invalid tariff "${rawTariff}". Set to null.` })
      }
    } else {
      mapped.tariff = null
    }

    // Language certificates
    const mapCert = (val: any): StudentLanguageCertificate | null => {
      if (!val) return 'NO CERTIFICATE'
      const valClean = String(val).trim().toUpperCase()
      if (CERT_VALUES.includes(valClean)) return valClean as StudentLanguageCertificate
      return 'NO CERTIFICATE'
    }

    mapped.language_certificate = mapCert(isFirestore ? getVal(['languageCertificate', 'language_certificate']) : getVal([excelMapping['language_certificate']]))
    mapped.certificate_score = isFirestore ? (getVal(['certificateScore', 'certificate_score']) || null) : (getVal([excelMapping['certificate_score']]) || null)

    mapped.language_certificate_2 = mapCert(isFirestore ? getVal(['languageCertificate2', 'language_certificate_2']) : getVal([excelMapping['language_certificate_2']]))
    mapped.certificate_score_2 = isFirestore ? (getVal(['certificateScore2', 'certificate_score_2']) || null) : (getVal([excelMapping['certificate_score_2']]) || null)

    mapped.language_certificate_3 = mapCert(isFirestore ? getVal(['languageCertificate3', 'language_certificate_3']) : getVal([excelMapping['language_certificate_3']]))
    mapped.certificate_score_3 = isFirestore ? (getVal(['certificateScore3', 'certificate_score_3']) || null) : (getVal([excelMapping['certificate_score_3']]) || null)

    // Universities
    mapped.university_1 = isFirestore ? (getVal(['university1', 'university_1']) || null) : (getVal([excelMapping['university_1']]) || null)
    mapped.university_1_status = isFirestore ? (getVal(['university1Status', 'university_1_status']) || 'Chosen') : (getVal([excelMapping['university_1_status']]) || 'Chosen')

    mapped.university_2 = isFirestore ? (getVal(['university2', 'university_2']) || null) : (getVal([excelMapping['university_2']]) || null)
    mapped.university_2_status = isFirestore ? (getVal(['university2Status', 'university_2_status']) || null) : (getVal([excelMapping['university_2_status']]) || null)

    mapped.university_3 = isFirestore ? (getVal(['university3', 'university_3']) || null) : (getVal([excelMapping['university_3']]) || null)
    mapped.university_3_status = isFirestore ? (getVal(['university3Status', 'university_3_status']) || null) : (getVal([excelMapping['university_3_status']]) || null)

    // Financial
    mapped.balance = parseFloat(String(isFirestore ? (getVal(['balance']) || 0) : (getVal([excelMapping['balance']]) || 0))) || 0
    mapped.discount = parseFloat(String(isFirestore ? (getVal(['discount']) || 0) : (getVal([excelMapping['discount']]) || 0))) || 0

    // Metadata
    mapped.office = isFirestore ? (getVal(['office']) || null) : (getVal([excelMapping['office']]) || null)
    mapped.student_group = isFirestore ? (getVal(['group', 'student_group']) || null) : (getVal([excelMapping['student_group']]) || null)
    mapped.lead_by = isFirestore ? (getVal(['leadBy', 'lead_by']) || null) : (getVal([excelMapping['lead_by']]) || null)
    mapped.notes = isFirestore ? (getVal(['notes']) || null) : (getVal([excelMapping['notes']]) || null)

    // Dates
    mapped.created_at = isFirestore ? (getVal(['createdAt', 'created_at']) || new Date().toISOString()) : (getVal([excelMapping['created_at']]) || new Date().toISOString())
    mapped.updated_at = isFirestore ? (getVal(['updatedAt', 'updated_at']) || new Date().toISOString()) : (getVal([excelMapping['updated_at']]) || new Date().toISOString())
    mapped.jarayon_updated_at = isFirestore ? (getVal(['jarayonUpdatedAt', 'jarayon_updated_at']) || null) : (getVal([excelMapping['jarayon_updated_at']]) || null)

    // Row color settings compatibility
    mapped.row_color = isFirestore ? (getVal(['rowColor', 'row_color']) || null) : (getVal([excelMapping['row_color']]) || null)
    mapped.status_row_color = isFirestore ? (getVal(['statusRowColor', 'status_row_color']) || null) : (getVal([excelMapping['status_row_color']]) || null)

    // Task tags conversion
    const rawTags = isFirestore ? getVal(['taskTags', 'task_tags']) : getVal([excelMapping['task_tags']])
    if (Array.isArray(rawTags)) {
      mapped.task_tags = rawTags.map(String)
    } else if (rawTags && typeof rawTags === 'string') {
      mapped.task_tags = rawTags.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      mapped.task_tags = []
    }

    // Mandatory document columns defaults
    mapped.pick_needed = isFirestore ? (getVal(['pickNeeded', 'pick_needed']) || []) : []
    mapped.has_mc = isFirestore ? (!!getVal(['hasMc', 'has_mc'])) : false
    mapped.bc_hand_count = parseInt(isFirestore ? (getVal(['bcHandCount', 'bc_hand_count']) || 0) : 0) || 0
    mapped.mc_hand_count = parseInt(isFirestore ? (getVal(['mcHandCount', 'mc_hand_count']) || 0) : 0) || 0
    mapped.apos_hand_count = parseInt(isFirestore ? (getVal(['aposHandCount', 'apos_hand_count']) || 0) : 0) || 0
    mapped.pic_hand_count = parseInt(isFirestore ? (getVal(['picHandCount', 'pic_hand_count']) || 0) : 0) || 0

    mapped.is_deleted = isFirestore ? (!!getVal(['deleted', 'isDeleted', 'is_deleted'])) : false

    const hasErrors = errors.some(e => e.severity === 'error')

    return {
      raw,
      mapped,
      isValid: !hasErrors,
      errors
    }
  }

  // --- FIRESTORE LOGIC ---
  const handleConnectFirestore = async () => {
    setIsFirebaseLoading(true)
    setFbError(null)
    setFbConnected(false)
    setParsedRecords([])

    try {
      const firebase = await loadFirebaseSDK()
      
      // Prevent multiple initializations
      let app
      if (firebase.apps.length === 0) {
        app = firebase.initializeApp(fbConfig)
      } else {
        app = firebase.app()
      }
      
      const firestore = app.firestore()
      
      setImportLogs(prev => [...prev, `[System] Connected to Firebase Project: ${fbConfig.projectId}`])

      // Fetch snapshot
      const snapshot = await firestore.collection(fbCollection).get()
      
      if (snapshot.empty) {
        throw new Error(`Collection "${fbCollection}" is empty or does not exist.`)
      }

      const docs: any[] = []
      snapshot.forEach((doc: any) => {
        docs.push({
          firestoreId: doc.id,
          ...doc.data()
        })
      })

      setImportLogs(prev => [...prev, `[System] Fetched ${docs.length} documents from Firestore collection: "${fbCollection}"`])
      
      // Parse & Validate
      const parsed = docs.map(doc => sanitizeRecord(doc, true))
      setParsedRecords(parsed)
      setFbConnected(true)
    } catch (err: any) {
      console.error(err)
      setFbError(err.message || 'Failed to connect/fetch from Firestore. Check config and security rules.')
      setImportLogs(prev => [...prev, `[Error] Firestore failed: ${err.message}`])
    } finally {
      setIsFirebaseLoading(false)
    }
  }

  // --- EXCEL LOGIC ---
  const handleExcelDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleProcessExcelFile(files[0])
    }
  }

  const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleProcessExcelFile(files[0])
    }
  }

  const handleProcessExcelFile = async (file: File) => {
    setIsExcelLoading(true)
    setExcelFile(file)
    setParsedRecords([])
    setExcelHeaders([])
    setExcelRows([])
    
    try {
      const XLSX = await loadSheetJS()
      const reader = new FileReader()
      
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary' })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
          
          if (data.length === 0) {
            throw new Error('Spreadsheet has no records or data rows.')
          }

          // Extract unique headers
          const headers = Array.from(
            new Set(data.flatMap((row: any) => Object.keys(row)))
          ) as string[]

          setExcelHeaders(headers)
          setExcelRows(data)

          // Intelligent Mapping defaults
          const initMapping: Record<string, string> = {}
          const cleanString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
          const matchHeader = (dest: string, patterns: string[]) => {
            const cleanPatterns = patterns.map(cleanString)
            const found = headers.find(h => {
              const cleanedH = cleanString(h)
              return cleanPatterns.some(p => cleanedH.includes(p) || p.includes(cleanedH))
            })
            if (found) initMapping[dest] = found
          }

          matchHeader('id', ['student id', 'id', 'kod', 'index', 'number'])
          matchHeader('full_name', ['full name', 'name', 'f.i.sh', 'fish', 'ism', 'fullname'])
          matchHeader('passport', ['passport', 'pass', 'seriya'])
          matchHeader('passport_issue_date', ['date of issue', 'issue date', 'passport issue'])
          matchHeader('passport_expire_date', ['date of expiration', 'expiration date', 'passport expire', 'expire date'])
          matchHeader('gender', ['gender', 'sex', 'jins'])
          matchHeader('birthday', ['birthday', 'birth', 'tugilgan', 'date'])
          matchHeader('phone1', ['phone 1', 'phone1', 'phone', 'tel1', 'telefon', 'phone number'])
          matchHeader('phone2', ['phone 2', 'phone2', 'tel2', 'qoshimcha tel'])
          
          matchHeader('father_name', ['father fullname', 'father name', 'ota ismi', 'otasi ismi', 'ota f.i.sh', 'ota fish'])
          matchHeader('father_phone', ['father phone', 'otasi tel', 'ota tel'])
          matchHeader('father_job', ['father job', 'father work', 'ota kasb'])
          matchHeader('mother_name', ['mother fullname', 'mother name', 'ona ismi', 'onasi ismi', 'ona f.i.sh', 'ona fish'])
          matchHeader('mother_phone', ['mother phone', 'onasi tel', 'ona tel'])
          matchHeader('mother_job', ['mother job', 'mother work', 'ona kasb'])
          
          matchHeader('email', ['email', 'pochta'])
          matchHeader('address', ['address', 'manzil'])
          
          matchHeader('level', ['education level 1', 'level 1', 'level', 'bosqich 1', 'daraja 1'])
          matchHeader('level2', ['education level 2', 'level 2', 'bosqich 2', 'daraja 2'])
          matchHeader('educational_background', ['educational background', 'background', 'malumoti'])
          matchHeader('major', ['major', 'yonalish'])
          matchHeader('tariff', ['tariff', 'tarif', 'package'])
          
          matchHeader('language_certificate', ['language certificate 1', 'certificate 1', 'cert 1', 'sertifikat 1'])
          matchHeader('certificate_score', ['score 1', 'ball 1', 'score1', 'ball1'])
          matchHeader('language_certificate_2', ['language certificate 2', 'certificate 2', 'cert 2', 'sertifikat 2'])
          matchHeader('certificate_score_2', ['score 2', 'ball 2', 'score2', 'ball2'])
          matchHeader('language_certificate_3', ['language certificate 3', 'certificate 3', 'cert 3', 'sertifikat 3'])
          matchHeader('certificate_score_3', ['score 3', 'ball 3', 'score3', 'ball3'])
          
          matchHeader('university_1', ['university 1', 'universitet 1', 'otm 1', 'university1'])
          matchHeader('university_1_status', ['university 1 status', 'otm 1 status', 'university1status'])
          matchHeader('university_2', ['university 2', 'universitet 2', 'otm 2', 'university2'])
          matchHeader('university_2_status', ['university 2 status', 'otm 2 status', 'university2status'])
          matchHeader('university_3', ['university 3', 'universitet 3', 'otm 3', 'university3'])
          matchHeader('university_3_status', ['university 3 status', 'otm 3 status', 'university3status'])
          
          matchHeader('balance', ['balance', 'balans', 'qoldiq'])
          matchHeader('discount', ['discount', 'chegirma'])
          matchHeader('office', ['office', 'offis', 'filial'])
          matchHeader('student_group', ['group', 'guruh'])
          matchHeader('lead_by', ['lead by', 'manba', 'lead'])
          matchHeader('notes', ['note', 'notes', 'izoh'])

          setExcelMapping(initMapping)
          setImportLogs(prev => [...prev, `[System] Parsed ${data.length} records from Excel: ${file.name}`])
        } catch (e: any) {
          alert('Error parsing sheet: ' + e.message)
        }
      }
      reader.readAsBinaryString(file)
    } catch (err: any) {
      alert('Failed to load SheetJS library: ' + err.message)
    } finally {
      setIsExcelLoading(false)
    }
  }

  // Remap Excel whenever mapping config updates
  useEffect(() => {
    if (excelRows.length > 0) {
      const parsed = excelRows.map(row => sanitizeRecord(row, false))
      setParsedRecords(parsed)
    }
  }, [excelMapping, excelRows])

  // --- MIGRATION EXECUTION ---
  const handleStartImport = async () => {
    if (parsedRecords.length === 0) return
    
    setIsImporting(true)
    setImportComplete(false)
    const recordsToImport = [...parsedRecords]
    const total = recordsToImport.length
    
    setImportProgress({ current: 0, total, success: 0, failed: 0 })
    setImportLogs(prev => [...prev, `[Import] Starting upload of ${total} records using Strategy: ${conflictStrategy.toUpperCase()}`])

    // Perform inserts in chunks of 25 to avoid rate-limiting or heavy queries
    const chunkSize = 25
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = recordsToImport.slice(i, i + chunkSize)
      const chunkData = chunk.filter(c => c.isValid).map(c => ({
        ...(c.mapped as Student),
        tenant_id: loggedInProfile?.tenant_id || 'unibridge',
        created_by: loggedInProfile?.id || null
      }))

      if (chunkData.length === 0) {
        failedCount += chunk.length
        setImportProgress(p => ({ ...p, current: i + chunk.length, failed: failedCount }))
        continue
      }

      try {
        if (conflictStrategy === 'overwrite') {
          // Supabase bulk upsert queries using primary key id
          const { error: upsertErr } = await (supabase
            .from('students') as any)
            .upsert(chunkData, { onConflict: 'id' })

          if (upsertErr) throw upsertErr
          
          successCount += chunkData.length
          setImportLogs(prev => [...prev, `[Success] Batch [${i}-${i+chunkData.length}]: Upserted successfully`])
        } else {
          // If skip duplicates, try fetching existing IDs in this chunk first
          const ids = chunkData.map(c => c.id)
          const { data: existingRecords } = await (supabase
            .from('students') as any)
            .select('id')
            .in('id', ids)

          const existingIds = new Set((existingRecords as any[] || []).map(r => r.id))
          const insertableData = chunkData.filter(c => !existingIds.has(c.id))
          const skippedCount = chunkData.length - insertableData.length

          if (insertableData.length > 0) {
            const { error: insertErr } = await (supabase
              .from('students') as any)
              .insert(insertableData)

            if (insertErr) throw insertErr
          }

          successCount += insertableData.length
          failedCount += skippedCount
          
          if (skippedCount > 0) {
            setImportLogs(prev => [...prev, `[Skip] Batch [${i}-${i+chunkData.length}]: Skipped ${skippedCount} duplicate(s)`])
          }
          if (insertableData.length > 0) {
            setImportLogs(prev => [...prev, `[Success] Batch [${i}-${i+chunkData.length}]: Inserted ${insertableData.length} new records`])
          }
        }
      } catch (err: any) {
        console.error(err)
        failedCount += chunk.length
        setImportLogs(prev => [...prev, `[Error] Batch failed at index ${i}: ${err.message || err}`])
      }

      setImportProgress({
        current: Math.min(i + chunkSize, total),
        total,
        success: successCount,
        failed: failedCount
      })
    }

    setIsImporting(false)
    setImportComplete(true)
    setImportLogs(prev => [...prev, `[Finished] Migration complete. Success: ${successCount}, Skips/Errors: ${failedCount}`])
  }

  const resetImport = () => {
    setParsedRecords([])
    setExcelFile(null)
    setExcelHeaders([])
    setExcelRows([])
    setFbConnected(false)
    setImportComplete(false)
    setImportLogs([])
  }

  // Pre-calculate parsed counts
  const totalParsed = parsedRecords.length
  const totalValid = parsedRecords.filter(r => r.isValid).length
  const totalInvalid = totalParsed - totalValid

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Back to Students Dashboard */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/students')}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] active:scale-[0.96] transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students List
        </button>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 border border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 text-xs font-semibold">
          <Database className="h-3.5 w-3.5" />
          Migration Engine v2.0
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-bold tracking-tight">Student Data Import Center</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Copy legacy students directly from your live Firestore database, or upload custom Excel/CSV spreadsheets.
          </p>
        </div>

        {!isImporting && !importComplete ? (
          <>
            {/* Tabs Selector */}
            <div className="flex items-center gap-2 border-b border-[var(--border)]">
              <button
                onClick={() => { setActiveTab('firestore'); resetImport(); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'firestore'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <Database className="h-4 w-4" />
                Firestore Live Database
              </button>
              <button
                onClick={() => { setActiveTab('excel'); resetImport(); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'excel'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel / CSV Spreadsheet
              </button>
            </div>

            {/* TAB CONTENT: FIRESTORE */}
            {activeTab === 'firestore' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connection Form */}
                <div className="lg:col-span-1 glass rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
                    <Settings className="h-4 w-4 text-[var(--foreground-muted)]" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--foreground-muted)]">Credentials</h2>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1">Firebase Project ID</label>
                      <input
                        type="text"
                        value={fbConfig.projectId}
                        onChange={e => setFbConfig(p => ({ ...p, projectId: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1">API Key</label>
                      <input
                        type="password"
                        value={fbConfig.apiKey}
                        onChange={e => setFbConfig(p => ({ ...p, apiKey: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)] animate-pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1">Auth Domain</label>
                      <input
                        type="text"
                        value={fbConfig.authDomain}
                        onChange={e => setFbConfig(p => ({ ...p, authDomain: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1">Collection Name</label>
                      <input
                        type="text"
                        value={fbCollection}
                        onChange={e => setFbCollection(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)] font-mono font-bold"
                      />
                    </div>

                    <button
                      onClick={handleConnectFirestore}
                      disabled={isFirebaseLoading}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold py-2.5 rounded-[var(--radius-md)] cursor-pointer disabled:opacity-50 transition-all select-none"
                    >
                      {isFirebaseLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Connect & Fetch Data
                        </>
                      )}
                    </button>
                  </div>

                  {fbError && (
                    <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-[var(--radius-md)] text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{fbError}</span>
                    </div>
                  )}
                </div>

                {/* Firestore Table Preview */}
                <div className="lg:col-span-2 glass rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-[var(--accent)]" />
                      <h2 className="font-semibold text-sm">Collection Preview</h2>
                    </div>
                    {fbConnected && (
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-500 font-semibold">Live Data Connected</span>
                      </div>
                    )}
                  </div>

                  {fbConnected && parsedRecords.length > 0 ? (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Summary Badges */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[var(--background)] p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                            <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Total Found</span>
                            <span className="text-lg font-bold">{totalParsed} students</span>
                          </div>
                          <div className="bg-green-50/50 dark:bg-green-950/10 p-3 rounded-[var(--radius-md)] border border-green-200/50 dark:border-green-900/20">
                            <span className="block text-[10px] uppercase font-bold text-green-600 dark:text-green-400">Insertable</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{totalValid} valid</span>
                          </div>
                          <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-[var(--radius-md)] border border-amber-200/50 dark:border-amber-900/20">
                            <span className="block text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Fails / Cleans</span>
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{totalInvalid} warning(s)</span>
                          </div>
                        </div>

                        {/* Preview Table */}
                        <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] max-h-64 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--foreground-muted)] uppercase">
                              <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Cleaned Phone</th>
                                <th className="px-4 py-2">Tariff</th>
                                <th className="px-4 py-2">Warnings</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {parsedRecords.slice(0, previewLimit).map((record, index) => (
                                <tr key={index} className={record.isValid ? '' : 'bg-amber-50/10'}>
                                  <td className="px-4 py-2 font-mono font-bold">{record.mapped.id || '-'}</td>
                                  <td className="px-4 py-2 font-semibold">{record.mapped.full_name || '-'}</td>
                                  <td className="px-4 py-2 font-mono">{record.mapped.phone1 || <span className="text-red-400">null</span>}</td>
                                  <td className="px-4 py-2">{record.mapped.tariff || '-'}</td>
                                  <td className="px-4 py-2">
                                    {record.errors.length > 0 ? (
                                      <div className="text-[10px] text-amber-500 font-medium">
                                        {record.errors.map(e => e.message).join('; ')}
                                      </div>
                                    ) : (
                                      <span className="text-green-500">None</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {totalParsed > previewLimit && (
                          <div className="text-center">
                            <button
                              onClick={() => setPreviewLimit(p => p + 20)}
                              className="text-xs text-[var(--accent)] hover:underline font-semibold"
                            >
                              Show 20 More Records... (out of {totalParsed})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Setup & Import Strategy */}
                      <div className="border-t border-[var(--border)] pt-4 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] mb-1">On ID Conflict</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConflictStrategy('overwrite')}
                                className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold border ${
                                  conflictStrategy === 'overwrite'
                                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                                }`}
                              >
                                Overwrite (Upsert)
                              </button>
                              <button
                                onClick={() => setConflictStrategy('skip')}
                                className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold border ${
                                  conflictStrategy === 'skip'
                                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                    : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                                }`}
                              >
                                Skip Duplicates
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleStartImport}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-[var(--radius-md)] cursor-pointer select-none"
                        >
                          <Play className="h-4 w-4" />
                          Start Migration to Supabase
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <Database className="h-10 w-10 text-[var(--foreground-subtle)] mb-3 animate-bounce" strokeWidth={1} />
                      <p className="text-sm font-semibold text-[var(--foreground-muted)]">No data loaded.</p>
                      <p className="text-xs text-[var(--foreground-subtle)] max-w-sm mt-1">
                        Use the credential card on the left to authenticate and pull your live students records.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: EXCEL */}
            {activeTab === 'excel' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Drag-n-drop Upload area & column mapper */}
                <div className="lg:col-span-1 glass rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-sm)] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
                      <Sliders className="h-4 w-4 text-[var(--foreground-muted)]" />
                      <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--foreground-muted)]">File & Mapping</h2>
                    </div>

                    {!excelFile ? (
                      <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleExcelDrop}
                        className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer relative"
                      >
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleExcelSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <FileSpreadsheet className="h-10 w-10 text-[var(--foreground-subtle)] mx-auto mb-2" />
                        <span className="block text-xs font-semibold">Drag & Drop Spreadsheet</span>
                        <span className="block text-[10px] text-[var(--foreground-subtle)] mt-1">Supports .xlsx, .xls, .csv</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-[var(--radius-md)] border border-[var(--border)] text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="font-semibold truncate">{excelFile.name}</span>
                        </div>
                        <button
                          onClick={() => { setExcelFile(null); setExcelRows([]); setParsedRecords([]); }}
                          className="p-1 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {excelHeaders.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Map columns</span>
                          <span className="text-[10px] text-green-500 font-semibold">Auto-matched columns</span>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {[
                            { key: 'id', label: 'Student ID *' },
                            { key: 'full_name', label: 'Full Name *' },
                            { key: 'phone1', label: 'Phone 1' },
                            { key: 'phone2', label: 'Phone 2' },
                            { key: 'gender', label: 'Gender' },
                            { key: 'birthday', label: 'Birthday' },
                            { key: 'passport', label: 'Passport Series' },
                            { key: 'passport_issue_date', label: 'Passport Date of Issue' },
                            { key: 'passport_expire_date', label: 'Passport Date of Expiry' },
                            { key: 'email', label: 'Email' },
                            { key: 'address', label: 'Address' },
                            { key: 'level', label: 'Education Level 1' },
                            { key: 'level2', label: 'Education Level 2' },
                            { key: 'educational_background', label: 'Educational Background' },
                            { key: 'major', label: 'Major' },
                            { key: 'tariff', label: 'Tariff' },
                            { key: 'language_certificate', label: 'Language Certificate 1' },
                            { key: 'certificate_score', label: 'Score 1' },
                            { key: 'language_certificate_2', label: 'Language Certificate 2' },
                            { key: 'certificate_score_2', label: 'Score 2' },
                            { key: 'language_certificate_3', label: 'Language Certificate 3' },
                            { key: 'certificate_score_3', label: 'Score 3' },
                            { key: 'university_1', label: 'University 1' },
                            { key: 'university_1_status', label: 'University 1 Status' },
                            { key: 'university_2', label: 'University 2' },
                            { key: 'university_2_status', label: 'University 2 Status' },
                            { key: 'university_3', label: 'University 3' },
                            { key: 'university_3_status', label: 'University 3 Status' },
                            { key: 'balance', label: 'Balance' },
                            { key: 'discount', label: 'Discount' },
                            { key: 'father_name', label: 'Father Fullname' },
                            { key: 'father_phone', label: 'Father Phone' },
                            { key: 'father_job', label: 'Father Job' },
                            { key: 'mother_name', label: 'Mother Fullname' },
                            { key: 'mother_phone', label: 'Mother Phone' },
                            { key: 'mother_job', label: 'Mother Job' },
                            { key: 'office', label: 'Office' },
                            { key: 'student_group', label: 'Group' },
                            { key: 'lead_by', label: 'Lead by' },
                            { key: 'notes', label: 'Notes' },
                          ].map(col => (
                            <div key={col.key} className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium truncate text-[var(--foreground-muted)] w-28">{col.label}</span>
                              <select
                                value={excelMapping[col.key] || ''}
                                onChange={e => setExcelMapping(p => ({ ...p, [col.key]: e.target.value }))}
                                className="flex-1 text-[11px] px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-sm)] focus:outline-none"
                              >
                                <option value="">-- Skip Column --</option>
                                {excelHeaders.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {excelRows.length > 0 && (
                    <button
                      onClick={handleStartImport}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 rounded-[var(--radius-md)] cursor-pointer select-none mt-4"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Import {totalValid} Records
                    </button>
                  )}
                </div>

                {/* Excel Table Preview */}
                <div className="lg:col-span-2 glass rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-[var(--accent)]" />
                      <h2 className="font-semibold text-sm">Spreadsheet Preview</h2>
                    </div>
                  </div>

                  {excelRows.length > 0 && parsedRecords.length > 0 ? (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Summary Badges */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[var(--background)] p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                            <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Parsed rows</span>
                            <span className="text-lg font-bold">{totalParsed} total</span>
                          </div>
                          <div className="bg-green-50/50 dark:bg-green-950/10 p-3 rounded-[var(--radius-md)] border border-green-200/50 dark:border-green-900/20">
                            <span className="block text-[10px] uppercase font-bold text-green-600 dark:text-green-400">Valid</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{totalValid} rows</span>
                          </div>
                          <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-[var(--radius-md)] border border-amber-200/50 dark:border-amber-900/20">
                            <span className="block text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Validation warnings</span>
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{totalInvalid} rows</span>
                          </div>
                        </div>

                        {/* Preview Table */}
                        <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] max-h-64 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--foreground-muted)] uppercase">
                              <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Cleaned Phone</th>
                                <th className="px-4 py-2">Tariff</th>
                                <th className="px-4 py-2">Warnings</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {parsedRecords.slice(0, previewLimit).map((record, index) => (
                                <tr key={index} className={record.isValid ? '' : 'bg-amber-50/10'}>
                                  <td className="px-4 py-2 font-mono font-bold">{record.mapped.id || <span className="text-red-400 font-semibold">Missing ID</span>}</td>
                                  <td className="px-4 py-2 font-semibold">{record.mapped.full_name || <span className="text-red-400 font-semibold">Missing Name</span>}</td>
                                  <td className="px-4 py-2 font-mono">{record.mapped.phone1 || <span className="text-amber-400">null</span>}</td>
                                  <td className="px-4 py-2">{record.mapped.tariff || '-'}</td>
                                  <td className="px-4 py-2">
                                    {record.errors.length > 0 ? (
                                      <div className="text-[10px] text-amber-500 font-medium">
                                        {record.errors.map(e => e.message).join('; ')}
                                      </div>
                                    ) : (
                                      <span className="text-green-500">None</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {totalParsed > previewLimit && (
                          <div className="text-center">
                            <button
                              onClick={() => setPreviewLimit(p => p + 20)}
                              className="text-xs text-[var(--accent)] hover:underline font-semibold"
                            >
                              Show 20 More Records... (out of {totalParsed})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Setup & Import Strategy */}
                      <div className="border-t border-[var(--border)] pt-4 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)] mb-1">On ID Conflict</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConflictStrategy('overwrite')}
                              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold border ${
                                conflictStrategy === 'overwrite'
                                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                  : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                              }`}
                            >
                              Overwrite (Upsert)
                            </button>
                            <button
                              onClick={() => setConflictStrategy('skip')}
                              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-semibold border ${
                                conflictStrategy === 'skip'
                                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                  : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                              }`}
                            >
                              Skip Duplicates
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <FileSpreadsheet className="h-10 w-10 text-[var(--foreground-subtle)] mb-3 animate-pulse" strokeWidth={1} />
                      <p className="text-sm font-semibold text-[var(--foreground-muted)]">No spreadsheet loaded.</p>
                      <p className="text-xs text-[var(--foreground-subtle)] max-w-sm mt-1">
                        Upload or drag in your Excel/CSV file to preview and match columns.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* MIGRATION RUNNING / DONE DASHBOARD */
          <div className="glass rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {isImporting ? 'Migration is in Progress...' : 'Migration Complete!'}
                </h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Uploading records to Supabase in batches...
                </p>
              </div>

              {isImporting ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Streaming Queries...
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-full px-3 py-1 select-none">
                  <Check className="h-4 w-4" />
                  Migration Finished Successfully
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Progress: {importProgress.current} / {importProgress.total} records</span>
                <span>{Math.round((importProgress.current / importProgress.total) * 100) || 0}%</span>
              </div>
              <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-100 ease-out"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>

              {/* Status summary counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-[var(--background)] p-3 rounded-[var(--radius-md)] text-center border border-[var(--border)]">
                  <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Total</span>
                  <span className="text-base font-bold">{importProgress.total}</span>
                </div>
                <div className="bg-[var(--background)] p-3 rounded-[var(--radius-md)] text-center border border-[var(--border)]">
                  <span className="block text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Processed</span>
                  <span className="text-base font-bold">{importProgress.current}</span>
                </div>
                <div className="bg-green-50/50 dark:bg-green-950/10 p-3 rounded-[var(--radius-md)] text-center border border-green-200/50 dark:border-green-900/20">
                  <span className="block text-[10px] uppercase font-bold text-green-600 dark:text-green-400">Migrated</span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">{importProgress.success}</span>
                </div>
                <div className="bg-red-50/50 dark:bg-red-950/10 p-3 rounded-[var(--radius-md)] text-center border border-red-200/50 dark:border-red-900/20">
                  <span className="block text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Failed / Skips</span>
                  <span className="text-base font-bold text-red-600 dark:text-red-400">{importProgress.failed}</span>
                </div>
              </div>
            </div>

            {/* Console Log outputs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)]">
                <Terminal className="h-4 w-4" />
                Live Execution Logs
              </div>
              <div className="bg-[#0e0c1b] text-gray-300 font-mono text-[11px] p-4 rounded-[var(--radius-md)] h-48 overflow-y-auto space-y-1 scroll-smooth">
                {importLogs.map((log, index) => (
                  <div key={index} className={
                    log.includes('[Error]') ? 'text-red-400' :
                    log.includes('[Success]') ? 'text-green-400' :
                    log.includes('[Skip]') ? 'text-yellow-400' :
                    'text-gray-400'
                  }>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions when done */}
            {importComplete && (
              <div className="flex gap-4 border-t border-[var(--border)] pt-5">
                <button
                  onClick={() => router.push('/students')}
                  className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold py-2.5 rounded-[var(--radius-md)] cursor-pointer text-center"
                >
                  View Students in Table Dashboard
                </button>
                <button
                  onClick={resetImport}
                  className="flex-1 bg-[var(--background)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-semibold py-2.5 rounded-[var(--radius-md)] cursor-pointer text-center"
                >
                  Import Another Dataset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
