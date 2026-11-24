'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Merchant} from '../../data/merchants';
import {Place,categoryLabel,minutes,merchant} from '../../lib/amap/real';
import {OfferRecords,applicableOffers} from '../../lib/amap/supplement';
import {couponDemos,DEMO_EXPIRES_AT} from '../../lib/amap/demo';
import {eligible,countdown,statusNames} from '../nearby/subsidy';
import {SubsidyController} from '../nearby/useSubsidy';
import MerchantLinkDetails from './MerchantLinkDetails';

type Row={id:string;m:Merchant;place?:Place;demo:boolean};
export default function SubsidyMerchants({A,origin,tier,records,controller:s,onClose,onSelect,onFavorite,onRegister,favorites,onJoin}:{A:any;origin:Place|null;tier:number;records:OfferRecords;controller:SubsidyController;onClose:()=>void;onSelect:(p:Place)=>void;onFavorite:(m:Merchant)=>void;onRegister:(ms:Merchant[])=>void;favorites:number[];onJoin:(p:Place)=>void}){
 const [items,Items]=useState<Place[]>([]),[loading,Loading]=useState(false),[error,E]=useState(''),[retry,R]=useState(0),[selected,Selected]=useState<string|null>(null),[notice,Notice]=useState('');
 const serial=useRef(0),pane=useRef<HTMLDivElement>(null),scroll=useRef(0),instance=useRef(''),rows=useRef(new Map<string,Row>()),close=useRef(onClose);close.current=onClose;const key=JSON.stringify(records);
 useEffect(()=>{const saved=history.state?.onrouteCoupon;instance.current=saved?.tier===tier?saved.session:crypto.randomUUID();if(saved?.session===instance.current)Selected(saved.detailId||null);else history.pushState({...history.state,onrouteCoupon:{tier,session:instance.current,detailId:null}},'',`#commute-coupon-${tier}`);const pop=(event:PopStateEvent)=>{const state=event.state?.onrouteCoupon;if(state?.session===instance.current)Selected(state.detailId||null);else close.current()};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)},[tier]);
 useEffect(()=>{onRegister(couponDemos(tier))},[tier]);
 useLayoutEffect(()=>{if(!selected&&pane.current)pane.current.scrollTop=scroll.current},[selected]);
 useEffect(()=>{const id=++serial.current;let disposed=false;Items([]);E('');if(!A||!origin){Loading(false);return}Loading(true);applicableOffers(A,origin,tier,records,s.time(),()=>disposed||id!==serial.current).then(r=>{if(disposed||id!==serial.current)return;Items(r.places);if(r.failed)E(`${r.failed} 家真实商家的 POI 或道路耗时暂未核实，未列为适用商家。`)}).catch(e=>{if(!disposed&&id===serial.current)E(e.message)}).finally(()=>{if(!disposed&&id===serial.current)Loading(false)});return()=>{disposed=true;serial.current++}},[A,origin,tier,key,retry]);
 const amount=tier===30?2:tier===60?6:8,available=items.filter(p=>records[p.id]?.offer.expiresAt>s.now&&!eligible(merchant(p,records[p.id]?.offer),tier));
 const realRows:Row[]=available.map(p=>({id:p.id,m:merchant(p,records[p.id].offer),place:p,demo:false}));
 const demoRows:Row[]=couponDemos(tier).map(m=>({id:'coupon-demo-'+m.id,m,demo:true}));
 [...realRows,...demoRows].forEach(r=>rows.current.set(r.id,r));const detail=selected?rows.current.get(selected):undefined;
 function back(){Notice('');if(history.state?.onrouteCoupon?.session===instance.current)history.back();else if(selected)Selected(null);else close.current()}
 function exit(action:()=>void){window.addEventListener('popstate',action,{once:true});history.go(selected?-2:-1)}
 function select(row:Row){scroll.current=pane.current?.scrollTop||0;Selected(row.id);Notice('');history.pushState({...history.state,onrouteCoupon:{tier,session:instance.current,detailId:row.id}},'',`#commute-coupon-${tier}-${encodeURIComponent(row.id)}`)}
 const claimFor=(m:Merchant)=>[...s.claims].reverse().find(c=>c.merchantId===m.id&&c.kind!=='along'&&c.status!=='cancelled');
 function card(row:Row){const {m,demo}=row,claim=claimFor(m);return <article className="rm-applicable-card" key={row.id} data-demo={demo||undefined}><img src={m.image} alt="商家品类示意，非实拍"/><button onClick={()=>select(row)}><b>{m.name}</b><small>{demo?'演示数据 · 虚拟商家':categoryLabel(row.place!)} · {m.category}</small><span>{m.address}</span><em>{demo?'模拟步行':'高德步行'}约 {Math.ceil(m.walk)} 分钟 · 通勤补 ¥{amount}</em><span>{m.package} · 演示团购 ¥{m.price}</span>{claim&&<span>{statusNames[claim.status]}{['claimed','purchased','failed'].includes(claim.status)?' · '+countdown(claim,s.now):''}</span>}</button><button onClick={()=>select(row)}>查看详情</button></article>}
 return <div className="rm-backdrop rm-applicable-backdrop" onClick={back}><section className="rm-dialog rm-applicable-dialog" role="dialog" aria-modal="true" aria-label={detail?'通勤补贴商家详情':'¥'+amount+'通勤补贴适用商家'} onClick={e=>e.stopPropagation()}>
 <div className="rm-coupon-header"><button onClick={back} aria-label={selected?'返回适用商家列表':'返回地图'}>{selected?'返回适用商家列表':'返回地图'}</button><span>¥{amount} 通勤补贴</span></div>
 <div className="rm-coupon-list-scroll" ref={pane} hidden={!!selected} data-tier={tier}><small>真实 POI 优惠与虚拟演示商家分别标注</small><h2>¥{amount} 通勤补贴 · 适用商家</h2><p>{tier===30?'步行 0–10 分钟':tier===60?'步行大于 10 至 20 分钟':'步行大于 20 分钟'} · 领取后 {tier} 分钟核销。</p>
 <p className="rm-applicable-count">当前 {realRows.length+demoRows.length} 家 · 演示数据不代表真实交易</p>
 {realRows.length>0&&<><h3>高德真实 POI · 本机演示优惠</h3>{realRows.map(card)}</>}
 {loading&&<p className="rm-loading">正在核对真实 POI 与步行耗时…</p>}
 {!origin&&<p className="rm-zero">选择真实起点后可核验真实商家；下方虚拟商家使用明确标注的模拟步行时间。</p>}
 <h3>演示数据 · 4 家虚拟适用商家</h3><p>以下商家没有高德 POI 或真实坐标，不会参与真实地图导航。</p>{demoRows.map(card)}
 {error&&<p className="rm-discovery-error">{error}</p>}<button className="rm-action" disabled={!A||!origin||loading} onClick={()=>R(v=>v+1)}>重新校验真实商家</button></div>
 {selected&&detail&&<div className="rm-coupon-detail-scroll"><span className="rm-demo-label">{detail.demo?'演示数据 · 虚拟商家 · 无真实交易':'高德真实 POI · 本机演示优惠'}</span><img className="rm-coupon-photo" src={detail.m.image} alt="商家品类示意，非实拍"/><h2>{detail.m.name}</h2><p>{detail.m.category} · {detail.m.address}</p><div className="rm-local-offer"><b>{detail.m.package}</b><p>演示原价 <del>¥{detail.m.original}</del> · 演示团购 ¥{detail.m.price}</p><p>{detail.demo?'模拟步行':'高德步行'}约 {Math.ceil(detail.m.walk)} 分钟 · 通勤补 ¥{amount} · {tier} 分钟核销</p><p>{detail.m.platformOffer?.rules}</p><p>活动截止：{new Date(detail.m.platformOffer?.expiresAt||DEMO_EXPIRES_AT).toLocaleString('zh-CN')}</p><p>领取状态：{claimFor(detail.m)?statusNames[claimFor(detail.m)!.status]:'尚未领取'}{claimFor(detail.m)&&['claimed','purchased','failed'].includes(claimFor(detail.m)!.status)?' · '+countdown(claimFor(detail.m)!,s.now):''}</p>
 <button disabled={(detail.m.platformOffer?.expiresAt||DEMO_EXPIRES_AT)<=s.now||!!eligible(detail.m,tier)} onClick={()=>{try{const c=s.claim(detail.m,tier);Notice('模拟领取：'+statusNames[c.status])}catch(e){Notice((e as Error).message)}}}>模拟领取 ¥{amount} 通勤补贴</button><button onClick={()=>onFavorite(detail.m)}>{favorites.includes(detail.m.id)?'已收藏':'收藏商家'}</button></div>
 {notice&&<p role="status">{notice}</p>}{detail.demo?<p className="rm-zero">演示位置，无真实高德 POI；不提供真实导航、销量、评分或交易。</p>:<MerchantLinkDetails place={detail.place!} offer={detail.m.platformOffer} claim={claimFor(detail.m)} now={s.now} canReturn onReturn={back} onLocation={()=>exit(()=>onSelect(detail.place!))} onJoin={()=>exit(()=>onJoin(detail.place!))} joined={false} busy={false}/>}
 </div>}{selected&&!detail&&<p className="rm-loading">正在恢复商家资料，请稍候或返回列表。</p>}
 </section></div>
}
