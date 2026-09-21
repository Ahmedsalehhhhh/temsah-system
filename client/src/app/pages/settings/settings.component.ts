import { AuthService } from '../../core/auth.service'
import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PayrollService } from '../../core/payroll.service'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  constructor(public payroll: PayrollService, public auth: AuthService) {}

  updateGeneral(field: 'egpConversionRate' | 'managementItBaseSalary', value: string) {
    this.payroll.updateSettings({ [field]: Number(value) } as any)
  }
  updateStandard(field: string, value: string) {
    this.payroll.updateStreamerRules({ standard: { ...this.payroll.settings().streamerRules.standard, [field]: Number(value) } })
  }
  updateExtra(field: string, value: string) {
    this.payroll.updateStreamerRules({ extra: { ...this.payroll.settings().streamerRules.extra, [field]: Number(value) } })
  }
  updateDefaultRate(value: string) {
    this.payroll.updateStreamerRules({ defaultRate: Number(value) })
  }
}
