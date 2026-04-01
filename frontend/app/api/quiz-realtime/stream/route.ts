import { NextRequest } from 'next/server';
import { getBridgeSession, subscribeLines, unsubscribeLines } from '../bridge';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId || !getBridgeSession(sessionId)) {
    return new Response('Unknown session', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const listener = (line: string) => {
        controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      };

      for (const line of subscribeLines(sessionId, listener)) {
        controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      }

      // Send initial comment to confirm connection is alive
      controller.enqueue(encoder.encode(':connected\n\n'));

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribeLines(sessionId, listener);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
