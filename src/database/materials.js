const KEY           = "nova_materials";
const BOOKMARKS_KEY = "nova_mat_bookmarks";
const RECENT_KEY    = "nova_mat_recent";

export const MAT_CLASSES  = ["9th", "10th"];
export const MAT_SUBJECTS = ["Math", "Science", "English", "Social Science"];

export const MATERIAL_TYPES = [
  "Chapter Notes",
  "Short Notes",
  "Formula Sheet",
  "Revision Notes",
  "Assignment",
  "Worksheet",
  "PYQ",
  "Important Questions",
  "Sample Paper",
  "Extra Material",
];

export const TYPE_META = {
  "Chapter Notes":       { icon: "📄", color: "#7c3aed", bg: "#ede9fe" },
  "Short Notes":         { icon: "📝", color: "#0369a1", bg: "#e0f2fe" },
  "Formula Sheet":       { icon: "📘", color: "#1d4ed8", bg: "#dbeafe" },
  "Revision Notes":      { icon: "📚", color: "#9333ea", bg: "#f3e8ff" },
  "Assignment":          { icon: "📂", color: "#b45309", bg: "#fef3c7" },
  "Worksheet":           { icon: "📋", color: "#059669", bg: "#d1fae5" },
  "PYQ":                 { icon: "❓", color: "#dc2626", bg: "#fee2e2" },
  "Important Questions": { icon: "🎯", color: "#d97706", bg: "#fef9c3" },
  "Sample Paper":        { icon: "📑", color: "#6d28d9", bg: "#f5f3ff" },
  "Extra Material":      { icon: "📁", color: "#52525b", bg: "#f4f4f5" },
};

export const SUBJECT_META = {
  "Math":           { icon: "📐", bg: "#ede9fe", fg: "#6d28d9", accent: "#8b5cf6" },
  "Science":        { icon: "🔬", bg: "#dcfce7", fg: "#15803d", accent: "#22c55e" },
  "English":        { icon: "📖", bg: "#dbeafe", fg: "#1d4ed8", accent: "#3b82f6" },
  "Social Science": { icon: "🌍", bg: "#fef3c7", fg: "#b45309", accent: "#f59e0b" },
};

function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function getAllMaterials() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

export function getPublishedMaterials() {
  return getAllMaterials().filter((m) => m.status !== "draft");
}

export function addMaterial(data) {
  const all  = getAllMaterials();
  const item = { ...data, id: "mat_" + Date.now(), createdAt: new Date().toISOString(), views: 0, downloads: 0 };
  all.unshift(item);
  save(all);
  return item;
}

export function updateMaterial(id, updates) {
  const all = getAllMaterials();
  const idx = all.findIndex((m) => m.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    save(all);
    return all[idx];
  }
  return null;
}

export function deleteMaterial(id) {
  save(getAllMaterials().filter((m) => m.id !== id));
}

/* ── Bookmarks ── */
function bData() {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || {}; }
  catch { return {}; }
}

export function getBookmarkIds(studentId) {
  return new Set(bData()[studentId] || []);
}

export function toggleBookmark(studentId, materialId) {
  const d   = bData();
  const set = new Set(d[studentId] || []);
  if (set.has(materialId)) set.delete(materialId);
  else set.add(materialId);
  d[studentId] = [...set];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(d));
  return set.has(materialId);
}

/* ── Recent views ── */
function rData() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || {}; }
  catch { return {}; }
}

export function getRecentMaterialIds(studentId, limit = 8) {
  return (rData()[studentId] || []).slice(0, limit);
}

export function recordMaterialView(studentId, materialId) {
  const d    = rData();
  const list = (d[studentId] || []).filter((id) => id !== materialId);
  list.unshift(materialId);
  d[studentId] = list.slice(0, 30);
  localStorage.setItem(RECENT_KEY, JSON.stringify(d));

  const all = getAllMaterials();
  const idx = all.findIndex((m) => m.id === materialId);
  if (idx !== -1) { all[idx].views = (all[idx].views || 0) + 1; save(all); }
}

export function recordDownload(materialId) {
  const all = getAllMaterials();
  const idx = all.findIndex((m) => m.id === materialId);
  if (idx !== -1) { all[idx].downloads = (all[idx].downloads || 0) + 1; save(all); }
}

/* ── PDF viewer URL helper ── */
export function getPdfViewerUrl(url) {
  if (!url) return null;
  if (url.includes("drive.google.com")) {
    const m = url.match(/\/d\/([^/?#]+)/) || url.match(/id=([^&]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    return url;
  }
  if (url.includes("dropbox.com")) {
    return url.replace(/[?&]dl=0/, "?raw=1").replace(/[?&]dl=1/, "?raw=1");
  }
  if (url.match(/\.(pdf|docx|pptx?)(\?|$)/i)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
}
