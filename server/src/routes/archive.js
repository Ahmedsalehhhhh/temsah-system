import {ownScope,companyScope} from '../lib/recordScope.js'
import Company from '../models/Company.js'
import { requirePermission, can } from '../lib/permissions.js'
import { Router } from 'express'
import Period from '../models/Period.js'
import StreamerPerformance from '../models/StreamerPerformance.js'
import RecruitingRecord from '../models/RecruitingRecord.js'
import RecruiterAdjustment from '../models/RecruiterAdjustment.js'
import StaffRow from '../models/StaffRow.js'
import Expense from '../models/Expense.js'
import Attendance from '../models/Attendance.js'
import GameTrackerRecord from '../models/GameTrackerRecord.js'
import Problem from '../models/Problem.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requirePermission('finance'))
router.get('/periods', async (_req, res, next) => {
  try { res.json(await Period.find({ status: 'closed' }).sort({ closedAt: -1, createdAt: -1 })) } catch (err) { next(err) }
})
router.get('/:periodId', async (req, res, next) => {
  try {
    const period = await Period.findOne({ _id: req.params.periodId, status: 'closed' })
    if (!period) return res.status(404).json({ message: 'Closed period not found' })
    const [streamers, recruitingRecords, recruiterAdjustments, staffRows, expenses, attendance, gameTracker, problems] = await Promise.all([
      can(req.user,'streamers') || can(req.user,'name-rates') ? StreamerPerformance.find({ period: period._id }).populate('streamer', 'name').sort({ createdAt: 1 }) : [],
      can(req.user,'recruiting-log') || can(req.user,'recruiters') ? RecruitingRecord.find({ period: period._id }).populate('recruiter', 'name') : [],
      can(req.user,'recruiters') ? RecruiterAdjustment.find({ period: period._id }).populate('recruiter', 'name') : [],
      can(req.user,'management-payroll') || can(req.user,'it') ? StaffRow.find({ period: period._id }).populate('employee', 'name dept') : [],
      can(req.user,'expenses') ? Expense.find({ period: period._id, company:{$in:(await Company.find(companyScope(req.user)).select('_id')).map(x=>x._id)} }).populate('company', 'name').sort({ date: -1 }) : [],
      can(req.user, 'operations') ? Attendance.find({ periodId: period._id,...ownScope(req.user,'attendance-and-work') }).populate('userId', 'name fullName').sort({ workDate: 1 }) : [],
      can(req.user,'game-tracker') ? GameTrackerRecord.find({ periodId: period._id }).sort({ date: -1, _id: -1 }) : [],
      can(req.user, 'management') ? Problem.find({ periodId: period._id,...ownScope(req.user,'management') }).populate('userId', 'name fullName').sort({ createdAt: -1 }) : [],
    ])
    res.json({ period, streamers, recruitingRecords, recruiterAdjustments, staffRows:staffRows.filter(row=>!row.employee?.dept || can(req.user,row.employee.dept==='it'?'it':row.employee.dept==='general'?'salaries':'management-payroll')), expenses, attendance, gameTracker, problems })
  } catch (err) { next(err) }
})
export default router
