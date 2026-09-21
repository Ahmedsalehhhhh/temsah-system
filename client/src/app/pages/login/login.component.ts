import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService } from '../../core/auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  mode = signal<'login' | 'register'>('login')
  name = ''
  email = ''
  password = ''
  error = signal('')
  busy = signal(false)

  constructor(public auth: AuthService, private router: Router) {}

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login')
    this.error.set('')
  }

  async submit() {
    this.error.set('')
    this.busy.set(true)
    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email, this.password)
      } else {
        await this.auth.register(this.name, this.email, this.password)
      }
      this.router.navigateByUrl(this.auth.can('overview') ? '/' : this.auth.landingPage())
    } catch (err: any) {
      this.error.set(err.message)
    } finally {
      this.busy.set(false)
    }
  }
}
