import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

let socketInstance: Socket | null = null;

export function getRealtimeSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: {
        token: getStoredToken() || undefined,
      },
    });
  }
  return socketInstance;
}

export function reconnectSocketWithAuth() {
  if (socketInstance) {
    socketInstance.auth = {
      token: getStoredToken() || undefined,
    };
    socketInstance.disconnect().connect();
  }
}

