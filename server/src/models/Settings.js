import mongoose from 'mongoose'

// Singleton document — always _id: 'global'
const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  egpConversionRate: { type: Number, default: 50 },
  managementItBaseSalary: { type: Number, default: 8000 },
  // Retained for recruiter payroll records; it is no longer configurable in Admin.
  tierAmounts: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 1500 },
    3: { type: Number, default: 1000 },
    4: { type: Number, default: 500 },
    5: { type: Number, default: 0 },
  },
  streamerRules: {
    defaultRate: { type: Number, default: 0.5 },
    standard: {
      score: { type: Number, default: 150000 },
      days: { type: Number, default: 20 },
      hours: { type: Number, default: 60 },
      pct: { type: Number, default: 0.03 },
    },
    extra: {
      score: { type: Number, default: 150000 },
      days: { type: Number, default: 22 },
      hours: { type: Number, default: 100 },
      pct: { type: Number, default: 0.02 },
    },
  },
})

export default mongoose.model('Settings', settingsSchema)