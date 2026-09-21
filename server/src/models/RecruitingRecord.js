import mongoose from 'mongoose'

const recruitingRecordSchema = new mongoose.Schema(
  {
    period: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },
    user: { type: String, required: true, trim: true },
    tier: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    score: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('RecruitingRecord', recruitingRecordSchema)
