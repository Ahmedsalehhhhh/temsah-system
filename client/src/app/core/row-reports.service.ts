import {Injectable,inject} from '@angular/core'
import {HttpClient} from '@angular/common/http'
import {firstValueFrom} from 'rxjs'
import {environment} from '../../environments/environment'
import {Report,pdfFile,saveFile,safeName} from './export-files'
@Injectable({providedIn:'root'})
export class RowReportsService{
 http=inject(HttpClient)
 async load(key:string,period:string){return firstValueFrom(this.http.get<Report>(environment.apiUrl+'/reports/'+key,{params:{period}}))}
 async pdf(key:string,period:string,id:string){const r=await this.load(key,period),row=r.rows.find(x=>x.id===id);if(!row)throw Error('السجل غير موجود');saveFile(await pdfFile(r,row),safeName(row.name||id)+'.pdf')}
 async save(key:string,period:string,row:string,column:string,value:any){await firstValueFrom(this.http.put(environment.apiUrl+'/reports/'+key+'/values',{period,row,column,value}))}
}
