import {ResponsiveTablesDirective} from '../responsive-tables.directive'
import {ReportToolsComponent} from '../report-tools.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Component, OnInit, OnDestroy, effect, signal, untracked } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { PayrollService } from '../../core/payroll.service'
import { AuthService } from '../../core/auth.service'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { SupportAssistantComponent } from '../support-assistant/support-assistant.component'

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ReportToolsComponent, ResponsiveTablesDirective, SupportAssistantComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit, OnDestroy {
  menuOpen = signal(false)
  payrollExpanded = signal(false)
  payrollActive = signal(false)
  payrollNav = [
    {to:'/salaries',label:'مرتبات الموظفين',icon:'▥'},
    { to: '/streamers', label: 'الستريمرز', icon: '▣' },
    { to: '/name-rates', label: 'الأسماء والنسب', icon: '%' },
    { to: '/recruiters', label: 'الريكروترز', icon: '◈' },
    { to: '/recruiting-list', label: 'سجل الريكروتينج', icon: '≡' },
    { to: '/management-payroll', label: 'الإدارة', icon: '◆' },
    {to:'/management-log',label:'سجل الإدارة',icon:'≡'},
    { to: '/it', label: 'IT', icon: '◇' },
    { to: '/settings', label: 'الإعدادات', icon: '⚙' },
  ]

  visiblePayrollNav() { return this.payrollNav.filter(item=>this.auth.can(item.to === '/recruiting-list' ? 'recruiting-log' : item.to==='/management-log'?'management-payroll':item.to.slice(1))) }
  adding = signal(false)
  notifications = signal<any[]>([])
  notificationsOpen = signal(false)
  private notificationsPoll: any
  newLabel = ''

  constructor(public payroll: PayrollService, public auth: AuthService, private router: Router, private http: HttpClient) {
    const syncNavigation = () => {
      const path = this.router.url.split(/[?#]/)[0]
      const active = path === '/payroll' || this.payrollNav.some(item => item.to === path)
      this.payrollActive.set(active)
      if (active) this.payrollExpanded.set(true)
    }
    syncNavigation()
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) syncNavigation()
    })
    effect(() => {
      this.auth.user()?.permissions
      untracked(() => { void this.payroll.loadMasterData() })
    }, { allowSignalWrites: true })
    effect(() => {
      const id = this.payroll.currentPeriodId()
      if (id && this.auth.canReadFinance()) this.payroll.loadPeriodData(id)
    })
  }

  ngOnInit() {
    void this.loadNotifications()
    this.notificationsPoll = setInterval(() => void this.loadNotifications(), 10000)
  }
  ngOnDestroy() { clearInterval(this.notificationsPoll) }
  async loadNotifications() {
    try { const result = await firstValueFrom(this.http.get<any>(environment.apiUrl + '/tasks/notifications')); this.notifications.set(result.rows || []) } catch {}
  }
  async openNotifications() { await this.router.navigate(['/notifications']) }
  goToTasks() { this.notificationsOpen.set(false); this.notifications.set([]); void this.router.navigate(['/tasks']) }
  closeMenu() { this.menuOpen.set(false) }

  reopenPeriod() {
    const id = this.payroll.currentPeriodId()
    if (id) this.payroll.performAction(() => this.payroll.reopenPeriod(id))
  }

  onPeriodChange(id: string) {
    this.payroll.setCurrentPeriod(id)
  }

  async createPeriod() {
    if (this.newLabel.trim()) {
      const saved = await this.payroll.performAction(() => this.payroll.addPeriod(this.newLabel.trim()))
      if (!saved) return
      this.newLabel = ''
      this.adding.set(false)
    }
  }
}
