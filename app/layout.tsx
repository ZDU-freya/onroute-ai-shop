import './globals.css';
import './mobile.css';
import type {Viewport} from 'next';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata={title:'抖省省 · AI 顺路买 V3.4',description:'高德真实商家与顺路路线，本地模拟优惠和购买。'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}