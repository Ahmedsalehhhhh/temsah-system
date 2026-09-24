import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  itemName: { type: String, required: true, trim: true, maxlength: 160 },
  quantity: { type: Number, required: true, min: 1, max: 1000000 },
  deliveredAt: { type: Date, required: true, default: Date.now },
  notes: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['DELIVERED', 'RETURNED'], default: 'DELIVERED', index: true },
  returnedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

schema.index({ status: 1, deliveredAt: -1 })
export default mongoose.model('InventoryDelivery', schema)
