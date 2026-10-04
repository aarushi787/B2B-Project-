// Purpose: Frontend Socket.IO connectivity and event helpers.
//
// Auth: the page asks the API (over the normal httpOnly-cookie session) for a 60-second socket token and presents
// it in the handshake. This works even when the websocket host is a different site from the page (Vercel frontend,
// Render API), where browsers may not send cookies on the handshake. No token is ever stored.
//
// Where: Vercel cannot proxy websockets, so in production set VITE_SOCKET_URL to the API host
// (e.g. https://your-api.onrender.com). Without it the app still works; live updates are simply off.
import { io, Socket } from 'socket.io-client';
import { apiClient } from './apiClient';

type EventHandler<T = unknown> = (payload: T) => void;

const env = (import.meta as any).env ?? {};

function resolveSocketUrl(): string | null {
  const configured = String(env.VITE_SOCKET_URL || '').trim();
  if (configured) return configured.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  return env.PROD ? null : 'http://localhost:5000';
}

class SocketService {
  private socket: Socket | null = null;
  private socketUrl = resolveSocketUrl();

  connect(): Socket {
    if (this.socket) return this.socket; // socket.io reconnects by itself; never open a second connection

    this.socket = io(this.socketUrl ?? window.location.origin, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: this.socketUrl !== null, // no websocket host configured: keep an inert socket so callers need no checks
      auth: (cb) => {
        apiClient
          .get<{ token: string }>('/auth/socket-token')
          .then((r) => cb({ token: r.token }))
          .catch(() => cb({}));
      },
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T = unknown>(event: string, handler: EventHandler<T>) {
    this.connect().on(event, handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>) {
    this.socket?.off(event, handler as EventHandler);
  }

  watchDeal(dealId: string) {
    this.connect().emit('deals:watch', { dealId });
  }

  unwatchDeal(dealId: string) {
    this.socket?.emit('deals:unwatch', { dealId });
  }

  sendTyping(receiverId: string, dealId?: string, isTyping = true) {
    this.connect().emit('messages:typing', { receiverId, dealId, isTyping });
  }
}

export const socketService = new SocketService();
