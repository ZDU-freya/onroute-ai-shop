import { NextRequest, NextResponse } from 'next/server';
import { get, Agent } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { rootCertificates } from 'node:tls';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Include the OS trust store without disabling certificate verification.
const agent = new Agent({ ca: [...rootCertificates, ...(existsSync('/etc/ssl/cert.pem') ? [readFileSync('/etc/ssl/cert.pem', 'utf8')] : [])] });
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join('/');
  const allowed = /^v3\/(direction\/(walking|driving|transit\/integrated)|geocode\/(geo|regeo)|place\/(text|around|detail)|config\/district|ip)$/.test(route) || route === 'v4/map/styles';
  if (!allowed) return NextResponse.json({ error: '不支持的地图服务' }, { status: 403 });
  if (!process.env.AMAP_SECURITY_CODE || !process.env.AMAP_JS_KEY) return NextResponse.json({ error: '地图尚未配置' }, { status: 503 });
  const query = new URLSearchParams(request.nextUrl.searchParams);
  query.set('key', process.env.AMAP_JS_KEY);
  query.set('jscode', process.env.AMAP_SECURITY_CODE);
  const host = route === 'v4/map/styles' ? 'https://webapi.amap.com/' : 'https://restapi.amap.com/';
  try {
    const upstream = await new Promise<{ body: Buffer; status: number; type: string }>((resolve, reject) => {
      const req = get(host + route + '?' + query.toString(), { agent, headers: { Referer: request.headers.get('referer') || request.nextUrl.origin, 'User-Agent': request.headers.get('user-agent') || 'LifeCircleMapProxy' } }, res => {
        const chunks: Buffer[] = []; let size = 0;
        res.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) req.destroy(new Error('Response too large')); else chunks.push(chunk); });
        res.on('end', () => resolve({ body: Buffer.concat(chunks), status: res.statusCode || 502, type: res.headers['content-type'] || 'application/json' }));
        res.on('error', reject);
      });
      req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
      req.on('error', reject);
    });
    return new NextResponse(new Uint8Array(upstream.body), { status: upstream.status, headers: { 'Content-Type': query.has('callback') ? 'application/javascript; charset=utf-8' : upstream.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return NextResponse.json({ error: '高德服务暂不可达，请稍后重试' }, { status: 502 }); }
}
