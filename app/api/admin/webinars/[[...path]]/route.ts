import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

function target(parts?: string[]) { return `/admin/webinars${parts?.length ? `/${parts.join('/')}` : ''}`; }
export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(req, target((await ctx.params).path), { method: 'GET' });
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(req, target((await ctx.params).path), { method: 'POST' });
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyToBackend(req, target((await ctx.params).path), { method: 'PATCH' });
}
