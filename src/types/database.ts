export type UserRole = 'Manager' | 'Admin' | 'Head Manager'

export interface Profile {
  id: string
  full_name: string | null
  email: string
  role: UserRole
  avatar_url: string | null
  tenant_id: string
  created_at: string
  updated_at: string
}

// Reusable school contact details, keyed by name. Auto-fills the Educational
// Background form so the same institution isn't retyped for every student.
export interface School {
  id: string
  name: string
  address: string | null
  website: string | null
  phone: string | null
  email: string | null
  source: 'seed' | 'user'
  created_at: string
  updated_at: string
}

export type StudentLevel = 'COLLEGE' | 'BACHELOR' | 'MASTERS' | 'MASTER NO CERTIFICATE' | 'LANGUAGE COURSE'
export type StudentTariff = 'STANDART' | 'PREMIUM' | 'VISA PLUS' | 'E-VISA' | 'REGIONAL VISA'
export type StudentLanguageCertificate = 'TOPIK' | 'IELTS' | 'TOEFL' | 'CEFR' | 'SAT' | 'SKA' | 'NO CERTIFICATE'

export interface Student {
  // 1. Personal & Contact Information
  id: string
  full_name: string
  korean_name: string | null
  passport: string | null
  passport_issue_date: string | null
  passport_expire_date: string | null
  gender: 'MALE' | 'FEMALE' | null
  birthday: string | null
  phone1: string | null
  phone2: string | null
  father_name: string | null
  father_phone: string | null
  father_job: string | null
  mother_name: string | null
  mother_phone: string | null
  mother_job: string | null
  email: string | null
  address: string | null

  // 2. Educational & Tariff Details
  level: StudentLevel | null
  level2: StudentLevel | null
  educational_background: string | null
  major: string | null
  final_school_name: string | null
  gpa: string | null
  gpa_system: string | null
  degree_no: string | null
  date_of_entry: string | null
  date_of_graduation: string | null
  graduation_expected: boolean
  school_address: string | null
  school_website: string | null
  school_phone: string | null
  school_email: string | null
  tariff: StudentTariff | null

  // 3. Language Certificates (Supports up to 3)
  language_certificate: StudentLanguageCertificate | null
  certificate_score: string | null
  certificate_test_date: string | null
  certificate_valid_date: string | null
  language_certificate_2: StudentLanguageCertificate | null
  certificate_score_2: string | null
  certificate_2_test_date: string | null
  certificate_2_valid_date: string | null
  language_certificate_3: StudentLanguageCertificate | null
  certificate_score_3: string | null
  certificate_3_test_date: string | null
  certificate_3_valid_date: string | null

  // 4. University Selection & Statuses
  university_1: string | null
  university_1_status: string
  university_1_major: string | null
  university_2: string | null
  university_2_status: string | null
  university_2_major: string | null
  university_3: string | null
  university_3_status: string | null
  university_3_major: string | null
  university_4: string | null
  university_4_status: string | null
  university_4_major: string | null
  university_5: string | null
  university_5_status: string | null
  university_5_major: string | null

  // 5. Financial Parameters
  balance: number
  discount: number

  // 7. Document Checklist & Hand Counts
  pick_needed: string[]
  has_mc: boolean
  bc_hand_count: number
  mc_hand_count: number
  apos_hand_count: number
  pic_hand_count: number

  // 8. System & Management Metadata
  office: string | null
  student_group: string | null
  lead_by: string | null
  coordinator: string | null
  notes: string | null
  created_at: string
  updated_at: string
  jarayon_updated_at: string | null
  is_deleted: boolean
  row_color: string | null
  status_row_color: string | null
  task_tags: string[]
  folder_ids: string[]
  invoice: string | null
  coa: string | null
  embassy: string | null
  invoice_university: string | null
  embassy_documents: string[] | null
  status_hidden: boolean | null
  kdb_put_date: string | null
  kdb_take_date: string | null
  embassy_father_docs: string[] | null
  embassy_mother_docs: string[] | null
  embassy_sponsor_notes: string | null
  google_drive_url?: string | null
  google_drive_folder_id?: string | null
  tenant_id: string
  created_by: string | null
  creator?: { id: string; full_name: string | null; email: string } | null
}

export type PaymentMethod = 'Karta J.A' | 'Karta Abdulaziz' | 'Naqd' | 'Karta M.A' | 'Bank' | 'Discount' | 'Withdrawal'
export type PaymentReceivedBy = 'ABDULAZIZ' | 'MUSLIHIDDIN' | 'BAXTIYOR' | 'MUHAMMADALI' | 'JASUR' | 'ADMIN' | 'System'

