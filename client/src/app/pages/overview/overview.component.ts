import { Component, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PayrollService } from '../../core/payroll.service'
import { calcStreamer, calcRecruiter, calcStaff, formatEGP } from '../../core/calc'

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  styles: [`.payroll-panel { display:grid; grid-template-rows:0fr; transition:grid-template-rows .28s ease } .payroll-panel.expanded { grid-template-rows:1fr } .payroll-inner { min-height:0; overflow:hidden } @media(prefers-reduced-motion:reduce) { .payroll-panel { transition:none } }`],
  templateUrl: './overview.component.html',
})
export class OverviewComponent {
  payrollExpanded = signal(false)
  formatEGP = formatEGP

  constructor(public payroll: PayrollService) {}

  streamerResults = computed(() => {
    const { settings, streamerPerformance, streamers } = this.snapshot()
    return streamers.map((st) => {
      const perf = streamerPerformance.find((p) => p.periodId === this.payroll.currentPeriodId() && p.streamerId === st.id)
      return { ...st, ...calcStreamer(perf, st, settings.streamerRules, settings.egpConversionRate) }
    })
  })

  recruiterResults = computed(() => {
    const { settings, recruitingRecords, recruiterAdjustments, recruiters } = this.snapshot()
    return recruiters.map((rc) => {
      const records = recruitingRecords.filter((r) => r.periodId === this.payroll.currentPeriodId() && r.recruiterId === rc.id)
      const adj = recruiterAdjustments.find((a) => a.periodId === this.payroll.currentPeriodId() && a.recruiterId === rc.id)
      return { ...rc, ...calcRecruiter(records, settings.tierAmounts, adj) }
    })
  })

  mgmtResults = computed(() => {
    const { settings, managementRows, managementEmployees } = this.snapshot()
    return managementEmployees.map((e) => {
      const row = managementRows.find((r) => r.periodId === this.payroll.currentPeriodId() && r.employeeId === e.id)
      return { ...e, ...calcStaff(row, settings.managementItBaseSalary) }
    })
  })

  itResults = computed(() => {
    const { settings, itRows, itEmployees } = this.snapshot()
    return itEmployees.map((e) => {
      const row = itRows.find((r) => r.periodId === this.payroll.currentPeriodId() && r.employeeId === e.id)
      return { ...e, ...calcStaff(row, settings.managementItBaseSalary) }
    })
  })

  private snapshot() {
    return {
      settings: this.payroll.settings(),
      streamers: this.payroll.streamers(),
      streamerPerformance: this.payroll.streamerPerformance(),
      recruiters: this.payroll.recruiters(),
      recruitingRecords: this.payroll.recruitingRecords(),
      recruiterAdjustments: this.payroll.recruiterAdjustments(),
      managementEmployees: this.payroll.managementEmployees(),
      managementRows: this.payroll.managementRows(),
      itEmployees: this.payroll.itEmployees(),
      itRows: this.payroll.itRows(),
    }
  }

  rows = computed(() => {
    const s = this.payroll.settings()
    const streamersBase = this.sum(this.streamerResults(), (x) => x.cash * s.egpConversionRate)
    const streamersBonus = this.sum(this.streamerResults(), (x) => x.bonus * s.egpConversionRate)
    const streamersDeduction = this.sum(this.streamerResults(), (x) => x.deduction * s.egpConversionRate)

    const recruitersBase = this.sum(this.recruiterResults(), (x) => x.amount)
    const recruitersBonus = this.sum(this.recruiterResults(), (x) => x.bonus)
    const recruitersDeduction = this.sum(this.recruiterResults(), (x) => x.deduction)

    const mgmtBase = this.sum(this.mgmtResults(), (x) => x.baseSalary)
    const mgmtBonus = this.sum(this.mgmtResults(), (x) => x.recruiterBonus + x.bonus)
    const mgmtDeduction = this.sum(this.mgmtResults(), (x) => x.deduction)

    const itBase = this.sum(this.itResults(), (x) => x.baseSalary)
    const itBonus = this.sum(this.itResults(), (x) => x.recruiterBonus + x.bonus)
    const itDeduction = this.sum(this.itResults(), (x) => x.deduction)

    return [
      { name: 'الستريمرز', base: streamersBase, bonus: streamersBonus, deduction: streamersDeduction, total: streamersBase + streamersBonus - streamersDeduction, count: this.payroll.streamers().length },
      { name: 'الريكروترز', base: recruitersBase, bonus: recruitersBonus, deduction: recruitersDeduction, total: recruitersBase + recruitersBonus - recruitersDeduction, count: this.payroll.recruiters().length },
      { name: 'الإدارة', base: mgmtBase, bonus: mgmtBonus, deduction: mgmtDeduction, total: mgmtBase + mgmtBonus - mgmtDeduction, count: this.payroll.managementEmployees().length },
      { name: 'IT', base: itBase, bonus: itBonus, deduction: itDeduction, total: itBase + itBonus - itDeduction, count: this.payroll.itEmployees().length },
    ]
  })

  companyTotal = computed(() => this.sum(this.rows(), (r) => r.total))
  employeeCount = computed(() => this.sum(this.rows(), (r) => r.count))
  totalBase = computed(() => this.sum(this.rows(), (r) => r.base))
  totalBonus = computed(() => this.sum(this.rows(), (r) => r.bonus))
  totalDeduction = computed(() => this.sum(this.rows(), (r) => r.deduction))

  recentActivity = computed(() => {
    const periodId = this.payroll.currentPeriodId()
    return [
      { label: 'سجلات أداء الستريمرز', count: this.payroll.streamerPerformance().filter((item) => item.periodId === periodId).length },
      { label: 'سجلات التوظيف', count: this.payroll.recruitingRecords().filter((item) => item.periodId === periodId).length },
      { label: 'سجلات رواتب الإدارة', count: this.payroll.managementRows().filter((item) => item.periodId === periodId).length },
      { label: 'سجلات رواتب تقنية المعلومات', count: this.payroll.itRows().filter((item) => item.periodId === periodId).length },
    ]
  })

  private sum<T>(arr: T[], fn: (x: T) => number) { return arr.reduce((s, x) => s + fn(x), 0) }
}
