import {Component,OnInit,inject,effect} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {PersonPickerComponent} from '../components/person-picker.component'
import {AuthService} from '../core/auth.service'
import {PayrollService} from '../core/payroll.service'
import {environment} from '../../environments/environment'
@Component({standalone:true,imports:[CommonModule,FormsModule,PersonPickerComponent],template:`<section class="salary-editor"><h1>مرتبات الموظفين</h1><p>اختر موظفًا أو أضف اسم شخص بدون حساب. الرواتب مرتبطة بالفترة المختارة.</p><form *ngIf="auth.can('salaries','write')" (ngSubmit)="add()"><app-person-picker endpoint="/employees/general/identity-options" (personChange)="person=$event"></app-person-picker><label>الراتب الأساسي<input type="number" min="0" [(ngModel)]="baseSalary" name="baseSalary"/></label><button [disabled]="busy||!person.name||payroll.isPeriodLocked()">إضافة راتب</button></form><p role="alert">{{error}}</p><button (click)="load()">تحديث الفترة</button><div class="salary-table"><table><thead><tr><th>الاسم</th><th>الإيميل</th><th>الدور</th><th>الأساسي</th><th>بونص</th><th>خصم</th><th>الإجمالي</th></tr></thead><tbody><tr *ngFor="let r of rows"><td>{{r.name}}</td><td>{{r.email||'—'}}</td><td>{{r.role}}</td><td><input type="number" [(ngModel)]="r.baseSalary" [disabled]="!auth.can('salaries','write')||payroll.isPeriodLocked()"/></td><td><input type="number" [(ngModel)]="r.bonus" [disabled]="!auth.can('salaries','write')||payroll.isPeriodLocked()"/></td><td><input type="number" [(ngModel)]="r.deduction" [disabled]="!auth.can('salaries','write')||payroll.isPeriodLocked()"/></td><td>{{r.total}}</td><td><button *ngIf="auth.can('salaries','write')" [disabled]="busy||payroll.isPeriodLocked()" (click)="save(r)">حفظ</button></td></tr></tbody></table></div></section>`})
export class SalaryEditorComponent implements OnInit{
 http=inject(HttpClient);auth=inject(AuthService);payroll=inject(PayrollService);person:any={};baseSalary=0;busy=false;error='';rows:any[]=[]
 constructor(){effect(()=>{if(this.payroll.currentPeriodId())void this.load()})}ngOnInit(){}async load(){try{const r=await firstValueFrom(this.http.get<any>(environment.apiUrl+'/reports/salaries',{params:{period:this.payroll.currentPeriodId()||''}}));this.rows=r.rows}catch(e:any){this.error=e.error?.message||e.message}}
 async save(r:any){this.busy=true;try{await firstValueFrom(this.http.put(environment.apiUrl+'/employees/general/rows/'+this.payroll.currentPeriodId()+'/'+r.id,{baseSalary:r.baseSalary,bonus:r.bonus,deduction:r.deduction}));await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async add(){this.busy=true;try{await firstValueFrom(this.http.post(environment.apiUrl+'/employees/general',{...this.person,baseSalary:this.baseSalary,periodId:this.payroll.currentPeriodId()}));await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
}
