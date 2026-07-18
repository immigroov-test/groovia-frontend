// BFF proxy: public mentor browse (find-a-mentor). Forwards country/category/q/limit to
// the backend's public /mentors list. No auth required - guests use this for the
// "Find a mentor" intent, so it never spends an LLM/Groq token.
import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../lib/backend';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search; // preserves ?country=..&category=..
  return proxyPublic(req, `/mentors${qs}`);
}
