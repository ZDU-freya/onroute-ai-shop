'use client';
import {useState} from 'react';
import {Merchant,Mode} from '../data/merchants';
import MockCityMap from './MockCityMap';
import AMapCanvas from './amap/AMapCanvas';
export default function CityMap(props:{items:Merchant[];selected:Merchant|null;mode:Mode;onSelect:(m:Merchant)=>void;onClear:()=>void;home:string;origin?:string;hero?:boolean;badges?:Record<number,string>;travelMode?:'walking'|'transit'|'driving';routeStops?:Merchant[]}){const [mock,M]=useState(false);if(mock)return <div style={{height:'100%',position:'relative'}}><MockCityMap {...props}/><button className="lcmap-switch" onClick={()=>M(false)}>重试高德地图</button></div>;return <AMapCanvas {...props} onFallback={()=>M(true)}/>}
