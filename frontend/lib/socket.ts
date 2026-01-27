// WebSocket client for quiz game communication

export type MessageType =
    | 'CREATE_GAME'
    | 'JOIN_GAME'
    | 'START_GAME'
    | 'SUBMIT_ANSWER'
    | 'NEXT_QUESTION'
    | 'END_GAME'
    | 'GAME_CREATED'
    | 'PLAYER_JOINED'
    | 'PLAYER_LEFT'
    | 'GAME_STARTED'
    | 'QUESTION'
    | 'ANSWER_RESULT'
    | 'LEADERBOARD'
    | 'GAME_ENDED'
    | 'ERROR';

export interface WebSocketMessage {
    type: MessageType;
    payload: unknown;
    sessionId?: string;
    playerId?: string;
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
    private ws: WebSocket | null = null;
    private messageHandlers: Map<MessageType, ((payload: unknown) => void)[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private serverUrl: string = '';
    private isExplicitlyDisconnected = false;

    connect(serverUrl: string): Promise<void> {
        // If already connected to the same URL, do nothing
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) && this.serverUrl === serverUrl) {
            return Promise.resolve();
        }

        // Close existing connection if any
        this.disconnect();

        this.serverUrl = serverUrl;
        this.isExplicitlyDisconnected = false;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        console.log('Received:', message.type, message.payload);

                        const handlers = this.messageHandlers.get(message.type);
                        if (handlers) {
                            handlers.forEach(handler => handler(message.payload));
                        }
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Don't reject here immediately, let onclose handle it or reject if it's the initial connection
                    if (this.reconnectAttempts === 0 && this.ws?.readyState !== WebSocket.OPEN) {
                        reject(error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    if (!this.isExplicitlyDisconnected) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.serverUrl && !this.isExplicitlyDisconnected) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                if (!this.isExplicitlyDisconnected) {
                    this.connect(this.serverUrl).catch(() => { });
                }
            }, 2000);
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = { type, payload };
            console.log('Sending:', type, payload);
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        this.isExplicitlyDisconnected = true;
        if (this.ws) {
            // Remove listeners to prevent further callbacks
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const getWebSocketUrl = () => {
    // If we have a specific env var that is NOT localhost, use it.
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
    }

    // Otherwise, construct from window location
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:8080/ws/quiz`;
    }

    // Fallback for SSR (shouldn't happen for client connection)
    return envUrl || 'ws://localhost:8080/ws/quiz';
};

export const quizSocket = new QuizSocket();
