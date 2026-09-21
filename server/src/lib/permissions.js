import { PAGES, FINANCE_PAGES } from './permissionDefaults.js'
export const ROLES = ['EMPLOYEE', 'ACCOUNTANT', 'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN']

// Legacy roles receive the least-privileged access, never implied accounting access.
export function normalizeRole(role) {
  const value = typeof role === 'string' ? role.toUpperCase() : ''
  return ['STAFF', 'STREAMER'].includes(value) ? 'EMPLOYEE' : value
}

export function isAdminOrAbove(role) {
  return ['ADMIN', 'SUPER_ADMIN'].includes(normalizeRole(role))
}

export function can(user, resource, action = 'read') {
  const role = normalizeRole(user?.role)
  if (!ROLES.includes(role) || !['read','write'].includes(action)) return false
  const page = ({accounts:'employee-accounts', operations:'attendance-and-work', finance:user?.permissionPage || 'overview'})[resource] || resource
  if (!PAGES.includes(page)) return false
  if (isAdminOrAbove(role)) return true
  const level = user?.permissions?.[page]
  return level === 'FULL_EDIT' || action === 'read' && level === 'VIEW_ONLY'
}

export function assignableRoles(user) {
  return normalizeRole(user?.role) === 'SUPER_ADMIN' ? [...ROLES]
    : isAdminOrAbove(user?.role) || can(user, 'employee-accounts','write') ? ['EMPLOYEE', 'ACCOUNTANT', 'MANAGEMENT'] : []
}

export function canManageAccount(actor, target) {
  return assignableRoles(actor).includes(normalizeRole(target?.role))
}

// Shared GET dependencies never confer permission to mutate the source page.
export function requestPages(req, resource) {
  if (resource !== 'finance') return [({accounts:'employee-accounts',operations:'attendance-and-work'})[resource] || resource]
  const base = req.baseUrl.split('/').pop(), path = req.path
  const read = ['GET','HEAD','OPTIONS'].includes(req.method)
  if (base === 'streamers') {
    if (path.includes('name-rates')) return ['name-rates']
    return ['streamers']
  }
  if (base === 'employees') return [path.startsWith('/general')?'salaries':path.startsWith('/it') ? 'it' : 'management-payroll']
  if (base === 'recruiters') return [read && path==='/lookup' ? 'recruiting-log' : 'recruiters']
  if (['recruiting-records','recruitingRecords'].includes(base)) return [read && path.startsWith('/payroll/') ? 'recruiters' : 'recruiting-log']
  if (base === 'settings') return read && path==='/calculation' ? FINANCE_PAGES : ['settings']
  if (base === 'periods') return read ? [...FINANCE_PAGES,'management'] : ['payroll']
  if (base === 'payroll') return ['overview','payroll']
  return [({companies:'expenses',gameTracker:'game-tracker'})[base] || base]
}
export function requirePermission(resource, action) {
  return (req, res, next) => {
    const operation = action || (['GET','HEAD','OPTIONS'].includes(req.method) ? 'read' : 'write')
    const pages = requestPages(req, resource)
    if (!pages.some(page => can(req.user, page, operation))) return res.status(403).json({message:'ليس لديك صلاحية لهذا الإجراء'})
    req.user.permissionPage = pages[0]
    next()
  }
}
