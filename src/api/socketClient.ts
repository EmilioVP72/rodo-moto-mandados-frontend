import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || window.location.origin;
    socketInstance = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });
  }
  return socketInstance;
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
