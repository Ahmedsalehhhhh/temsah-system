import mongoose from 'mongoose'
import { LEVELS } from '../lib/permissionDefaults.js'
const schema = new mongoose.Schema({
  _id: String,
  entries: { type: Map, of: { type: String, enum: LEVELS }, default: {} },
}, { timestamps: true, strict: 'throw' })
export default mongoose.model('PermissionPolicy', schema)
