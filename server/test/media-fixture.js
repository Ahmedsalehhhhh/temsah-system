import {v2 as cloudinary} from 'cloudinary'
import {Writable} from 'node:stream'
import assert from 'node:assert/strict'
export function mockMedia(t){
 for(const key of ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET']){const previous=process.env[key];process.env[key]='local-fixture';t.after(()=>previous===undefined?delete process.env[key]:process.env[key]=previous)}
 const files=new Map();const originalFetch=globalThis.fetch
 t.mock.method(cloudinary.uploader,'upload_stream',(options,callback)=>{assert.equal(options.type,'authenticated');assert.equal(options.resource_type,'raw');const chunks=[];return new Writable({write(chunk,encoding,next){chunks.push(chunk);next()},final(next){const public_id='test-'+files.size;files.set(public_id,Buffer.concat(chunks));callback(null,{public_id});next()}})})
 t.mock.method(cloudinary.utils,'private_download_url',(id,format,options)=>{assert.equal(options.type,'authenticated');assert.ok(options.expires_at>Date.now()/1000);return 'https://media.test/'+id})
 t.mock.method(globalThis,'fetch',(url,options)=>String(url).startsWith('https://media.test/')?Promise.resolve(new Response(files.get(String(url).split('/').pop()))):originalFetch(url,options))
}
