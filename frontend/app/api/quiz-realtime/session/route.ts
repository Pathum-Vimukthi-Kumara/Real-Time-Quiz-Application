import { NextRequest, NextResponse } from 'next/server';
import { closeBridgeSession, openBridgeSession } from '../bridge';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string };
    const sessionId = await openBridgeSession(body.token);
    return NextResponse.json({ sessionId });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to open TCP session';
    console.error('quiz-realtime session:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  closeBridgeSession(sessionId);
  return NextResponse.json({ ok: true });
}
