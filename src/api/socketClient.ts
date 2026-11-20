import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './httpClient';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || window.location.origin;
    socketInstance = io(wsUrl, {
      path: '/socket.io',
      auth: {
        token: getAuthToken() || undefined,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      const token = getAuthToken();
      if (token) {
        socketInstance?.emit('auth:identify', token);
      }
    });
  }
  return socketInstance;
}

export function identifySocketSession(token: string | null): void {
  try {
    const socket = getSocket();
    socket.auth = { token: token || undefined };
    if (token && socket.connected) {
      socket.emit('auth:identify', token);
    } else if (!token && socket.connected) {
      socket.emit('auth:logout');
      socket.disconnect();
      socket.connect();
    }
  } catch {}
}

export function onSocketEvent<T = any>(
  event: string,
  handler: (payload: T) => void
): () => void {
  try {
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  } catch {
    return () => {};
  }
}

export function emitSocketEvent(event: string, payload: unknown): void {
  try {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(event, payload);
    }
  } catch {}
}
