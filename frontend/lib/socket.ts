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
    private ws: WebSocket | null = null;
    private messageHandlers: Map<MessageType, ((payload: unknown) => void)[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private serverUrl: string = '';
    private isExplicitlyDisconnected = false;
    private reconnectTimeoutId: NodeJS.Timeout | null = null;
    private baseReconnectDelay = 1000; // Start with 1 second
    private maxReconnectDelay = 30000; // Cap at 30 seconds
    private clientSequenceNumber = 0; // Sequence for outgoing messages
    private expectedServerSequence = 1; // Expected sequence from server (starts at 1)

    connect(serverUrl: string): Promise<void> {
        // If already connected to the same URL, do nothing
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) && this.serverUrl === serverUrl) {
            return Promise.resolve();
        }

        // Close existing connection if any
        this.disconnect();

        this.serverUrl = serverUrl;
        this.isExplicitlyDisconnected = false;

        // Clear any pending reconnection timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        return new Promise((resolve, reject) => {
            try {
                // Append JWT token from localStorage to WebSocket URL
                const token = localStorage.getItem('authToken');
                const wsUrl = token ? `${serverUrl}?token=${token}` : serverUrl;
                
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.clientSequenceNumber = 0;
                    this.expectedServerSequence = 1;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        
                        // Validate sequence number if present
                        if (message.sequenceNumber !== undefined) {
                            if (message.sequenceNumber < this.expectedServerSequence) {
                                console.warn(`Duplicate message detected. Expected seq ${this.expectedServerSequence}, got ${message.sequenceNumber}`);
                                return; // Ignore duplicate
                            } else if (message.sequenceNumber > this.expectedServerSequence) {
                                console.warn(`Out-of-order message detected. Expected seq ${this.expectedServerSequence}, got ${message.sequenceNumber}`);
                            }
                            this.expectedServerSequence = message.sequenceNumber + 1;
                        }
                        
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
            
            // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
            const delay = Math.min(
                this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                this.maxReconnectDelay
            );
            
            console.log(`Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            this.reconnectTimeoutId = setTimeout(() => {
                if (!this.isExplicitlyDisconnected) {
                    this.connect(this.serverUrl).catch(() => { });
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.clientSequenceNumber++;
            const message: WebSocketMessage = { 
                type, 
                payload,
                sequenceNumber: this.clientSequenceNumber 
            };
            console.log('Sending:', type, payload, 'seq:', this.clientSequenceNumber);
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        this.isExplicitlyDisconnected = true;
        
        // Clear any pending reconnection timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
        
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
    // If we have an env var, use it
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) {
        return envUrl;
    }

    // Otherwise, construct from window location
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:8081/ws/quiz`;
    }

    // Fallback for SSR
    return 'ws://localhost:8081/ws/quiz';
};

export const quizSocket = new QuizSocket();
