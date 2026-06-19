export type UserRole = 'Manager' | 'Admin'

export interface Profile {
  id: string
  full_name: string | null
  email: string
  role: UserRole
  avatar_url: string | null
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
  passport: string | null
  passport_issue_date: string | null
  passport_expire_date: string | null
  gender: 'MALE' | 'FEMALE' | null
  birthday: string | null
  phone1: string | null
  phone2: string | null
  father_phone: string | null
  father_job: string | null
  mother_phone: string | null
  mother_job: string | null
  email: string | null
  address: string | null

  // 2. Educational & Tariff Details
  level: StudentLevel | null
  level2: StudentLevel | null
  educational_background: string | null
  tariff: StudentTariff | null

  // 3. Language Certificates (Supports up to 3)
  language_certificate: StudentLanguageCertificate | null
  certificate_score: string | null
  language_certificate_2: StudentLanguageCertificate | null
  certificate_score_2: string | null
  language_certificate_3: StudentLanguageCertificate | null
  certificate_score_3: string | null

  // 4. University Selection & Statuses
  university_1: string | null
  university_1_status: string
  university_2: string | null
  university_2_status: string | null
  university_3: string | null
  university_3_status: string | null

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
  notes: string | null
  created_at: string
  updated_at: string
  jarayon_updated_at: string | null
  is_deleted: boolean
  row_color: string | null
  status_row_color: string | null
  task_tags: string[]
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      students: {
        Row: Student
        Insert: {
          id: string
          full_name: string
          passport?: string | null
          passport_issue_date?: string | null
          passport_expire_date?: string | null
          gender?: 'MALE' | 'FEMALE' | null
          birthday?: string | null
          phone1?: string | null
          phone2?: string | null
          father_phone?: string | null
          father_job?: string | null
          mother_phone?: string | null
          mother_job?: string | null
          email?: string | null
          address?: string | null
          level?: StudentLevel | null
          level2?: StudentLevel | null
          educational_background?: string | null
          tariff?: StudentTariff | null
          language_certificate?: StudentLanguageCertificate | null
          certificate_score?: string | null
          language_certificate_2?: StudentLanguageCertificate | null
          certificate_score_2?: string | null
          language_certificate_3?: StudentLanguageCertificate | null
          certificate_score_3?: string | null
          university_1?: string | null
          university_1_status?: string
          university_2?: string | null
          university_2_status?: string | null
          university_3?: string | null
          university_3_status?: string | null
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
          notes?: string | null
          created_at?: string
          updated_at?: string
          jarayon_updated_at?: string | null
          is_deleted?: boolean
          row_color?: string | null
          status_row_color?: string | null
          task_tags?: string[]
        }
        Update: {
          id?: string
          full_name?: string
          passport?: string | null
          passport_issue_date?: string | null
          passport_expire_date?: string | null
          gender?: 'MALE' | 'FEMALE' | null
          birthday?: string | null
          phone1?: string | null
          phone2?: string | null
          father_phone?: string | null
          father_job?: string | null
          mother_phone?: string | null
          mother_job?: string | null
          email?: string | null
          address?: string | null
          level?: StudentLevel | null
          level2?: StudentLevel | null
          educational_background?: string | null
          tariff?: StudentTariff | null
          language_certificate?: StudentLanguageCertificate | null
          certificate_score?: string | null
          language_certificate_2?: StudentLanguageCertificate | null
          certificate_score_2?: string | null
          language_certificate_3?: StudentLanguageCertificate | null
          certificate_score_3?: string | null
          university_1?: string | null
          university_1_status?: string
          university_2?: string | null
          university_2_status?: string | null
          university_3?: string | null
          university_3_status?: string | null
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
          notes?: string | null
          created_at?: string
          updated_at?: string
          jarayon_updated_at?: string | null
          is_deleted?: boolean
          row_color?: string | null
          status_row_color?: string | null
          task_tags?: string[]
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
