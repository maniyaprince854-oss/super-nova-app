const KEY = "nova_live_classes";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

export function getAllLiveClasses() { return load(); }

export function addLiveClass(data) {
  const all  = load();
  const item = { ...data, id: "lc_" + Date.now(), createdAt: new Date().toISOString() };
  all.unshift(item);
  save(all);
  return item;
}

export function updateLiveClass(id, updates) {
  const all = load();
  const idx = all.findIndex((m) => m.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; save(all); return all[idx]; }
  return null;
}

export function deleteLiveClass(id) { save(load().filter((m) => m.id !== id)); }

export function getUpcomingLiveClasses(studentClass) {
  const now = new Date();
  return load()
    .filter((c) => {
      if (c.status === "cancelled") return false;
      if (c.class !== "all" && c.class !== studentClass) return false;
      const start = new Date(c.scheduledAt);
      return now <= new Date(start.getTime() + 2 * 60 * 60 * 1000);
    })
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);
}
