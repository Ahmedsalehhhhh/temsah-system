import {RowReportsService} from '../../core/row-reports.service'
import {Report} from '../../core/export-files'
import { Component, computed, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy,inject,effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { PayrollService, ImportSheet } from '../../core/payroll.service'
import { AuthService } from '../../core/auth.service'
import { calcStreamer, formatEGP } from '../../core/calc'

@Component({
  selector: 'app-streamers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './streamers.component.html',
})
export class StreamersComponent implements AfterViewInit, OnDestroy {
 exchangeDraft:number|null=null;exchangeBusy=false;async saveExchange(){this.exchangeBusy=true;try{await this.payroll.performAction(()=>this.payroll.saveExchangeRate(this.exchangeDraft??this.payroll.exchangeRate()))}finally{this.exchangeBusy=false}}
  @ViewChild('tableViewport') tableViewport?: ElementRef<HTMLElement>
  @ViewChild('topScroll') topScroll?: ElementRef<HTMLElement>
  @ViewChild('scrollSizer') scrollSizer?: ElementRef<HTMLElement>
  @ViewChild('deleteDialog') deleteDialog?: ElementRef<HTMLDialogElement>
  private resizeObserver?: ResizeObserver
  selected = new Set<string>()
  deleteIds: string[] = []
  deleteBusy = false
  deleteError = ''
  deleteMessage = ''
  deletePeriodId = ''
  get selectedIds() { return this.rows().map(r => r.streamer.id).filter(id => this.selected.has(id)) }
  get allSelected() { return this.rows().length > 0 && this.selectedIds.length === this.rows().length }
  toggleSelected(id: string, checked: boolean) {
    if (checked) this.selected.add(id); else this.selected.delete(id)
  }
  toggleAll(checked: boolean) { this.selected = new Set(checked ? this.rows().map(r => r.streamer.id) : []) }
  requestDelete(ids: string[]) {
    if (!this.auth.canWriteFinance() || this.payroll.isPeriodLocked() || !this.payroll.currentPeriodId() || !ids.length) return
    this.deleteIds = [...ids]
    this.deletePeriodId = this.payroll.currentPeriodId()!
    this.deleteError = ''
    this.deleteDialog?.nativeElement.showModal()
  }
  requestDeleteAll() { this.requestDelete(this.rows().map(r => r.streamer.id)) }
  cancelDelete() { if (!this.deleteBusy) this.deleteDialog?.nativeElement.close() }
  async confirmDelete() {
    if (this.deleteBusy) return
    this.deleteBusy = true; this.deleteError = ''; this.deleteMessage = ''
    try {
      const result = await this.payroll.removeStreamers(this.deleteIds, this.deletePeriodId)
      this.selected = new Set([...this.selected].filter(id => !this.deleteIds.includes(id)))
      this.deleteMessage = 'تم حذف ' + result.deletedCount + ' ستريمر'
      this.deleteDialog?.nativeElement.close()
    } catch (err: any) { this.deleteError = err.error?.message || err.message || 'تعذر الحذف؛ حاول مرة أخرى' }
    finally { this.deleteBusy = false }
  }
  ngAfterViewInit() {
    const viewport = this.tableViewport?.nativeElement
    const table = viewport?.querySelector('table')
    if (!viewport || !table) return
    this.resizeObserver = new ResizeObserver(() => {
      if (this.scrollSizer) this.scrollSizer.nativeElement.style.width = viewport.scrollWidth + 'px'
      if (this.topScroll) this.topScroll.nativeElement.scrollLeft = viewport.scrollLeft
    })
    this.resizeObserver.observe(viewport); this.resizeObserver.observe(table)
  }
  ngOnDestroy() { window.removeEventListener('report-columns-changed',this.customRefresh); this.resizeObserver?.disconnect() }
  syncScroll(from: HTMLElement, to: HTMLElement) { if (to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft }
  scrollTable(direction: number) { this.tableViewport?.nativeElement.scrollBy({ left: direction * 360, behavior: 'smooth' }) }
  onTableWheel(event: WheelEvent) {
    if (event.shiftKey && event.deltaY) {
      event.preventDefault()
      this.tableViewport?.nativeElement.scrollBy({ left: event.deltaY })
    }
  }
  formatEGP = formatEGP
  newName = ''
  grantWriteAccess = false
  newEmail = ''
  newPassword = ''
  importBusy = false
  importError = ''
  importMessage = ''
  importSheets: ImportSheet[] = []
  sheetIndex = 0
  nameColumn = 0
  startRow = 1
  updateExisting=false
  importFields=['score','days','hours','rate','bonus','bonusReason','deduction','deductionReason','status']
  mapping:Record<string,number>={}
  get importRows(){return (this.selectedSheet?.rows||[]).filter(r=>r.number>=this.startRow&&(r.values[this.nameColumn]||'').trim()).map(r=>({name:r.values[this.nameColumn].trim(),...Object.fromEntries(this.importFields.filter(k=>this.mapping[k]>=0&&r.values[this.mapping[k]]!=='').map(k=>[k,r.values[this.mapping[k]]]))}))}

  get selectedSheet() { return this.importSheets[this.sheetIndex] }
  get importColumns() {
    const count = Math.max(0, ...(this.selectedSheet?.rows.map((r) => r.values.length) || []))
    return Array.from({ length: count }, (_, i) => ({ index: i, label: `${i + 1}: ${this.selectedSheet?.rows.find((r) => r.number === this.startRow - 1)?.values[i] || ''}` }))
  }
  get importNames() {
    return (this.selectedSheet?.rows || []).filter((r) => r.number >= this.startRow)
      .map((r) => (r.values[this.nameColumn] || '').trim()).filter(Boolean)
  }
  get uniqueImportNames() { return [...new Set(this.importNames)] }
  selectSheet() {
    this.nameColumn = this.selectedSheet?.nameColumn || 0
    this.startRow = this.selectedSheet?.startRow || 1
    const headers=this.selectedSheet?.rows.find(r=>r.number===this.startRow-1)?.values||[]
    const aliases:Record<string,string[]>={score:['score','السكور'],days:['days','الأيام'],hours:['hours','الساعات'],rate:['rate','النسبة'],bonus:['bonus','بونص','البونص'],deduction:['deduction','خصم','الخصم'],bonusReason:['bonusreason','سبب البونص'],deductionReason:['deductionreason','سبب الخصم'],status:['status','الحالة']}
    this.mapping=Object.fromEntries(this.importFields.map(k=>[k,headers.findIndex(h=>aliases[k].includes(h.toLowerCase().trim().replace(/[_]/g,'')))]))
  }
  async chooseFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    this.importError = ''; this.importMessage = ''; this.importSheets = []
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) {
      this.importError = 'اختار ملف .xlsx بحجم لا يتجاوز 5 MB'; return
    }
    this.importBusy = true
    try {
      const result = await this.payroll.previewStreamerImport(file)
      this.importSheets = result.sheets
      const preferred = result.sheets.findIndex((s) => s.name.toLowerCase() === 'name & rates')
      this.sheetIndex = preferred >= 0 ? preferred : 0
      this.selectSheet()
    } catch (err: any) { this.importError = err.error?.message || 'تعذر قراءة الملف؛ جرّب مرة أخرى' }
    finally { this.importBusy = false }
  }
  async confirmImport() {
    const periodId = this.payroll.currentPeriodId()
    if (!periodId || this.payroll.isPeriodLocked() || this.importBusy) return
    this.importBusy = true; this.importError = ''; this.importMessage = ''
    try {
      const result = await this.payroll.importStreamers(this.importRows, periodId,this.updateExisting)
      this.importMessage = `تمت إضافة ${result.added} وتحديث ${result.updated||0} وتخطي ${result.skipped} سجل`
      this.importSheets = [];await this.refreshColumns()
    } catch (err: any) { this.importError = err.error?.message || 'تعذر الاستيراد؛ يمكنك إعادة المحاولة بدون تكرار الأسماء' }
    finally { this.importBusy = false }
  }

  totals = computed(() => this.rows().reduce((total, row) => ({
    cash: total.cash + row.result.cash, bonus: total.bonus + row.result.bonus,
    deduction: total.deduction + row.result.deduction, total: total.total + row.result.total,
    egp: total.egp + row.result.egp,
  }), { cash: 0, bonus: 0, deduction: 0, total: 0, egp: 0 }))

  reports=inject(RowReportsService);customReport:Report|null=null;reportError='';pdfBusy=false
  reportKey=location.pathname.includes('name-rates')?'name-rates':'streamers'
  get customColumns(){return this.customReport?.columns.filter(c=>c.custom)||[]}
  customValue(id:string,key:string){return this.customReport?.rows.find(r=>r.id===id)?.[key]??''}
  async refreshColumns(){try{this.customReport=await this.reports.load(this.reportKey,this.payroll.currentPeriodId()||'')}catch(e:any){this.reportError=e.error?.message||e.message}}
  async saveCustom(id:string,col:any,value:any){try{await this.reports.save(this.reportKey,this.payroll.currentPeriodId()||'',id,col.id,value);await this.refreshColumns()}catch(e:any){this.reportError=e.error?.message||e.message}}
  async downloadPdf(id:string){this.pdfBusy=true;this.reportError='';try{await this.reports.pdf(this.reportKey,this.payroll.currentPeriodId()||'',id)}catch(e:any){this.reportError=e.error?.message||e.message}finally{this.pdfBusy=false}}
  customRefresh=()=>void this.refreshColumns()
  constructor(public payroll: PayrollService, public auth: AuthService) {effect(()=>{if(this.payroll.currentPeriodId())void this.refreshColumns()});window.addEventListener('report-columns-changed',this.customRefresh)}


  protected buildRows() {
    const settings = this.payroll.settings()
    const periodId = this.payroll.currentPeriodId()
    return this.payroll.streamers().map((st) => {
      const perf = this.payroll.streamerPerformance().find((p) => p.periodId === periodId && p.streamerId === st.id)
        || { score: 0, days: 0, hours: 0, status: 'active' as const, bonus: 0, bonusReason: '', deduction: 0, deductionReason: '' }
      const result = calcStreamer(perf, {...st,rate:(perf as any).rateSnapshot??st.rate}, settings.streamerRules, this.payroll.exchangeRate())
      return { streamer: st, perf, result }
    })
  }
  rows = computed(() => this.buildRows())

  async addStreamer() {
    if (this.newName.trim()) {
      const saved = await this.payroll.performAction(() => this.payroll.addStreamer(this.newName.trim(), this.grantWriteAccess, this.newEmail.trim(), this.newPassword))
      if (!saved) return
      this.newName = ''
      this.newEmail = ''
      this.newPassword = ''
      this.grantWriteAccess = false
    }
  }

  onScoreBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { score: Number(value) })
  }
  onDaysBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { days: Number(value) })
  }
  onHoursBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { hours: Number(value) })
  }
  onStatusChange(streamerId: string, value: any) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { status: value })
  }
  onRateBlur(id: string, value: string) {
    this.payroll.updateStreamer(id, { rate: Number(value) })
  }
  onBonusBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { bonus: Number(value) })
  }
  onBonusReasonBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { bonusReason: value })
  }
  onDeductionBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { deduction: Number(value) })
  }
  onDeductionReasonBlur(streamerId: string, value: string) {
    this.payroll.upsertPerformance(this.payroll.currentPeriodId()!, streamerId, { deductionReason: value })
  }
}
