import { Component, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { StreamersComponent } from './streamers.component'
import { PayrollService } from '../../core/payroll.service'
import { AuthService } from '../../core/auth.service'
@Component({
  selector: 'app-name-rates', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <h1 class="text-xl font-semibold mb-2">الأسماء والنسب — Name &amp; Rates</h1>
    
    <div *ngIf="auth.canWriteFinance()" class="flex flex-wrap items-end gap-2 mb-5">
      <input [(ngModel)]="newName" placeholder="Name" class="bg-base-850 border border-base-700 rounded p-2" />
      <input [(ngModel)]="newRate" type="number" step="0.01" placeholder="Rate" class="bg-base-850 border border-base-700 rounded p-2 w-24" />
      <input [(ngModel)]="newBonus" type="number" placeholder="Bonus" class="bg-base-850 border border-base-700 rounded p-2 w-24" />
      <input [(ngModel)]="newBonusReason" placeholder="Bonus reason" class="bg-base-850 border border-base-700 rounded p-2" />
      <input [(ngModel)]="newDeduction" type="number" placeholder="Deduction" class="bg-base-850 border border-base-700 rounded p-2 w-24" />
      <input [(ngModel)]="newDeductionReason" placeholder="Deduction reason" class="bg-base-850 border border-base-700 rounded p-2" />
      <button (click)="addNameRate()" [disabled]="payroll.isPeriodLocked() || !payroll.currentPeriodId()" class="bg-gold-500 text-base-950 rounded px-4 py-2 disabled:opacity-50">+ Add</button>
    </div>
    <div class="overflow-auto bg-base-900 border border-base-700 rounded-lg">
      <table class="w-full text-sm">
        <thead><tr class="text-right border-b border-base-700">
          <th class="p-3">الاسم</th><th class="p-3">Rate</th><th class="p-3">بونص</th>
          <th class="p-3">السبب</th><th class="p-3">خصم</th><th class="p-3">السبب</th>
        </tr></thead>
        <tbody><tr *ngFor="let row of rows()" class="border-b border-base-800">
          <td class="p-3">{{ row.streamer.name }}</td>
          <td class="p-2"><input aria-label="Rate" type="number" step="0.01" [value]="row.streamer.rate" (blur)="onRateBlur(row.streamer.id, $any($event.target).value)" [disabled]="payroll.isPeriodLocked() || !auth.canWriteFinance()" class="bg-transparent border border-base-700 p-2 rounded w-24" /><span class="text-ink-500">{{ row.streamer.rate | percent:'1.0-2' }}</span></td>
          <td class="p-2"><input aria-label="بونص" type="number" [value]="row.perf.bonus" (blur)="onBonusBlur(row.streamer.id, $any($event.target).value)" [disabled]="payroll.isPeriodLocked() || !auth.canWriteFinance() || !payroll.currentPeriodId()" class="bg-transparent border border-base-700 p-2 rounded w-24" /></td>
          <td class="p-2"><input aria-label="سبب البونص" [value]="row.perf.bonusReason || ''" (blur)="onBonusReasonBlur(row.streamer.id, $any($event.target).value)" [disabled]="payroll.isPeriodLocked() || !auth.canWriteFinance() || !payroll.currentPeriodId()" class="bg-transparent border border-base-700 p-2 rounded" /></td>
          <td class="p-2"><input aria-label="خصم" type="number" [value]="row.perf.deduction" (blur)="onDeductionBlur(row.streamer.id, $any($event.target).value)" [disabled]="payroll.isPeriodLocked() || !auth.canWriteFinance() || !payroll.currentPeriodId()" class="bg-transparent border border-base-700 p-2 rounded w-24" /></td>
          <td class="p-2"><input aria-label="سبب الخصم" [value]="row.perf.deductionReason || ''" (blur)="onDeductionReasonBlur(row.streamer.id, $any($event.target).value)" [disabled]="payroll.isPeriodLocked() || !auth.canWriteFinance() || !payroll.currentPeriodId()" class="bg-transparent border border-base-700 p-2 rounded" /></td>
        </tr></tbody>
      </table>
      <p *ngIf="!rows().length" class="p-4 text-ink-500">أضف الأسماء أو ارفع ملف Excel من صفحة الستريمرز.</p>
    </div>
  `,
})
export class NameRatesComponent extends StreamersComponent {
  constructor(payroll: PayrollService, auth: AuthService) { super(payroll, auth) }
  override rows = computed(() => this.buildRows().filter((row) => row.streamer.source === 'name-rates'))
  newRate = this.payroll.settings().streamerRules.defaultRate
  newBonus = 0
  newBonusReason = ''
  newDeduction = 0
  newDeductionReason = ''

  async addNameRate() {
    const periodId = this.payroll.currentPeriodId()
    if (!this.newName.trim() || !periodId) return
    const saved = await this.payroll.performAction(() => this.payroll.addNameRate(this.newName.trim(), Number(this.newRate), periodId, {
      bonus: Number(this.newBonus), bonusReason: this.newBonusReason, deduction: Number(this.newDeduction), deductionReason: this.newDeductionReason,
    }))
    if (saved) {
      this.newName = ''; this.newBonus = 0; this.newBonusReason = ''; this.newDeduction = 0; this.newDeductionReason = ''
    }
  }
  override onRateBlur(id: string, value: string) { this.payroll.updateNameRate(id, Number(value)) }
  private updateAdjustment(streamerId: string, patch: any) {
    const periodId = this.payroll.currentPeriodId()
    if (periodId) this.payroll.upsertNameRatePerformance(periodId, streamerId, patch)
  }
  override onBonusBlur(id: string, value: string) { this.updateAdjustment(id, { bonus: Number(value) }) }
  override onBonusReasonBlur(id: string, value: string) { this.updateAdjustment(id, { bonusReason: value }) }
  override onDeductionBlur(id: string, value: string) { this.updateAdjustment(id, { deduction: Number(value) }) }
  override onDeductionReasonBlur(id: string, value: string) { this.updateAdjustment(id, { deductionReason: value }) }
}
