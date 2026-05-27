const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const DB_FILE    = path.join(__dirname, '../database/notes.json');
const UPLOAD_BASE = path.join(__dirname, '../uploads');

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch { return []; }
}
function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, path.join(UPLOAD_BASE, 'pdfs')); },
  filename(req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

router.get('/', (req, res) => { res.json(readDB()); });

router.post('/', upload.single('file'), (req, res) => {
  const io = req.app.get('io');
  const db = readDB();

  let fileUrl = req.body.pdfUrl || null;
  if (req.file) {
    const rel = path.relative(UPLOAD_BASE, req.file.path).replace(/\\/g, '/');
    fileUrl = `/uploads/${rel}`;
  }

  const note = {
    id:           req.body.id || `mat_${Date.now()}`,
    class:        req.body.class        || '',
    subject:      req.body.subject      || '',
    chapter:      req.body.chapter      || '',
    materialType: req.body.materialType || '',
    title:        req.body.title        || '',
    description:  req.body.description  || '',
    pdfUrl:       fileUrl               || '',
    visibility:   req.body.visibility   || 'all',
    status:       req.body.status       || 'published',
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };

  const filtered = db.filter(n => n.id !== note.id);
  filtered.unshift(note);
  writeDB(filtered);

  io.emit('note:added', note);
  res.json({ success: true, note });
});

router.delete('/:id', (req, res) => {
  const io = req.app.get('io');
  let db = readDB();
  db = db.filter(n => n.id !== req.params.id);
  writeDB(db);
  io.emit('note:deleted', { id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
