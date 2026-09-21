import mongoose from 'mongoose'

const recruiterSchema = new mongoose.Schema(
  {
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
    email:{type:String,trim:true,lowercase:true,default:''},
    role:{type:String,default:''},
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('Recruiter', recruiterSchema)
