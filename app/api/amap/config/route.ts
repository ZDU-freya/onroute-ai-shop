import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export function GET(){if(!process.env.AMAP_JS_KEY||!process.env.AMAP_SECURITY_CODE)return NextResponse.json({configured:false},{status:503});return NextResponse.json({configured:true,key:process.env.AMAP_JS_KEY,serviceHost:'/_AMapService'},{headers:{'Cache-Control':'no-store'}})}
