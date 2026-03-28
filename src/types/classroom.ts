export interface ClassRoom {
  id: string
  teacher_id: string
  name: string
  invite_code: string
  gdpr_confirmed_at: string
  created_at: string
}

export interface ClassMember {
  id: string
  class_id: string
  user_id: string
  joined_at: string
  last_active_at: string | null
}

export interface ClassAssignment {
  id: string
  class_id: string
  set_slug: string | null
  custom_deck_id: string | null
  assigned_at: string
}

// Joined types for UI queries
export interface ClassWithStudentCount extends ClassRoom {
  student_count: number
  last_activity: string | null
}

export interface ClassMemberWithProfile extends ClassMember {
  username: string | null
  avatar_id: number
}

export interface AssignmentWithDeck extends ClassAssignment {
  deck_title: string | null
}

// For the create-class form
export interface CreateClassPayload {
  name: string
  invite_code: string
  gdpr_confirmed_at: string
}
