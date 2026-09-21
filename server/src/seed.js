import './config/env.js'
import { connectDB } from './config/db.js'
import mongoose from 'mongoose'
import Settings from './models/Settings.js'
import Period from './models/Period.js'
import Streamer from './models/Streamer.js'
import Recruiter from './models/Recruiter.js'
import Employee from './models/Employee.js'

async function run() {
  await connectDB()

  await Settings.findByIdAndUpdate('global', {}, { upsert: true, setDefaultsOnInsert: true })

  const periodCount = await Period.countDocuments()
  if (periodCount === 0) {
    await Period.create({ label: 'سبتمبر 2026' })
    console.log('Created first payroll period')
  }

  const streamerNames = [
    ['ranger_cr', 0.5],
    ['iron_gaming11', 0.62],
    ['hessinelkadyy', 0.7],
  ]
  for (const [name, rate] of streamerNames) {
    await Streamer.findOneAndUpdate({ name }, { name, rate }, { upsert: true, setDefaultsOnInsert: true })
  }

  for (const name of ['Alia', 'Karim', 'Samira']) {
    await Recruiter.findOneAndUpdate({ name }, { name }, { upsert: true, setDefaultsOnInsert: true })
  }

  await Employee.findOneAndUpdate({ name: 'Yasmin', dept: 'management' }, { name: 'Yasmin', dept: 'management' }, { upsert: true, setDefaultsOnInsert: true })
  await Employee.findOneAndUpdate({ name: 'Omar', dept: 'it' }, { name: 'Omar', dept: 'it' }, { upsert: true, setDefaultsOnInsert: true })

  console.log('Seed complete')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
