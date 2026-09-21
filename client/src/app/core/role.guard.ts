import { inject } from '@angular/core'
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router'
import { AuthService } from './auth.service'
import { pageResource } from './permissions'
export const roleGuard: CanActivateFn = async route => {
  const auth=inject(AuthService), router=inject(Router)
  while(auth.loading()) await new Promise(resolve=>setTimeout(resolve,20))
  if(!auth.user()) return router.createUrlTree(['/login'])
  try { await auth.refreshPermissions(false) } catch { return router.createUrlTree(['/no-access']) }
  const page=pageResource(route.routeConfig?.path || '')
  return page==='notifications' || auth.can(page) || page==='attendance-and-work' && (auth.can('attendance-own') || auth.can('tasks')) || router.parseUrl(auth.landingPage())
}
export const roleChildGuard: CanActivateChildFn = roleGuard
