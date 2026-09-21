import {Component,Input,inject,OnChanges} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../environments/environment'
@Component({selector:'app-company-access',standalone:true,imports:[CommonModule,FormsModule],template:`<section class="export-panel"><button (click)="open=!open;open&&load()">صلاحيات مصروفات الشركة</button><div *ngIf="open"><p>حدد الموظفين المسموح لهم بمشاهدة مصروفات هذه الشركة. يجب منحهم صلاحية صفحة المصروفات أيضًا من إعدادات الصلاحيات.</p><label *ngFor="let u of users" class="access-user"><input type="checkbox" [checked]="selected.has(u._id)" (change)="toggle(u._id,$any($event.target).checked)"/> {{u.fullName||u.name}} — {{u.email}}</label><button (click)="save()" [disabled]="busy">حفظ الصلاحيات</button></div><p role="status">{{message}}</p></section>`})
export class CompanyAccessComponent implements OnChanges{
 @Input() company:any;http=inject(HttpClient);users:any[]=[];selected=new Set<string>();open=false;busy=false;message=''
 ngOnChanges(){this.selected=new Set(this.company?.expenseReaders||[]);this.message=''}
 toggle(id:string,on:boolean){on?this.selected.add(id):this.selected.delete(id)}
 async load(){try{this.users=await firstValueFrom(this.http.get<any[]>(environment.apiUrl+'/companies/access-options'))}catch(e:any){this.message=e.error?.message||e.message}}
 async save(){this.busy=true;try{await firstValueFrom(this.http.put(environment.apiUrl+'/companies/'+this.company._id+'/access',{employeeIds:[...this.selected]}));this.company.expenseReaders=[...this.selected];this.message='تم حفظ صلاحيات الشركة'}catch(e:any){this.message=e.error?.message||e.message}finally{this.busy=false}}
}
