import {AfterViewInit,Directive,ElementRef,OnDestroy} from '@angular/core'
/** Keeps the original controls and handlers while presenting each row as a mobile card. */
@Directive({selector:'[appResponsiveTables]',standalone:true})
export class ResponsiveTablesDirective implements AfterViewInit,OnDestroy {
 private observer?:MutationObserver;private timer:any;
 constructor(private host:ElementRef<HTMLElement>){}
 ngAfterViewInit(){this.update();this.observer=new MutationObserver(()=>{clearTimeout(this.timer);this.timer=setTimeout(()=>this.update(),0)});this.observer.observe(this.host.nativeElement,{childList:true,subtree:true,characterData:true})}
 ngOnDestroy(){this.observer?.disconnect();clearTimeout(this.timer)}
 private update(){for(const table of Array.from(this.host.nativeElement.querySelectorAll<HTMLTableElement>('table'))){
 if(table.closest('.desktop-streamers,.report-table'))continue;
 const header=table.tHead?.rows[0];if(!header)continue;
 const labels=Array.from(header.cells).map(c=>c.textContent?.trim()||'الإجراءات');table.classList.add('mobile-card-table');table.parentElement?.classList.add('mobile-card-container');
 for(const body of Array.from(table.tBodies))for(const row of Array.from(body.rows)){let index=0;for(const cell of Array.from(row.cells)){const label=labels[index]||'تفاصيل';if(cell.getAttribute('data-label')!==label)cell.setAttribute('data-label',label);cell.classList.toggle('card-wide',cell.colSpan>1);for(const input of Array.from(cell.querySelectorAll('input,select,textarea'))){if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',label)}index+=cell.colSpan;}}
 }}
}
