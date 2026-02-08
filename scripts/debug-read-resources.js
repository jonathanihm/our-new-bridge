const fs = require('fs')
const path = require('path')

const cfgPath = path.join(process.cwd(),'config','cities','des-moines.json')
const cfg = JSON.parse(fs.readFileSync(cfgPath,'utf8'))
console.log('config.slug=', cfg.slug)
const resourcePath = path.join(process.cwd(),'data', cfg.slug, 'resources.json')
console.log('resourcePath=', resourcePath)
try{
  const data = JSON.parse(fs.readFileSync(resourcePath,'utf8'))
  console.log('has food?', Array.isArray(data.food), 'food length=', data.food?.length)
}catch(e){
  console.error('read error', e)
}
