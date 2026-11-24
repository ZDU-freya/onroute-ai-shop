'use client';
import {allMerchants} from '../../data/planning';
import {useState,useEffect} from 'react';
import {Claim,expire,claimOffer,redeem,bestOffer} from './subsidy';
import {RouteContext} from './commute';
import {Merchant} from '../../data/merchants';
export function useSubsidy(){const [claims,C]=useState<Claim[]>([]),[offset,O]=useState(0),[tick,T]=useState(Date.now()),[ready,R]=useState(false);useEffect(()=>{try{const d=JSON.parse(localStorage.getItem('dss-subsidy-v32')||'{}');C((d.claims||[]).map((c:Claim)=>!c.ruleVersion&&c.status==='claimed'?{...c,status:'cancelled'}:c));O(d.offset||0)}catch{}R(true);const timer=setInterval(()=>T(Date.now()),1000);return()=>clearInterval(timer)},[]);const now=tick+offset;useEffect(()=>{if(ready)localStorage.setItem('dss-subsidy-v32',JSON.stringify({claims,offset}))},[claims,offset,ready]);const visible=claims.map(c=>expire(c,now));
function claim(m:Merchant,tier:number){const c=claimOffer(visible,m,tier,Date.now()+offset);C(a=>a.some(x=>x.claimId===c.claimId)?a:[...a,c]);return c}
function bind(merchant:number,orderId:string,context?:RouteContext,merchantData?:Merchant){const m=merchantData||allMerchants.find(m=>m.id===merchant)!;const offer=bestOffer(m,visible,Date.now()+offset,context);if(!offer)return undefined;if(offer.kind==='commute'){const c=offer.claim!;C(a=>a.map(x=>x.claimId===c.claimId?{...x,status:'purchased',orderId}:x));return c.claimId}const c:Claim={kind:'along',ruleVersion:'v33',sessionId:context!.sessionId,claimId:crypto.randomUUID(),merchantId:merchant,productId:`product-${merchant}`,tierMinutes:0,subsidyAmount:offer.amount,claimedAt:Date.now()+offset,expiresAt:Number.MAX_SAFE_INTEGER,status:'purchased',orderId};C(a=>[...a,c]);return c.claimId}

function confirm(claimId:string,m:Merchant,orderId:string,fail=false){const c=visible.find(c=>c.claimId===claimId);if(!c)return null;const result=redeem(c,m,orderId,Date.now()+offset,fail);C(a=>a.map(x=>x.claimId===claimId?result:x));return result}
return {claims:visible,now,ready,time:()=>Date.now()+offset,claim,bind,confirm,cancel:(id:string)=>C(a=>a.map(c=>c.claimId===id&&!['redeemed','expired'].includes(c.status)?{...c,status:'cancelled'}:c)),reset:()=>{C([]);O(0);T(Date.now())},advance:()=>{O(v=>v+31*60000);T(Date.now())}}}
export type SubsidyController=ReturnType<typeof useSubsidy>;
