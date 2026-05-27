/* ─────────────────────────────────────────────────────────
   Nova Classes — Backend API helpers
   In DEV:  calls go directly to Express backend (port 3001)
   In PROD: calls go to the same origin (Express serves all)
   Gracefully degrade when server is offline.
───────────────────────────────────────────────────────── */

function backendUrl(path) {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3001${path}`;
  }
  return path;
}

const TIMEOUT = 8000;

function timed(fetchPromise, ms = TIMEOUT) {
  return Promise.race([
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/** Returns true if the sync server is reachable */
export async function pingServer() {
  try {
    const res = await timed(fetch(backendUrl('/api/status')));
    return res.ok;
  } catch {
    return false;
  }
}

/** Returns connected-client info or null */
export async function getServerStatus() {
  try {
    const res = await timed(fetch(backendUrl('/api/status')));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Push a material object to the server (JSON, no file upload) */
export async function syncMaterialToServer(material) {
  try {
    const res = await timed(fetch(backendUrl('/api/materials'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...material,
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

    const res = await timed(
      fetch(backendUrl('/api/materials'), { method: 'POST', body: fd }),
      30000
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Delete a material from the server */
export async function deleteMaterialFromServer(id) {
  try {
    const res = await timed(
      fetch(backendUrl(`/api/materials/${id}`), { method: 'DELETE' })
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Push a note/PDF object to the server */
export async function syncNoteToServer(note) {
  try {
    const res = await timed(fetch(backendUrl('/api/notes'), {
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
    const res = await timed(
      fetch(backendUrl(`/api/notes/${id}`), { method: 'DELETE' })
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch all materials from the server (for fresh-device hydration) */
export async function fetchMaterialsFromServer() {
  try {
    const res = await timed(fetch(backendUrl('/api/materials')));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch all notes from the server (for fresh-device hydration) */
export async function fetchNotesFromServer() {
  try {
    const res = await timed(fetch(backendUrl('/api/notes')));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
