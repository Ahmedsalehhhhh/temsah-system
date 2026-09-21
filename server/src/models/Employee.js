import mongoose from 'mongoose'

// dept: 'management' | 'it'
const employeeSchema = new mongoose.Schema(
  {
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
    email:{type:String,trim:true,lowercase:true,default:''},
    role:{type:String,default:''},
    baseSalary:{type:Number,min:0,default:null},
    name: { type: String, required: true, trim: true },
    dept: { type: String, enum: ['management', 'it','general'], required: true },
  },
  { timestamps: true }
)

export default mongoose.model('Employee', employeeSchema)
