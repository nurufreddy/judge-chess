import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@judge-chess/shared';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (typeof window === 'undefined') {
    // SSR stub
    return {} as Socket<ServerToClientEvents, ClientToServerEvents>;
  }

  if (!socketInstance) {
    const serverUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      `${window.location.protocol}//${window.location.hostname}:4000`;

    socketInstance = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server at', serverUrl, 'with id', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }

  return socketInstance;
}
