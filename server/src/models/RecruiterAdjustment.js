import mongoose from 'mongoose'

const recruiterAdjustmentSchema = new mongoose.Schema(
  {
    period: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },
    bonus: { type: Number, default: 0 },
    bonusReason: { type: String, default: '' },
    deduction: { type: Number, default: 0 },
    deductionReason: { type: String, default: '' },
  },
  { timestamps: true }
)

recruiterAdjustmentSchema.index({ period: 1, recruiter: 1 }, { unique: true })

export default mongoose.model('RecruiterAdjustment', recruiterAdjustmentSchema)
