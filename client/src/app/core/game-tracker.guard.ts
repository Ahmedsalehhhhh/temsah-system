import { inject, Component } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CanActivateFn, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { AuthService } from './auth.service'
import { User } from './models'
import { environment } from '../../environments/environment'
export const gameTrackerGuard: CanActivateFn = async () => {
  const auth = inject(AuthService), http = inject(HttpClient), router = inject(Router)
  if (!auth.getToken()) return router.createUrlTree(['/login'])
  try {
    const result = await firstValueFrom(http.get<{user:User}>(environment.apiUrl+'/auth/me'))
    auth.user.set(result.user)
    return auth.canAccessGameTracker() || router.createUrlTree(['/game-tracker-denied'])
  } catch { return router.createUrlTree([auth.getToken() ? '/game-tracker-denied' : '/login']) }
}
@Component({selector:'app-game-tracker-denied',standalone:true,template:'<h1 class="text-xl mb-3">Game Tracker</h1><p role="alert">Access Denied — ليس لديك صلاحية الدخول إلى هذه الصفحة.</p>'})
export class GameTrackerDeniedComponent {}