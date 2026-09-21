import mongoose from 'mongoose'

const periodSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    closedAt: Date,
    payrollRevision:{type:Number,default:0},
    egpConversionRate:{type:Number,min:0.000001,default:null},
  },
  { timestamps: true }
)

export default mongoose.model('Period', periodSchema)
