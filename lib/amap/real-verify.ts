import assert from 'node:assert/strict';
import { Place, tierOf, reachable, limited, merchant, numericId, validCoordinates, trip } from './real';
import { eligible, claimOffer, expire, bestOffer } from '../../components/nearby/subsidy';
import { alongEligible, randomAmount } from '../../components/nearby/commute';
async function main(){
const p:Place={id:'verified-poi-test',name:'验证地点',address:'验证地址',location:[120.155,30.274],city:'杭州',type:'餐饮服务;咖啡厅',closed:false,walkSeconds:600};
for(const [seconds,amount] of [[0,2],[600,2],[601,6],[1200,6],[1201,8]])assert.equal(tierOf({...p,walkSeconds:seconds})?.amount,amount);
assert.equal(tierOf({...p,walkSeconds:undefined}),null);
assert.equal(reachable({...p,walkSeconds:601},'walk10'),false);
assert.equal(reachable({...p,walkSeconds:1201,transitSeconds:1199},'transit'),true);
assert.equal(tierOf({...p,walkSeconds:1201,transitSeconds:1199})?.amount,8);
assert.equal(reachable({...p,transitSeconds:undefined},'transit'),false);
assert.equal(validCoordinates([NaN,30]),false);
assert.equal(numericId(p.id),numericId(p.id));assert(numericId(p.id)<0);
const noOffer=merchant(p);assert(eligible(noOffer,30));assert.equal(alongEligible(noOffer),false);assert.equal(bestOffer(noOffer,[],Date.now(),{sessionId:'s',merchantIds:[noOffer.id]}),null);
const configured=merchant(p,{commute:true,along:true,price:29,expiresAt:Date.now()+3600000,sponsored:false});assert.equal(eligible(configured,30),'');assert(eligible(configured,60));assert(alongEligible(configured));
const now=Date.now(),c=claimOffer([],configured,30,now);assert.equal(c.subsidyAmount,2);assert.equal(c.expiresAt,now+1800000);assert.equal(expire(JSON.parse(JSON.stringify(c)),now+1800000).status,'expired');assert.equal(randomAmount(configured.id,'stable'),randomAmount(configured.id,'stable'));
assert.equal(bestOffer(configured,[c],now,{sessionId:'stable',merchantIds:[]})?.kind,'commute');
let running=0,max=0;const results=await limited([1,2,3,4,5],async n=>{running++;max=Math.max(max,running);await new Promise(r=>setTimeout(r,5));running--;if(n===3)throw Error('provider failure');return n*2});assert.equal(max,2);assert.equal(results[2].status,'rejected');assert.deepEqual(results.filter(r=>r.status==='fulfilled').map(r=>r.value),[2,4,8,10]);
const calls:any[]=[];class Walking{search(from:any,to:any,cb:any){calls.push([from,to]);cb('complete',{routes:[{time:123,distance:250,steps:[{path:[from,to]}]}]})}}
const end={...p,id:'end',location:[120.165,30.284] as [number,number]},stop={...p,id:'stop',location:[120.16,30.28] as [number,number]};
const result=await trip({Walking},p,[stop],end,'walking');assert.equal(calls.length,2);assert.equal(result.time,246);assert.equal(result.distance,500);assert.deepEqual(result.legs[0].path,[p.location,stop.location]);
console.log('PASS V3.4：真实耗时边界、公交与步行档位独立、POI ID 稳定关联、未配置商家无补贴、领取时限恢复、择高不叠加、并发上限与部分失败、分段路线几何和时间汇总。');

}
main().catch(error=>{console.error(error);process.exitCode=1});
