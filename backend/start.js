/**
 * NOVA CLASSES — Classroom Server Launcher
 * Run: npm start
 *
 * 1. Builds the latest React app
 * 2. Starts Express on port 3000 serving everything
 * 3. Prints the URL — share it with students on the same Wi-Fi
 */
const { execSync } = require('child_process');
const path = require('path');
const os   = require('os');

const ROOT = path.join(__dirname, '..');

/* ─── helpers ─── */
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function line(char, width) { return char.repeat(width); }

function box(rows, width = 56) {
  const L = '║', TL = '╔', TR = '╗', BL = '╚', BR = '╝',
        LM = '╠', RM = '╣', H = '═';
  console.log(TL + line(H, width) + TR);
  rows.forEach(r => {
    if (r === '---') { console.log(LM + line(H, width) + RM); return; }
    const pad = width - 2 - r.length;
    console.log(L + ' ' + r + ' '.repeat(Math.max(0, pad)) + ' ' + L);
  });
  console.log(BL + line(H, width) + BR);
}

/* ─── Step 1: Banner ─── */
console.clear();
box(['', '  NOVA CLASSES — Classroom Server', '']);
console.log('');

/* ─── Step 2: Build the frontend ─── */
console.log('  [1/2]  Building the app...\n');
try {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error('\n  ✖  Build failed. Fix errors above, then run npm start again.\n');
  process.exit(1);
}

/* ─── Step 3: Start the server ─── */
console.log('\n  [2/2]  Starting server...\n');

// Classroom mode: everything on port 3000
process.env.PORT = process.env.PORT || '3000';

// Hand off to server.js
require('./server.js');
