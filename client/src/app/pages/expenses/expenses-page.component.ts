import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AuthService } from '../../core/auth.service'
import { ExpensesComponent } from './expenses.component'

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [CommonModule, ExpensesComponent],
  template: `<app-expenses *ngIf="auth.can('expenses'); else restricted"></app-expenses>
    <ng-template #restricted><p role="status">{{ auth.loading() ? 'جاري تحميل الحساب…' : 'إدارة المصروفات متاحة للأدمن فقط.' }}</p></ng-template>`,
  styles: ['app-expenses { margin-top: 0 }'],
})
export class ExpensesPageComponent {
  constructor(public auth: AuthService) {}
}
