import { can } from '../lib/permissions.js'
import mongoose from 'mongoose'
import { states, paymentMethods } from '../lib/gameTracker.js'
const photo = new mongoose.Schema({ name: {type:String,required:true}, mime: {type:String,enum:['image/png','image/jpeg'],required:true}, publicId:String, resourceType:String, data: {type:Buffer,select:false} }, {_id:false})
const schema = new mongoose.Schema({
  periodId: {type:mongoose.Schema.Types.ObjectId,ref:'Period',required:true,index:true},
  date: {type:String,required:true},
  user: {type:String,required:true,maxlength:120},
  email: {type:String,required:true,maxlength:254},
  product: {type:String,required:true,maxlength:200},
  costMinor: {type:Number,required:true,min:0,max:100000000000,validate:Number.isSafeInteger},
  priceMinor: {type:Number,required:true,min:0,max:100000000000,validate:Number.isSafeInteger},
  state: {type:String,enum:states,required:true},
  website: {type:String,required:true,maxlength:500},
  paymentMethod: {type:String,enum:paymentMethods,required:true},
  purchaseProof: {type:photo,default:null},
  customerPaymentMethod: {type:String,enum:[...paymentMethods,null],default:null},
  transferredToCompany: {type:Boolean,default:false},
  photoForPayment: {type:photo,default:null},
  photoFromUs: {type:photo,default:null},
  createdBy: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  created_at: {type:Date,default:Date.now,immutable:true},
}, {versionKey:false,strict:'throw'})
schema.index({created_at:-1,_id:-1})
schema.index({date:1,state:1,paymentMethod:1})
const adminMutation = Symbol('adminMutation')
const immutableError = () => Object.assign(new Error('Game Tracker records are append-only'),{status:405})
schema.pre('save', function() { if (!this.isNew) throw immutableError() })
for (const operation of ['updateOne','updateMany','findOneAndUpdate','replaceOne','findOneAndReplace','deleteOne','deleteMany','findOneAndDelete']) {
  schema.pre(operation, {query:true,document:false}, function() { if (!this[adminMutation]) throw immutableError() })
}
schema.pre('deleteOne', {document:true,query:false}, function() { throw immutableError() })
const GameTrackerRecord = mongoose.model('GameTrackerRecord',schema)
// Prevent bulk writes from bypassing document/query middleware through this model.
GameTrackerRecord.bulkWrite = async function() { throw immutableError() }
// Only these narrowly scoped operations can opt out of the default write lock.
GameTrackerRecord.adminUpdate = async function(actor, id, fields) {
  if (!can(actor, 'game-tracker', 'write')) throw Object.assign(new Error('Admin required'), {status:403})
  const query = this.findOneAndUpdate({_id:id}, {$set:fields}, {new:true,runValidators:true})
  query[adminMutation] = true
  return query.exec()
}
GameTrackerRecord.adminDelete = async function(actor, id) {
  if (!can(actor, 'game-tracker', 'write')) throw Object.assign(new Error('Admin required'), {status:403})
  const query = this.findOneAndDelete({_id:id})
  query[adminMutation] = true
  return query.exec()
}
export default GameTrackerRecord
