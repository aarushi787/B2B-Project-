// Purpose: This module (services/socketService.ts) is used to implement frontend Socket.IO connectivity and event helpers in a modular, maintainable way.
import { io, Socket } from 'socket.io-client';

type EventHandler<T = unknown> = (payload: T) => void;

const API_BASE_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000/api';

function toSocketUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, '');
}

class SocketService {
  private socket: Socket | null = null;
  private socketUrl = toSocketUrl(API_BASE_URL);

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    // Auth is the httpOnly cookie, sent automatically with credentials; no token is handled in JS.
    this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
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
