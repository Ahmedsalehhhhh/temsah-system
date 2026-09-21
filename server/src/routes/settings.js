import { requirePermission } from '../lib/permissions.js'
import { Router } from 'express'
import Settings from '../models/Settings.js'
import { requireAuth } from '../middleware/auth.js'

const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))

async function getOrCreateSettings() {
  let settings = await Settings.findById('global')
  if (!settings) settings = await Settings.create({ _id: 'global' })
  return settings
}

router.get('/calculation', async (req,res,next)=>{
  try {
    const s=await getOrCreateSettings()
    res.json({egpConversionRate:s.egpConversionRate,managementItBaseSalary:s.managementItBaseSalary,tierAmounts:s.tierAmounts,streamerRules:s.streamerRules})
  } catch(e){next(e)}
})
router.get('/', async (req, res, next) => {
  try {
    res.json(await getOrCreateSettings())
  } catch (err) {
    next(err)
  }
})

router.patch('/', requireFinanceWrite, async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings()
    Object.assign(settings, req.body)
    await settings.save()
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

export default router
