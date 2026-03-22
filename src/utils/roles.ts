import type { Profile } from '../store/authStore'

export const hasRole = (profile: Profile | null, role: string): boolean =>
  profile?.roles?.includes(role) ?? false

export const isPlayer = (profile: Profile | null) => hasRole(profile, 'player')
export const isTeacher = (profile: Profile | null) => hasRole(profile, 'teacher')
export const isSuperAdmin = (profile: Profile | null) => hasRole(profile, 'superadmin')
export const isAdminUser = (profile: Profile | null) =>
  isTeacher(profile) || isSuperAdmin(profile)

export const isPendingTeacher = (profile: Profile | null) =>
  !isTeacher(profile) && profile?.teacher_request_status === 'pending'
