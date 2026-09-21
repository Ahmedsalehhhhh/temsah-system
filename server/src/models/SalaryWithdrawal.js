import mongoose from 'mongoose'
const schema=new mongoose.Schema({
 period:{type:mongoose.Schema.Types.ObjectId,ref:'Period',required:true},
 source:{type:String,required:true},name:String,
 amountMinor:{type:Number,required:true,min:1},note:{type:String,maxlength:500,default:''},
 requestId:{type:String,required:true},createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 voidedAt:Date,voidedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});schema.index({period:1,requestId:1},{unique:true});schema.index({period:1,source:1});
export default mongoose.model('SalaryWithdrawal',schema)
