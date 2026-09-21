import {AuthService} from '../../core/auth.service'
import {Component,OnInit,OnDestroy,signal} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../../environments/environment'
import {PayrollService} from '../../core/payroll.service'
@Component({selector:'app-management',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./management.component.html'})
export class ManagementComponent implements OnInit,OnDestroy {
 rows=signal<any[]>([]);total=0;page=1;state='';problem='';busy=false;loading=false;error='';private poll:any
 private api=environment.apiUrl+'/management'
 constructor(private http:HttpClient,public auth:AuthService,public payroll:PayrollService){}
 ngOnInit(){void this.load();this.poll=setInterval(()=>{if(!this.busy&&!this.loading)void this.load()},60000)}
 ngOnDestroy(){clearInterval(this.poll)}
 async load(){this.loading=true;try{const r=await firstValueFrom(this.http.get<any>(this.api,{params:{page:this.page,state:this.state}}));this.rows.set(r.rows);this.total=r.total;this.error=''}catch(e:any){this.error=e.error?.message||e.message}finally{this.loading=false}}
 async create(){if(!this.auth.can('management','write')||this.busy||!this.problem.trim()||!this.payroll.currentPeriodId())return;this.busy=true;try{await firstValueFrom(this.http.post(this.api,{problem:this.problem,periodId:this.payroll.currentPeriodId()}));this.problem='';this.page=1;this.state='';await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async change(row:any){if(!this.auth.can('management','write')||this.busy)return;this.busy=true;try{await firstValueFrom(this.http.patch(this.api+'/'+row._id,{state:row.state==='Open'?'Resolved':'Open'}));await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 get pages(){return Math.max(1,Math.ceil(this.total/20))}
}
