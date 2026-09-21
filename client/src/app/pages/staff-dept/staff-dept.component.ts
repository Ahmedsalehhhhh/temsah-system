import {inject} from '@angular/core'
import {RowReportsService} from '../../core/row-reports.service'
import {PersonPickerComponent} from '../../components/person-picker.component'
import { Component, Input, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { PayrollService } from '../../core/payroll.service'
import { AuthService } from '../../core/auth.service'
import { calcStaff, formatEGP } from '../../core/calc'
import { StaffRow } from '../../core/models'

@Component({ selector: 'app-staff-dept', standalone: true, imports: [PersonPickerComponent, CommonModule, FormsModule], templateUrl: './staff-dept.component.html' })
export class StaffDeptComponent {
 reports=inject(RowReportsService);pdfError='';pdfBusy=false;async downloadPdf(id:string){this.pdfBusy=true;this.pdfError='';try{await this.reports.pdf(this.dept==='it'?'it':'management-payroll',this.payroll.currentPeriodId()||'',id)}catch(e:any){this.pdfError=e.error?.message||e.message}finally{this.pdfBusy=false}}
  @Input() dept!: 'management' | 'it'
  @Input() title = ''
  @Input() subtitle = ''
  formatEGP = formatEGP
  newName = '';person:any={name:''};newBase:number|null=null
  constructor(public payroll: PayrollService, public auth: AuthService) {}
  employees = computed(() => this.dept === 'management' ? this.payroll.managementEmployees() : this.payroll.itEmployees())
  allRows = computed(() => this.dept === 'management' ? this.payroll.managementRows() : this.payroll.itRows())
  rows = computed(() => this.employees().map((emp) => {
    const row: StaffRow = this.allRows().find((r) => r.periodId === this.payroll.currentPeriodId() && r.employeeId === emp.id)
      || { periodId: this.payroll.currentPeriodId() || '', employeeId: emp.id, bonus: 0, deduction: 0 }
    return { emp, row, result: calcStaff(row, row.baseSalary??emp.baseSalary??this.payroll.settings().managementItBaseSalary, this.dept==='management'?row.recruiterBonus:0) }
  }))
  totals = computed(() => this.rows().reduce((sum, r) => ({ recruiterBonus:sum.recruiterBonus+r.result.recruiterBonus, baseSalary: sum.baseSalary + r.result.baseSalary, bonus: sum.bonus + r.result.bonus, deduction: sum.deduction + r.result.deduction, total: sum.total + r.result.total }), { recruiterBonus:0, baseSalary: 0, bonus: 0, deduction: 0, total: 0 }))
  async addStaff() { if (this.person.name?.trim() && await this.payroll.performAction(() => this.payroll.addStaff(this.dept, this.dept==='it'?{...this.person,baseSalary:this.newBase}:this.person))) this.person={name:''} }
  async onBaseBlur(id:string,value:string){await this.payroll.performAction(()=>this.payroll.upsertStaffRow(this.dept,this.payroll.currentPeriodId()!,id,{baseSalary:Number(value)}))}
  onBonusBlur(id: string, value: string) { this.payroll.upsertStaffRow(this.dept, this.payroll.currentPeriodId()!, id, { bonus: Number(value) }) }
  onDeductionBlur(id: string, value: string) { this.payroll.upsertStaffRow(this.dept, this.payroll.currentPeriodId()!, id, { deduction: Number(value) }) }
  onReasonBlur(id: string, field: 'bonusReason' | 'deductionReason', value: string) { this.payroll.upsertStaffRow(this.dept, this.payroll.currentPeriodId()!, id, { [field]: value }) }
}