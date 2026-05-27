const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const { v4: uuid } = require('uuid');

const DB_FILE    = path.join(__dirname, '../database/materials.json');
const UPLOAD_BASE = path.join(__dirname, '../uploads');

/* ── Ensure dirs ── */
['pdfs','notes','videos'].forEach(d =>
  fs.mkdirSync(path.join(UPLOAD_BASE, d), { recursive: true })
);

/* ── JSON helpers ── */
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

/* ── Multer ── */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const mime = file.mimetype;
    let sub = 'notes';
    if (mime === 'application/pdf') sub = 'pdfs';
    else if (mime.startsWith('video/')) sub = 'videos';
    cb(null, path.join(UPLOAD_BASE, sub));
  },
  filename(req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

/* ── GET all ── */
router.get('/', (req, res) => {
  res.json(readDB());
});

/* ── POST add ── */
router.post('/', upload.single('file'), (req, res) => {
  const io = req.app.get('io');
  const db = readDB();

  let fileUrl = req.body.pdfUrl || null;
  if (req.file) {
    const rel = path.relative(UPLOAD_BASE, req.file.path).replace(/\\/g, '/');
    fileUrl = `/uploads/${rel}`;
  }

  function parseField(raw, fallback = []) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return raw.split(',').map(t => t.trim()).filter(Boolean); }
  }

  const material = {
    id:             req.body.id || `sm_${Date.now()}`,
    subject:        req.body.subject       || '',
    class:          req.body.class         || '',
    chapter:        req.body.chapter       || '',
    lectureTitle:   req.body.lectureTitle  || '',
    youtubeUrl:     req.body.youtubeUrl    || '',
    pdfUrl:         fileUrl                || '',
    description:    req.body.description   || '',
    contentType:    req.body.contentType   || 'YouTube Video',
    status:         req.body.status        || 'published',
    scheduledAt:    req.body.scheduledAt   || null,
    visibility:     req.body.visibility    || 'all',
    tags:           parseField(req.body.tags),
    timestamps:     parseField(req.body.timestamps),
    relatedNoteIds: parseField(req.body.relatedNoteIds),
    views:          0,
    sortOrder:      db.length,
    createdAt:      new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
  };

  // Replace existing entry if same id (re-sync after offline edit)
  const filtered = db.filter(m => m.id !== material.id);
  filtered.unshift(material);
  writeDB(filtered);

  io.emit('material:added', material);

  res.json({ success: true, material });
});

/* ── PUT update ── */
router.put('/:id', upload.single('file'), (req, res) => {
  const io = req.app.get('io');
  const db = readDB();
  const idx = db.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  let fileUrl = db[idx].pdfUrl;
  if (req.file) {
    const rel = path.relative(UPLOAD_BASE, req.file.path).replace(/\\/g, '/');
    fileUrl = `/uploads/${rel}`;
  } else if (req.body.pdfUrl !== undefined) {
    fileUrl = req.body.pdfUrl;
  }

  function parseField(raw, fallback) {
    if (raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch { return raw.split(',').map(t => t.trim()).filter(Boolean); }
  }

  const updated = {
    ...db[idx],
    subject:      req.body.subject      ?? db[idx].subject,
    class:        req.body.class        ?? db[idx].class,
    chapter:      req.body.chapter      ?? db[idx].chapter,
    lectureTitle: req.body.lectureTitle ?? db[idx].lectureTitle,
    youtubeUrl:   req.body.youtubeUrl   ?? db[idx].youtubeUrl,
    pdfUrl:       fileUrl,
    description:  req.body.description  ?? db[idx].description,
    status:       req.body.status       ?? db[idx].status,
    scheduledAt:  req.body.scheduledAt  ?? db[idx].scheduledAt,
    visibility:   req.body.visibility   ?? db[idx].visibility,
    tags:         parseField(req.body.tags, db[idx].tags),
    timestamps:   parseField(req.body.timestamps, db[idx].timestamps),
    updatedAt:    new Date().toISOString(),
  };

  db[idx] = updated;
  writeDB(db);

  io.emit('material:updated', updated);
  res.json({ success: true, material: updated });
});

/* ── DELETE ── */
router.delete('/:id', (req, res) => {
  const io = req.app.get('io');
  let db = readDB();
  if (!db.find(m => m.id === req.params.id))
    return res.status(404).json({ error: 'Not found' });

  db = db.filter(m => m.id !== req.params.id);
  writeDB(db);

  io.emit('material:deleted', { id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
