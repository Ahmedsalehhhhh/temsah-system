export const LEVELS = ['NO_ACCESS', 'VIEW_ONLY', 'FULL_EDIT']
export const PAGES = ['overview','payroll','streamers','name-rates','recruiters','recruiting-log','management-payroll','it','settings','expenses','archive','game-tracker','management','attendance-and-work','employee-accounts','tasks','attendance-own','management-all','attendance-and-work-all','tasks-all','follow-ups-all','salaries','inventory']
export const EDITABLE_ROLES = ['EMPLOYEE','ACCOUNTANT','MANAGEMENT','ADMIN']
export const FINANCE_PAGES = [...PAGES.slice(0,12),'salaries']
export function defaultPermissions(role) {
  return Object.fromEntries(PAGES.map(page => [page,
    role === 'ADMIN' ? 'FULL_EDIT' : page.endsWith('-all') ? 'NO_ACCESS' : page === 'attendance-own' ? 'FULL_EDIT' :
    ['management','attendance-and-work','tasks','inventory'].includes(page) ? (role === 'MANAGEMENT' ? 'FULL_EDIT' : 'NO_ACCESS') :
    page === 'employee-accounts' ? 'NO_ACCESS' :
    role === 'ACCOUNTANT' ? 'FULL_EDIT' : role === 'MANAGEMENT' ? 'VIEW_ONLY' : 'NO_ACCESS']))
}
