import {Merchant} from '../../data/merchants';
import {Coordinate} from './client';
import {Place,Trip} from './real';
import {RouteDiscovery,routeSamples} from './supplement';

// Fixed expiry: refreshing or reopening a drawer never restarts an activity.
export const DEMO_EXPIRES_AT=Date.parse('2027-12-31T15:59:59Z');
const categories=['咖啡','烘焙','便利店','餐饮'];
export const demoCouponMerchants:Merchant[]=[30,60,120].flatMap((tier,g)=>[0,1,2,3].map(i=>{
 const id=900001+g*100+i*4,walk=[[4,6,8,10],[12,14,17,20],[23,26,30,35]][g][i];
 const name=['顺途咖啡','麦香工坊','邻里便利','暖心小馆'][i]+' · '+['近程','中程','远程'][g]+'演示店';
 return {id,name,category:categories[i],image:'/poi-category.svg',x:0,y:0,address:`演示商圈 ${String.fromCharCode(65+g)} · ${i+1}号演示位置（无真实坐标）`,rating:0,package:categories[i]+'演示体验套餐',original:49+i*5,price:19+i*5,previous:null,discount:true,open:true,hours:'仅供演示',favorite:false,views:0,frequent:false,todayFavorite:false,walk,walk10:walk<=10,walk20:walk<=20,transit20:false,routeId:'demo-coupon-'+id,sponsored:false,platformOffer:{productName:categories[i]+'演示体验套餐',originalPrice:49+i*5,price:19+i*5,commute:true,along:false,sponsored:false,expiresAt:DEMO_EXPIRES_AT,rules:'演示数据，无真实交易；按标注的模拟步行时间分档，领取后计时，核销后确认返还，每订单一种补贴。'},transit:{access:0,wait:0,ride:0,exit:0,transfers:0,home:0,homeTransfers:0,extra:0}};
}));
export function couponDemos(tier:number){return demoCouponMerchants.filter(m=>(m.walk<=10?30:m.walk<=20?60:120)===tier)}
export type DemoRouteMarker={demo:{product:string;price:number;category:string};place:Place;kind:'along'|'hot';reason:string;delta?:never;trip?:never;stay?:never};
export type MapDiscovery=(RouteDiscovery&{demo?:undefined})|DemoRouteMarker;
export const isDemoPlace=(p:Place)=>p.id.startsWith('demo:route:');
function meters(a:Coordinate,b:Coordinate){return Math.hypot((a[0]-b[0])*111320*Math.cos(a[1]*Math.PI/180),(a[1]-b[1])*110540)}
export function completeRouteMarkers(real:RouteDiscovery[],route:Trip,excluded:string[],city:string):{items:MapDiscovery[];unavailable:boolean}{
 const path=route.legs.flatMap(l=>l.path);
 const valid=path.length>1&&path.every(p=>p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90);
 const unique=[...new Map(real.filter(r=>!excluded.includes(r.place.id)).map(r=>[r.place.id,r])).values()];
 const items:MapDiscovery[]=['along','hot'].flatMap(kind=>unique.filter(r=>r.kind===kind).slice(0,3));
 if(items.length===6)return {items,unavailable:false};
 const samples=valid?routeSamples(path,6):[];
 // Positions are deterministic samples ON the verified route, never random nearby coordinates.
 if(samples.length!==6||samples.some((p,i)=>samples.slice(0,i).some(q=>meters(p,q)<24)))return {items,unavailable:true};
 for(const kind of ['along','hot'] as const){const existing=items.filter(r=>r.kind===kind).length;for(let i=existing;i<3;i++){
  const index=(kind==='hot'?3:0)+i,category=['咖啡','烘焙','便利店','餐饮','奶茶','水果'][index];
  items.push({kind,demo:{category,product:category+'演示体验套餐',price:19+index*3},place:{id:`demo:route:${kind}:${i}`,name:`${category}${kind==='hot'?'热卖':'顺路'}演示店 ${i+1}`,type:category,address:'沿当前真实路线的演示位置；不是高德 POI，无真实商家或交易',city,closed:false,location:samples[index]},reason:'演示商家 · 演示位置；不参与真实路线计算，关联并核实高德 POI 后才可加入路线'});
 }}
 return {items,unavailable:false};
}
