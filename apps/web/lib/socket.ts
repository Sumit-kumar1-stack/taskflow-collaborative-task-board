import { io, Socket } from 'socket.io-client';
import { getAccessToken, refreshSession } from './auth';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000', {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token: getAccessToken() },
      reconnection: true,
    });
    socket.on('auth:error', async () => {
      if (await refreshSession()) {
        socket!.auth = { token: getAccessToken() };
        socket!.connect();
      }
    });
    socket.on('connect_error', async (err) => {
      if (/auth/i.test(err.message)) {
        if (await refreshSession()) {
          socket!.auth = { token: getAccessToken() };
          socket!.connect();
        }
      }
    });
  }
  socket.auth = { token: getAccessToken() };
  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
