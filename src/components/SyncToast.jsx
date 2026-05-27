import { useEffect, useState } from 'react';
import './SyncToast.css';

/**
 * Floating toast shown on student devices when a new material is synced.
 * Props:
 *   material — the new material object (or null to hide)
 *   onClose  — callback when dismissed
 */
export default function SyncToast({ material, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!material) { setVisible(false); return; }
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, 6000);

    return () => clearTimeout(timer);
  }, [material, onClose]);

  if (!material) return null;

  const typeIcon =
    material.contentType === 'YouTube Video' ? '▶' :
    material.contentType === 'PDF Notes'     ? '📄' : '📚';

  return (
    <div className={`sync-toast ${visible ? 'sync-toast--in' : 'sync-toast--out'}`}>
      <div className="sync-toast-icon">{typeIcon}</div>
      <div className="sync-toast-body">
        <p className="sync-toast-title">New material added!</p>
        <p className="sync-toast-sub">
          <strong>{material.subject}</strong>
          {material.chapter ? ` · ${material.chapter}` : ''}
          {' — '}
          {material.lectureTitle || material.title || 'Untitled'}
        </p>
      </div>
      <button className="sync-toast-close" onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 300); }}>
        ✕
      </button>
    </div>
  );
}
