// One-time migration for records created before periodId existed.
// Usage: node src/backfill-period-links.js --apply  (without --apply it is a dry run)
import './config/env.js'
import { connectDB } from './config/db.js'
import Period from './models/Period.js'
import Attendance from './models/Attendance.js'
import GameTrackerRecord from './models/GameTrackerRecord.js'
import Problem from './models/Problem.js'
import Streamer from './models/Streamer.js'
import StreamerPerformance from './models/StreamerPerformance.js'

const apply = process.argv.includes('--apply')
const arabicMonths = { 'يناير':1,'فبراير':2,'مارس':3,'أبريل':4,'ابريل':4,'مايو':5,'يونيو':6,'يوليو':7,'أغسطس':8,'اغسطس':8,'سبتمبر':9,'أكتوبر':10,'اكتوبر':10,'نوفمبر':11,'ديسمبر':12 }
const englishMonths = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
const digits = (value) => String(value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
function key(label) { const s=digits(label).toLowerCase(); const year=Number(s.match(/\d{4}/)?.[0]); const month=Object.entries({...arabicMonths,...englishMonths}).find(([name])=>s.includes(name))?.[1]; return year&&month ? `${year}-${String(month).padStart(2,'0')}` : null }
function dateKey(value) { const d=new Date(value); return Number.isNaN(+d)?null:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}` }
await connectDB(); const periods=await Period.find(); const lookup=new Map(periods.map(p=>[key(p.label),p._id]).filter(([k])=>k));
async function link(Model, dateField) { const rows=await Model.find({periodId:{$exists:false}}); let linked=0, skipped=0; for(const row of rows){const id=lookup.get(dateKey(row[dateField]));if(!id){skipped++;continue}if(apply){row.periodId=id;await row.save()}linked++}console.log(`${Model.modelName}: ${linked} linked, ${skipped} unmatched${apply?'':' (dry run)'}`) }
await link(Attendance,'workDate'); await link(GameTrackerRecord,'date'); await link(Problem,'openedAt');
const perf=await StreamerPerformance.find({rateSnapshot:null}); const streamers=await Streamer.find({_id:{$in:perf.map(x=>x.streamer)}}).select('_id rate'); const rates=new Map(streamers.map(x=>[String(x._id),x.rate])); if(apply&&perf.length)await StreamerPerformance.bulkWrite(perf.map(x=>({updateOne:{filter:{_id:x._id},update:{$set:{rateSnapshot:rates.get(String(x.streamer))??0}}}}))); console.log(`StreamerPerformance snapshots: ${perf.length}${apply?' written':' pending'}`)
process.exit(0)
