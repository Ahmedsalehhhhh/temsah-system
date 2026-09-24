import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  nameKey: { type: String, required: true, trim: true, lowercase: true, unique: true },
  category: { type: String, trim: true, maxlength: 100, default: '' },
  quantityTotal: { type: Number, required: true, min: 0, max: 1000000 },
  quantityAvailable: { type: Number, required: true, min: 0, max: 1000000 },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

schema.index({ active: 1, name: 1 })
export default mongoose.model('InventoryItem', schema)
