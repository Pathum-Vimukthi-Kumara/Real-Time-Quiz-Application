// Browser uses HTTP(S) + SSE to the Next.js bridge; the bridge opens a raw TCP socket to the Java quiz server.

export type MessageType =
  | 'AUTH'
  | 'CREATE_GAME'
  | 'JOIN_GAME'
  | 'RECONNECT_GAME'
  | 'START_GAME'
  | 'SUBMIT_ANSWER'
  | 'NEXT_QUESTION'
  | 'END_GAME'
  | 'LATENCY_PING'
  | 'GAME_CREATED'
  | 'PLAYER_JOINED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_LEFT'
  | 'GAME_STARTED'
  | 'QUESTION'
  | 'ANSWER_RESULT'
  | 'LEADERBOARD'
  | 'GAME_ENDED'
  | 'LATENCY_PONG'
  | 'ERROR'
  | 'SERVER_SHUTDOWN';

export interface WebSocketMessage {
  type: MessageType;
  payload: unknown;
  sessionId?: string;
  playerId?: string;
  sequenceNumber?: number;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface Question {
  questionIndex: number;
  questionText: string;
  options: string[];
  points: number;
  timeLimit: number;
  totalQuestions: number;
}

class QuizSocket {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private messageHandlers: Map<MessageType, ((payload: unknown) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  /** @deprecated unused; TCP bridge is same-origin */
  private serverUrl: string = '';
  private isExplicitlyDisconnected = false;
  private isServerShuttingDown = false;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private clientSequenceNumber = 0;
  private expectedServerSequence = 1;
  private latencyMeasurements: number[] = [];
  private currentLatency: number = 0;
  private latencyIntervalId: NodeJS.Timeout | null = null;
  private pendingPingTimestamp: number | null = null;

  /**
   * Connects via Next.js `/api/quiz-realtime/*`, which proxies to the Java TCP quiz port.
   * `serverUrl` is ignored (kept for call-site compatibility).
   */
  connect(_serverUrl?: string): Promise<void> {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN && this.sessionId) {
      return Promise.resolve();
    }

    this.disconnect();

    this.serverUrl = _serverUrl || '';
    this.isExplicitlyDisconnected = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    return new Promise((resolve, reject) => {
      const run = async () => {
        try {
          const token =
            typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          const res = await fetch('/api/quiz-realtime/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token || undefined }),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(
              typeof errBody === 'object' && errBody && 'error' in errBody
                ? String((errBody as { error: string }).error)
                : `Session HTTP ${res.status}`
            );
          }
          const data = (await res.json()) as { sessionId: string };
          this.sessionId = data.sessionId;

          const es = new EventSource(
            `/api/quiz-realtime/stream?sessionId=${encodeURIComponent(data.sessionId)}`
          );
          this.eventSource = es;

          const timeout = setTimeout(() => {
            es.close();
            if (!hasOpened) {
              this.sessionId = null;
              this.eventSource = null;
              void fetch(
                `/api/quiz-realtime/session?sessionId=${encodeURIComponent(data.sessionId)}`,
                { method: 'DELETE' }
              ).catch(() => {});
              console.error('EventSource onopen timeout - connection established but open event never fired');
              reject(new Error('Realtime stream connect timeout'));
            }
          }, 15000);

          let hasOpened = false;

          es.onopen = () => {
            clearTimeout(timeout);
            hasOpened = true;
            console.log('Quiz realtime (TCP bridge) connected, session:', data.sessionId);
            this.reconnectAttempts = 0;
            this.clientSequenceNumber = 0;
            this.expectedServerSequence = 1;
            this.startLatencyMeasurement();
            resolve();
          };

          es.onerror = (error) => {
            console.error('EventSource error:', error);
            if (hasOpened && es.readyState === EventSource.CLOSED) {
              if (!this.isExplicitlyDisconnected && !this.isServerShuttingDown) {
                this.attemptReconnect();
              }
            }
          };

          es.onmessage = (event) => {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);

              if (message.type === 'SERVER_SHUTDOWN') {
                this.isServerShuttingDown = true;
                this.stopLatencyMeasurement();
                this.messageHandlers.get(message.type)?.forEach((h) => h(message.payload));
                return;
              }

              if (message.type === 'LATENCY_PONG' || message.type === 'ERROR') {
                if (message.type === 'LATENCY_PONG') {
                  this.handleLatencyPong(message.payload);
                } else {
                  console.error('Received ERROR:', message.payload);
                  this.messageHandlers.get(message.type)?.forEach((h) => h(message.payload));
                }
                return;
              }

              if (message.sequenceNumber !== undefined) {
                if (message.sequenceNumber < this.expectedServerSequence) {
                  console.warn(
                    `Duplicate message detected. Expected seq ${this.expectedServerSequence}, got ${message.sequenceNumber}`
                  );
                  return;
                } else if (message.sequenceNumber > this.expectedServerSequence) {
                  console.warn(
                    `Out-of-order message detected. Expected seq ${this.expectedServerSequence}, got ${message.sequenceNumber}`
                  );
                }
                this.expectedServerSequence = message.sequenceNumber + 1;
              }

              console.log('Received:', message.type, message.payload);
              this.messageHandlers.get(message.type)?.forEach((h) => h(message.payload));
            } catch (error) {
              console.error('Error parsing message:', error);
            }
          };
        } catch (e) {
          reject(e);
        }
      };

