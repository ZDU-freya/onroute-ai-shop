import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {claimOffer} from '../../components/nearby/subsidy';
import {Place,Offer,Trip} from './real';
import {applicableOffers,discoverRoute,distanceToRoute,isDemoHot,routeSamples,uniquePlaces} from './supplement';
async function main(){
 const now=Date.now(),offer:Offer={commute:true,along:true,price:29,expiresAt:now+3600000,sponsored:false,hotSale:true,productName:'本地演示体验券'};
 assert(isDemoHot(offer,now));assert(!isDemoHot({...offer,expiresAt:now},now));assert(!isDemoHot({...offer,productName:''},now));assert(!isDemoHot(undefined,now));
 assert(distanceToRoute([120.005,30],[[120,30],[120.01,30]])<0.001);assert(distanceToRoute([120.005,30.02],[[120,30],[120.01,30]])>450);assert.equal(distanceToRoute([120,30],[]),Infinity);
 assert.deepEqual(routeSamples([[120,30],[120.01,30]],1),[[120.005,30]]);
 const make=(id:string,x:number,y=30):Place=>({id,name:id,address:'真实资料测试地址',city:'杭州',type:'餐饮服务;咖啡厅',closed:false,location:[x,y]});
 const origin=make('origin',121,31),p=make('valid',121.005,31),wrong=make('missing',121.002,31);
 assert.deepEqual(uniquePlaces([p,p,wrong,{...wrong,id:'closed',closed:true}],['missing']).map(p=>p.id),['valid']);
 class Details{getDetails(id:string,cb:any){cb(id==='missing'?'no_data':'complete',{poiList:{pois:id==='missing'?[]:[{...p,id,location:{lng:p.location[0],lat:p.location[1]}}]}})}}
 class Walking{search(from:any,to:any,cb:any){cb('complete',{routes:[{time:600,distance:800,steps:[{path:[from,to]}]}]})}}
 assert.throws(()=>claimOffer([],require('./real').merchant({...p,walkSeconds:300},{...offer,expiresAt:now}),30,now),/活动已结束/);
 const checked=await applicableOffers({PlaceSearch:Details,Walking},origin,30,{valid:{place:{...p,name:'旧名称',location:[135,40]},offer},missing:{place:wrong,offer}},now);
 assert.equal(checked.places.length,1);assert.equal(checked.places[0].name,'valid');assert.equal(checked.places[0].walkSeconds,600);assert.equal(checked.failed,1);
 assert.equal((await applicableOffers({PlaceSearch:Details,Walking},origin,60,{valid:{place:p,offer}},now)).places.length,0);
 assert.equal((await applicableOffers({PlaceSearch:Details,Walking},origin,30,{valid:{place:p,offer:{...offer,expiresAt:now}}},now)).places.length,0);
 const start=make('route-origin',120),stop=make('main',120.002),home=make('home',120.01),hot=make('hot',120.005),normal=make('normal',120.006),far=make('far',120.005,30.02);
 const provider={hot,normal,far} as Record<string,Place>;
 class Search{searchNearBy(q:any,c:any,r:any,cb:any){cb('complete',{poiList:{pois:[hot,hot,normal,far].map(p=>({...p,location:{lng:p.location[0],lat:p.location[1]}}))}})}getDetails(id:string,cb:any){const p=provider[id];cb('complete',{poiList:{pois:p?[{...p,location:{lng:p.location[0],lat:p.location[1]}}]:[]}})}}
 class RouteWalking{search(from:any,to:any,cb:any){const time=from[0]===start.location[0]&&to[0]===stop.location[0]?300:350;cb('complete',{routes:[{time,distance:500,steps:[{path:[from,to]}]}]})}}
 const current:Trip={time:1000,distance:1000,legs:[{path:[start.location,stop.location,home.location],time:1000,distance:1000}]};
 const discoveries=await discoverRoute({PlaceSearch:Search,Walking:RouteWalking},{origin:start,home,stops:[stop],route:current,transport:'walking',records:{hot:{place:hot,offer}},now,reusable:[],cancelled:()=>false});
 assert.equal(discoveries.length,2);assert.equal(discoveries.find(c=>c.place.id==='hot')?.kind,'hot');assert.equal(discoveries.find(c=>c.place.id==='normal')?.kind,'along');assert(!discoveries.some(c=>c.place.id==='far'));assert.equal(new Set(discoveries.map(c=>c.place.id)).size,discoveries.length);
 assert((await discoverRoute({PlaceSearch:Search,Walking:RouteWalking},{origin:start,home,stops:[stop,hot],route:current,transport:'walking',records:{hot:{place:hot,offer}},now,reusable:[],cancelled:()=>false})).every(c=>c.place.id!=='hot'));
 const filtered=await discoverRoute({PlaceSearch:Search,Walking:RouteWalking},{origin:start,home,stops:[stop],route:current,transport:'walking',records:{hot:{place:hot,offer}},now,reusable:[{place:hot,trip:current,delta:11,stay:5}],cancelled:()=>false});assert(!filtered.some(c=>c.place.id==='hot'));
 const cancelled=await discoverRoute({PlaceSearch:Search,Walking:RouteWalking},{origin:start,home,stops:[stop],route:current,transport:'walking',records:{},now,reusable:[],cancelled:()=>true});assert.deepEqual(cancelled,[]);
 console.log('PASS 地图增量：真实 POI ID 再核实、档位/活动失效过滤、部分服务失败、沿线采样与空间预筛、真实分段耗时校验、演示热卖来源、去重及已加入站点排除。');
 const source=readFileSync('components/real-map/RealCommute.tsx','utf8');
 const locked=JSON.parse(readFileSync('components/real-map/protected-v34.json','utf8'));
 for(const block of locked.blocks){const part=source.slice(source.indexOf(block.start),source.indexOf(block.end,source.indexOf(block.start)));assert.equal(createHash('sha256').update(part).digest('hex'),block.hash,block.name+' changed')}
 assert.equal(createHash('sha256').update(readFileSync('components/real-map/real-map.css')).digest('hex'),locked.stylesheetHash);
 console.log('PASS 保护约束：原「顺路买点什么」完整 JSX、原推荐筛选管线、三张精选卡 JSX、原样式文件与修改前一致。');
}
main().catch(e=>{console.error(e);process.exitCode=1});
