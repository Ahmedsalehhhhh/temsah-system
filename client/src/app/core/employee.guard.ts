import { roleGuard, roleChildGuard } from './role.guard'
export const employeeAdminGuard = roleGuard
export const employeeScopeGuard = roleChildGuard
