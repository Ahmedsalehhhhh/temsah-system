import {CommonModule} from '@angular/common'
import {Component,OnInit,signal} from '@angular/core'
import {FormsModule} from '@angular/forms'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../../environments/environment'
import {AuthService} from '../../core/auth.service'
import {confirmAction} from '../../core/confirm-dialog'

@Component({selector:'app-inventory',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./inventory.component.html',styleUrl:'./inventory.component.css'})
export class InventoryComponent implements OnInit {
 tab:'stock'|'deliveries'='stock';items=signal<any[]>([]);deliveries=signal<any[]>([]);employees=signal<any[]>([]);summary=signal<any>({items:0,total:0,available:0,delivered:0})
 loading=false;busy=false;error='';notice='';showItemForm=false;showDeliveryForm=false;deliveryStatus='DELIVERED';employeeSearch='';editingId=''
 itemForm={name:'',category:'',quantity:1,notes:'',revision:0}
 deliveryForm={userId:'',itemId:'',quantity:1,notes:''}
 private api=environment.apiUrl+'/inventory'
 constructor(private http:HttpClient,public auth:AuthService){}
 async ngOnInit(){await this.load()}
 get canWrite(){return this.auth.can('inventory','write')}
 get filteredEmployees(){const value=this.employeeSearch.trim().toLowerCase();return value?this.employees().filter(user=>(user.fullName+' '+user.email).toLowerCase().includes(value)):this.employees()}
 get availableItems(){return this.items().filter(item=>item.active&&item.quantityAvailable>0)}
 selectedItem(){return this.items().find(item=>item._id===this.deliveryForm.itemId)}
 async load(){this.loading=true;try{const [stock,deliveries,employees]=await Promise.all([firstValueFrom(this.http.get<any>(this.api+'/items')),firstValueFrom(this.http.get<any[]>(this.api+'/deliveries',{params:{status:this.deliveryStatus}})),firstValueFrom(this.http.get<any[]>(this.api+'/employees'))]);this.items.set(stock.rows);this.summary.set(stock.summary);this.deliveries.set(deliveries);this.employees.set(employees);this.error=''}catch(e:any){this.error=e.error?.message||e.message}finally{this.loading=false}}
 selectTab(tab:'stock'|'deliveries'){this.tab=tab;this.error='';this.notice='';if(tab==='deliveries')void this.loadDeliveries()}
 async loadDeliveries(){try{this.deliveries.set(await firstValueFrom(this.http.get<any[]>(this.api+'/deliveries',{params:{status:this.deliveryStatus}})));this.error=''}catch(e:any){this.error=e.error?.message||e.message}}
 newItem(){this.editingId='';this.itemForm={name:'',category:'',quantity:1,notes:'',revision:0};this.showItemForm=true}
 editItem(row:any){this.editingId=row._id;this.itemForm={name:row.name,category:row.category||'',quantity:row.quantityTotal,notes:row.notes||'',revision:row.__v||0};this.showItemForm=true}
 async saveItem(){if(this.busy||!this.itemForm.name.trim()||this.itemForm.quantity<1)return;this.busy=true;try{const body={name:this.itemForm.name,category:this.itemForm.category,quantity:Number(this.itemForm.quantity),notes:this.itemForm.notes,...(this.editingId?{revision:this.itemForm.revision}:{})};if(this.editingId)await firstValueFrom(this.http.patch(this.api+'/items/'+this.editingId,body));else await firstValueFrom(this.http.post(this.api+'/items',body));this.showItemForm=false;this.notice='تم حفظ الصنف';await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 openDelivery(){this.deliveryForm={userId:'',itemId:'',quantity:1,notes:''};this.employeeSearch='';this.showDeliveryForm=true}
 async deliver(){if(this.busy||!this.deliveryForm.userId||!this.deliveryForm.itemId||this.deliveryForm.quantity<1)return;this.busy=true;try{await firstValueFrom(this.http.post(this.api+'/deliveries',{...this.deliveryForm,quantity:Number(this.deliveryForm.quantity)}));this.showDeliveryForm=false;this.notice='تم تسجيل التسليم وخصم الكمية من المخزون';await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 async returnDelivery(row:any){if(this.busy||!await confirmAction(`تأكيد استرجاع ${row.quantity} من ${row.itemName} للمخزون؟`))return;this.busy=true;try{await firstValueFrom(this.http.patch(this.api+'/deliveries/'+row._id+'/return',{}));this.notice='تم الاسترجاع وإعادة الكمية للمخزون';await this.load()}catch(e:any){this.error=e.error?.message||e.message}finally{this.busy=false}}
 person(row:any){return row.userId?.fullName||row.userId?.name||'—'}
}