export interface Payment {
  id: string
  amount: number
  method: string
  received_by: string
  notes: string | null
  is_discount: boolean
  is_withdrawal: boolean
  student_id: string | null
  student_name: string | null
  tenant_id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      payments: {
        Row: Payment
        Insert: {
          id?: string
          amount: number
          method: string
          received_by: string
          notes?: string | null
          is_discount?: boolean
          is_withdrawal?: boolean
          student_id?: string | null
          student_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          method?: string
          received_by?: string
          notes?: string | null
          is_discount?: boolean
          is_withdrawal?: boolean
          student_id?: string | null
          student_name?: string | null
          updated_at?: string
        }
      }
      students: {
        Row: Student
        Insert: {
          id: string
          full_name: string
          korean_name?: string | null
          passport?: string | null
          passport_issue_date?: string | null
          passport_expire_date?: string | null
          gender?: 'MALE' | 'FEMALE' | null
          birthday?: string | null
          phone1?: string | null
          phone2?: string | null
          father_name?: string | null
          father_phone?: string | null
          father_job?: string | null
          mother_name?: string | null
          mother_phone?: string | null
          mother_job?: string | null
          email?: string | null
          address?: string | null
          level?: StudentLevel | null
          level2?: StudentLevel | null
          educational_background?: string | null
          major?: string | null
          final_school_name?: string | null
          gpa?: string | null
          gpa_system?: string | null
          degree_no?: string | null
          date_of_entry?: string | null
          date_of_graduation?: string | null
          graduation_expected?: boolean
          school_address?: string | null
          school_website?: string | null
          school_phone?: string | null
          school_email?: string | null
          tariff?: StudentTariff | null
          language_certificate?: StudentLanguageCertificate | null
          certificate_score?: string | null
          certificate_test_date?: string | null
          certificate_valid_date?: string | null
          language_certificate_2?: StudentLanguageCertificate | null
          certificate_score_2?: string | null
          certificate_2_test_date?: string | null
          certificate_2_valid_date?: string | null
          language_certificate_3?: StudentLanguageCertificate | null
          certificate_score_3?: string | null
          certificate_3_test_date?: string | null
          certificate_3_valid_date?: string | null
          university_1?: string | null
          university_1_status?: string
          university_1_major?: string | null
          university_2?: string | null
          university_2_status?: string | null
          university_2_major?: string | null
          university_3?: string | null
          university_3_status?: string | null
          university_3_major?: string | null
          university_4?: string | null
          university_4_status?: string | null
          university_4_major?: string | null
          university_5?: string | null
          university_5_status?: string | null
          university_5_major?: string | null
          balance?: number
          discount?: number
          pick_needed?: string[]
          has_mc?: boolean
          bc_hand_count?: number
          mc_hand_count?: number
          apos_hand_count?: number
          pic_hand_count?: number
          office?: string | null
          student_group?: string | null
          lead_by?: string | null
          coordinator?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          jarayon_updated_at?: string | null
          is_deleted?: boolean
          row_color?: string | null
          status_row_color?: string | null
          task_tags?: string[]
          folder_ids?: string[]
          invoice?: string | null
          coa?: string | null
          embassy?: string | null
          invoice_university?: string | null
          embassy_documents?: string[] | null
          status_hidden?: boolean | null
          kdb_put_date?: string | null
          kdb_take_date?: string | null
          embassy_father_docs?: string[] | null
          embassy_mother_docs?: string[] | null
          embassy_sponsor_notes?: string | null
          google_drive_url?: string | null
          google_drive_folder_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          korean_name?: string | null
          passport?: string | null
          passport_issue_date?: string | null
          passport_expire_date?: string | null
          gender?: 'MALE' | 'FEMALE' | null
          birthday?: string | null
          phone1?: string | null
          phone2?: string | null
          father_name?: string | null
          father_phone?: string | null
          father_job?: string | null
          mother_name?: string | null
          mother_phone?: string | null
          mother_job?: string | null
          email?: string | null
          address?: string | null
          level?: StudentLevel | null
          level2?: StudentLevel | null
          educational_background?: string | null
          major?: string | null
          final_school_name?: string | null
          gpa?: string | null
          gpa_system?: string | null
          degree_no?: string | null
          date_of_entry?: string | null
          date_of_graduation?: string | null
          graduation_expected?: boolean
          school_address?: string | null
          school_website?: string | null
          school_phone?: string | null
          school_email?: string | null
          tariff?: StudentTariff | null
          language_certificate?: StudentLanguageCertificate | null
          certificate_score?: string | null
          certificate_test_date?: string | null
          certificate_valid_date?: string | null
          language_certificate_2?: StudentLanguageCertificate | null
          certificate_score_2?: string | null
          certificate_2_test_date?: string | null
          certificate_2_valid_date?: string | null
          language_certificate_3?: StudentLanguageCertificate | null
          certificate_score_3?: string | null
          certificate_3_test_date?: string | null
          certificate_3_valid_date?: string | null
          university_1?: string | null
          university_1_status?: string
          university_1_major?: string | null
          university_2?: string | null
          university_2_status?: string | null
          university_2_major?: string | null
          university_3?: string | null
          university_3_status?: string | null
          university_3_major?: string | null
          university_4?: string | null
          university_4_status?: string | null
          university_4_major?: string | null
          university_5?: string | null
          university_5_status?: string | null
          university_5_major?: string | null
          balance?: number
          discount?: number
          pick_needed?: string[]
          has_mc?: boolean
          bc_hand_count?: number
          mc_hand_count?: number
          apos_hand_count?: number
          pic_hand_count?: number
          office?: string | null
          student_group?: string | null
          lead_by?: string | null
          coordinator?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          jarayon_updated_at?: string | null
          is_deleted?: boolean
          row_color?: string | null
          status_row_color?: string | null
          task_tags?: string[]
          folder_ids?: string[]
          invoice?: string | null
          coa?: string | null
          embassy?: string | null
          invoice_university?: string | null
          embassy_documents?: string[] | null
          status_hidden?: boolean | null
          kdb_put_date?: string | null
          kdb_take_date?: string | null
          embassy_father_docs?: string[] | null
          embassy_mother_docs?: string[] | null
          embassy_sponsor_notes?: string | null
          google_drive_url?: string | null
          google_drive_folder_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
