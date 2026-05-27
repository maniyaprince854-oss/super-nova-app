import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';
import './NetworkStatus.css';

/**
 * Shows server connection status.
 * role = 'admin'   → "🟢 2 students connected"
 * role = 'student' → "🟢 Live sync on"
 */
export default function NetworkStatus({ role = 'student' }) {
  const [status,  setStatus]  = useState('connecting');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const socket = getSocket(role, role === 'admin' ? 'Admin PC' : 'Student');

    function onConnect()      { setStatus('connected'); }
    function onDisconnect()   { setStatus('disconnected'); }
    function onConnectError() { setStatus('error'); }
    function onClients(list)  { setClients(list || []); }

    socket.on('connect',        onConnect);
    socket.on('disconnect',     onDisconnect);
    socket.on('connect_error',  onConnectError);
    socket.on('clients:update', onClients);

    // Might already be connected if hook runs late
    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect',        onConnect);
      socket.off('disconnect',     onDisconnect);
      socket.off('connect_error',  onConnectError);
      socket.off('clients:update', onClients);
    };
  }, [role]);

  const students = clients.filter(c => c.type === 'student');

  if (status === 'connecting') {
    return (
      <div className="net-status net-status--connecting">
        <span className="net-dot net-dot--pulse" />
        <span className="net-label">Connecting…</span>
      </div>
    );
  }

  if (status === 'disconnected' || status === 'error') {
    return (
      <div className="net-status net-status--offline">
        <span className="net-dot net-dot--offline" />
        <span className="net-label net-label--offline">
          {role === 'admin' ? 'Server offline' : 'No server'}
        </span>
      </div>
    );
  }

  /* connected */
  if (role === 'admin') {
    return (
      <div className="net-status net-status--online">
        <span className="net-dot net-dot--online" />
        <span className="net-label">
          {students.length > 0
            ? `${students.length} student${students.length !== 1 ? 's' : ''} online`
            : 'Server running'}
        </span>
        {students.length > 0 && (
          <div className="net-avatars">
            {students.slice(0, 6).map((c) => (
              <span key={c.id} className="net-avatar" title={c.name}>
                {c.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {students.length > 6 && (
              <span className="net-avatar net-avatar--more">+{students.length - 6}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="net-status net-status--online">
      <span className="net-dot net-dot--online" />
      <span className="net-label">Live sync</span>
    </div>
  );
}
