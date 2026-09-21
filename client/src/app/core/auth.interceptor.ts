import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { AuthService } from './auth.service'
import { catchError, throwError } from 'rxjs'
import { Router } from '@angular/router'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const router = inject(Router)
  const token = auth.getToken()

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401) {
        auth.clearToken()
        auth.user.set(null)
        router.navigate(['/login'])
      }
      const message = err?.error?.message || 'حصل خطأ في الاتصال بالسيرفر'
      return throwError(() => new Error(message))
    })
  )
}
