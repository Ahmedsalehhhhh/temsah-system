import mongoose from 'mongoose'

const updateSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 4000 },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now },
}, { _id: true })

const schema = new mongoose.Schema({
  category: { type: String, enum: ['Management', 'Recruiters'], default: 'Management', index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  details: { type: String, trim: true, maxlength: 4000, default: '' },
  nextStep: { type: String, trim: true, maxlength: 1000, default: '' },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: null },
  updates: { type: [updateSchema], default: [] },
}, { timestamps: true })

schema.index({ category: 1, status: 1, updatedAt: -1 })
export default mongoose.model('FollowUp', schema)
