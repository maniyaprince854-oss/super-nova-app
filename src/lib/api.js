/* ─────────────────────────────────────────
   Nova Classes — Backend API helpers
   Gracefully degrade when server is offline
───────────────────────────────────────── */

const TIMEOUT = 6000;

function timed(promise, ms = TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/** Returns true if the sync server is reachable */
export async function pingServer() {
  try {
    const res = await timed(fetch('/api/status'));
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns connected-client info or null */
export async function getServerStatus() {
  try {
    const res = await timed(fetch('/api/status'));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Push a material object to the server (JSON, no file upload) */
export async function syncMaterialToServer(material) {
  try {
    const res = await timed(fetch('/api/materials', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...material,
        // Ensure arrays are JSON-serialisable
        tags:           Array.isArray(material.tags)           ? material.tags           : [],
        timestamps:     Array.isArray(material.timestamps)     ? material.timestamps     : [],
        relatedNoteIds: Array.isArray(material.relatedNoteIds) ? material.relatedNoteIds : [],
      }),
    }));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Upload a material WITH an actual file (multipart) */
export async function uploadMaterialWithFile(material, file) {
  try {
    const fd = new FormData();
    Object.entries(material).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
    });
    if (file) fd.append('file', file);

    const res = await timed(fetch('/api/materials', { method: 'POST', body: fd }), 30000);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Delete a material from the server */
export async function deleteMaterialFromServer(id) {
  try {
    const res = await timed(fetch(`/api/materials/${id}`, { method: 'DELETE' }));
    return res.ok;
  } catch {
    return false;
  }
}

/** Push a note/PDF object to the server */
export async function syncNoteToServer(note) {
  try {
    const res = await timed(fetch('/api/notes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(note),
    }));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Delete a note from the server */
export async function deleteNoteFromServer(id) {
  try {
    const res = await timed(fetch(`/api/notes/${id}`, { method: 'DELETE' }));
    return res.ok;
  } catch {
    return false;
  }
}
