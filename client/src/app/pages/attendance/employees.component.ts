import {confirmAction} from '../../core/confirm-dialog'
import { AuthService } from '../../core/auth.service'
import {Component,OnInit,ViewChild,ElementRef,signal} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../../environments/environment'
import {attendanceStyles} from './attendance.styles'
@Component({selector:'app-employee-accounts',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./employees.component.html',styles:[attendanceStyles]})
export class EmployeeAccountsComponent implements OnInit {
 @ViewChild('employeeDialog') dialog!:ElementRef<HTMLDialogElement>
 employees=signal<any[]>([]);error=signal('');notice=signal('');search='';busy=false;formError='';mode='add';selected:any=null
 form={fullName:'',email:'',temporaryPassword:'',role:'EMPLOYEE'}
 private api=environment.apiUrl+'/employee-accounts'
 constructor(public auth:AuthService,private http:HttpClient){}
 ngOnInit(){void this.load()}
 async load(){try{this.employees.set(await firstValueFrom(this.http.get<any[]>(this.api)))}catch(e:any){this.error.set(e.error?.message||e.message)}}
 filtered(){const term=this.search.trim().toLowerCase();return this.employees().filter(e=>(e.fullName+' '+e.email).toLowerCase().includes(term))}
 open(mode:string,e:any=null){if(mode!=='view' && e && !this.auth.canManageAccount(e))return;this.mode=mode;this.selected=e;this.formError='';this.form={fullName:e?.fullName||'',email:e?.email||'',temporaryPassword:'',role:e?.role||'EMPLOYEE'};this.dialog.nativeElement.showModal()}
 close(){this.form.temporaryPassword='';this.dialog.nativeElement.close()}
 async save(){if(this.busy || !this.auth.can('employee-accounts','write'))return;this.busy=true;this.formError='';try{
  if(this.mode==='add')await firstValueFrom(this.http.post(this.api,this.form))
  if(this.mode==='edit')await firstValueFrom(this.http.patch(this.api+'/'+this.selected.id,{fullName:this.form.fullName,email:this.form.email,role:this.form.role}))
  if(this.mode==='reset')await firstValueFrom(this.http.post(this.api+'/'+this.selected.id+'/reset-password',{temporaryPassword:this.form.temporaryPassword}))
  this.close();this.notice.set('تم حفظ حساب الموظف');await this.load()
 }catch(e:any){this.formError=e.error?.message||e.message}finally{this.busy=false}}
 async toggle(e:any){if(!this.auth.canManageAccount(e)||this.busy)return;if(!await confirmAction((e.status==='ACTIVE'?'Deactivate ':'Activate ')+e.fullName+'?'))return;this.busy=true;this.error.set('');try{await firstValueFrom(this.http.patch(this.api+'/'+e.id,{status:e.status==='ACTIVE'?'INACTIVE':'ACTIVE'}));await this.load()}catch(err:any){this.error.set(err.error?.message||err.message)}finally{this.busy=false}}
}
