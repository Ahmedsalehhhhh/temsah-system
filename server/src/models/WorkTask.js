import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  userId: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,immutable:true},
  assignedTo: {type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},
  text: {type:String,trim:true,maxlength:4000,default:''},
  image: {url:String,publicId:String},
  status: {type:String,enum:['Pending','Completed'],default:'Pending'},
  assigneeReadAt: {type:Date,default:null},
}, {timestamps:true})
schema.index({userId:1,createdAt:-1})
schema.index({assignedTo:1,createdAt:-1})
export default mongoose.model('WorkTask',schema)
