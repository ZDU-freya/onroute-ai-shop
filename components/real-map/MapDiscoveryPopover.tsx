'use client';
import {X,Flame,Route} from 'lucide-react';
import {categoryLabel,Offer} from '../../lib/amap/real';
import {MapDiscovery} from '../../lib/amap/demo';
export default function MapDiscoveryPopover({item,offer,now,subsidy,onClose,onDetail,onAdd,busy}:{item:MapDiscovery;offer?:Offer;now:number;subsidy:React.ReactNode;onClose:()=>void;onDetail:()=>void;onAdd:()=>void;busy:boolean}){
 const hot=item.kind==='hot';return <section className="rm-discovery-popover" role="dialog" aria-label="沿线商家信息"><button className="rm-popover-close" aria-label="关闭沿线商家信息" onClick={onClose}><X size={16}/></button><div className="rm-marker-tags">{!hot&&<span><Route size={12}/>顺路商家</span>}{hot&&<span className="hot"><Flame size={12}/>演示热卖</span>}</div><h3>{item.place.name}</h3><p>{categoryLabel(item.place)}<br/>{item.place.address}</p><strong>{item.demo?'演示商家 · 演示位置':`额外交通 ${(item.delta??0)>=0?'+':''}${Math.ceil(item.delta??0)} 分钟`}</strong><p>{item.demo?item.demo.product:hot?offer?.productName:item.reason}</p>{hot&&<p>演示团购 ¥{item.demo?.price??offer?.price} · 不代表真实销量或排名</p>}<div className="rm-benefit">{item.demo?<span>演示位置不参与真实路线计算；请先关联并验证高德 POI。</span>:subsidy}</div><div className="rm-popover-actions"><button onClick={onDetail}>查看详情</button><button disabled={busy||!!item.demo} onClick={onAdd}>{item.demo?'需先关联真实 POI':busy?'路线更新中':'加入路线'}</button></div></section>
}
