const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const os         = require('os');
const fs         = require('fs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] },
});

/* ── Middleware ── */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Static: uploaded files ── */
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

/* ── Connected clients registry ── */
const clients = new Map(); // socketId → { id, type, name, connectedAt }

function getClientsList() {
  return Array.from(clients.values());
}

/* ── Socket.IO ── */
io.on('connection', (socket) => {
  const type = socket.handshake.query.type || 'student';
  const name = socket.handshake.query.name || (type === 'admin' ? 'Admin PC' : 'Student');

  clients.set(socket.id, {
    id: socket.id,
    type,
    name,
    connectedAt: new Date().toISOString(),
  });

  // Announce updated device list to everyone
  io.emit('clients:update', getClientsList());

  socket.on('disconnect', () => {
    clients.delete(socket.id);
    io.emit('clients:update', getClientsList());
  });
});

/* ── Share io + client helpers with routes ── */
app.set('io', io);
app.set('getClientsList', getClientsList);

/* ── API Routes ── */
app.use('/api/materials', require('./routes/materials'));
app.use('/api/notes',     require('./routes/notes'));
app.use('/api/status',    require('./routes/status'));

/* ── Serve built React app (production / classroom mode) ── */
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'API running',
      note: 'Run "npm run build" in the project root to serve the frontend.',
    });
  });
}

/* ── Find local IPv4 address (prefer LAN ranges over VPN) ── */
function getAllLocalIPs() {
  const nets = os.networkInterfaces();
  const lan = [], other = [];
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const ip = iface.address;
      if (ip.startsWith('192.168.') || ip.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
        lan.push(ip);
      } else {
        other.push(ip);
      }
    }
  }
  return lan.length ? lan : other;
}

/* ── Start ── */
const PORT = parseInt(process.env.PORT || '3001', 10);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ERROR: Port ${PORT} is already in use.`);
    console.error(`  Another copy of the server is already running.`);
    console.error(`  Close it first, then run npm start again.\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getAllLocalIPs();
  const ip  = ips[0] || 'localhost';
  const W   = 58;
  function pad(str) { return str + ' '.repeat(Math.max(0, W - 2 - str.length)); }

  console.log('\n╔' + '═'.repeat(W) + '╗');
  console.log('║' + pad('  NOVA CLASSES — Classroom Server is LIVE') + ' ║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + pad(`  Admin URL:   http://${ip}:${PORT}/admin`) + ' ║');
  console.log('║' + pad(`  Student URL: http://${ip}:${PORT}/student`) + ' ║');
  if (ips.length > 1) {
    ips.slice(1).forEach(extra =>
      console.log('║' + pad(`  Alt URL:     http://${extra}:${PORT}/student`) + ' ║')
    );
  }
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + pad('  Admin login:   admin  /  nova@123') + ' ║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + pad('  Share the Student URL with students on Wi-Fi') + ' ║');
  console.log('║' + pad('  Students just open it in their browser') + ' ║');
  console.log('╚' + '═'.repeat(W) + '╝\n');
});

module.exports = { app, io };
