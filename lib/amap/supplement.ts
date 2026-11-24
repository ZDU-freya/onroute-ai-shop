import {Coordinate,queryRoute} from './client';
import {Place,Offer,Trip,Along,normalize,places,limited,trip,tierOf,merchant,types} from './real';
import {eligible} from '../../components/nearby/subsidy';
export type OfferRecords=Record<string,{place:Place;offer:Offer}>;
export type RouteDiscovery=Along & {kind:'along'|'hot';reason:string};
export const MARKER_MAX_EXTRA_MINUTES=10;
const detailsCache=new Map<string,{time:number;place:Place}>();
export async function poiDetails(A:any,id:string,city:string):Promise<Place>{
 const cached=detailsCache.get(id);if(cached&&Date.now()-cached.time<300000)return cached.place;
 const place=await new Promise<Place>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('商家资料查询超时')),15000);new A.PlaceSearch({city,extensions:'all'}).getDetails(id,(status:string,result:any)=>{clearTimeout(timer);if(status!=='complete'){reject(new Error('该高德 POI 不存在或暂不可用：'+(result?.info||status)));return}const raw=result.poiList?.pois?.find((p:any)=>p.id===id);const normalized=raw?normalize(raw,city):null;if(!normalized){reject(new Error('未获得匹配 POI ID 的真实商家资料'));return}resolve(normalized)})});
 detailsCache.set(id,{time:Date.now(),place});return place;
}
export function isDemoHot(offer:Offer|undefined,now:number){return !!offer?.hotSale&&offer.expiresAt>now&&!!offer.productName?.trim()}
export function distanceToRoute(point:Coordinate,path:Coordinate[]):number{
 if(!path.length)return Infinity;const scaleX=111320*Math.cos(point[1]*Math.PI/180),scaleY=110540;let nearest=Infinity;
 for(let i=1;i<path.length;i++){const ax=(path[i-1][0]-point[0])*scaleX,ay=(path[i-1][1]-point[1])*scaleY,bx=(path[i][0]-point[0])*scaleX,by=(path[i][1]-point[1])*scaleY;const dx=bx-ax,dy=by-ay;const t=dx*dx+dy*dy?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy))):0;nearest=Math.min(nearest,Math.hypot(ax+t*dx,ay+t*dy))}return nearest;
}
export function routeSamples(path:Coordinate[],count=3):Coordinate[]{
 if(!path.length)return [];if(path.length===1)return [path[0]];const lengths=path.slice(1).map((p,i)=>Math.hypot((p[0]-path[i][0])*Math.cos(p[1]*Math.PI/180),p[1]-path[i][1]));const total=lengths.reduce((a,b)=>a+b,0);if(!total)return [path[0]];const samples:Coordinate[]=[];for(let n=1;n<=count;n++){let remaining=total*n/(count+1);for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=lengths[i]?remaining/lengths[i]:0;samples.push([path[i][0]+(path[i+1][0]-path[i][0])*t,path[i][1]+(path[i+1][1]-path[i][1])*t]);break}remaining-=lengths[i]}}return samples;
}
export function uniquePlaces(points:Place[],excluded:string[]){return Array.from(new Map(points.filter(p=>!p.closed&&!excluded.includes(p.id)).map(p=>[p.id,p])).values())}
export async function applicableOffers(A:any,origin:Place,tier:number,records:OfferRecords,now:number,cancelled:()=>boolean=()=>false){
 const configs=Object.entries(records).filter(([,r])=>r.offer.commute&&r.offer.expiresAt>now);const result=await limited(configs,async([id,r])=>{if(cancelled())throw Error('已取消');const p=await poiDetails(A,id,origin.city);if(cancelled())throw Error('已取消');const walking=await queryRoute(A,origin.location,p.location,'walking',origin.city,p.city);const place={...p,walkSeconds:walking.time};if(tierOf(place)?.minutes!==tier||eligible(merchant(place,r.offer),tier))return null;return place});return {places:result.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]),failed:result.filter(r=>r.status==='rejected').length};
}
export async function discoverRoute(A:any,options:{origin:Place;home:Place;stops:Place[];route:Trip;transport:'walking'|'transit'|'driving';records:OfferRecords;now:number;reusable:Along[];maxExtra?:number;cancelled:()=>boolean}){
 const {origin,home,stops,route,transport,records,now,reusable,cancelled}=options;const maxExtra=options.maxExtra??MARKER_MAX_EXTRA_MINUTES;const path=route.legs.flatMap(l=>l.path);const samples=routeSamples(path,2);const groups=await limited(samples,p=>{if(cancelled())throw Error('已取消');return places(A,origin.city,'',p,450,types['全部'],6)});
 if(cancelled())return [];
 const configured=Object.values(records).filter(r=>isDemoHot(r.offer,now)).map(r=>r.place);const raw=uniquePlaces([...configured,...reusable.map(c=>c.place),...groups.flatMap(g=>g.status==='fulfilled'?g.value:[])],[origin.id,home.id,...stops.map(p=>p.id)]).filter(p=>distanceToRoute(p.location,path)<=450).sort((a,b)=>Number(isDemoHot(records[b.id]?.offer,now))-Number(isDemoHot(records[a.id]?.offer,now))||distanceToRoute(a.location,path)-distanceToRoute(b.location,path)).slice(0,6);
 const results=await limited(raw,async p=>{if(cancelled())throw Error('已取消');let c=reusable.find(c=>c.place.id===p.id);if(!c){const real=await poiDetails(A,p.id,origin.city);if(cancelled())throw Error('已取消');const walking=await queryRoute(A,origin.location,real.location,'walking',origin.city,real.city);const place={...real,walkSeconds:walking.time};const next=await trip(A,origin,[...stops,place],home,transport);c={place,trip:next,delta:(next.time-route.time)/60,stay:5}}if(c.delta>maxExtra)return null;const hot=isDemoHot(records[p.id]?.offer,now);return {...c,kind:hot?'hot':'along',reason:hot?'关联本机演示热卖商品；高德已校验绕路时间':'靠近当前真实路线，高德已校验额外交通耗时'} as RouteDiscovery});
 return results.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]).sort((a,b)=>a.delta-b.delta);
}
