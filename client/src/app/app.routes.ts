import { roleGuard, roleChildGuard } from './core/role.guard'
import { managementGuard } from './core/management.guard'
import { employeeAdminGuard } from './core/employee.guard'
import { gameTrackerGuard } from './core/game-tracker.guard'
import { Routes } from '@angular/router'
import { authGuard } from './core/auth.guard'
import { LayoutComponent } from './components/layout/layout.component'

export const routes: Routes = [
  { path: 'no-access', loadComponent:()=>import('./pages/permissions/permissions.component').then(m=>m.NoAccessComponent), canActivate: [authGuard] },
  { path: 'login', loadComponent:()=>import('./pages/login/login.component').then(m=>m.LoginComponent) },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [roleChildGuard],
    children: [
      {path:'management-log',loadComponent:()=>import('./pages/management-log.component').then(m=>m.ManagementLogComponent)},
      {path:'notifications',loadComponent:()=>import('./pages/notifications.component').then(m=>m.NotificationsComponent)},
      { path: '', loadComponent:()=>import('./pages/overview/overview.component').then(m=>m.OverviewComponent) },
      { path: 'permissions', loadComponent:()=>import('./pages/permissions/permissions.component').then(m=>m.PermissionsComponent) },
      { path: 'attendance', loadComponent:()=>import('./pages/attendance/attendance.component').then(m=>m.AttendanceComponent), canActivate: [roleGuard] },
      { path: 'attendance-and-work', loadComponent:()=>import('./pages/attendance/attendance.component').then(m=>m.AttendanceComponent), canActivate: [roleGuard], data: { allAttendance: true } },
      { path: 'tasks', loadComponent:()=>import('./pages/attendance/tasks.component').then(m=>m.TasksComponent), canActivate: [roleGuard] },
      { path: 'follow-ups', loadComponent:()=>import('./pages/follow-ups/follow-ups.component').then(m=>m.FollowUpsComponent), canActivate: [managementGuard] },
      { path: 'inventory', loadComponent:()=>import('./pages/inventory/inventory.component').then(m=>m.InventoryComponent), canActivate: [roleGuard] },
      { path: 'employee-accounts', loadComponent:()=>import('./pages/attendance/employees.component').then(m=>m.EmployeeAccountsComponent), canActivate: [employeeAdminGuard] },
      { path: 'game-tracker', loadComponent:()=>import('./pages/game-tracker/game-tracker.component').then(m=>m.GameTrackerComponent), canActivate: [gameTrackerGuard] },
      { path: 'game-tracker-denied', loadComponent:()=>import('./core/game-tracker.guard').then(m=>m.GameTrackerDeniedComponent) },
      { path: 'expenses', loadComponent:()=>import('./pages/expenses/expenses-page.component').then(m=>m.ExpensesPageComponent) },
      { path: 'payroll', loadComponent:()=>import('./pages/payroll/payroll.component').then(m=>m.PayrollComponent) },
      { path: 'streamers', loadComponent:()=>import('./pages/streamers/streamers.component').then(m=>m.StreamersComponent) },
      { path: 'name-rates', loadComponent:()=>import('./pages/streamers/name-rates.component').then(m=>m.NameRatesComponent) },
      { path: 'recruiters', loadComponent:()=>import('./pages/recruiters/recruiters.component').then(m=>m.RecruitersComponent) },
      { path: 'recruiting-list', loadComponent:()=>import('./pages/recruiting-list/recruiting-list.component').then(m=>m.RecruitingListComponent) },
      { path: 'management', redirectTo: 'follow-ups' },
      { path: 'management-payroll', loadComponent:()=>import('./pages/staff-dept/staff-dept.component').then(m=>m.StaffDeptComponent), data: { dept: 'management', title: 'الإدارة', subtitle: 'Base Salary ثابت + بونص/خصم شهري' } },
      { path: 'it', loadComponent:()=>import('./pages/staff-dept/staff-dept.component').then(m=>m.StaffDeptComponent), data: { dept: 'it', title: 'IT', subtitle: 'نفس منطق الإدارة بالظبط' } },
      {path:'salaries',loadComponent:()=>import('./pages/salary-ledger.component').then(m=>m.SalaryEditorComponent)},
      { path: 'settings', loadComponent:()=>import('./pages/settings/settings.component').then(m=>m.SettingsComponent) },
      { path: 'archive', loadComponent:()=>import('./pages/archive/archive.component').then(m=>m.ArchiveComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
]
