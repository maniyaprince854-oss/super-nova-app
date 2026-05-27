const { execSync, spawnSync } = require('child_process');
const path = require('path');
const os   = require('os');

const ROOT = path.join(__dirname, '..');

function getLanIP() {
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
  return (lan.length ? lan : other)[0] || 'localhost';
}

function line(char, w) { return char.repeat(w); }
function box(rows, w = 58) {
  const H = '═', TL = '╔', TR = '╗', BL = '╚', BR = '╝', L = '║', LM = '╠', RM = '╣';
  console.log(TL + line(H, w) + TR);
  rows.forEach(r => {
    if (r === '---') { console.log(LM + line(H, w) + RM); return; }
    const pad = w - 2 - r.length;
    console.log(L + ' ' + r + ' '.repeat(Math.max(0, pad)) + ' ' + L);
  });
  console.log(BL + line(H, w) + BR);
}

const PORT = process.env.PORT || '3000';

/* ─── Banner ─── */
console.clear();
box(['', '  NOVA CLASSES — Classroom Server', '']);
console.log('');

/* ─── Step 1: Open Windows Firewall for port 3000 ─── */
console.log('  [0/2]  Opening firewall for port ' + PORT + '...');
try {
  // Remove old rule first (ignore error if it doesn't exist)
  spawnSync('netsh', ['advfirewall', 'firewall', 'delete', 'rule', 'name=Nova Classes'], { stdio: 'pipe' });
  // Add fresh rule
  const r = spawnSync('netsh', [
    'advfirewall', 'firewall', 'add', 'rule',
    'name=Nova Classes',
    'dir=in', 'action=allow',
    'protocol=TCP',
    `localport=${PORT}`,
  ], { stdio: 'pipe' });
  if (r.status === 0) {
    console.log('         Firewall port ' + PORT + ' opened — students on the same Wi-Fi can connect.\n');
  } else {
    console.log('         Could not open firewall automatically.\n');
    console.log('  TIP:   If students cannot connect, close this window,\n         right-click CMD → "Run as administrator", then run npm start again.\n');
  }
} catch {
  console.log('         Skipping firewall step (not on Windows or no permission).\n');
}

/* ─── Step 2: Build the frontend ─── */
console.log('  [1/2]  Building the app...\n');
try {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error('\n  ERROR: Build failed. Fix the errors above, then run npm start again.\n');
  process.exit(1);
}

/* ─── Step 3: Start the server ─── */
console.log('\n  [2/2]  Starting server...\n');
process.env.PORT = PORT;

require('./server.js');
