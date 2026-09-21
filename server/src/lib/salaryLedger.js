import Employee from '../models/Employee.js'
import Recruiter from '../models/Recruiter.js'
import StaffRow from '../models/StaffRow.js'
import RecruitingRecord from '../models/RecruitingRecord.js'
import RecruiterAdjustment from '../models/RecruiterAdjustment.js'
import ManagementRecord from '../models/ManagementRecord.js'
import Settings from '../models/Settings.js'
import SalaryWithdrawal from '../models/SalaryWithdrawal.js'
import {calcRecruiter,calcStaff} from './calc.js'
export function groupSalaries(components,withdrawals){
 const groups=new Map();for(const c of components){const key=c.userId?'user:'+c.userId:c.email?'email:'+c.email.trim().toLowerCase():c.source;const g=groups.get(key)||{id:c.source,name:c.name,email:c.email||'',components:[],sources:[],totalMinor:0};g.components.push(c);g.sources.push(c.source);g.totalMinor+=Math.round(c.total*100);groups.set(key,g)}
 return [...groups.values()].map(g=>{const history=withdrawals.filter(w=>g.sources.includes(w.source));const withdrawnMinor=history.filter(w=>!w.voidedAt).reduce((n,w)=>n+w.amountMinor,0);return {...g,total:g.totalMinor/100,withdrawn:withdrawnMinor/100,remaining:(g.totalMinor-withdrawnMinor)/100,history}}).sort((a,b)=>a.name.localeCompare(b.name))
}
export async function salaryLedger(period,session=null){
 const read=q=>q.session(session).lean();
 const [employees,recruiters,staff,records,adjustments,management,settings,withdrawals]=await Promise.all([
 read(Employee.find()),read(Recruiter.find()),read(StaffRow.find({period})),read(RecruitingRecord.find({period})),read(RecruiterAdjustment.find({period})),read(ManagementRecord.find({period})),read(Settings.findById('global')),read(SalaryWithdrawal.find({period}).sort({createdAt:-1}))]);
 const cfg=settings||new Settings().toObject(),components=employees.map(e=>{const row=staff.find(r=>String(r.employee)===String(e._id))||{};const tier=e.dept==='management'?calcRecruiter(management.filter(r=>String(r.employee)===String(e._id)),cfg.tierAmounts).amount:0;return {...e,source:'employee:'+e._id,...calcStaff(row,row.baseSalary??e.baseSalary??(e.dept==='general'?0:cfg.managementItBaseSalary),tier)}});
 for(const e of recruiters){const adj=adjustments.find(r=>String(r.recruiter)===String(e._id));components.push({...e,source:'recruiter:'+e._id,dept:'recruiters',...calcRecruiter(records.filter(r=>String(r.recruiter)===String(e._id)),cfg.tierAmounts,adj)})}
 return groupSalaries(components,withdrawals)
}
