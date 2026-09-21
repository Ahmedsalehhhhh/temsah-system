import { ROLES } from '../lib/permissions.js'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fullName: { type: String, trim: true, maxlength: 120 },
    status: { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
    tokenVersion: { type: Number, default: 0 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'EMPLOYEE' },
    gameTrackerIdentity: { type: String, enum: ['saif', 'accountant1', 'accountant2', 'accountant3'], default: undefined },
    game_tracker_access: { type: Boolean, default: false },
    game_tracker_create: { type: Boolean, default: false },
    // A streamer account can edit performance only for this streamer record.
    streamer: { type: mongoose.Schema.Types.ObjectId, ref: 'Streamer', default: null },
  },
  { timestamps: true }
)

userSchema.index({ gameTrackerIdentity: 1 }, { unique: true, partialFilterExpression: { gameTrackerIdentity: { $type: 'string' } } })

export default mongoose.model('User', userSchema)
