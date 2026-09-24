import { can, normalizeRole, isAdminOrAbove, ROLES, pageResource } from './permissions'
import { Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { environment } from '../../environments/environment'
import { User } from './models'
import { firstValueFrom } from 'rxjs'

const TOKEN_KEY = 'golden-payroll-token'

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null)
  loading = signal(true)
  private refreshTimer?: ReturnType<typeof setInterval>

  constructor(private http: HttpClient, private router: Router) {
    this.refreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && this.user() && !this.loading()) {
        void this.refreshPermissions().catch(() => {})
      }
    }, 30000)
    const token = this.getToken()
    if (!token) {
      this.loading.set(false)
      return
    }
    // Finish constructing AuthService before its interceptor resolves this service.
    queueMicrotask(() => {
    this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res) => { this.user.set(res.user); this.loading.set(false) },
      error: () => { this.clearToken(); this.loading.set(false) },
    })
    })
  }

  getToken() { return localStorage.getItem(TOKEN_KEY) }
  setToken(token: string) { localStorage.setItem(TOKEN_KEY, token) }
  clearToken() { localStorage.removeItem(TOKEN_KEY) }

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: User }>(`${environment.apiUrl}/auth/login`, { email, password })
    )
    this.setToken(res.token)
    this.user.set(res.user)
  }

  async register(name: string, email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: User }>(`${environment.apiUrl}/auth/register`, { name, email, password })
    )
    this.setToken(res.token)
    this.user.set(res.user)
  }

  logout() {
    this.clearToken()
    this.user.set(null)
    this.router.navigate(['/login'])
  }

  async refreshPermissions(redirect=true) {
    const result = await firstValueFrom(this.http.get<{permissions: NonNullable<User['permissions']>}>(environment.apiUrl+'/permissions/me'))
    this.user.update(user => user && JSON.stringify(user.permissions)!==JSON.stringify(result.permissions) ? {...user,permissions:result.permissions} : user)
    const page = pageResource(this.router.url.split(/[?#]/)[0].replace(/^\//,''))
    if (redirect && !['login','no-access','notifications'].includes(page) && !this.can(page) && !(page === 'attendance-and-work' && (this.can('attendance-own') || this.can('tasks')))) void this.router.navigateByUrl(this.landingPage())
  }
  canViewAll(page:string) { return this.isAdmin() || this.can(page==='follow-ups'?'management':page) && this.can(page+'-all') }
  role() { return normalizeRole(this.user()?.role) }
  can(resource: string, action = 'read') {
    const page = ({accounts:'employee-accounts',operations:'attendance-and-work',finance:pageResource(this.router.url.split(/[?#]/)[0].replace(/^\//,''))} as Record<string,string>)[resource] || resource
    return can(this.role(), page, action, this.user()?.permissions)
  }
  canReadFinance() { return ['overview','payroll','streamers','name-rates','recruiters','recruiting-log','management-payroll','it','settings','expenses','archive','game-tracker','salaries'].some(page=>this.can(page)) }
  canWriteFinance() { return this.can('finance', 'write') }
  canAccessGameTracker() { return this.can('game-tracker') }
  canCreateGameTracker() { return this.can('game-tracker','write') }
  canManage() { return this.can('management','write') }
  isAdmin() { return isAdminOrAbove(this.user()?.role) }
  assignableRoles(): readonly string[] { return this.role() === 'SUPER_ADMIN' ? ROLES : this.isAdmin() || this.can('employee-accounts','write') ? ['EMPLOYEE', 'ACCOUNTANT', 'MANAGEMENT'] : [] }
  canManageAccount(user: { role: string }) { return this.can('employee-accounts','write') && this.assignableRoles().includes(normalizeRole(user.role)) }
  landingPage() {
    if (this.can('attendance-own')) return '/attendance'
    if (this.isAdmin()) return '/permissions'
    const page = Object.keys(this.user()?.permissions || {}).find(p=>this.can(p))
    return page ? ({overview:'/', 'recruiting-log':'/recruiting-list', tasks:'/attendance-and-work'} as Record<string,string>)[page] || '/'+page : '/no-access'
  }
}
