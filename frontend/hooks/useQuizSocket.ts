import { useState, useEffect, useCallback, useRef } from 'react';
import { quizSocket, MessageType } from '@/lib/socket';
import { useToast } from '@/contexts/ToastContext';

export function useQuizSocket() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { addToast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectUrlRef = useRef<string | undefined>();
  const autoReconnectRef = useRef(false);

  const connect = useCallback(
    async (url?: string) => {
      if (connected || connecting) return;

      autoReconnectRef.current = true;
      reconnectUrlRef.current = url;
      setConnecting(true);
      try {
        await quizSocket.connect(url);
        setConnected(true);
        setConnecting(false);
      } catch (err) {
        setConnecting(false);
        setConnected(false);
        addToast('Failed to connect to game server', 'error');
        console.error('Quiz realtime connection error:', err);
      }
    },
    [connected, connecting, addToast]
  );

  // Separate reconnection effect
  useEffect(() => {
    if (!connected && !connecting && autoReconnectRef.current) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(reconnectUrlRef.current);
      }, 3000);
    }
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connected, connecting, connect]);

  const disconnect = useCallback(() => {
    autoReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    quizSocket.disconnect();
    setConnected(false);
    setConnecting(false);
  }, []);

  const send = useCallback(
    (type: MessageType, payload: unknown) => {
      if (!connected) {
        console.warn('Cannot send message: not connected');
        addToast('Not connected to server', 'warning');
        return;
      }
      quizSocket.send(type, payload);
    },
    [connected, addToast]
  );

  const on = useCallback((type: MessageType, handler: (payload: unknown) => void) => {
    quizSocket.on(type, handler);
  }, []);

  const off = useCallback((type: MessageType, handler: (payload: unknown) => void) => {
    quizSocket.off(type, handler);
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connecting,
    connect,
    disconnect,
    send,
    on,
    off,
    isConnected: () => connected,
  };
}
