const express = require('express');
const router  = express.Router();
const os      = require('os');

function getLocalIP() {
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
  const all = lan.length ? lan : other;
  return all[0] || 'localhost';
}

router.get('/', (req, res) => {
  const getClientsList = req.app.get('getClientsList');
  const clients = getClientsList();
  const students = clients.filter(c => c.type === 'student');
  const admins   = clients.filter(c => c.type === 'admin');

  res.json({
    running:      true,
    serverIP:     getLocalIP(),
    students:     students.length,
    admins:       admins.length,
    total:        clients.length,
    clients,
    timestamp:    new Date().toISOString(),
  });
});

module.exports = router;
