import assert from 'node:assert/strict';
import {couponDemos,demoCouponMerchants,completeRouteMarkers} from './demo';
import {Trip} from './real';
import {eligible,claimOffer} from '../../components/nearby/subsidy';
for(const tier of [30,60,120]){
 const rows=couponDemos(tier);assert.equal(rows.length,4);
 for(const m of rows){assert(!m.poi,'Coupon demos must never pretend to be verified POIs');assert.equal(eligible(m,tier),'');const now=Date.now(),claim=claimOffer([],m,tier,now);assert.equal(claim.subsidyAmount,tier===30?2:tier===60?6:8);assert.equal(claim.expiresAt,now+tier*60000);assert.equal(m.walk<=10?30:m.walk<=20?60:120,tier)}
}
assert.equal(new Set(demoCouponMerchants.map(m=>m.id)).size,12);
const route:Trip={time:900,distance:1200,legs:[{path:[[120.15,30.27],[120.16,30.275],[120.17,30.28]],time:900,distance:1200}]};
const before=JSON.stringify(route),result=completeRouteMarkers([],route,[],'杭州');assert(!result.unavailable);assert.equal(result.items.filter(r=>r.kind==='along').length,3);assert.equal(result.items.filter(r=>r.kind==='hot').length,3);assert.equal(new Set(result.items.map(r=>r.place.id)).size,6);
for(const m of result.items){assert(m.demo);assert.equal(m.trip,undefined);assert.equal(m.delta,undefined);assert.match(m.place.address,/演示位置/);assert(m.place.id.startsWith('demo:route:'))}
assert.equal(JSON.stringify(route),before,'Demo markers must not modify real route geometry or timings');assert.deepEqual(completeRouteMarkers([],route,[],'杭州'),result);
for(const path of [[],[[120,30]],[[120,30],[120.00001,30]],[[NaN,30],[120,30]]] as [number,number][][]){const output=completeRouteMarkers([],{...route,legs:[{path,time:1,distance:1}]},[],'杭州');assert(output.unavailable);assert.equal(output.items.length,0)}
const real={place:{...result.items[0].place,id:'real-poi'},trip:route,delta:1,stay:5,kind:'along' as const,reason:'已核实'};
const mixed=completeRouteMarkers([real,real],route,[],'杭州');assert.equal(mixed.items.length,6);assert.equal(mixed.items.filter(m=>m.kind==='along').length,3);assert.equal(mixed.items.filter(m=>m.kind==='hot').length,3);assert.equal(mixed.items.filter(m=>m.place.id==='real-poi').length,1);assert(!mixed.items.find(m=>m.place.id==='real-poi')?.demo);
assert(!completeRouteMarkers([real],route,['real-poi'],'杭州').items.some(m=>m.place.id==='real-poi'));
console.log('PASS 移动端演示：三档各4家、独立ID、原领取时限；3+3互斥标记、真实POI优先、无伪造路线/耗时、短路线不可用、几何不变。');
