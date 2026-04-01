import { NextRequest, NextResponse } from 'next/server';
import { getBridgeSession, writeLine } from '../bridge';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  if (!getBridgeSession(sessionId)) {
    return NextResponse.json({ error: 'Unknown session' }, { status: 404 });
  }

  const body = await req.text();
  if (!body.trim()) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  const ok = writeLine(sessionId, body.trim());
  if (!ok) {
    return NextResponse.json({ error: 'Socket not writable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
