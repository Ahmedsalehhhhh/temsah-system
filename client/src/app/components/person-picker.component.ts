import {Component,Input,Output,EventEmitter,OnInit,inject} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../environments/environment'
@Component({selector:'app-person-picker',standalone:true,imports:[CommonModule,FormsModule],template:`<div class="person-picker"><label>طريقة الإضافة<select [ngModelOptions]="{standalone:true}" [(ngModel)]="mode" (ngModelChange)="emit()"><option value="email">اختيار إيميل موظف</option><option value="name">اسم شخص بدون إيميل</option></select></label><label *ngIf="mode==='email'">الموظف<select [ngModelOptions]="{standalone:true}" [(ngModel)]="id" (ngModelChange)="emit()"><option value="">اختر الموظف</option><option *ngFor="let p of people" [value]="p._id">{{p.email}} — {{p.fullName||p.name}}</option></select></label><label *ngIf="mode==='email'">الدور<input [value]="selected?.role||'—'" readonly/></label><label *ngIf="mode==='name'">الاسم<input [ngModelOptions]="{standalone:true}" [(ngModel)]="name" (ngModelChange)="emit()" maxlength="200" placeholder="اسم الشخص"/></label><p *ngIf="error" role="alert">{{error}}</p></div>`})
export class PersonPickerComponent implements OnInit{
 @Input() endpoint='';@Output() personChange=new EventEmitter<any>();http=inject(HttpClient);mode='email';id='';name='';people:any[]=[];error='';get selected(){return this.people.find(x=>x._id===this.id)}
 async ngOnInit(){try{this.people=await firstValueFrom(this.http.get<any[]>(environment.apiUrl+this.endpoint))}catch(e:any){this.error=e.error?.message||'تعذر تحميل الموظفين؛ يمكنك إضافة اسم فقط'}}
 emit(){this.personChange.emit(this.mode==='name'?{name:this.name.trim()}:{userId:this.id,name:this.selected?.fullName||this.selected?.name||''})}
}
