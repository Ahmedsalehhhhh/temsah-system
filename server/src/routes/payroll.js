import ManagementRecord from '../models/ManagementRecord.js'
import Period from '../models/Period.js'
import { requirePermission, can } from '../lib/permissions.js'
import { Router } from 'express'
import Settings from '../models/Settings.js'
import Streamer from '../models/Streamer.js'
import StreamerPerformance from '../models/StreamerPerformance.js'
import Recruiter from '../models/Recruiter.js'
import RecruitingRecord from '../models/RecruitingRecord.js'
import RecruiterAdjustment from '../models/RecruiterAdjustment.js'
import Employee from '../models/Employee.js'
import StaffRow from '../models/StaffRow.js'
import { requireAuth } from '../middleware/auth.js'
import { calcStreamer, calcRecruiter, calcStaff } from '../lib/calc.js'

const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.get('/overview/:periodId', async (req, res, next) => {
  try {
    const periodId = req.params.periodId
    const settings = (await Settings.findById('global')) || (await Settings.create({ _id: 'global' }))

    const period=await Period.findById(periodId);if(period?.egpConversionRate)settings.egpConversionRate=period.egpConversionRate
    const [streamers, performances, recruiters, records, adjustments, mgmtEmployees, itEmployees, staffRows] =
      await Promise.all([
        can(req.user,'streamers') || can(req.user,'name-rates') ? Streamer.find() : [],
        can(req.user,'streamers') || can(req.user,'name-rates') ? StreamerPerformance.find({ period: periodId }) : [],
        can(req.user,'recruiters') || can(req.user,'recruiting-log') ? Recruiter.find() : [],
        can(req.user,'recruiters') || can(req.user,'recruiting-log') ? RecruitingRecord.find({ period: periodId }) : [],
        can(req.user,'recruiters') ? RecruiterAdjustment.find({ period: periodId }) : [],
        can(req.user,'management-payroll') ? Employee.find({ dept: 'management' }) : [],
        can(req.user,'it') ? Employee.find({ dept: 'it' }) : [],
        StaffRow.find({ period: periodId }),
      ])

    const perfById = Object.fromEntries(performances.map((p) => [String(p.streamer), p]))
    const streamerResults = streamers.map((s) => {
      const r = calcStreamer(perfById[String(s._id)], {...s.toObject?.()||s,rate:perfById[String(s._id)]?.rateSnapshot??s.rate}, settings.streamerRules, settings.egpConversionRate)
      return { id: s._id, name: s.name, ...r }
    })

    const adjByRecruiter = Object.fromEntries(adjustments.map((a) => [String(a.recruiter), a]))
    const recruiterResults = recruiters.map((rc) => {
      const recs = records.filter((r) => String(r.recruiter) === String(rc._id))
      const r = calcRecruiter(recs, settings.tierAmounts, adjByRecruiter[String(rc._id)])
      return { id: rc._id, name: rc.name, ...r }
    })

    const managementRecords=can(req.user,'management-payroll')?await ManagementRecord.find({period:periodId}):[]
    const rowByEmployee = Object.fromEntries(staffRows.map((r) => [String(r.employee), r]))
    const buildStaffResults = (employees) =>
      employees.map((e) => {
        const r = calcStaff(rowByEmployee[String(e._id)], rowByEmployee[String(e._id)]?.baseSalary??e.baseSalary??settings.managementItBaseSalary, e.dept==='management'?calcRecruiter(managementRecords.filter(x=>String(x.employee)===String(e._id)),settings.tierAmounts).amount:0)
        return { id: e._id, name: e.name, ...r }
      })

    const mgmtResults = buildStaffResults(mgmtEmployees)
    const itResults = buildStaffResults(itEmployees)

    const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0)

    const streamersBase = sum(streamerResults, (s) => s.cash * settings.egpConversionRate)
    const streamersBonus = sum(streamerResults, (s) => s.bonus * settings.egpConversionRate)
    const streamersDeduction = sum(streamerResults, (s) => s.deduction * settings.egpConversionRate)

    const recruitersBase = sum(recruiterResults, (r) => r.amount)
    const recruitersBonus = sum(recruiterResults, (r) => r.bonus)
    const recruitersDeduction = sum(recruiterResults, (r) => r.deduction)

    const mgmtBase = sum(mgmtResults, (r) => r.baseSalary)
    const mgmtBonus = sum(mgmtResults, (r) => r.recruiterBonus + r.bonus)
    const mgmtDeduction = sum(mgmtResults, (r) => r.deduction)

    const itBase = sum(itResults, (r) => r.baseSalary)
    const itBonus = sum(itResults, (r) => r.recruiterBonus + r.bonus)
    const itDeduction = sum(itResults, (r) => r.deduction)

    const departments = [
      { name: 'streamers', base: streamersBase, bonus: streamersBonus, deduction: streamersDeduction, total: streamersBase + streamersBonus - streamersDeduction, count: streamers.length },
      { name: 'recruiters', base: recruitersBase, bonus: recruitersBonus, deduction: recruitersDeduction, total: recruitersBase + recruitersBonus - recruitersDeduction, count: recruiters.length },
      { name: 'management', base: mgmtBase, bonus: mgmtBonus, deduction: mgmtDeduction, total: mgmtBase + mgmtBonus - mgmtDeduction, count: mgmtEmployees.length },
      { name: 'it', base: itBase, bonus: itBonus, deduction: itDeduction, total: itBase + itBonus - itDeduction, count: itEmployees.length },
    ]

    if(can(req.user,'salaries')){const general=await Employee.find({dept:'general'});const results=general.map(e=>{const row=rowByEmployee[String(e._id)]||{};return calcStaff(row,row.baseSalary??0)});departments.push({name:'employees',base:sum(results,r=>r.baseSalary),bonus:sum(results,r=>r.bonus),deduction:sum(results,r=>r.deduction),total:sum(results,r=>r.total),count:general.length})}
    const companyTotal = sum(departments, (d) => d.total)
    const employeeCount = sum(departments, (d) => d.count)

    res.json({
      departments,
      companyTotal,
      employeeCount,
      streamers: streamerResults,
      recruiters: recruiterResults,
      management: mgmtResults,
      it: itResults,
    })
  } catch (err) {
    next(err)
  }
})

export default router
