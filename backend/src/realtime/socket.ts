// Purpose: This module (backend/src/realtime/socket.ts) is used to implement project functionality in a modular, maintainable way.
import { type Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken, verifySocketToken } from '../services/tokens.js';

type AuthContext = {
  userId: string;
  companyId?: string;
  role: string;
};

let ioInstance: Server | null = null;

function parseCookie(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return acc;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

type SocketCredential = { token: string; kind: 'socket' | 'access' };

// A short-lived socket token (from GET /api/auth/socket-token) works even where browsers do not send cookies on a
// cross-site websocket handshake. Otherwise fall back to the Bearer header or the httpOnly access cookie.
function resolveSocketCredential(socket: Socket): SocketCredential | null {
  const fromAuth = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token.trim() : '';
  if (fromAuth) return { token: fromAuth, kind: 'socket' };

  const authHeader = socket.handshake.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) return { token, kind: 'access' };
  }

  const cookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token';
  const cookies = parseCookie(socket.handshake.headers.cookie);
  const fromCookie = cookies[cookieName]?.trim();
  return fromCookie ? { token: fromCookie, kind: 'access' } : null;
}

function companyRoom(companyId: string) {
  return `company:${companyId}`;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function dealRoom(dealId: string) {
  return `deal:${dealId}`;
}

export function initSocketServer(httpServer: HttpServer, corsOrigin: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    // CORS does not apply to raw websocket upgrades, so enforce the same Origin allowlist here
    // (prevents cross-site websocket hijacking with the ambient auth cookie).
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) return callback(null, true);
      corsOrigin(origin, (_err: Error | null, allowed?: boolean) => callback(null, !!allowed));
    },
  });

  io.use((socket, next) => {
    try {
      const credential = resolveSocketCredential(socket);
      if (!credential) return next(new Error('Authentication required'));
      const decoded = credential.kind === 'socket' ? verifySocketToken(credential.token) : verifyAccessToken(credential.token);
      if (decoded.type !== credential.kind) return next(new Error('Invalid token type'));

      socket.data.auth = {
        userId: decoded.userId,
        companyId: decoded.companyId ?? undefined,
        role: decoded.role,
      } satisfies AuthContext;

      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth as AuthContext;
    socket.join(userRoom(auth.userId));
    if (auth.companyId) {
      socket.join(companyRoom(auth.companyId));
    }
    if (String(auth.role).toLowerCase() === 'admin') socket.join('admins');

    socket.emit('socket:connected', {
      userId: auth.userId,
      companyId: auth.companyId ?? null,
      connectedAt: new Date().toISOString(),
    });

    socket.on('deals:watch', (payload: { dealId?: string }) => {
      const dealId = payload?.dealId;
      if (!dealId) return;
      socket.join(dealRoom(dealId));
    });

    socket.on('deals:unwatch', (payload: { dealId?: string }) => {
      const dealId = payload?.dealId;
      if (!dealId) return;
      socket.leave(dealRoom(dealId));
    });

    socket.on(
      'messages:typing',
      (payload: { receiverId?: string; dealId?: string; isTyping?: boolean }) => {
        const typingEvent = {
          senderId: auth.companyId ?? null,
          receiverId: payload?.receiverId ?? null,
          dealId: payload?.dealId ?? null,
          isTyping: payload?.isTyping !== false,
          timestamp: new Date().toISOString(),
        };

        if (payload?.receiverId) {
          io.to(companyRoom(payload.receiverId)).emit('messages:typing', typingEvent);
        }
        if (payload?.dealId) {
          io.to(dealRoom(payload.dealId)).emit('messages:typing', typingEvent);
        }
      }
    );
  });

  ioInstance = io;
  return io;
}

export function getSocketServer(): Server | null {
  return ioInstance;
}

export function emitToCompany(companyId: string | null | undefined, event: string, payload: unknown) {
  if (!ioInstance || !companyId) return;
  ioInstance.to(companyRoom(companyId)).emit(event, payload);
}

export function emitToUser(userId: string | null | undefined, event: string, payload: unknown) {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
}

export function emitToDeal(dealId: string | null | undefined, event: string, payload: unknown) {
  if (!ioInstance || !dealId) return;
  ioInstance.to(dealRoom(dealId)).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown) {
  ioInstance?.to('admins').emit(event, payload);
}
