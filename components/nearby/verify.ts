import assert from 'node:assert/strict';
import {allMerchants,defaultConfig,newStop,calculate} from '../../data/planning';
import {tiers,eligible,claimOffer,redeem,expire,countdown,bestOffer} from './subsidy';
import {distanceTier,randomAmount,routeCandidates,alongEligible} from './commute';
for(const [walk,amount,minutes] of [[0,2,30],[10,2,30],[10.01,6,60],[20,6,60],[20.01,8,120]]){assert.equal(distanceTier({walk})?.amount,amount);assert.equal(distanceTier({walk})?.minutes,minutes)}assert.equal(distanceTier({walk:NaN}),null);
const m=allMerchants[1],now=10000000,c=claimOffer([],m,30,now);assert.equal(c.subsidyAmount,2);assert.equal(c.expiresAt-now,1800000);assert.equal(claimOffer([c],m,30,now).claimId,c.claimId);assert.equal(countdown(c,now),'30:00');assert.equal(countdown(JSON.parse(JSON.stringify(c)),now+60000),'29:00');assert.equal(expire(c,c.expiresAt).status,'expired');
assert(eligible(m,120));assert.equal(redeem({...c,status:'purchased',orderId:'o'},m,'o',now).confirmedAmount,2);assert.equal(redeem({...c,status:'purchased',orderId:'o'},m,'o',c.expiresAt).status,'expired');
for(const merchant of allMerchants){const a=randomAmount(merchant.id,'session-fixed');assert(a>=2&&a<=5);assert.equal(a,randomAmount(merchant.id,'session-fixed'))}
const context={sessionId:'session-fixed',merchantIds:[m.id]};const best=bestOffer(m,[c],now,context)!;assert.equal(best.amount,Math.max(2,randomAmount(m.id,context.sessionId)));assert.equal(bestOffer(m,[],now)?.amount,undefined);assert.equal(bestOffer(m,[],now,{...context,merchantIds:[]}),null);
const c2={...c,subsidyAmount:8};assert.equal(bestOffer(m,[c2],now,context)?.kind,'commute');assert.equal(bestOffer(m,[c],now,context)?.kind,best.amount>2?'along':'commute');
const along={...c,kind:'along' as const,tierMinutes:0,expiresAt:Number.MAX_SAFE_INTEGER,status:'purchased' as const,orderId:'a',subsidyAmount:randomAmount(m.id,'s')};const success=redeem(along,m,'a',now);assert.equal(success.status,'redeemed');assert.equal(redeem(success,m,'a',now+1000).confirmedAmount,success.confirmedAmount);
const config={...defaultConfig,limit:180,budget:500,departure:'18:00'};const stops=[newStop(m.category,m)];const candidates=routeCandidates(stops,config);assert(candidates.length);assert(candidates.every(c=>c.merchant.id!==m.id&&c.delta===c.next.total-calculate(stops,config).total));assert(candidates.every(c=>c.deviation<=450));assert(candidates.some(c=>alongEligible(c.merchant)));
console.log('PASS V3.3：10/20分钟边界、无效步行数据、距离档位、绝对截止、领取核销幂等、会话伪随机稳定、仅加入路线有资格、择高不叠加、沿线筛选与额外耗时重算。');
