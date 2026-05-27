import { io } from 'socket.io-client';

let _socket = null;

/**
 * In DEV:  connect directly to the Express backend on port 3001.
 *          This bypasses Vite's proxy and works for any device on the same Wi-Fi.
 * In PROD: connect to the same origin (Express serves everything on one port).
 */
function backendUrl() {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return window.location.origin;
}

export function getSocket(type = 'student', name = '') {
  if (_socket) return _socket;

  const deviceName = name || (type === 'admin' ? 'Admin PC' : 'Student');

  _socket = io(backendUrl(), {
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
