import User from '../models/User.js'
export async function personInput(body){
 if(body.userId){const user=await User.findOne({_id:body.userId,status:{$ne:'INACTIVE'}}).select('name fullName email role');if(!user)throw Object.assign(new Error('اختر موظفًا نشطًا'),{status:400});return {name:user.fullName||user.name,userId:user._id,email:user.email,role:user.role}}
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>200)throw Object.assign(new Error('اسم الشخص مطلوب'),{status:400});return {name:body.name.trim(),email:'',userId:null,role:''}
}
export async function identities(req,res,next){try{res.json(await User.find({status:{$ne:'INACTIVE'}}).select('name fullName email role').sort({name:1}))}catch(e){next(e)}}