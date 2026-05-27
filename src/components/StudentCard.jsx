import "./StudentCard.css";

const AVATAR_PALETTES = [
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#ffedd5", fg: "#c2410c" },
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#f0fdf4", fg: "#166534" },
];

function getAvatarPalette(name) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function StudentCard({ student, onView, onEdit, onDelete }) {
  const joinDate = new Date(student.joinDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const palette = getAvatarPalette(student.name);

  return (
    <div className="student-card">
      <div
        className="student-card-avatar"
        style={{ background: palette.bg, color: palette.fg }}
      >
        {student.name.charAt(0).toUpperCase()}
      </div>

      <div className="student-card-info">
        <div className="student-card-name">{student.name}</div>
        <div className="student-card-meta">
          <span className="student-card-username">@{student.username}</span>
          <span className="student-card-dot"/>
          <span className="student-card-badge">Class {student.class}</span>
          <span className="student-card-dot"/>
          <span className="student-card-date">{joinDate}</span>
        </div>
      </div>

      <div className="student-card-actions">
        {onView && (
          <button className="sc-btn sc-btn--view" onClick={() => onView(student)} title="View Profile">
            <EyeIcon />
            <span className="sc-btn-label">View</span>
          </button>
        )}
        {onEdit && (
          <button className="sc-btn sc-btn--edit" onClick={() => onEdit(student)} title="Edit">
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button className="sc-btn sc-btn--delete" onClick={() => onDelete(student)} title="Delete">
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}
