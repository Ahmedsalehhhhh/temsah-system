import SalaryWithdrawal from '../models/SalaryWithdrawal.js'
import ManagementRecord from '../models/ManagementRecord.js'
import Settings from '../models/Settings.js'
import {calcRecruiter} from '../lib/calc.js'
import mongoose from 'mongoose'
import { requirePermission } from '../lib/permissions.js'
import {personInput,identities} from '../lib/personInput.js'
import { Router } from 'express'
import Employee from '../models/Employee.js'
import StaffRow from '../models/StaffRow.js'
import { requireAuth } from '../middleware/auth.js'
import { assertPeriodOpen } from './_guards.js'

const requireFinanceWrite = requirePermission('finance', 'write')
const router = Router()
router.use(requireAuth, requirePermission('finance'))

router.get('/:dept/identity-options',requireFinanceWrite,identities)
// dept param: 'management' | 'it'
router.get('/:dept', async (req, res, next) => {
  try {
    res.json(await Employee.find({ dept: req.params.dept }).sort({ name: 1 }))
  } catch (err) { next(err) }
})

router.post('/:dept', requireFinanceWrite, async (req, res, next) => {
  try {
    const person = await personInput(req.body); const name=person.name
    if (!name) return res.status(400).json({ message: 'اسم الموظف مطلوب' })
    if(!['management','it','general'].includes(req.params.dept))return res.status(400).json({message:'قسم غير صالح'})
    if(['general','it'].includes(req.params.dept)){await assertPeriodOpen(req.body.periodId);if(typeof req.body.baseSalary!=='number'||!Number.isFinite(req.body.baseSalary)||req.body.baseSalary<0) return res.status(400).json({message:'راتب غير صالح'})}
    let employee;await mongoose.connection.transaction(async session=>{[employee]=await Employee.create([{...person,dept:req.params.dept,baseSalary:req.params.dept==='it'?req.body.baseSalary:null}],{session});if(['general','it'].includes(req.params.dept))await StaffRow.create([{employee:employee._id,period:req.body.periodId,baseSalary:req.body.baseSalary}],{session})})
    res.status(201).json(employee)
  } catch (err) { next(err) }
})

router.delete('/:dept/:id', requireFinanceWrite, async (req, res, next) => {
  try {
    if(await SalaryWithdrawal.exists({source:'employee:'+req.params.id}))return res.status(409).json({message:'لهذا الموظف سجل سحوبات؛ احتفظ بحسابه للحفاظ على السجل المالي'})
    await Employee.findOneAndDelete({_id:req.params.id,dept:req.params.dept})
    await StaffRow.deleteMany({ employee: req.params.id })
    res.status(204).end()
  } catch (err) { next(err) }
})

router.get('/:dept/rows/:periodId', async (req, res, next) => {
  try {
    const employees = await Employee.find({ dept: req.params.dept })
    const rows = await StaffRow.find({ period: req.params.periodId, employee: { $in: employees.map((e) => e._id) } })
    if(req.params.dept==='management'){
      const records=await ManagementRecord.find({period:req.params.periodId});const cfg=await Settings.findById('global')||new Settings();
      return res.json(employees.map(e=>{const row=rows.find(r=>String(r.employee)===String(e._id));const calc=calcRecruiter(records.filter(r=>String(r.employee)===String(e._id)),cfg.tierAmounts);return {...(row?.toObject?.()||row||{employee:e._id,period:req.params.periodId,bonus:0,deduction:0}),recruiterBonus:calc.amount,tierCounts:calc.counts}}))
    }
    res.json(rows)
  } catch (err) { next(err) }
})

router.put('/:dept/rows/:periodId/:employeeId', async (req, res, next) => {
  try {
    await assertPeriodOpen(req.params.periodId)
    const person=await Employee.findOne({_id:req.params.employeeId,dept:req.params.dept});if(!person)return res.status(404).json({message:'الموظف غير موجود'});
    const { bonus, bonusReason, deduction, deductionReason,baseSalary } = req.body
    for(const v of [bonus,deduction,baseSalary])if(v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e9))return res.status(400).json({message:'قيمة مالية غير صالحة'})
    const update = {}; if(baseSalary!==undefined)update.baseSalary=baseSalary
    if (bonus !== undefined) update.bonus = bonus
    if (bonusReason !== undefined) update.bonusReason = bonusReason
    if (deduction !== undefined) update.deduction = deduction
    if (deductionReason !== undefined) update.deductionReason = deductionReason

    const row = await StaffRow.findOneAndUpdate(
      { period: req.params.periodId, employee: req.params.employeeId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true,runValidators:true }
    )
    res.json(row)
  } catch (err) { next(err) }
})

export default router
