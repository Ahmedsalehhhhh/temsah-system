import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  period: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  amountMinor: { type: Number, required: true, min: 1, max: 100000000000 },
  category: { type: String, trim: true, maxlength: 80, default: 'غير مصنف', index: true },
  description: { type: String, required: true, maxlength: 1000 },
  date: { type: String, required: true },
  receipt: {
    name: String, publicId:String, resourceType:String,
    mime: String,
    data: { type: Buffer, select: false },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })
schema.index({ company: 1, period: 1, category: 1, date: -1 })
export default mongoose.model('Expense', schema)
