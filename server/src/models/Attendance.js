import mongoose from 'mongoose'
export const workUpdateSchema = new mongoose.Schema({text:{type:String,required:true,maxlength:4000},status:{type:String,enum:['Completed','In Progress','Blocked'],required:true},createdAt:{type:Date,required:true},checkout:{type:Boolean,default:false}}, {_id:true})
// Embed audits with attendance so the correction and its audit are one atomic write.
export const attendanceAuditSchema = new mongoose.Schema({changedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},changedByName:{type:String,required:true},changedAt:{type:Date,required:true},reason:{type:String,required:true,maxlength:1000},oldValue:{checkIn:Date,checkOut:Date},newValue:{checkIn:Date,checkOut:Date}}, {_id:true})
const schema=new mongoose.Schema({
 userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},periodId:{type:mongoose.Schema.Types.ObjectId,ref:'Period',required:true,index:true},
 workDate:{type:String,required:true},sessionNumber:{type:Number,required:true,min:1,max:2,default:1},checkIn:{type:Date,required:true},checkOut:{type:Date,default:null},isOpen:{type:Boolean,required:true,default:true},hasPriorReport:{type:Boolean,default:false},
 updates:{type:[workUpdateSchema],default:[]},audits:{type:[attendanceAuditSchema],default:[]}
},{timestamps:true,strict:'throw'})
schema.index({userId:1,workDate:1,sessionNumber:1},{unique:true})
schema.index({userId:1},{unique:true,partialFilterExpression:{isOpen:true}})
schema.index({workDate:-1,userId:1})
export default mongoose.model('Attendance',schema)
