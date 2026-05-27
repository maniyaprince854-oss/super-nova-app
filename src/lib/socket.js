import { io } from 'socket.io-client';

let _socket = null;

/**
 * Returns the shared Socket.IO client.
 * Connects to the same origin — Vite proxies to backend in dev,
 * Express serves both in production.
 */
export function getSocket(type = 'student', name = '') {
  if (_socket) return _socket;

  const deviceName = name || (type === 'admin' ? 'Admin PC' : 'Student');

  _socket = io({
    query: { type, name: deviceName },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 8000,
  });

  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
