import {ManagementLogComponent} from './pages/management-log.component'
import {NotificationsComponent} from './pages/notifications.component'
import {SalaryEditorComponent} from './pages/salary-ledger.component'
import { roleGuard, roleChildGuard } from './core/role.guard'
import { managementGuard } from './core/management.guard'
import { employeeAdminGuard } from './core/employee.guard'
import { gameTrackerGuard, GameTrackerDeniedComponent } from './core/game-tracker.guard'
import { ExpensesPageComponent } from './pages/expenses/expenses-page.component'
import { Routes } from '@angular/router'
import { authGuard } from './core/auth.guard'
import { LoginComponent } from './pages/login/login.component'
import { LayoutComponent } from './components/layout/layout.component'
import { OverviewComponent } from './pages/overview/overview.component'
import { PayrollComponent } from './pages/payroll/payroll.component'
import { StreamersComponent } from './pages/streamers/streamers.component'
import { RecruitersComponent } from './pages/recruiters/recruiters.component'
import { RecruitingListComponent } from './pages/recruiting-list/recruiting-list.component'
import { StaffDeptComponent } from './pages/staff-dept/staff-dept.component'
import { SettingsComponent } from './pages/settings/settings.component'

import { NameRatesComponent } from './pages/streamers/name-rates.component'
import { ArchiveComponent } from './pages/archive/archive.component'
import { AttendanceComponent } from './pages/attendance/attendance.component'
import { EmployeeAccountsComponent } from './pages/attendance/employees.component'
import { GameTrackerComponent } from './pages/game-tracker/game-tracker.component'
import { TasksComponent } from './pages/attendance/tasks.component'
import { FollowUpsComponent } from './pages/follow-ups/follow-ups.component'

import { PermissionsComponent, NoAccessComponent } from './pages/permissions/permissions.component'

export const routes: Routes = [
  { path: 'no-access', component: NoAccessComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [roleChildGuard],
    children: [
      {path:'management-log',component:ManagementLogComponent},
      {path:'notifications',component:NotificationsComponent},
      { path: '', component: OverviewComponent },
      { path: 'permissions', component: PermissionsComponent },
      { path: 'attendance', component: AttendanceComponent, canActivate: [roleGuard] },
      { path: 'attendance-and-work', component: AttendanceComponent, canActivate: [roleGuard], data: { allAttendance: true } },
      { path: 'tasks', component: TasksComponent, canActivate: [roleGuard] },
      { path: 'follow-ups', component: FollowUpsComponent, canActivate: [managementGuard] },
      { path: 'employee-accounts', component: EmployeeAccountsComponent, canActivate: [employeeAdminGuard] },
      { path: 'game-tracker', component: GameTrackerComponent, canActivate: [gameTrackerGuard] },
      { path: 'game-tracker-denied', component: GameTrackerDeniedComponent },
      { path: 'expenses', component: ExpensesPageComponent },
      { path: 'payroll', component: PayrollComponent },
      { path: 'streamers', component: StreamersComponent },
      { path: 'name-rates', component: NameRatesComponent },
      { path: 'recruiters', component: RecruitersComponent },
      { path: 'recruiting-list', component: RecruitingListComponent },
      { path: 'management', redirectTo: 'follow-ups' },
      { path: 'management-payroll', component: StaffDeptComponent, data: { dept: 'management', title: 'الإدارة', subtitle: 'Base Salary ثابت + بونص/خصم شهري' } },
      { path: 'it', component: StaffDeptComponent, data: { dept: 'it', title: 'IT', subtitle: 'نفس منطق الإدارة بالظبط' } },
      {path:'salaries',component:SalaryEditorComponent},
      { path: 'settings', component: SettingsComponent },
      { path: 'archive', component: ArchiveComponent },
    ],
  },
  { path: '**', redirectTo: '' },
]
