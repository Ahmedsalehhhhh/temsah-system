import { Component, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PayrollService } from '../../core/payroll.service'
import { formatEGP } from '../../core/calc'

@Component({ selector: 'app-payroll', standalone: true, imports: [CommonModule], templateUrl: './payroll.component.html' })
export class PayrollComponent {
  formatEGP = formatEGP
  constructor(public payroll: PayrollService) {
    effect(() => { const id = this.payroll.currentPeriodId(); if (id) this.payroll.loadPayrollOverview(id) })
  }
}