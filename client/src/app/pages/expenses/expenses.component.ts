import {CompanyAccessComponent} from '../../components/company-access.component'
import { AuthService } from '../../core/auth.service'
import { Component, signal, computed, effect, untracked, ViewChild, ElementRef, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { PayrollService } from '../../core/payroll.service'
import { prepareImage } from '../../core/image-upload'
interface Company { _id: string; name: string }
interface Expense { id: string; companyId: string; periodId: string; amount: number; category: string; description: string; date: string; receipt: {name:string; mime:string} | null }
interface ExpenseSummary { total:number; categories:string[]; byCategory:{category:string;amount:number}[]; byCompany:{companyId:string;company:string;amount:number}[] }
@Component({
  selector: 'app-expenses', standalone: true, imports: [CommonModule, FormsModule,CompanyAccessComponent],
  templateUrl: './expenses.component.html',
  styles: [`
    :host { display:block; margin-top:24px }
    dialog { width:min(600px,calc(100vw - 32px)); max-height:90vh; overflow:auto; border:1px solid #E5E7EB; border-radius:12px; background:#FFFFFF; color:#1A1A1A; padding:24px }
    dialog::backdrop { background:rgb(0 0 0 / .72) }
    .field { display:block; width:100%; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:6px; padding:10px; color:#1A1A1A; margin-top:6px }
    label { display:block; margin-bottom:16px; font-size:14px }
    button:disabled { opacity:.45; cursor:not-allowed }
    .summary-grid{display:grid;grid-template-columns:minmax(220px,1.35fr) repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}.summary-card{background:#fff;border:1px solid #e3e7ee;border-radius:15px;padding:16px;min-width:0}.summary-card.total{background:linear-gradient(135deg,#19263d,#263653);color:#fff}.summary-card small{display:block;color:#778399;margin-bottom:9px}.summary-card.total small{color:#d5dbea}.summary-card strong{font-size:21px;overflow-wrap:anywhere}.summary-card.total strong{font-size:27px;color:#f0c24d}.expense-filter{display:flex;align-items:center;gap:10px;margin:0 0 16px}.expense-filter select{min-width:180px}
    @media(max-width:640px){:host{margin-top:8px}dialog{width:100vw;max-width:none;height:100dvh;max-height:none;border:0;border-radius:0;padding:18px;padding-top:max(18px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}.summary-grid{grid-template-columns:1fr 1fr}.summary-card.total{grid-column:1/-1}.summary-card{padding:14px}.summary-card strong{font-size:18px}.expense-filter{align-items:stretch;flex-direction:column}.expense-filter select{width:100%;min-width:0}}
  `],
})
export class ExpensesComponent implements OnDestroy {
  @ViewChild('companyDialog') companyDialog!: ElementRef<HTMLDialogElement>
  @ViewChild('expenseDialog') expenseDialog!: ElementRef<HTMLDialogElement>
  @ViewChild('receiptDialog') receiptDialog!: ElementRef<HTMLDialogElement>
  @ViewChild('deleteDialog') deleteDialog!: ElementRef<HTMLDialogElement>
  @ViewChild('deleteCompanyDialog') deleteCompanyDialog!: ElementRef<HTMLDialogElement>
  editingCompany: Company | null = null
  deletingCompany: Company | null = null
  companies = signal<Company[]>([])
  companyId = signal('')
  rows = signal<Expense[]>([])
  total = signal(0)
  summary = signal<ExpenseSummary>({total:0,categories:[],byCategory:[],byCompany:[]})
  categoryFilter = signal('')
  loading = signal(false)
  companiesLoading = signal(true)
  error = signal('')
  message = signal('')
  company = computed(() => this.companies().find(c => c._id === this.companyId()))
  visibleRows = computed(() => this.categoryFilter() ? this.rows().filter(row => row.category === this.categoryFilter()) : this.rows())
  busy = false
  fileBusy = false
  formError = ''
  companyError = ''
  companyName = ''
  form = { amount: null as number | null, category: 'غير مصنف', description: '', date: '' }
  editing: Expense | null = null
  deleting: Expense | null = null
  scope = { companyId: '', periodId: '' }
  receiptChange: {name:string;base64:string} | null | undefined
  filePreview = ''
  filePdf: SafeResourceUrl | null = null
  fileMime = ''
  fileName = ''
  previewUrl = ''
  previewMime = ''
  previewPdf: SafeResourceUrl | null = null
  private sequence = 0
  private destroyed = false
  private api = environment.apiUrl
  constructor(public auth: AuthService, public payroll: PayrollService, private http: HttpClient, private sanitizer: DomSanitizer) {
    this.loadCompanies()
    effect(() => {
      const companyId = this.companyId(), periodId = this.payroll.currentPeriodId()
      // Only company and period changes reload the list, not receipt URLs.
      untracked(() => {
      if (periodId) void this.loadSummary(periodId)
      if (companyId && periodId) void this.loadExpenses(companyId, periodId)
      else { this.sequence++; this.rows.set([]); this.total.set(0); this.loading.set(false) }
      })
    }, { allowSignalWrites: true })
  }
  money(value:number) { return value.toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ج.م' }
  private query(scope: {companyId:string;periodId:string}) { return '?companyId='+encodeURIComponent(scope.companyId)+'&periodId='+encodeURIComponent(scope.periodId) }
  async loadSummary(periodId = this.payroll.currentPeriodId() || '') {
    if(!periodId)return
    try{this.summary.set(await firstValueFrom(this.http.get<ExpenseSummary>(this.api+'/expenses/summary?periodId='+encodeURIComponent(periodId))))}
    catch{this.summary.set({total:0,categories:[],byCategory:[],byCompany:[]})}
  }
  async loadCompanies() {
    this.companiesLoading.set(true)
    try {
      const data = await firstValueFrom(this.http.get<Company[]>(this.api+'/companies'))
      if (this.destroyed) return
      this.companies.set(data)
      if (!this.companyId() && data.length) this.companyId.set(data[0]._id)
    } catch(e:any) { this.error.set(e.message || 'تعذر تحميل الشركات') }
    finally { this.companiesLoading.set(false) }
  }
  async loadExpenses(companyId = this.companyId(), periodId = this.payroll.currentPeriodId() || '') {
    if (!companyId || !periodId) return
    const sequence = ++this.sequence
    this.loading.set(true); this.error.set(''); this.rows.set([]); this.total.set(0)
    try {
      const data = await firstValueFrom(this.http.get<{expenses:Expense[];total:number}>(this.api+'/expenses'+this.query({companyId,periodId})))
      if (sequence !== this.sequence || this.destroyed) return
      this.rows.set(data.expenses); this.total.set(data.total)
    } catch(e:any) { if (sequence === this.sequence) this.error.set(e.message || 'تعذر تحميل المصروفات') }
    finally { if(sequence === this.sequence) this.loading.set(false) }
  }
  private async receiptBlob(row:Expense) {
    return firstValueFrom(this.http.get(this.api+'/expenses/'+row.id+'/receipt'+this.query(row),{responseType:'blob'}))
  }
  openCompany(company:Company|null=null) { this.editingCompany=company; this.companyName=company?.name||''; this.companyError=''; this.companyDialog.nativeElement.showModal() }
  async saveCompany() {
    if(this.busy || !this.companyName.trim())return
    this.busy=true;this.companyError=''
    try {
      const row=await firstValueFrom(this.editingCompany ? this.http.patch<Company>(this.api+'/companies/'+this.editingCompany._id,{name:this.companyName}) : this.http.post<Company>(this.api+'/companies',{name:this.companyName}))
      this.companies.update(prev=>this.editingCompany?prev.map(c=>c._id===row._id?row:c):[...prev,row]);if(!this.editingCompany)this.companyId.set(row._id)
      this.companyDialog.nativeElement.close()
    } catch(e:any){this.companyError=e.error?.message||e.message||'تعذر حفظ الشركة'}
    finally{this.busy=false}
  }
  askDeleteCompany(company:Company){this.deletingCompany=company;this.companyError='';this.deleteCompanyDialog.nativeElement.showModal()}
  async deleteCompany(){
    if(!this.deletingCompany||this.busy)return
    this.busy=true;this.companyError=''
    const id=this.deletingCompany._id
    try{
      await firstValueFrom(this.http.delete(this.api+'/companies/'+id,{body:{confirm:true}}))
      this.companies.update(list=>list.filter(c=>c._id!==id))
      if(this.companyId()===id){this.sequence++;this.rows.set([]);this.total.set(0);this.companyId.set(this.companies()[0]?._id||'')}
      this.error.set('');this.message.set('تم حذف الشركة وجميع مصروفاتها');this.deleteCompanyDialog.nativeElement.close();this.deletingCompany=null
    }catch(e:any){this.companyError=e.error?.message||e.message||'تعذر حذف الشركة'}finally{this.busy=false}
  }
  openExpense(row:Expense|null=null) {
    if(this.payroll.isPeriodLocked() || !this.companyId() || !this.payroll.currentPeriodId())return
    this.scope={companyId:this.companyId(),periodId:this.payroll.currentPeriodId()!}
    this.editing=row;this.formError='';this.receiptChange=undefined;this.releaseFilePreview()
    const now=new Date();const localDate=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)
    this.form=row?{amount:row.amount,category:row.category||'غير مصنف',description:row.description,date:row.date}:{amount:null,category:'غير مصنف',description:'',date:localDate}
    this.fileName=row?.receipt?.name||''
    this.expenseDialog.nativeElement.showModal()
  }
  private releaseFilePreview(){if(this.filePreview.startsWith('blob:'))URL.revokeObjectURL(this.filePreview);this.filePreview='';this.filePdf=null;this.fileMime=''}
  async chooseReceipt(event:Event) {
    const input=event.target as HTMLInputElement, file=input.files?.[0];input.value=''
    if(!file)return
    this.formError=''
    if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){this.formError='اختار JPG أو PNG أو WEBP أو PDF';return}
    if(file.type==='application/pdf'&&file.size>3*1024*1024){this.formError='ملف PDF يجب ألا يتجاوز 3 MB';return}
    this.fileBusy=true
    try{
      const prepared=file.type==='application/pdf'?null:await prepareImage(file)
      const base64=prepared?.base64||await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)})
      if(this.destroyed)return
      this.receiptChange={name:prepared?.name||file.name,base64};this.releaseFilePreview()
      this.filePreview=prepared?.dataUrl||URL.createObjectURL(file);this.fileMime=prepared?'image/jpeg':file.type;this.fileName=prepared?.name||file.name
      if(file.type==='application/pdf')this.filePdf=this.sanitizer.bypassSecurityTrustResourceUrl(this.filePreview)
    }catch(e:any){this.formError=e?.message||'تعذر تجهيز الملف'}finally{this.fileBusy=false}
  }
  removeReceipt(){this.receiptChange=null;this.fileName='';this.releaseFilePreview()}
  async saveExpense() {
    if(this.busy||this.fileBusy)return
    this.busy=true;this.formError=''
    try{
      const body:any={...this.form}
      if(this.receiptChange!==undefined)body.receipt=this.receiptChange
      const url=this.api+'/expenses'+(this.editing?'/'+this.editing.id:'')+this.query(this.scope)
      await firstValueFrom(this.editing?this.http.patch(url,body):this.http.post(url,body))
      this.expenseDialog.nativeElement.close();this.releaseFilePreview();this.message.set('تم حفظ المصروف')
      await Promise.all([this.loadExpenses(),this.loadSummary()])
    }catch(e:any){this.formError=e.message||'تعذر حفظ المصروف'}finally{this.busy=false}
  }
  askDelete(row:Expense){this.deleting=row;this.formError='';this.deleteDialog.nativeElement.showModal()}
  async deleteExpense(){
    if(!this.deleting||this.busy)return
    this.busy=true;this.formError=''
    try{
      await firstValueFrom(this.http.delete(this.api+'/expenses/'+this.deleting.id+this.query(this.deleting)))
      this.deleteDialog.nativeElement.close();this.message.set('تم حذف المصروف وإيصاله');await Promise.all([this.loadExpenses(),this.loadSummary()])
    }catch(e:any){this.formError=e.message||'تعذر الحذف'}finally{this.busy=false}
  }
  async previewReceipt(row:Expense){
    this.error.set('')
    try{
      const blob=await this.receiptBlob(row)
      if(this.destroyed)return
      this.closePreview();this.previewUrl=URL.createObjectURL(blob);this.previewMime=row.receipt!.mime
      this.previewPdf=this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl)
      this.receiptDialog.nativeElement.showModal()
    }catch(e:any){this.error.set(e.message||'تعذر تحميل الإيصال')}
  }
  closePreview(){if(this.previewUrl)URL.revokeObjectURL(this.previewUrl);this.previewUrl='';this.previewPdf=null;this.receiptDialog?.nativeElement.close()}
  ngOnDestroy(){this.destroyed=true;this.sequence++;this.releaseFilePreview();this.closePreview()}
}