      void run();
    });
  }

  private attemptReconnect() {
    if (this.isServerShuttingDown || this.isExplicitlyDisconnected) {
      return;
    }

    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !this.isExplicitlyDisconnected
    ) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );

      console.log(
        `Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      this.reconnectTimeoutId = setTimeout(() => {
        if (!this.isExplicitlyDisconnected) {
          this.connect(this.serverUrl).catch(() => {});
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Please refresh the page to reconnect.');
    }
  }

  on(type: MessageType, handler: (payload: unknown) => void) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  off(type: MessageType, handler: (payload: unknown) => void) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(type: MessageType, payload: unknown) {
    if (!this.sessionId || !this.isConnected()) {
      console.warn('Quiz realtime: send attempted but not connected yet (sessionId:', this.sessionId, ', connected:', this.isConnected(), ')');
      return;
    }
    this.clientSequenceNumber++;
    const message: WebSocketMessage = {
      type,
      payload,
      sequenceNumber: this.clientSequenceNumber,
    };
    console.log('Sending:', type, payload, 'seq:', this.clientSequenceNumber);
    void fetch(`/api/quiz-realtime/send?sessionId=${encodeURIComponent(this.sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch(console.error);
  }

  disconnect() {
    this.isExplicitlyDisconnected = true;
    this.isServerShuttingDown = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopLatencyMeasurement();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const id = this.sessionId;
    this.sessionId = null;
    if (id && typeof window !== 'undefined') {
      void fetch(`/api/quiz-realtime/session?sessionId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }

  saveReconnectionData(
    pin: string,
    reconnectionToken: string,
    playerId: string,
    username: string
  ) {
    if (typeof window !== 'undefined') {
      const data = { pin, reconnectionToken, playerId, username };
      localStorage.setItem('gameReconnectionData', JSON.stringify(data));
    }
  }

  getReconnectionData(): {
    pin: string;
    reconnectionToken: string;
    playerId: string;
    username: string;
  } | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('gameReconnectionData');
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  clearReconnectionData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameReconnectionData');
    }
  }

  private startLatencyMeasurement() {
    this.stopLatencyMeasurement();
    this.sendLatencyPing();
    this.latencyIntervalId = setInterval(() => this.sendLatencyPing(), 3000);
  }

  private stopLatencyMeasurement() {
    if (this.latencyIntervalId) {
      clearInterval(this.latencyIntervalId);
      this.latencyIntervalId = null;
    }
    this.pendingPingTimestamp = null;
  }

  private sendLatencyPing() {
    if (!this.sessionId || !this.isConnected()) {
      return;
    }
    const timestamp = Date.now();
    this.pendingPingTimestamp = timestamp;
    const message: WebSocketMessage = {
      type: 'LATENCY_PING',
      payload: { timestamp },
    };
    void fetch(`/api/quiz-realtime/send?sessionId=${encodeURIComponent(this.sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch(console.error);
  }

  private handleLatencyPong(_payload: unknown) {
    if (!this.pendingPingTimestamp) return;

    const now = Date.now();
    const latency = now - this.pendingPingTimestamp;

    this.latencyMeasurements.push(latency);
    if (this.latencyMeasurements.length > 10) {
      this.latencyMeasurements.shift();
    }

    const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
    this.currentLatency = Math.round(sum / this.latencyMeasurements.length);

    this.pendingPingTimestamp = null;
    console.debug(`Latency: ${latency}ms (avg: ${this.currentLatency}ms)`);
  }

  getLatency(): number {
    return this.currentLatency;
  }

  isConnected(): boolean {
    return (
      this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
    );
  }
}

/** @deprecated Use `quizSocket.connect()` with no args. Kept for compatibility. */
export const getWebSocketUrl = () => '';

export const quizSocket = new QuizSocket();
