import {confirmAction} from '../../core/confirm-dialog'
import { CommonModule } from '@angular/common'
import { Component, OnDestroy, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { AuthService } from '../../core/auth.service'
import { PayrollService } from '../../core/payroll.service'

type Tab = 'Management' | 'Recruiters' | 'Problems'
@Component({ selector: 'app-follow-ups', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './follow-ups.component.html' })
export class FollowUpsComponent implements OnInit, OnDestroy {
  tab = signal<Tab>('Management'); rows = signal<any[]>([])
  status: 'Pending' | 'Completed' = 'Pending'; loading = false; busy = false; error = ''; showForm = false
  form = { title: '', details: '', nextStep: '', dueDate: '' }
  private poll: any
  private api = environment.apiUrl
  constructor(private http: HttpClient, public auth: AuthService, public payroll: PayrollService) {}
  ngOnInit() { void this.load(); this.poll = setInterval(() => { if (!this.busy) void this.load(true) }, 60000) }
  ngOnDestroy() { clearInterval(this.poll) }
  select(tab: Tab) { this.tab.set(tab); this.showForm = false; void this.load() }
  async load(quiet = false) {
    if (!quiet) this.loading = true
    try {
      if (this.tab() === 'Problems') {
        const r = await firstValueFrom(this.http.get<any>(this.api + '/management', { params: { page: 1, state: this.status === 'Pending' ? 'Open' : 'Resolved' } }))
        this.rows.set(r.rows.map((x: any) => ({ ...x, title: x.problem, status: x.state === 'Open' ? 'Pending' : 'Completed', createdBy: x.userId, updates: x.updates || [] })))
      } else {
        this.rows.set(await firstValueFrom(this.http.get<any[]>(this.api + '/follow-ups', { params: { category: this.tab(), status: this.status } })))
      }
      this.error = ''
    } catch (e: any) { this.error = e.error?.message || e.message } finally { this.loading = false }
  }
  async create() {
    if (this.busy || !this.form.title.trim()) return
    this.busy = true
    try {
      if (this.tab() === 'Problems') await firstValueFrom(this.http.post(this.api + '/management', { problem: this.form.title, periodId: this.payroll.currentPeriodId() }))
      else await firstValueFrom(this.http.post(this.api + '/follow-ups', { ...this.form, category: this.tab() }))
      this.form = { title: '', details: '', nextStep: '', dueDate: '' }; this.showForm = false; this.status = 'Pending'; await this.load()
    } catch (e: any) { this.error = e.error?.message || e.message } finally { this.busy = false }
  }
  async addUpdate(row: any) {
    if (this.busy || !row.draft?.trim()) return
    this.busy = true
    try {
      const url = this.tab() === 'Problems' ? `/management/${row._id}/updates` : `/follow-ups/${row._id}/updates`
      await firstValueFrom(this.http.post(this.api + url, { text: row.draft.trim() })); await this.load(true)
    } catch (e: any) { this.error = e.error?.message || e.message } finally { this.busy = false }
  }
  async toggle(row: any) {
    if (this.busy) return
    this.busy = true
    try {
      if (this.tab() === 'Problems') await firstValueFrom(this.http.patch(this.api + '/management/' + row._id, { state: row.status === 'Pending' ? 'Resolved' : 'Open' }))
      else await firstValueFrom(this.http.patch(this.api + '/follow-ups/' + row._id + '/status', { status: row.status === 'Pending' ? 'Completed' : 'Pending' }))
      await this.load(true)
    } catch (e: any) { this.error = e.error?.message || e.message } finally { this.busy = false }
  }
  canEdit(row:any){return this.auth.can('management','write')&&(this.auth.isAdmin()||row.createdBy?._id===this.auth.user()?.id)}
  async remove(row:any){if(!await confirmAction('حذف السجل نهائيًا؟'))return;try{await firstValueFrom(this.http.delete(this.api+(this.tab()==='Problems'?'/management/':'/follow-ups/')+row._id));await this.load()}catch(e:any){this.error=e.error?.message||e.message}}
  async edit(row:any){try{await firstValueFrom(this.http.patch(this.api+(this.tab()==='Problems'?'/management/':'/follow-ups/')+row._id,this.tab()==='Problems'?{problem:row.title}:{title:row.title,details:row.details,nextStep:row.nextStep}));row.editing=false;await this.load()}catch(e:any){this.error=e.error?.message||e.message}}
  name(user: any) { return user?.fullName || user?.name || '—' }
}
