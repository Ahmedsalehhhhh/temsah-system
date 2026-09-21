import {Component,OnDestroy,inject,effect} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {Router,NavigationEnd} from '@angular/router'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../environments/environment'
import {PayrollService} from '../core/payroll.service'
import {AuthService} from '../core/auth.service'
import {Report,excelFile,pdfFile,zipFile,saveFile,safeName} from '../core/export-files'
@Component({selector:'app-report-tools',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="export-panel" *ngIf="supported"><div class="export-heading"><div><small>التقارير</small><h2>تصدير وتخصيص الجدول</h2></div><span *ngIf="busy" role="status">{{progress||'جاري تجهيز الملف…'}}</span></div>
<div class="export-actions"><button [disabled]="busy" (click)="export('excel')">↓ Excel</button><button [disabled]="busy" (click)="export('pdf')">↓ PDF الجدول</button><button [disabled]="busy" (click)="export('zip')">↓ PDF لكل فرد (ZIP)</button><button [disabled]="busy" (click)="open()">{{expanded?'إغلاق':'الأعمدة وملفات الأفراد'}}</button><label *ngIf="key.includes('attendance')">تاريخ التقرير<input type="date" [(ngModel)]="date" (change)="expanded=false;report=null"/></label></div>
<p class="page-error" role="alert" *ngIf="error">{{error}}</p><div *ngIf="expanded&&report">
<form class="custom-add" *ngIf="auth.isAdmin()" (ngSubmit)="addColumn()"><input [(ngModel)]="label" name="label" placeholder="اسم العمود الجديد" maxlength="80" required/><select [(ngModel)]="type" name="type"><option value="text">نص</option><option value="number">رقم</option><option value="date">تاريخ</option></select><button [disabled]="busy||!label.trim()">+ إضافة عمود</button></form>
<div class="report-table"><table><thead><tr><th *ngFor="let col of report.columns">{{col.label}}</th><th>PDF</th></tr></thead><tbody><tr *ngFor="let row of report.rows"><td *ngFor="let col of report.columns"><input *ngIf="col.custom&&auth.isAdmin();else value" [attr.type]="col.type" [ngModel]="row[col.key]" [disabled]="busy||payroll.isPeriodLocked()" (change)="save(row,col,$any($event.target).value)" [attr.aria-label]="row.name+' '+col.label"/><ng-template #value>{{row[col.key]}}</ng-template></td><td><button [disabled]="busy" (click)="individual(row)">↓ PDF</button></td></tr></tbody></table></div>
<div class="report-cards"><article *ngFor="let row of report.rows"><h3>{{row.name||row.id}}</h3><dl><ng-container *ngFor="let col of report.columns"><dt>{{col.label}}</dt><dd><input *ngIf="col.custom&&auth.isAdmin();else mobileValue" [type]="col.type" [ngModel]="row[col.key]" (change)="save(row,col,$any($event.target).value)" [disabled]="busy||payroll.isPeriodLocked()"/><ng-template #mobileValue>{{row[col.key]}}</ng-template></dd></ng-container></dl><footer><button [disabled]="busy" (click)="individual(row)">تحميل الكشف ↓ PDF</button></footer></article></div></div></section>`})
export class ReportToolsComponent implements OnDestroy{
 auth=inject(AuthService);payroll=inject(PayrollService);http=inject(HttpClient);router=inject(Router)
 key=this.router.url.split(/[?#]/)[0].slice(1);expanded=false;busy=false;error='';progress='';report:Report|null=null;label='';type='text';date=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 subscription=this.router.events.subscribe(e=>{if(e instanceof NavigationEnd){this.key=e.urlAfterRedirects.split(/[?#]/)[0].slice(1);this.expanded=false;this.report=null;this.error=''}})
 get supported(){return ['management-log','streamers','name-rates','recruiters','recruiting-list','management-payroll','it','salaries','attendance','attendance-and-work','tasks','follow-ups','management','expenses','game-tracker'].includes(this.key)}
 constructor(){effect(()=>{this.payroll.currentPeriodId();this.report=null;this.expanded=false})}
 ngOnDestroy(){this.subscription.unsubscribe()}
 async load(){return firstValueFrom(this.http.get<Report>(environment.apiUrl+'/reports/'+this.key,{params:{period:this.payroll.currentPeriodId()||'',date:this.date}}))}
 async open(){if(this.expanded){this.expanded=false;return}this.busy=true;this.error='';try{this.report=await this.load();this.expanded=true}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async export(kind:string){if(this.busy)return;this.busy=true;this.error='';try{const r=await this.load();if(!r.rows.length)throw Error('لا توجد سجلات للتصدير');const blob=kind==='excel'?await excelFile(r):kind==='pdf'?await pdfFile(r):await zipFile(r,n=>this.progress='تم تجهيز '+n+' من '+r.rows.length);saveFile(blob,'Temsah-'+safeName(this.key)+'-'+safeName(r.period||'report')+'.'+(kind==='excel'?'xlsx':kind))}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false;this.progress=''}}
 async individual(row:any){if(!this.report)return;this.busy=true;try{saveFile(await pdfFile(this.report,row),safeName(row.name||row.id)+'.pdf')}catch(e:any){this.error=e.message}finally{this.busy=false}}
 async addColumn(){this.busy=true;this.error='';try{await firstValueFrom(this.http.post(environment.apiUrl+'/reports/'+this.key+'/columns',{label:this.label,type:this.type}));this.label='';this.report=await this.load();window.dispatchEvent(new Event('report-columns-changed'))}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async save(row:any,col:any,value:any){this.busy=true;this.error='';try{await firstValueFrom(this.http.put(environment.apiUrl+'/reports/'+this.key+'/values',{period:this.payroll.currentPeriodId()||'',date:this.date,row:row.id,column:col.id,value}));row[col.key]=value}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
}
