import mongoose from 'mongoose'

const streamerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    rate: { type: Number, default: 0.5 },
    // Entries created from Name & Rates are controlled by that page.  Direct
    // Streamers entries deliberately remain independent.
    source: { type: String, enum: ['name-rates', 'streamers'], default: 'streamers', index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.model('Streamer', streamerSchema)
