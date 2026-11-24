'use client';
import {useState} from 'react';
import {Stop} from '../../data/planning';
import {allMerchants,districts} from './model';
import AMapCanvas from '../amap/AMapCanvas';
import MockLeisureMap from './MockLeisureMap';
export default function LeisureMap(props:{stops?:Stop[];selected?:string;onSelect?:(id:string)=>void;onDistrict?:(id:number)=>void;city?:string;focus?:number}){const [fallback,F]=useState(false);if(fallback)return <div style={{position:'relative'}}><MockLeisureMap {...props}/><button className="lcmap-switch" onClick={()=>F(false)}>重试高德地图</button></div>;const {stops=[],selected='',onSelect,onDistrict}=props;const merchants=stops.map(s=>allMerchants.find(m=>m.id===s.merchant)!).filter(Boolean);const current=allMerchants.find(m=>m.id===stops.find(s=>s.id===selected)?.merchant)||null;return <div className="leisure-map" style={{height:560}}><AMapCanvas items={merchants} selected={current} routeStops={merchants} mode="walk20" home={stops.length?'滨河家园':''} onSelect={m=>{const s=stops.find(s=>s.merchant===m.id);if(s)onSelect?.(s.id)}} onClear={()=>{}} focus={props.focus} areas={stops.length?[]:districts} onArea={onDistrict} onFallback={()=>F(true)}/></div>}
