import {confirmAction} from '../../core/confirm-dialog'
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient, HttpParams } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { AuthService } from '../../core/auth.service'
import { environment } from '../../../environments/environment'
import { PayrollService } from '../../core/payroll.service'
type PhotoKind = 'photoForPayment' | 'photoFromUs' | 'purchaseProof'
interface Photo { name:string; mime:string }
interface RecordRow { purchaseProof:Photo|null; customerPaymentMethod:string|null; transferredToCompany:boolean; id:string; date:string; user:string; email:string; product:string; cost:number; price:number; state:string; website:string; paymentMethod:string; photoForPayment:Photo|null; photoFromUs:Photo|null; created_at:string }
@Component({
  selector:'app-game-tracker',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./game-tracker.component.html',
  styles:[`
    .field { width:100%; border:1px solid #E5E7EB; border-radius:6px; background:#FFFFFF; color:#1A1A1A; padding:10px; margin-top:5px }
    dialog { width:min(760px,calc(100vw - 32px)); max-height:90vh; overflow:auto; border:1px solid #E5E7EB; border-radius:12px; background:#FFFFFF; color:#1A1A1A; padding:24px }
    dialog::backdrop { background:rgb(0 0 0 / .72) }
    button:disabled { opacity:.45; cursor:not-allowed }
    th,td { padding:12px; text-align:start; border-bottom:1px solid #E5E7EB; vertical-align:top }
  `],
})
export class GameTrackerComponent implements OnInit,OnDestroy {
  @ViewChild('recordDialog') recordDialog!:ElementRef<HTMLDialogElement>
  @ViewChild('photoDialog') photoDialog!:ElementRef<HTMLDialogElement>
  states=['Pending','Completed','Cancelled','Refunded']
  paymentMethods=['Cash','Bank Transfer','Instapay','Vodafone Cash','Credit Card','Other']
  photoKinds:PhotoKind[]=['purchaseProof','photoForPayment','photoFromUs']
  photoLabels={purchaseProof:'Payment Proof',photoForPayment:'Customer Payment Proof',photoFromUs:'Transfer Proof'}
  rows=signal<RecordRow[]>([])
  thumbnails=signal<Record<string,string>>({})
  loading=signal(false)
  error=signal('')
  notice=signal('')
  total=signal(0)
  page=1
  limit=20
  filters={search:'',date:'',state:'',paymentMethod:''}
  editingId:string|null=null
  deletingId:string|null=null
  saving=false
  reading=0
  formError=''
  form=this.emptyForm()
  photos:Partial<Record<PhotoKind,{name:string;base64:string}>>={}
  previews:Partial<Record<PhotoKind,string>>={}
  previewUrl=''
  private sequence=0
  private destroyed=false
  private api=environment.apiUrl+'/game-tracker'
  constructor(public auth:AuthService,private http:HttpClient,public payroll:PayrollService) {}
  ngOnInit(){void this.load()}
  private emptyForm(){const now=new Date();return {date:new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10),user:'',email:'',product:'',cost:null as number|null,price:null as number|null,state:'Pending',website:'',paymentMethod:'Cash',customerPaymentMethod:null as string|null,transferredToCompany:false}}
  money(value:number){return value.toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2})+' ج.م'}
  get pages(){return Math.max(1,Math.ceil(this.total()/this.limit))}
  private clearThumbnails(){Object.values(this.thumbnails()).forEach(url=>URL.revokeObjectURL(url));this.thumbnails.set({})}
  async load(){
    const sequence=++this.sequence
    this.loading.set(true);this.error.set('');this.rows.set([]);this.clearThumbnails()
    const params=new HttpParams({fromObject:{...this.filters,page:this.page,limit:this.limit}})
    try{
      const result=await firstValueFrom(this.http.get<{records:RecordRow[];total:number}>(this.api,{params}))
      if(this.destroyed||sequence!==this.sequence)return
      this.rows.set(result.records);this.total.set(result.total)
      for(const row of result.records)for(const kind of this.photoKinds)if(row[kind])void this.thumbnail(row,kind,sequence)
    }catch(e:any){if(sequence===this.sequence){this.error.set(e.message||'تعذر تحميل السجلات');this.total.set(0)}}
    finally{if(sequence===this.sequence)this.loading.set(false)}
  }
  applyFilters(){this.page=1;void this.load()}
  resetFilters(){this.filters={search:'',date:'',state:'',paymentMethod:''};this.applyFilters()}
  changePage(delta:number){this.page=Math.min(this.pages,Math.max(1,this.page+delta));void this.load()}
  private photoBlob(row:RecordRow,kind:PhotoKind){return firstValueFrom(this.http.get(this.api+'/'+row.id+'/photos/'+kind,{responseType:'blob'}))}
  private async thumbnail(row:RecordRow,kind:PhotoKind,sequence:number){
    try{const blob=await this.photoBlob(row,kind);if(this.destroyed||sequence!==this.sequence)return;const url=URL.createObjectURL(blob);this.thumbnails.update(prev=>({...prev,[row.id+kind]:url}))}catch{/* The full-size button allows retry. */}
  }
  async showPhoto(row:RecordRow,kind:PhotoKind){
    try{const blob=await this.photoBlob(row,kind);if(this.destroyed)return;this.closePhoto();this.previewUrl=URL.createObjectURL(blob);this.photoDialog.nativeElement.showModal()}catch(e:any){this.error.set(e.message||'تعذر تحميل الصورة')}
  }
  closePhoto(){if(this.previewUrl)URL.revokeObjectURL(this.previewUrl);this.previewUrl='';this.photoDialog?.nativeElement.close()}
  openRecord(){if(!this.auth.canCreateGameTracker())return;this.editingId=null;this.clearPreviews();this.photos={};this.form=this.emptyForm();this.formError='';this.recordDialog.nativeElement.showModal()}
  editRecord(row:RecordRow){
    if(!this.auth.canWriteFinance())return
    this.editingId=row.id;this.clearPreviews();this.photos={};this.formError=''
    const {date,user,email,product,cost,price,state,website,paymentMethod,customerPaymentMethod,transferredToCompany}=row
    this.form={date,user,email,product,cost,price,state,website,paymentMethod,customerPaymentMethod,transferredToCompany}
    this.recordDialog.nativeElement.showModal()
  }
  async deleteRecord(row:RecordRow){
    if(!this.auth.canWriteFinance()||this.deletingId||!await confirmAction('Delete this record permanently?'))return
    this.deletingId=row.id;this.error.set('')
    try{await firstValueFrom(this.http.delete(this.api+'/'+row.id));this.notice.set('Record deleted.');if(this.rows().length===1&&this.page>1)this.page--;await this.load()}
    catch(e:any){this.error.set(e.error?.message||e.message)}finally{this.deletingId=null}
  }
  private clearPreviews(){Object.values(this.previews).forEach(url=>URL.revokeObjectURL(url));this.previews={}}
  async choosePhoto(event:Event,kind:PhotoKind){
    const input=event.target as HTMLInputElement,file=input.files?.[0];input.value=''
    if(!file)return
    this.formError=''
    if(!['image/png','image/jpeg'].includes(file.type)||file.size>3*1024*1024||!file.size){this.formError='اختار صورة PNG أو JPG بحجم حتى 3 MB';return}
    this.reading++
    try{
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)})
      if(this.destroyed)return
      if(this.previews[kind])URL.revokeObjectURL(this.previews[kind]!)
      this.photos[kind]={name:file.name,base64};this.previews[kind]=URL.createObjectURL(file)
    }catch{this.formError='تعذر قراءة الصورة'}finally{this.reading--}
  }
  async save(){
    if(this.saving||this.reading||!this.auth.canCreateGameTracker())return
    this.saving=true;this.formError=''
    try{
      await firstValueFrom(this.editingId ? this.http.patch(this.api+'/'+this.editingId,{...this.form,...this.photos}) : this.http.post(this.api,{...this.form,...this.photos,periodId:this.payroll.currentPeriodId()}))
      if(this.destroyed)return
      this.recordDialog.nativeElement.close();this.clearPreviews();this.photos={};this.notice.set(this.auth.canWriteFinance() ? 'تم حفظ السجل. يمكنك تعديله أو حذفه.' : 'تم حفظ السجل نهائيًا. لا يمكنك تعديله أو حذفه.')
      this.resetFilters()
    }catch(e:any){this.formError=e.message||'تعذر حفظ السجل'}finally{this.saving=false}
  }
  ngOnDestroy(){this.destroyed=true;this.sequence++;this.clearThumbnails();this.clearPreviews();this.closePhoto()}
}
