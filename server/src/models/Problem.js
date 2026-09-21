import mongoose from 'mongoose'
const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,immutable:true},periodId:{type:mongoose.Schema.Types.ObjectId,ref:'Period',required:true,index:true},
  problem:{type:String,required:true,trim:true,maxlength:4000},
  state:{type:String,enum:['Open','Resolved'],default:'Open'},
  openedAt:{type:Date,default:Date.now},
  resolvedAt:{type:Date,default:null},
  history:[{state:{type:String,enum:['Open','Resolved']},changedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},at:Date}],
  updates:[{text:{type:String,required:true,trim:true,maxlength:4000},by:{type:mongoose.Schema.Types.ObjectId,ref:'User'},at:{type:Date,default:Date.now}}],
},{timestamps:true})
schema.index({createdAt:-1})
export default mongoose.model('Problem',schema)
