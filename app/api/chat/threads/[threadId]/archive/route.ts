// BFF proxy: soft-delete a thread so it is not auto-resumed after the next sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../../lib/backend';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ archived: false }, { status: 401 });
  try {
    const res = await fetch(`${backendBaseUrl()}/chat/threads/${threadId}/archive`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ archived: false }, { status: 502 });
  }
}
