import { AuthService } from './auth.service'
import { Injectable, signal, computed } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../environments/environment'
import { Settings, Period, Streamer, StreamerPerformance, Recruiter, RecruitingRecord, RecruiterAdjustment, Employee, StaffRow } from './models'
const API = environment.apiUrl
const normId = (doc: any) => ({ ...doc, id: doc._id })
const normList = (list: any[]) => (list || []).map(normId)
export interface ImportSheet { name: string; rows: { number: number; values: string[] }[]; nameColumn: number; startRow: number }
const defaultSettings: Settings = {
  egpConversionRate: 50, managementItBaseSalary: 8000,
  tierAmounts: { 1: 0, 2: 1500, 3: 1000, 4: 500, 5: 0 },
  streamerRules: { defaultRate: 0.5, standard: { score: 150000, days: 20, hours: 60, pct: 0.03 }, extra: { score: 150000, days: 22, hours: 100, pct: 0.02 } },
}
@Injectable({ providedIn: 'root' })
export class PayrollService {
  loading = signal(true)
  error = signal('')
  settings = signal<Settings>(defaultSettings)
  periods = signal<Period[]>([])
  currentPeriodId = signal<string | null>(null)
  currentPeriod = computed(() => this.periods().find((p) => p.id === this.currentPeriodId()) || null)
  exchangeRate = computed(()=>this.currentPeriod()?.egpConversionRate??this.settings().egpConversionRate)
  async saveExchangeRate(value:number){const p=await this.patch<any>('/periods/'+this.currentPeriodId()+'/exchange-rate',{egpConversionRate:value});this.periods.update(rows=>rows.map(row=>row.id===p._id?normId(p):row));await this.loadPeriodData(p._id)}
  isPeriodLocked = computed(() => this.currentPeriod()?.status === 'closed')
  streamers = signal<Streamer[]>([])
  recruiters = signal<Recruiter[]>([])
  managementEmployees = signal<Employee[]>([])
  itEmployees = signal<Employee[]>([])
  streamerPerformance = signal<StreamerPerformance[]>([])
  recruitingRecords = signal<RecruitingRecord[]>([])
  recruiterAdjustments = signal<RecruiterAdjustment[]>([])
  managementRows = signal<StaffRow[]>([])
  itRows = signal<StaffRow[]>([])
  payrollOverview = signal<any | null>(null)
  constructor(private http: HttpClient, private auth: AuthService) {}
  private get<T>(path: string): Promise<T> {
    let allowed=true
    if(path.startsWith('/streamers')) allowed=this.auth.can('streamers') || this.auth.can('name-rates')
    else if(path.startsWith('/recruiters')) allowed=this.auth.can('recruiters') || this.auth.can('recruiting-log')
    else if(path.startsWith('/recruiting-records')) allowed=this.auth.can('recruiting-log') || this.auth.can('recruiters')
    else if(path.startsWith('/employees/management')) allowed=this.auth.can('management-payroll')
    else if(path.startsWith('/employees/it')) allowed=this.auth.can('it')
    else if(path==='/settings') allowed=this.auth.canReadFinance()
    else if(path==='/periods') allowed=this.auth.canReadFinance() || this.auth.can('management')
    if(!allowed)return Promise.resolve((path==='/settings'?defaultSettings:[]) as T)
    if(path==='/settings' && !this.auth.can('settings'))path='/settings/calculation'
    if(path==='/streamers' && !this.auth.can('streamers'))path='/streamers/name-rates'
    if(path.startsWith('/streamers/performance/') && !this.auth.can('streamers'))path=path.replace('/performance/','/performance/name-rates/')
    if(path==='/recruiters' && !this.auth.can('recruiters'))path='/recruiters/lookup'
    if(path.startsWith('/recruiters/adjustments/') && !this.auth.can('recruiters'))return Promise.resolve([] as T)
    if(path.startsWith('/recruiting-records/') && !this.auth.can('recruiting-log'))path=path.replace('/recruiting-records/','/recruiting-records/payroll/')
    return firstValueFrom(this.http.get<T>(API + path))
  }
  private canWritePath(path: string) {
    const page = path.startsWith('/periods') ? 'payroll' : path.startsWith('/settings') ? 'settings' :
      path.startsWith('/streamers') ? (path.includes('name-rates') ? 'name-rates' : 'streamers') :
      path.startsWith('/recruiting-records') ? 'recruiting-log' : path.startsWith('/recruiters') ? 'recruiters' :
      path.startsWith('/employees/it') ? 'it' : path.startsWith('/employees/management') ? 'management-payroll' : ''
    return this.auth.can(page,'write')
  }
  private post<T>(path: string, body: any) { if (!this.canWritePath(path)) return Promise.reject(new Error('Read-only access')); return firstValueFrom(this.http.post<T>(API + path, body)) }
  private put<T>(path: string, body: any) { if (!this.canWritePath(path)) return Promise.reject(new Error('Read-only access')); return firstValueFrom(this.http.put<T>(API + path, body)) }
  private patch<T>(path: string, body: any) { if (!this.canWritePath(path)) return Promise.reject(new Error('Read-only access')); return firstValueFrom(this.http.patch<T>(API + path, body)) }
  private del(path: string) { if (!this.canWritePath(path)) return Promise.reject(new Error('Read-only access')); return firstValueFrom(this.http.delete(API + path)) }
  async loadMasterData() {
    this.loading.set(true); this.error.set('')
    try {
      const [s, p, st, rc, mgmt, it] = await Promise.all([
        this.get<Settings>('/settings'), this.get<any[]>('/periods'), this.get<any[]>('/streamers'),
        this.get<any[]>('/recruiters'), this.get<any[]>('/employees/management'), this.get<any[]>('/employees/it'),
      ])
      this.settings.set(s)
      const periods = normList(p) as Period[]
      this.periods.set(periods); this.streamers.set(normList(st)); this.recruiters.set(normList(rc))
      this.managementEmployees.set(normList(mgmt)); this.itEmployees.set(normList(it))
      if (!this.currentPeriodId() && periods.length) {
        const open = [...periods].reverse().find((p) => p.status === 'open')
        this.currentPeriodId.set((open || periods[periods.length - 1]).id)
      }
    } catch (err: any) { this.error.set(err.error?.message || err.message) }
    finally { this.loading.set(false) }
  }
  async loadPeriodData(periodId: string) {
    if (!periodId) return
    try {
      const [perf, records, adjustments, mgmtRows, itR] = await Promise.all([
        this.get<any[]>('/streamers/performance/' + periodId),
        this.get<any[]>('/recruiting-records/' + periodId),
        this.get<any[]>('/recruiters/adjustments/' + periodId),
        this.get<any[]>('/employees/management/rows/' + periodId),
        this.get<any[]>('/employees/it/rows/' + periodId),
      ])
      this.streamerPerformance.set(perf.map((p) => ({ periodId: p.period, streamerId: p.streamer,
        score: p.score, days: p.days, hours: p.hours, status: p.status,rateSnapshot:p.rateSnapshot,
        bonus: p.bonus, bonusReason: p.bonusReason, deduction: p.deduction, deductionReason: p.deductionReason })))
      this.recruitingRecords.set(records.map((r) => ({ id: r._id, periodId: r.period, recruiterId: r.recruiter?._id || r.recruiter, user: r.user, tier: r.tier, score: r.score, days: r.days, hours: r.hours })))
      this.recruiterAdjustments.set(adjustments.map((a) => ({ periodId: a.period, recruiterId: a.recruiter, bonus: a.bonus, bonusReason: a.bonusReason, deduction: a.deduction, deductionReason: a.deductionReason })))
      const staff = (r: any): StaffRow => ({baseSalary:r.baseSalary,recruiterBonus:r.recruiterBonus,tierCounts:r.tierCounts, periodId: r.period, employeeId: r.employee, bonus: r.bonus, bonusReason: r.bonusReason, deduction: r.deduction, deductionReason: r.deductionReason })
      this.managementRows.set(mgmtRows.map(staff)); this.itRows.set(itR.map(staff))
    } catch (err: any) { this.error.set(err.error?.message || err.message) }
  }
  async loadPayrollOverview(periodId: string) {
    if (!periodId) { this.payrollOverview.set(null); return }
    this.payrollOverview.set(await this.get<any>('/payroll/overview/' + periodId))
  }
    setCurrentPeriod(id: string) { this.currentPeriodId.set(id) }
  async addPeriod(label: string) {
    const p = await this.post<any>('/periods', { label })
    this.periods.update((prev) => [...prev, normId(p)]); this.currentPeriodId.set(p._id)
  }
  async reopenPeriod(id: string) {
    const p = await this.patch<any>('/periods/' + id + '/reopen', {})
    this.periods.update((prev) => prev.map((x) => x.id === id ? normId(p) : x))
  }
  async performAction(action: () => Promise<unknown>): Promise<boolean> {
    this.error.set('')
    try { await action(); return true }
    catch (err: any) {
      this.error.set(err.error?.message || (err.status === 0 ? 'تعذر الاتصال بالسيرفر؛ تأكد إنه شغال ثم حاول تاني' : err.message) || 'تعذر حفظ التعديل')
      return false
    }
  }
  async closePeriod(id: string) {
    const p = await this.patch<any>('/periods/' + id + '/close', {})
    this.periods.update((prev) => prev.map((x) => x.id === id ? normId(p) : x))
  }
  async updateSettings(patch: Partial<Settings>) { this.settings.set(await this.patch<Settings>('/settings', patch)) }
  async updateStreamerRules(patch: any) { await this.updateSettings({ streamerRules: { ...this.settings().streamerRules, ...patch } }) }
  async updateTierAmounts(patch: any) { await this.updateSettings({ tierAmounts: { ...this.settings().tierAmounts, ...patch } }) }
  async addStreamer(name: string, writeAccess = false, email = '', password = '') {
    const s = await this.post<any>('/streamers', { name, writeAccess, email, password })
    this.streamers.update((prev) => [...prev, normId(s)])
  }
  async addNameRate(name: string, rate: number, periodId: string, adjustments: Pick<StreamerPerformance, 'bonus' | 'bonusReason' | 'deduction' | 'deductionReason'>) {
    const s = await this.post<any>('/streamers/name-rates', { name, rate, periodId, ...adjustments })
    this.streamers.update((prev) => [...prev, normId(s)])
    await this.loadPeriodData(periodId)
  }
  async previewStreamerImport(file: File) {
    return firstValueFrom(this.http.post<{ sheets: ImportSheet[] }>(API + '/streamers/import/preview', file, { headers: { 'Content-Type': 'application/octet-stream' } }))
  }
  async importStreamers(rows: any[], periodId: string, updateExisting=false) {
    const result = await this.post<{ added: number; updated?:number; skipped: number; streamers: any[] }>('/streamers/import', { rows, periodId, updateExisting })
    this.streamers.set(normList(result.streamers));await this.loadPeriodData(periodId)
    return result
  }
  async updateStreamer(id: string, patch: Partial<Streamer>) {
    const s = await this.patch<any>('/streamers/' + id, patch)
    this.streamers.update((prev) => prev.map((x) => x.id === id ? normId(s) : x))
  }
  async updateNameRate(id: string, rate: number) {
    const s = await this.patch<any>('/streamers/' + id + '/name-rates', { rate })
    this.streamers.update((prev) => prev.map((x) => x.id === id ? normId(s) : x))
  }
  async removeStreamers(ids: string[], periodId: string) {
    const result = await this.post<{ deletedCount: number; deletedIds: string[] }>('/streamers/bulk-delete', { ids, periodId, confirmed: true })
    const removed = new Set(result.deletedIds)
    this.streamers.update(prev => prev.filter(x => !removed.has(x.id)))
    this.streamerPerformance.update(prev => prev.filter(x => !removed.has(x.streamerId)))
    return result
  }
  async removeStreamer(id: string) {
    await this.del('/streamers/' + id)
    this.streamers.update((prev) => prev.filter((x) => x.id !== id))
    this.streamerPerformance.update((prev) => prev.filter((x) => x.streamerId !== id))
  }
  async upsertPerformance(periodId: string, streamerId: string, patch: Partial<StreamerPerformance>) {
    const current = this.streamerPerformance().find((x) => x.periodId === periodId && x.streamerId === streamerId)
      || { score: 0, days: 0, hours: 0, status: 'active' as const, bonus: 0, bonusReason: '', deduction: 0, deductionReason: '' }
    const merged = { ...current, ...patch }
    await this.put('/streamers/performance/' + periodId + '/' + streamerId, patch)
    this.streamerPerformance.update((prev) => {
      if (prev.some((x) => x.periodId === periodId && x.streamerId === streamerId))
        return prev.map((x) => x.periodId === periodId && x.streamerId === streamerId ? { ...x, ...patch } : x)
      return [...prev, { periodId, streamerId, ...merged }]
    })
  }
  async upsertNameRatePerformance(periodId: string, streamerId: string, patch: Partial<StreamerPerformance>) {
    const current = this.streamerPerformance().find((x) => x.periodId === periodId && x.streamerId === streamerId)
      || { score: 0, days: 0, hours: 0, status: 'active' as const, bonus: 0, bonusReason: '', deduction: 0, deductionReason: '' }
    const merged = { ...current, ...patch }
    await this.put('/streamers/performance/name-rates/' + periodId + '/' + streamerId, merged)
    this.streamerPerformance.update((prev) => prev.some((x) => x.periodId === periodId && x.streamerId === streamerId)
      ? prev.map((x) => x.periodId === periodId && x.streamerId === streamerId ? { ...x, ...patch } : x)
      : [...prev, { periodId, streamerId, ...merged }])
  }
  async addRecruiter(name: any) {
    const r = await this.post<any>('/recruiters', typeof name==='string'?{name}:{...name,periodId:this.currentPeriodId()})
    this.recruiters.update((prev) => [...prev, normId(r)])
  }
  async removeRecruiter(id: string) {
    await this.del('/recruiters/' + id)
    this.recruiters.update((prev) => prev.filter((x) => x.id !== id))
    this.recruitingRecords.update((prev) => prev.filter((x) => x.recruiterId !== id))
  }
  async addRecruitingRecord(periodId: string, record: Partial<RecruitingRecord>) {
    const r = await this.post<any>('/recruiting-records/' + periodId, { recruiter: record.recruiterId, user: record.user, tier: record.tier, score: record.score, days: record.days, hours: record.hours })
    this.recruitingRecords.update((prev) => [...prev, { id: r._id, periodId: r.period, recruiterId: r.recruiter, user: r.user, tier: r.tier, score: r.score, days: r.days, hours: r.hours }])
  }
  async removeRecruitingRecord(recordId: string) {
    await this.del('/recruiting-records/' + this.currentPeriodId() + '/' + recordId)
    this.recruitingRecords.update((prev) => prev.filter((x) => x.id !== recordId))
  }
  async upsertRecruiterAdjustment(periodId: string, recruiterId: string, patch: Partial<RecruiterAdjustment>) {
    const current = this.recruiterAdjustments().find((x) => x.periodId === periodId && x.recruiterId === recruiterId) || { bonus: 0, deduction: 0 }
    const merged = { ...current, ...patch }
    await this.put('/recruiters/adjustments/' + periodId + '/' + recruiterId, merged)
    this.recruiterAdjustments.update((prev) => {
      if (prev.some((x) => x.periodId === periodId && x.recruiterId === recruiterId))
        return prev.map((x) => x.periodId === periodId && x.recruiterId === recruiterId ? { ...x, ...patch } : x)
      return [...prev, { periodId, recruiterId, ...merged }]
    })
  }
  async addStaff(dept: 'management' | 'it', name: any) {
    const e = await this.post<any>('/employees/' + dept, typeof name==='string'?{name}:name)
    const employees = dept === 'management' ? this.managementEmployees : this.itEmployees
    employees.update((prev) => [...prev, normId(e)]);await this.loadPeriodData(this.currentPeriodId()!)
  }
  async removeStaff(dept: 'management' | 'it', id: string) {
    await this.del('/employees/' + dept + '/' + id)
    const employees = dept === 'management' ? this.managementEmployees : this.itEmployees
    const rows = dept === 'management' ? this.managementRows : this.itRows
    employees.update((prev) => prev.filter((x) => x.id !== id))
    rows.update((prev) => prev.filter((x) => x.employeeId !== id))
  }
  async upsertStaffRow(dept: 'management' | 'it', periodId: string, employeeId: string, patch: Partial<StaffRow>) {
    const rows = dept === 'management' ? this.managementRows : this.itRows
    const current = rows().find((x) => x.periodId === periodId && x.employeeId === employeeId)
      || { bonus: 0, deduction: 0 }
    const merged = { ...current, ...patch }
    await this.put('/employees/' + dept + '/rows/' + periodId + '/' + employeeId, merged)
    rows.update((prev) => {
      if (prev.some((x) => x.periodId === periodId && x.employeeId === employeeId))
        return prev.map((x) => x.periodId === periodId && x.employeeId === employeeId ? merged as StaffRow : x)
      return [...prev, { periodId, employeeId, ...merged } as StaffRow]
    })
  }
}
