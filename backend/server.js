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

/* ── Find local IPv4 address ── */
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

/* ── Start ── */
const PORT = parseInt(process.env.PORT || '3001', 10);

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   🟢  NOVA CLASSES — Local Sync Server           ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Admin:    http://${ip}:${PORT}/admin`.padEnd(51) + '║');
  console.log(`║  Student:  http://${ip}:${PORT}/student`.padEnd(51) + '║');
  console.log(`║  API:      http://${ip}:${PORT}/api`.padEnd(51) + '║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Share the Student URL with students on Wi-Fi    ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});

module.exports = { app, io };
