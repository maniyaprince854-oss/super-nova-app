const DB_NAME = "nova_files_db";
const STORE   = "files";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

export async function storeFile(id, file) {
  const db     = await openDB();
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      id,
      buffer,
      name: file.name,
      size: file.size,
      type: file.type || "application/pdf",
    });
    tx.oncomplete = () => resolve(id);
    tx.onerror    = (e) => reject(e.target.error);
  });
}

export async function getFileBlobUrl(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = (e) => {
        const rec = e.target.result;
        if (!rec) { resolve(null); return; }
        const blob = new Blob([rec.buffer], { type: rec.type });
        resolve(URL.createObjectURL(blob));
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteStoredFile(id) {
  if (!id) return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
    });
  } catch { /* ignore */ }
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
