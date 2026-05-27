const KEY          = "nova_study_materials";
const PROGRESS_KEY = "nova_study_progress";
const RECENT_KEY   = "nova_study_recent";

export const SUBJECTS      = ["Math", "Science", "English", "Social Science"];
export const STUDY_CLASSES = ["9th", "10th", "11th", "12th"];
export const CONTENT_TYPES = ["YouTube Video", "PDF Notes", "Combined"];

/* ── Materials ── */

export function getAllMaterials() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

export function getPublishedMaterials() {
  const now = new Date();
  return getAllMaterials().filter((m) => {
    if (m.status === "draft") return false;
    if (m.scheduledAt && new Date(m.scheduledAt) > now) return false;
    return true;
  });
}

export function addMaterial(data) {
  const all = getAllMaterials();
  const item = {
    ...data,
    id: "sm_" + Date.now(),
    createdAt: new Date().toISOString(),
    views: 0,
  };
  all.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(all));
  return item;
}

export function updateMaterial(id, updates) {
  const all = getAllMaterials();
  const idx = all.findIndex((m) => m.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[idx];
  }
  return null;
}

export function deleteMaterial(id) {
  const filtered = getAllMaterials().filter((m) => m.id !== id);
  localStorage.setItem(KEY, JSON.stringify(filtered));
}

export function incrementViews(id) {
  const all = getAllMaterials();
  const idx = all.findIndex((m) => m.id === id);
  if (idx !== -1) {
    all[idx].views = (all[idx].views || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(all));
  }
}

/* ── Student progress ── */

function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

export function getCompletedIds(studentId) {
  const p = getProgress();
  return new Set(p[studentId] || []);
}

export function toggleComplete(studentId, materialId) {
  const p   = getProgress();
  const set = new Set(p[studentId] || []);
  if (set.has(materialId)) set.delete(materialId);
  else set.add(materialId);
  p[studentId] = [...set];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  return set.has(materialId);
}

/* ── Recently viewed (continue learning) ── */

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || {}; }
  catch { return {}; }
}

export function getRecentIds(studentId, limit = 4) {
  const r = getRecent();
  return (r[studentId] || []).slice(0, limit);
}

export function recordView(studentId, materialId) {
  const r    = getRecent();
  const list = (r[studentId] || []).filter((id) => id !== materialId);
  list.unshift(materialId);
  r[studentId] = list.slice(0, 20);
  localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  incrementViews(materialId);
}

/* ── Helpers ── */

export function getMaterialsByClass(cls) {
  return getPublishedMaterials().filter((m) => m.class === cls);
}

export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ── Scheduled materials (for student countdown) ── */
export function getScheduledMaterials() {
  const now = new Date();
  return getAllMaterials().filter((m) => {
    if (m.status === "draft") return false;
    if (!m.scheduledAt) return false;
    return new Date(m.scheduledAt) > now;
  });
}

/* ── Admin analytics: completion counts per lecture ── */
export function getCompletionStats() {
  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const totalStudents = Object.keys(progress).length;
    const counts = {};
    for (const ids of Object.values(progress)) {
      for (const id of ids) counts[id] = (counts[id] || 0) + 1;
    }
    return { counts, totalStudents };
  } catch { return { counts: {}, totalStudents: 0 }; }
}

/* ── Timestamp helpers ── */
export function parseTimestampsStr(str) {
  return (str || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const sp = l.indexOf(" ");
    if (sp === -1) return null;
    return { time: l.slice(0, sp).trim(), label: l.slice(sp + 1).trim() };
  }).filter(Boolean);
}

export function timeToSeconds(t) {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/* ── Lecture sort-order swap ── */
export function swapLectureOrder(idA, idB) {
  const all  = getAllMaterials();
  const idxA = all.findIndex((m) => m.id === idA);
  const idxB = all.findIndex((m) => m.id === idB);
  if (idxA === -1 || idxB === -1) return;
  const orderA = all[idxA].sortOrder ?? idxA;
  const orderB = all[idxB].sortOrder ?? idxB;
  all[idxA] = { ...all[idxA], sortOrder: orderB };
  all[idxB] = { ...all[idxB], sortOrder: orderA };
  localStorage.setItem("nova_study_materials", JSON.stringify(all));
}
