import { type Student } from '@/types/database'

/**
 * Normalizes and checks if a field has a valid, non-empty, non-dashed value.
 */
export const isFieldFilled = (val: any): boolean => {
  if (val === null || val === undefined) return false
  if (typeof val.trim !== 'function') {
    return !!val
  }
  const trimmed = val.trim()
  return trimmed !== '' && trimmed !== '-'
}

/**
 * Centralized validation function to automatically synchronize a student's
 * profile fields with their Missing Documents (pick_needed) array.
 */
export function syncMissingDocuments(student: Student): string[] {
  const currentPick = student && Array.isArray(student.pick_needed) ? [...student.pick_needed] : []

  // If "FULL OK" is in the checklist, it overrides all missing documents
  if (currentPick.includes("FULL OK")) {
    return ["FULL OK"]
  }

  // 1. "2 ta nomer" (Needs at least 2 valid phone numbers total)
  const phoneFields = [student.phone1, student.phone2, student.father_phone, student.mother_phone]
  const filledPhones = phoneFields.filter(isFieldFilled).length
  const needs2Nomer = filledPhones < 2

  // 2. "Email" (Email is required)
  const needsEmail = !isFieldFilled(student.email)

  // 3. "Foreign passport" (Passport number is required)
  const needsPassport = !isFieldFilled(student.passport)

  // 4. "Manzil" (Address is required)
  const needsAddress = !isFieldFilled(student.address)

  // 5. "Edu-Level" (Education Level is required)
  const needsLevel = !isFieldFilled(student.level)

  let updated = [...currentPick]

  const updateDoc = (docName: string, condition: boolean) => {
    if (condition) {
      if (!updated.includes(docName)) {
        updated.push(docName)
      }
    } else {
      updated = updated.filter(d => d !== docName)
    }
  }

  updateDoc("2 ta nomer", needs2Nomer)
  updateDoc("Email", needsEmail)
  updateDoc("Foreign passport", needsPassport)
  updateDoc("Manzil", needsAddress)
  updateDoc("Edu-Level", needsLevel)

  return updated
}
