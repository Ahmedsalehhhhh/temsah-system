import {RouterLink} from '@angular/router'
import {confirmAction} from '../../core/confirm-dialog'
import {Component,OnInit,OnDestroy,Input,ElementRef,ViewChild,signal} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {AuthService} from '../../core/auth.service'
import {environment} from '../../../environments/environment'
import {prepareImage} from '../../core/image-upload'
@Component({selector:'app-work-tasks',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./tasks.component.html',styleUrl:'./tasks.component.css'})
export class TasksComponent implements OnInit,OnDestroy {
 @Input() mine=false
 employees:any[]=[]; private poll:any
 ngOnDestroy(){clearInterval(this.poll)}
 @ViewChild('imageDialog') imageDialog!:ElementRef<HTMLDialogElement>
 fullImage=''
 openImage(url:string){this.fullImage=url;this.imageDialog.nativeElement.showModal()}
 closeImage(){this.imageDialog.nativeElement.close();this.fullImage=''}
 rows=signal<any[]>([]);page=1;total=0;busy=false;reading=false;loading=false;error='';editing:string|null=null
 form={text:'',status:'Pending',assignedTo:''};image:any=undefined;preview=''
 private api=environment.apiUrl+'/tasks'
 constructor(public auth:AuthService,private http:HttpClient){}
 ngOnInit(){void this.load();this.poll=setInterval(()=>{if(!this.busy)void this.load()},5000);if(!this.mine&&this.auth.can('tasks','write'))void firstValueFrom(this.http.get<any[]>(environment.apiUrl+'/tasks/assignees',{params:{active:'true'}})).then(rows=>this.employees=rows).catch(e=>this.error=e.message)}
 get pages(){return Math.max(1,Math.ceil(this.total/20))}
 owns(row:any){return !this.mine && this.auth.can('tasks','write') && (this.auth.isAdmin?.() || row.userId?._id===this.auth.user?.()?.id || row.assignedTo?._id===this.auth.user?.()?.id) && !!row._id}
 async load(){this.loading=true;try{const r=await firstValueFrom(this.http.get<any>(this.api+(this.mine?'/mine':''),{params:{page:this.page}}));this.rows.set(r.rows);this.total=r.total;this.error=''}catch(e:any){this.error=e.error?.message||e.message}finally{this.loading=false}}
 reset(){this.editing=null;this.form={text:'',status:'Pending',assignedTo:''};this.image=undefined;this.preview=''}
 edit(row:any){this.editing=row._id;this.form={text:row.text,status:row.status,assignedTo:row.assignedTo?._id || row.assignedTo || ''};this.image=undefined;this.preview=row.image?.url||''}
 async choose(event:Event){const el=event.target as HTMLInputElement,file=el.files?.[0];el.value='';if(!file)return;this.error='';this.reading=true;try{const prepared=await prepareImage(file);this.image={name:prepared.name,base64:prepared.base64};this.preview=prepared.dataUrl}catch(e:any){this.error=e?.message||'تعذر تجهيز الصورة'}finally{this.reading=false}}
 async save(){if(this.mine || !this.auth.can('tasks','write')||!this.form.assignedTo||this.busy||this.reading||(!this.form.text.trim()&&!this.preview))return;this.busy=true;try{const body={...this.form,...(this.image!==undefined?{image:this.image}:{})};await firstValueFrom(this.editing?this.http.patch(this.api+'/'+this.editing,body):this.http.post(this.api,body));this.reset();this.page=1;await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async remove(row:any){if(this.mine || !this.auth.can('tasks','write')||this.busy||!await confirmAction('حذف هذه المهمة؟'))return;this.busy=true;try{await firstValueFrom(this.http.delete(this.api+'/'+row._id));if(this.editing===row._id)this.reset();if(this.rows().length===1&&this.page>1)this.page--;await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
}
