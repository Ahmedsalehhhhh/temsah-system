import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { ROLES, normalizeRole, assignableRoles, canManageAccount, requirePermission } from '../lib/permissions.js'
import { fields, text, passwordValue, objectId, accountView, fail } from '../lib/attendance.js'

const router = Router()
router.use(requireAuth, requirePermission('accounts'))
const route = fn => async (req, res, next) => {
  try { await fn(req, res) }
  catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'البريد الإلكتروني مستخدم بالفعل' })
    if (e.status) return res.status(e.status).json({ message: e.message })
    next(e)
  }
}
function emailValue(value) {
  const email = text(value, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'بريد إلكتروني غير صالح')
  return email
}
export function roleValue(actor, value) {
  if (!ROLES.includes(value)) throw fail(400, 'دور غير صالح')
  if (!assignableRoles(actor).includes(value)) throw fail(403, 'لا يمكنك تعيين هذا الدور')
  return value
}
export function assertManageable(actor, target) {
  if (!canManageAccount(actor, target)) throw fail(403, 'لا يمكنك تعديل هذا الحساب')
}
// Recheck the target role in the update itself, including during concurrent promotion.
function targetFilter(actor, id) {
  const roles = assignableRoles(actor)
  return { _id: id, role: { $in: [...roles, ...roles.map(role => role.toLowerCase()), 'staff', 'streamer'] } }
}
async function target(req) {
  const user = await User.findById(objectId(req.params.id)).select('name fullName email role status tokenVersion')
  if (!user) throw fail(404, 'الموظف غير موجود')
  assertManageable(req.user, user)
  return user
}
router.get('/', route(async (_req, res) => {
  const users = await User.find().sort({ name: 1 }).select('-passwordHash')
  res.json(users.map(accountView))
}))
router.post('/', route(async (req, res) => {
  fields(req.body, ['fullName', 'email', 'temporaryPassword', 'role'])
  const role = roleValue(req.user, req.body.role)
  const fullName = text(req.body.fullName, 120), email = emailValue(req.body.email)
  const passwordHash = await bcrypt.hash(passwordValue(req.body.temporaryPassword), 12)
  const user = await User.create({ name: fullName, fullName, email, passwordHash, role, status: 'ACTIVE' })
  res.status(201).json(accountView(user))
}))
router.get('/:id', route(async (req, res) => {
  const user = await User.findById(objectId(req.params.id)).select('-passwordHash')
  if (!user) throw fail(404, 'الموظف غير موجود')
  res.json(accountView(user))
}))
router.patch('/:id', route(async (req, res) => {
  fields(req.body, ['fullName', 'email', 'role', 'status'])
  const user = await target(req), changes = {}
  if (req.body.fullName !== undefined) changes.name = changes.fullName = text(req.body.fullName, 120)
  if (req.body.email !== undefined) changes.email = emailValue(req.body.email)
  if (req.body.role !== undefined) changes.role = roleValue(req.user, req.body.role)
  if (req.body.status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) throw fail(400, 'حالة غير صالحة')
    changes.status = req.body.status
  }
  if (String(user._id) === String(req.user._id) && (changes.status === 'INACTIVE' || changes.role && changes.role !== normalizeRole(user.role))) {
    throw fail(409, 'لا يمكنك تعطيل حسابك الإداري أو إزالة صلاحياته')
  }
  const invalidatesSession = changes.role && changes.role !== normalizeRole(user.role) || changes.status && changes.status !== user.status
  const updated = await User.findOneAndUpdate(targetFilter(req.user, user._id),
    { $set: changes, ...(invalidatesSession ? { $inc: { tokenVersion: 1 } } : {}) },
    { new: true, runValidators: true }).select('-passwordHash')
  if (!updated) throw fail(403, 'تغيرت صلاحية الحساب؛ أعد تحميل القائمة')
  res.json(accountView(updated))
}))
router.post('/:id/reset-password', route(async (req, res) => {
  fields(req.body, ['temporaryPassword'])
  const user = await target(req)
  const passwordHash = await bcrypt.hash(passwordValue(req.body.temporaryPassword), 12)
  const updated = await User.findOneAndUpdate(targetFilter(req.user, user._id),
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } }, { new: true }).select('_id')
  if (!updated) throw fail(403, 'تغيرت صلاحية الحساب؛ أعد تحميل القائمة')
  res.json({ id: String(updated._id), reset: true })
}))
export default router
