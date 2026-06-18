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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
