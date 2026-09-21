import { normalizeRole, requirePermission } from '../lib/permissions.js'
import { permissionSnapshot } from '../lib/permissionStore.js'
import { trackerAccess, trackerCreate } from '../lib/gameTracker.js'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

function signToken(user) {
  return jwt.sign({ sub: user._id, ver: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// Login accounts are created only by account administrators.
router.post('/register', requireAuth, requireAdmin, requirePermission('accounts','write'), async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'الاسم والإيميل والباسورد مطلوبين' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'EMPLOYEE',
    })
    user.permissions = (await permissionSnapshot(user)).effective
    const token = signToken(user)
    res.status(201).json({ token, user: { permissions: user.permissions, id: user._id, name: user.name, fullName: user.fullName || user.name, status: user.status || 'ACTIVE', email: user.email, role: normalizeRole(user.role), game_tracker_access: trackerAccess(user), game_tracker_create: trackerCreate(user) } })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({message:'البريد وكلمة المرور مطلوبان'})
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || user.status === 'INACTIVE') return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' })

    const ok = await bcrypt.compare(password || '', user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' })

    user.permissions = (await permissionSnapshot(user)).effective
    const token = signToken(user)
    res.json({ token, user: { permissions: user.permissions, id: user._id, name: user.name, fullName: user.fullName || user.name, status: user.status || 'ACTIVE', email: user.email, role: normalizeRole(user.role), game_tracker_access: trackerAccess(user), game_tracker_create: trackerCreate(user) } })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { ...req.user.toObject(), permissions: req.user.permissions, id: req.user._id, fullName: req.user.fullName || req.user.name, status: req.user.status || 'ACTIVE', game_tracker_access: trackerAccess(req.user), game_tracker_create: trackerCreate(req.user) } })
})

export default router
