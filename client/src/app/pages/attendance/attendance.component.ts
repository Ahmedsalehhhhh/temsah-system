import {confirmAction} from '../../core/confirm-dialog'
import { ActivatedRoute } from '@angular/router'
import {Component,OnInit,OnDestroy,HostListener,signal} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient,HttpParams} from '@angular/common/http'
import {firstValueFrom,timeout} from 'rxjs'
import {AuthService} from '../../core/auth.service'
import {PayrollService} from '../../core/payroll.service'
import {environment} from '../../../environments/environment'
import {attendanceStyles} from './attendance.styles'
@Component({selector:'app-attendance',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./attendance.component.html',styles:[attendanceStyles]})
export class AttendanceComponent implements OnInit,OnDestroy {
 data=signal<any>(null);today=signal<any>(null);detail=signal<any>(null);employees=signal<any[]>([])
 error=signal('');notice=signal('');busy=false;loading=false;detailLoading=false;dialogError='';history=false;page=1
 filters={date:'',search:'',employee:'',status:'',from:'',to:''}
 update={text:'',status:'Completed'};correction={checkIn:'',checkOut:'',reason:''};correctionId='';correctionRevision=0;correcting=false
 timeZone='Africa/Cairo';serverTime=Date.now();receivedAt=performance.now();tick=signal(0)
 private poll:any;private clock:any;private disposed=false;private sequence=0;private detailSequence=0
 private api=environment.apiUrl+'/attendance'
 constructor(private route:ActivatedRoute,public auth:AuthService,private http:HttpClient,public payroll:PayrollService){}
 get workPage(){return this.route.snapshot.data['allAttendance'] === true}
 get allAttendance(){return this.route.snapshot.data['allAttendance'] === true && this.auth.canViewAll('attendance-and-work')}
 async ngOnInit(){await this.load();if(this.allAttendance)try{this.employees.set(await firstValueFrom(this.http.get<any[]>(this.api+'/employees')))}catch(e:any){this.error.set(e.error?.message||e.message)};this.poll=setInterval(()=>{if(!this.busy)void this.load(true)},5000);this.clock=setInterval(()=>this.tick.update(x=>x+1),1000)}
 ngOnDestroy(){this.disposed=true;this.sequence++;this.detailSequence++;clearInterval(this.poll);clearInterval(this.clock)}
 now(){this.tick();return this.serverTime+(performance.now()-this.receivedAt)}
 duration(seconds:number){seconds=Math.max(0,Math.floor(seconds||0));return Math.floor(seconds/3600)+'h '+Math.floor(seconds%3600/60)+'m '+seconds%60+'s'}
 worked(row:any){
  if(row?.shifts?.length)return this.duration(row.shifts.reduce((sum:number,shift:any)=>sum+Math.max(0,((shift.checkOut?Date.parse(shift.checkOut):this.now())-Date.parse(shift.checkIn))/1000),0))
  return row?.checkIn?this.duration(((row.checkOut?Date.parse(row.checkOut):this.now())-Date.parse(row.checkIn))/1000):'—'
 }
 time(value:string){return value?new Intl.DateTimeFormat('ar-EG',{timeZone:this.timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)):'—'}
 stamp(value:string){return value?new Intl.DateTimeFormat('ar-EG',{timeZone:this.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—'}
 status(value:string){return ({'Working':'Working — يعمل الآن','Finished':'Finished — انتهى','Not Started':'Not Started — لم يبدأ','Completed':'Completed — مكتمل','In Progress':'In Progress — قيد التنفيذ','Blocked':'Blocked — متعطل','Checked In':'تسجيل حضور','Checked Out':'تسجيل انصراف'} as any)[value]||value}
 hasWorkReport(today:any=this.today()){return !!this.update.text.trim() || !!today?.updates?.length}
 canStartAnother(today:any){const attendance=today?.attendance;return attendance?.status==='Finished'&&attendance?.date===today?.date&&(attendance?.shifts?.length||1)<2}
 async load(quiet=false){
  const seq=++this.sequence;if(!quiet)this.loading=true
  try{
   let path='/today',query:any={}
   if(this.history){path='/history';query={scope:this.allAttendance?'':'own',from:this.filters.from,to:this.filters.to,status:this.filters.status,employee:this.allAttendance?this.filters.employee:'',page:this.page}}
   else if(this.allAttendance){path='/dashboard';query={date:this.filters.date,search:this.filters.search,employee:this.filters.employee,status:this.filters.status}}
   query=Object.fromEntries(Object.entries(query).filter(([k,v])=>v!==''))
   const result=await firstValueFrom(this.http.get<any>(this.api+path,{params:new HttpParams({fromObject:query})}))
   if(this.disposed||seq!==this.sequence)return
   this.timeZone=result.timeZone;this.serverTime=Date.parse(result.serverNow);this.receivedAt=performance.now()
   if(!this.filters.date&&result.date)this.filters.date=result.date
   if(!this.allAttendance&&!this.history)this.today.set(result);else this.data.set(result)
   this.error.set('')
  }catch(e:any){if(!this.disposed&&seq===this.sequence)this.error.set(e.error?.message||e.message)}finally{if(seq===this.sequence)this.loading=false}
 }
 switchMode(history:boolean){this.history=history;this.filters.status='';this.page=1;this.data.set(null);void this.load()}
 reset(){this.filters={date:'',search:'',employee:'',status:'',from:'',to:''};this.page=1;void this.load()}
 async action(kind:'check-in'|'check-out'|'updates'){
 if(kind==='check-out'&&!await confirmAction('تأكيد تسجيل الانصراف وإنهاء وردية اليوم؟'))return;
  if(this.busy || !this.auth.can('attendance-own','write') || kind==='check-out' && !this.hasWorkReport())return;this.busy=true;this.error.set('')
  try{const body=kind==='check-in'?{periodId:this.payroll.currentPeriodId()}:kind==='check-out'&&!this.update.text.trim()?{}:this.update;await firstValueFrom(this.http.post(this.api+'/'+kind,body));if(kind==='updates'||kind==='check-out')this.update={text:'',status:'Completed'};this.notice.set('تم الحفظ بنجاح');await this.load()}
  catch(e:any){this.error.set(e.error?.message||e.message)}finally{this.busy=false}
 }
 async view(row:any){
  const seq=++this.detailSequence
  this.detail.set({...row,updates:[],audits:[]});this.correcting=false;this.dialogError='';this.detailLoading=!!row.id
  if(!row.id)return
  try{
   const result=await firstValueFrom(this.http.get<any>(this.api+'/'+row.id).pipe(timeout(12000)))
   if(seq===this.detailSequence)this.detail.set(result)
  }catch(e:any){if(seq===this.detailSequence)this.dialogError=e.name==='TimeoutError'?'تحميل التفاصيل اتأخر. اقفل النافذة وحاول مرة تانية.':e.error?.message||e.message}
  finally{if(seq===this.detailSequence)this.detailLoading=false}
 }
 closeDetail(){
  this.detailSequence++;this.detailLoading=false;this.correcting=false;this.dialogError='';this.detail.set(null)
 }
 closeFromBackdrop(event:MouseEvent){if(event.target===event.currentTarget)this.closeDetail()}
 @HostListener('document:keydown.escape') closeOnEscape(){if(this.detail())this.closeDetail()}
 timeline(){const d=this.detail();if(!d)return [];const shifts=d.shifts?.length?d.shifts:[d];return [...shifts.flatMap((shift:any,index:number)=>[...(shift.checkIn?[{createdAt:shift.checkIn,status:'Checked In',text:'الفترة '+(index+1)}]:[]),...(shift.checkOut?[{createdAt:shift.checkOut,status:'Checked Out',text:'الفترة '+(index+1)}]:[])]),...(d.updates||[])].sort((a:any,b:any)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))}
 beginCorrection(shift:any){this.correctionId=shift.id;this.correctionRevision=shift.revision;this.correction={checkIn:shift.checkIn,checkOut:shift.checkOut||'',reason:''};this.correcting=true}
 async saveCorrection(){
  if(this.busy)return;this.busy=true;this.dialogError=''
  try{await firstValueFrom(this.http.patch(this.api+'/'+this.correctionId+'/correction',{...this.correction,checkOut:this.correction.checkOut||null,revision:this.correctionRevision}));this.detail.set(await firstValueFrom(this.http.get<any>(this.api+'/'+this.correctionId)));this.correcting=false;await this.load()}
  catch(e:any){this.dialogError=e.error?.message||e.message}finally{this.busy=false}
 }
 get pages(){return Math.max(1,Math.ceil((this.data()?.total||0)/30))}
 changePage(delta:number){this.page+=delta;void this.load()}
}
