import net from 'net';
import { randomUUID } from 'crypto';

export type LineListener = (line: string) => void;

type BridgeSession = {
  socket: net.Socket;
  buffer: string;
  /** Lines received before any SSE subscriber attached */
  pending: string[];
  listeners: Set<LineListener>;
};

const sessions = new Map<string, BridgeSession>();

function dispatchLine(session: BridgeSession, line: string) {
  if (session.listeners.size === 0) {
    session.pending.push(line);
    while (session.pending.length > 200) {
      session.pending.shift();
    }
    return;
  }
  for (const fn of session.listeners) {
    fn(line);
  }
}

export async function openBridgeSession(token?: string | null): Promise<string> {
  const host = process.env.QUIZ_TCP_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.QUIZ_TCP_PORT || '8082', 10);

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.createConnection({ host, port }, () => resolve(s));
    s.once('error', reject);
  });

  if (token) {
    const authLine = JSON.stringify({ type: 'AUTH', payload: { token } }) + '\n';
    await new Promise<void>((resolve, reject) => {
      socket.write(authLine, (err) => (err ? reject(err) : resolve()));
    });
  }

  const session: BridgeSession = {
    socket,
    buffer: '',
    pending: [],
    listeners: new Set(),
  };

  const id = randomUUID();
  sessions.set(id, session);

  socket.on('data', (chunk: Buffer) => {
    session.buffer += chunk.toString('utf8');
    let idx: number;
    while ((idx = session.buffer.indexOf('\n')) >= 0) {
      const raw = session.buffer.slice(0, idx);
      session.buffer = session.buffer.slice(idx + 1);
      const line = raw.trim();
      if (line.length > 0) {
        dispatchLine(session, line);
      }
    }
  });

  const teardown = () => {
    sessions.delete(id);
    try {
      socket.destroy();
    } catch {
      // ignore
    }
  };

  socket.on('close', teardown);
  socket.on('error', teardown);

  return id;
}

export function getBridgeSession(sessionId: string): BridgeSession | undefined {
  return sessions.get(sessionId);
}

export function subscribeLines(sessionId: string, listener: LineListener): string[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }
  session.listeners.add(listener);
  const pending = session.pending;
  session.pending = [];
  return pending;
}

export function unsubscribeLines(sessionId: string, listener: LineListener) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  session.listeners.delete(listener);
}

export function writeLine(sessionId: string, jsonLine: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.socket.destroyed) {
    return false;
  }
  const line = jsonLine.endsWith('\n') ? jsonLine : jsonLine + '\n';
  session.socket.write(line);
  return true;
}

export function closeBridgeSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.delete(sessionId);
  try {
    session.socket.destroy();
  } catch {
    // ignore
  }
}
