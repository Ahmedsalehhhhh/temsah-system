import PermissionPolicy from '../models/PermissionPolicy.js'
import { PAGES, EDITABLE_ROLES, defaultPermissions } from './permissionDefaults.js'
export async function seedPermissions() {
  for (const role of EDITABLE_ROLES) {
    await PermissionPolicy.updateOne({_id:'role:'+role}, {$setOnInsert:{entries:defaultPermissions(role)}}, {upsert:true,runValidators:true})
  }
}
export async function permissionSnapshot(user) {
  const role = String(user.role || '').toUpperCase()
  if (role === 'SUPER_ADMIN') return {effective:Object.fromEntries(PAGES.map(p=>[p,'FULL_EDIT'])), overrides:{}, defaults:{}}
  const [roleDoc, userDoc] = await Promise.all([
    PermissionPolicy.findById('role:'+role).lean(),
    PermissionPolicy.findById('user:'+String(user._id || user.id)).lean(),
  ])
  const defaults = {...defaultPermissions(role), ...roleDoc?.entries}
  const overrides = userDoc?.entries || {}
  return {defaults, overrides, effective:Object.fromEntries(PAGES.map(p=>[p,overrides[p] || defaults[p] || 'NO_ACCESS']))}
}
