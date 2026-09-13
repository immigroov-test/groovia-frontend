import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

function path(req: NextRequest, parts?: string[]) {
  const suffix = parts?.length ? `/${parts.join('/')}` : '';
  return `/webinars${suffix}${req.nextUrl.search}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyPublic(req, path(req, (await ctx.params).path), { method: 'GET' });
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyPublic(req, path(req, (await ctx.params).path), { method: 'POST' });
}
