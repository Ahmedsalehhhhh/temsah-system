import { isAdminOrAbove, normalizeRole } from '../lib/permissions.js'
import jwt from 'jsonwebtoken'
import { permissionSnapshot } from '../lib/permissionStore.js'
import User from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: 'مطلوب تسجيل دخول' })

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub).select('-passwordHash')
    if (!user) return res.status(401).json({ message: 'المستخدم غير موجود' })

    if (user.status === 'INACTIVE' || (payload.ver || 0) !== (user.tokenVersion || 0)) return res.status(401).json({message:'الحساب غير نشط أو الجلسة منتهية'})
    user.role = normalizeRole(user.role)
    user.permissions = (await permissionSnapshot(user)).effective
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'التوكن غير صالح أو منتهي' })
  }
}

export function requireAdmin(req, res, next) {
  if (!isAdminOrAbove(req.user?.role)) {
    return res.status(403).json({ message: 'الصلاحية دي للأدمن فقط' })
  }
  next()
}
