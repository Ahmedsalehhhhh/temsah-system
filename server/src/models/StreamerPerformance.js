import mongoose from 'mongoose'

const streamerPerformanceSchema = new mongoose.Schema(
  {
    period: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    streamer: { type: mongoose.Schema.Types.ObjectId, ref: 'Streamer', required: true },
    // Frozen when the payroll period is closed; never use the live Streamer.rate for history.
    rateSnapshot: { type: Number, default: null },
    score: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    bonus: { type: Number, default: 0 },
    bonusReason: { type: String, default: '' },
    deduction: { type: Number, default: 0 },
    deductionReason: { type: String, default: '' },
  },
  { timestamps: true }
)

streamerPerformanceSchema.index({ period: 1, streamer: 1 }, { unique: true })

export default mongoose.model('StreamerPerformance', streamerPerformanceSchema)
