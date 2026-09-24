export const ROLES = ['EMPLOYEE', 'ACCOUNTANT', 'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'] as const
export type Role = typeof ROLES[number]
export const PAGES = ['overview','payroll','streamers','name-rates','recruiters','recruiting-log','management-payroll','it','settings','expenses','archive','game-tracker','management','attendance-and-work','employee-accounts','tasks','attendance-own','management-all','attendance-and-work-all','tasks-all','follow-ups-all','salaries','inventory']
export type AccessLevel = 'NO_ACCESS' | 'VIEW_ONLY' | 'FULL_EDIT'
export function normalizeRole(role: string | undefined): string {
  const value = (role || '').toUpperCase()
  return ['STAFF', 'STREAMER'].includes(value) ? 'EMPLOYEE' : value
}
export function isAdminOrAbove(role: string | undefined): boolean { return ['ADMIN','SUPER_ADMIN'].includes(normalizeRole(role)) }
export function can(role: string | undefined, page: string, action = 'read', permissions: Record<string,AccessLevel> = {}): boolean {
  if (!['read','write'].includes(action)) return false
  if (page === 'permissions') return isAdminOrAbove(role)
  if (!(ROLES as readonly string[]).includes(normalizeRole(role)) || !PAGES.includes(page)) return false
  const level = isAdminOrAbove(role) ? 'FULL_EDIT' : permissions[page]
  return level === 'FULL_EDIT' || action === 'read' && level === 'VIEW_ONLY'
}
export function pageResource(path: string): string {
  return ({'management-log':'management-payroll','':'overview',attendance:'attendance-own','recruiting-list':'recruiting-log','game-tracker-denied':'game-tracker','follow-ups':'management'} as Record<string,string>)[path] || path
}
