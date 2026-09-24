import {Component,OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {AuthService} from '../../core/auth.service'
import {environment} from '../../../environments/environment'
@Component({selector:'app-permissions',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./permissions.component.html'})
export class PermissionsComponent implements OnInit {
  data:any; selected=''; employee:any; busy=false; error=''; message=''
  labels:any={NO_ACCESS:'No Access',VIEW_ONLY:'View Only',FULL_EDIT:'Full Edit'}
  names:any={'management-all':'مشاهدة كل مشاكل الإدارة','attendance-and-work-all':'مشاهدة حضور كل الموظفين','tasks-all':'مشاهدة كل المهام والمحادثات','follow-ups-all':'مشاهدة كل المتابعات','salaries':'مرتبات الموظفين','inventory':'المخزون والتسليمات','attendance-own':'Personal attendance / حضوري (own records only)','attendance-and-work':'Team Attendance & Work','tasks':'التاسكات','recruiting-log':'Recruiting Log'}
  private api=environment.apiUrl+'/permissions'
  constructor(private http:HttpClient,public auth:AuthService){}
  get roles(){return Object.keys(this.data?.roles || {})}
  async ngOnInit(){try{this.data=await firstValueFrom(this.http.get(this.api))}catch(e:any){this.error=e.message}}
  async selectEmployee(){this.employee=null;this.error='';if(!this.selected)return;this.busy=true;try{this.employee=await firstValueFrom(this.http.get(this.api+'/employees/'+this.selected))}catch(e:any){this.error=e.message}finally{this.busy=false}}
  async saveRole(role:string,page:string,level:string){if(this.busy)return;this.busy=true;this.error='';this.message='';try{await firstValueFrom(this.http.put(this.api+'/roles/'+role+'/'+page,{level}));this.data.roles[role][page]=level;await this.auth.refreshPermissions();this.message='تم حفظ الصلاحيات';if(this.selected)this.employee=await firstValueFrom(this.http.get(this.api+'/employees/'+this.selected))}catch(e:any){this.error=e.message}finally{this.busy=false}}
  async saveOverride(page:string,level:string){if(this.busy)return;this.busy=true;this.error='';this.message='';try{this.employee=await firstValueFrom(this.http.put(this.api+'/employees/'+this.selected+'/'+page,{level:level||null}));await this.auth.refreshPermissions();this.message='تم حفظ الصلاحيات'}catch(e:any){this.error=e.message}finally{this.busy=false}}
}
@Component({standalone:true,template:'<h1>لا توجد صفحات متاحة لحسابك</h1><p>اطلب من الأدمن تعديل الصلاحيات.</p><button (click)="auth.logout()">تسجيل خروج</button>'})
export class NoAccessComponent {constructor(public auth:AuthService){}}
