// WebSocket client for quiz game communication

export type MessageType =
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
    private ws: WebSocket | null = null;
    private messageHandlers: Map<MessageType, ((payload: unknown) => void)[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private serverUrl: string = '';
    private isExplicitlyDisconnected = false;
    private isServerShuttingDown = false; // Track if server is shutting down
    private reconnectTimeoutId: NodeJS.Timeout | null = null;
    private baseReconnectDelay = 1000; // Start with 1 second
    private maxReconnectDelay = 30000; // Cap at 30 seconds
    private clientSequenceNumber = 0; // Sequence for outgoing messages
    private expectedServerSequence = 1; // Expected sequence from server (starts at 1)
    private latencyMeasurements: number[] = []; // Rolling window of last 10 measurements
    private currentLatency: number = 0; // Current measured latency in ms
    private latencyIntervalId: NodeJS.Timeout | null = null;
    private pendingPingTimestamp: number | null = null;

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
                    this.startLatencyMeasurement();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        
                        // Handle SERVER_SHUTDOWN immediately - stop all reconnection attempts
                        if (message.type === 'SERVER_SHUTDOWN') {
                            this.isServerShuttingDown = true;
                            this.stopLatencyMeasurement();
                            console.warn('Server is shutting down:', message.payload);
                            const handlers = this.messageHandlers.get(message.type);
                            if (handlers) {
                                handlers.forEach(handler => handler(message.payload));
                            }
                            return;
                        }
                        
                        // Handle control messages separately (no sequence validation)
                        if (message.type === 'LATENCY_PONG' || message.type === 'ERROR') {
                            if (message.type === 'LATENCY_PONG') {
                                this.handleLatencyPong(message.payload);
                            } else {
                                console.error('Received ERROR:', message.payload);
                                const handlers = this.messageHandlers.get(message.type);
                                if (handlers) {
                                    handlers.forEach(handler => handler(message.payload));
                                }
                            }
                            return;
                        }
                        
                        // Validate sequence number for game messages
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

                this.ws.onerror = () => {
                    // Suppress error logging - WebSocket error events don't contain useful info
                    // and are often triggered by React Strict Mode cleanup in development.
                    // Actual connection failures are handled by onclose and reconnection logic.
                };

                this.ws.onclose = (event) => {
                    // Only log meaningful disconnections (not React Strict Mode cleanup)
                    if (!this.isExplicitlyDisconnected && event.code !== 1000 && this.reconnectAttempts === 0) {
                        console.log('WebSocket disconnected with code:', event.code);
                    }
                    
                    // Don't attempt reconnection if server is shutting down or explicitly disconnected
                    if (!this.isExplicitlyDisconnected && !this.isServerShuttingDown) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private attemptReconnect() {
        // Don't reconnect if server is shutting down
        if (this.isServerShuttingDown) {
            console.log('Server is shutting down - reconnection disabled');
            return;
        }
        
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
        this.isServerShuttingDown = false; // Reset shutdown flag on manual disconnect
        
        // Clear any pending reconnection timeout
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
        
        // Stop latency measurement
        this.stopLatencyMeasurement();
        
        if (this.ws) {
            // Remove listeners to prevent further callbacks
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            
            // Only close if not already closed or closing
            // Suppress warning when closing a CONNECTING socket (happens in React Strict Mode)
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                try {
                    this.ws.close();
                } catch (e) {
                    // Ignore errors during disconnect (common in React Strict Mode)
                }
            }
            this.ws = null;
        }
    }

    saveReconnectionData(pin: string, reconnectionToken: string, playerId: string, username: string) {
        if (typeof window !== 'undefined') {
            const data = { pin, reconnectionToken, playerId, username };
            localStorage.setItem('gameReconnectionData', JSON.stringify(data));
        }
    }

    getReconnectionData(): { pin: string; reconnectionToken: string; playerId: string; username: string } | null {
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
        // Stop any existing measurement
        this.stopLatencyMeasurement();
        
        // Send first ping immediately
        this.sendLatencyPing();
        
        // Then send ping every 3 seconds
        this.latencyIntervalId = setInterval(() => {
            this.sendLatencyPing();
        }, 3000);
    }

    private stopLatencyMeasurement() {
        if (this.latencyIntervalId) {
            clearInterval(this.latencyIntervalId);
            this.latencyIntervalId = null;
        }
        this.pendingPingTimestamp = null;
    }

    private sendLatencyPing() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const timestamp = Date.now();
            this.pendingPingTimestamp = timestamp;
            
            // Send without incrementing client sequence number (utility message)
            const message: WebSocketMessage = {
                type: 'LATENCY_PING',
                payload: { timestamp }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    private handleLatencyPong(payload: unknown) {
        if (!this.pendingPingTimestamp) return;
        
        const now = Date.now();
        const latency = now - this.pendingPingTimestamp;
        
        // Add to rolling window (keep last 10 measurements)
        this.latencyMeasurements.push(latency);
        if (this.latencyMeasurements.length > 10) {
            this.latencyMeasurements.shift();
        }
        
        // Calculate average latency
        const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
        this.currentLatency = Math.round(sum / this.latencyMeasurements.length);
        
        this.pendingPingTimestamp = null;
        console.debug(`Latency: ${latency}ms (avg: ${this.currentLatency}ms)`);
    }

    getLatency(): number {
        return this.currentLatency;
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
