import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import StudentNav from "../../components/StudentNav";
import {
  getPublishedMaterials, SUBJECTS, extractYouTubeId,
  getCompletedIds, toggleComplete, getRecentIds, recordView,
  getScheduledMaterials, timeToSeconds,
} from "../../database/studyMaterials";
import {
  getPublishedMaterials as getPublishedNotes,
  TYPE_META, getPdfViewerUrl, toggleBookmark, getBookmarkIds,
} from "../../database/materials";
import { getFileBlobUrl } from "../../database/fileStore";
import { recordStudyDay } from "../../database/streaks";
import { getUpcomingLiveClasses } from "../../database/liveClasses";
import { getPersonalNote, savePersonalNote } from "../../database/personalNotes";
import { PlayCircleIcon, FileTextIcon, BookOpenIcon, ChevronRightIcon, SearchIcon } from "../../components/Icons";
import { getSocket } from "../../lib/socket";
import { fetchMaterialsFromServer, fetchNotesFromServer } from "../../lib/api";
import NetworkStatus from "../../components/NetworkStatus";
import SyncToast from "../../components/SyncToast";
import "./Study.css";

const STUDY_KEY = "nova_study_materials";

const SUBJECT_COLORS = {
  "Math":           { bg: "#ede9fe", fg: "#6d28d9", accent: "#8b5cf6", icon: "📐" },
  "Science":        { bg: "#dcfce7", fg: "#15803d", accent: "#22c55e", icon: "🔬" },
  "English":        { bg: "#dbeafe", fg: "#1d4ed8", accent: "#3b82f6", icon: "📖" },
  "Social Science": { bg: "#fef3c7", fg: "#b45309", accent: "#f59e0b", icon: "🌍" },
};
function getSubjectColor(s) {
  return SUBJECT_COLORS[s] || { bg: "#f4f4f5", fg: "#52525b", accent: "#a1a1aa", icon: "📚" };
}

function formatCountdown(scheduledAt) {
  const diff  = new Date(scheduledAt) - Date.now();
  if (diff <= 0) return "unlocking soon";
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/* ── Completion badge modal ── */
function CompletionBadge({ subject, onClose }) {
  const c = getSubjectColor(subject);
  return (
    <div className="study-badge-overlay" onClick={onClose}>
      <div className="study-badge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="study-badge-stars">✦ ✦ ✦ ✦ ✦</div>
        <div className="study-badge-emoji" style={{ background: c.bg }}>{c.icon}</div>
        <h2 className="study-badge-title">Subject Complete!</h2>
        <p className="study-badge-body">
          You've finished all videos in <strong style={{ color: c.accent }}>{subject}</strong>. Amazing work! 🎉
        </p>
        <button className="study-badge-btn" style={{ background: c.accent }} onClick={onClose}>
          Keep Learning
        </button>
      </div>
    </div>
  );
}

/* ── Lecture card ── */
function LectureCard({ lec, done, onWatch, onPdf, onToggleDone, accentColor, showSubjectTag, onTagClick }) {
  const ytId = extractYouTubeId(lec.youtubeUrl);
  return (
    <div className={`study-lecture-card ${done ? "study-lecture-card--done" : ""}`}>
      {ytId ? (
        <div className="study-lecture-thumb" onClick={onWatch}>
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={lec.lectureTitle} loading="lazy"/>
          <div className="study-lecture-play-overlay">
            <div className="study-lecture-play-btn"><PlayCircleIcon size={32}/></div>
          </div>
        </div>
      ) : (
        <div className="study-lecture-thumb study-lecture-thumb--empty"><BookOpenIcon size={24}/></div>
      )}
      <div className="study-lecture-info">
        {showSubjectTag ? (
          <p className="study-lecture-chapter" style={{ color: accentColor }}>{lec.subject} · {lec.chapter}</p>
        ) : (
          <p className="study-lecture-chapter">{lec.chapter}</p>
        )}
        <h4 className="study-lecture-title">{lec.lectureTitle}</h4>
        {lec.description && <p className="study-lecture-desc">{lec.description}</p>}
        {lec.tags?.length > 0 && (
          <div className="study-lec-tags">
            {lec.tags.slice(0, 3).map((t) => (
              <button key={t} className="study-lec-tag" onClick={(e) => { e.stopPropagation(); onTagClick?.(t); }}>
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="study-lecture-btns">
          {lec.youtubeUrl && (
            <button className="study-lec-btn study-lec-btn--watch" onClick={onWatch}>
              <PlayCircleIcon size={15}/> Watch
            </button>
          )}
          {lec.pdfUrl && (
            <button className="study-lec-btn study-lec-btn--pdf" onClick={onPdf}>
              <FileTextIcon size={15}/> Notes
            </button>
          )}
          <button className={`study-lec-btn study-lec-btn--done ${done ? "checked" : ""}`} onClick={onToggleDone}>
            {done ? "✓ Done" : "Mark Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Video modal ── */
function VideoModal({ material, done, onClose, onPdf, onToggleDone, allNotes, onOpenNote, studentId }) {
  const ytId         = extractYouTubeId(material.youtubeUrl);
  const [startSec, setStartSec]     = useState(0);
  const [noteText, setNoteText]     = useState(() => getPersonalNote(studentId, material.id));
  const [noteSaved, setNoteSaved]   = useState(false);

  const timestamps   = material.timestamps  || [];
  const relatedNotes = (material.relatedNoteIds || []).map((id) => allNotes.find((n) => n.id === id)).filter(Boolean);
  const iframeSrc    = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0${startSec ? `&start=${startSec}` : ""}`;

  function seek(time) { setStartSec(timeToSeconds(time)); }

  function saveNote() {
    savePersonalNote(studentId, material.id, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  return (
    <div className="study-video-overlay" onClick={onClose}>
      <div className="study-video-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="study-video-modal-header">
          <div className="study-video-modal-info">
            <p className="study-video-modal-chapter">{material.subject} · {material.chapter}</p>
            <h3 className="study-video-modal-title">{material.lectureTitle}</h3>
          </div>
          <div className="study-video-modal-actions">
            <button className={`study-video-done-btn ${done ? "checked" : ""}`} onClick={onToggleDone}>
              {done ? "✓ Completed" : "Mark Complete"}
            </button>
            <button className="study-video-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Video */}
        <div className="study-video-frame">
          <iframe
            key={startSec}
            src={iframeSrc}
            title={material.lectureTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Timestamps */}
        {timestamps.length > 0 && (
          <div className="study-video-timestamps">
            <p className="study-video-ts-heading">⏱ Video Chapters</p>
            <div className="study-video-ts-list">
              {timestamps.map((ts, i) => (
                <button key={i} className="study-video-ts-btn" onClick={() => seek(ts.time)}>
                  <span className="study-video-ts-time">{ts.time}</span>
                  <span className="study-video-ts-label">{ts.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {(material.description || material.pdfUrl || material.tags?.length > 0 || relatedNotes.length > 0) && (
          <div className="study-video-footer">
            <div className="study-video-footer-left">
              {material.description && <p className="study-video-desc">{material.description}</p>}
              {material.tags?.length > 0 && (
                <div className="study-video-tags">
                  {material.tags.map((t) => <span key={t} className="study-video-tag">{t}</span>)}
                </div>
              )}
              {relatedNotes.length > 0 && (
                <div className="study-video-related">
                  <p className="study-video-related-heading">📎 Attached Notes</p>
                  <div className="study-video-related-list">
                    {relatedNotes.map((note) => {
                      const tm = TYPE_META[note.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };
                      return (
                        <button key={note.id} className="study-video-related-btn" onClick={() => onOpenNote(note)}>
                          <span>{tm.icon}</span>
                          <span>{note.title}</span>
                          <ChevronRightIcon size={12}/>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {material.pdfUrl && (
              <button className="study-lec-btn study-lec-btn--pdf" onClick={onPdf}>
                <FileTextIcon size={15}/> Open Notes PDF
              </button>
            )}
          </div>
        )}

        {/* Personal notes */}
        <div className="study-personal-notes">
          <div className="study-personal-notes-hdr">
            <span>📝 My Notes</span>
            <button className={`study-personal-notes-save ${noteSaved ? "saved" : ""}`} onClick={saveNote}>
              {noteSaved ? "✓ Saved!" : "Save"}
            </button>
          </div>
          <textarea
            className="study-personal-notes-area"
            placeholder="Your private notes for this lecture… (saved to your account)"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function StudentStudy() {
  const navigate = useNavigate();
  const [student, setStudent]               = useState(null);
  const [materials, setMaterials]           = useState([]);
  const [activeSubject, setActiveSubject]   = useState(null);
  const [classFilter, setClassFilter]       = useState("mine");
  const [videoModal, setVideoModal]         = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [search, setSearch]                 = useState("");
  const [completedIds, setCompletedIds]     = useState(new Set());
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [allNotes, setAllNotes]             = useState([]);
  const [bookmarkedNoteIds, setBookmarkedNoteIds] = useState(new Set());
  const [pdfViewer, setPdfViewer]           = useState(null);
  const [recentlyAdded, setRecentlyAdded]   = useState([]);
  const [streakData, setStreakData]         = useState({ streak: 0, longestStreak: 0 });
  const [badgeSubject, setBadgeSubject]     = useState(null);
  const [activeFilter, setActiveFilter]     = useState("all");
  const [liveClasses, setLiveClasses]       = useState([]);
  const [scheduledItems, setScheduledItems] = useState([]);
  const [syncToast, setSyncToast]           = useState(null);

  const reload = useCallback((s) => {
    const all = getPublishedMaterials();
    setMaterials(all);
    const recentIds = getRecentIds(s.id, 4);
    setRecentMaterials(recentIds.map((id) => all.find((m) => m.id === id)).filter(Boolean));
    setCompletedIds(getCompletedIds(s.id));
    const notes = getPublishedNotes();
    setAllNotes(notes);
    setBookmarkedNoteIds(getBookmarkIds(s.id));
    const visNotes = notes.filter((n) => !n.visibility || n.visibility === "all" || n.visibility === s.class);
    const visVids  = all.filter((m) => !m.class || m.class === s.class || m.class.toLowerCase() === "all");
    const combined = [
      ...visVids.map((m) => ({ ...m, _type: "video", _title: m.lectureTitle })),
      ...visNotes.map((n) => ({ ...n, _type: "note",  _title: n.title })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
    setRecentlyAdded(combined);
    setLiveClasses(getUpcomingLiveClasses(s.class));
    setScheduledItems(getScheduledMaterials().filter((m) => !m.class || m.class === s.class || m.class.toLowerCase() === "all" || m.visibility === "all"));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("supernova_current_student");
    if (!raw) { navigate("/student/login"); return; }
    const s = JSON.parse(raw);
    setStudent(s);
    reload(s);
    setStreakData(recordStudyDay(s.id));
  }, [navigate, reload]);

  /* ── Server hydration: pull all existing materials on first load ── */
  useEffect(() => {
    async function hydrate() {
      const [serverMaterials, serverNotes] = await Promise.all([
        fetchMaterialsFromServer(),
        fetchNotesFromServer(),
      ]);

      let changed = false;

      if (Array.isArray(serverMaterials) && serverMaterials.length > 0) {
        try {
          const local = JSON.parse(localStorage.getItem(STUDY_KEY) || '[]');
          const merged = [...local];
          serverMaterials.forEach((m) => {
            const idx = merged.findIndex((x) => x.id === m.id);
            if (idx === -1) { merged.unshift(m); changed = true; }
            else { merged[idx] = m; changed = true; }
          });
          localStorage.setItem(STUDY_KEY, JSON.stringify(merged));
        } catch {}
      }

      if (Array.isArray(serverNotes) && serverNotes.length > 0) {
        try {
          const NOTES_KEY = 'nova_materials';
          const local = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
          const merged = [...local];
          serverNotes.forEach((n) => {
            const idx = merged.findIndex((x) => x.id === n.id);
            if (idx === -1) { merged.unshift(n); changed = true; }
            else { merged[idx] = n; changed = true; }
          });
          localStorage.setItem(NOTES_KEY, JSON.stringify(merged));
        } catch {}
      }

      if (changed) {
        setStudent((s) => { if (s) reload(s); return s; });
      }
    }
    hydrate();
  }, [reload]);

  /* ── Live sync: receive new materials from admin ── */
  useEffect(() => {
    const socket = getSocket('student', 'Student');

    function onMaterialAdded(material) {
      // Persist to localStorage so it survives refresh
      try {
        const all = JSON.parse(localStorage.getItem(STUDY_KEY) || '[]');
        if (!all.find((m) => m.id === material.id)) {
          all.unshift(material);
          localStorage.setItem(STUDY_KEY, JSON.stringify(all));
        }
      } catch {}
      // Show toast, reload UI
      setSyncToast(material);
      setStudent((s) => { if (s) reload(s); return s; });
    }

    function onMaterialUpdated(material) {
      try {
        const all = JSON.parse(localStorage.getItem(STUDY_KEY) || '[]');
        const idx = all.findIndex((m) => m.id === material.id);
        if (idx !== -1) { all[idx] = material; localStorage.setItem(STUDY_KEY, JSON.stringify(all)); }
      } catch {}
      setStudent((s) => { if (s) reload(s); return s; });
    }

    function onMaterialDeleted({ id }) {
      try {
        const all = JSON.parse(localStorage.getItem(STUDY_KEY) || '[]');
        localStorage.setItem(STUDY_KEY, JSON.stringify(all.filter((m) => m.id !== id)));
      } catch {}
      setStudent((s) => { if (s) reload(s); return s; });
    }

    function onNoteAdded(note) {
      try {
        const all = JSON.parse(localStorage.getItem('nova_materials') || '[]');
        if (!all.find((n) => n.id === note.id)) {
          all.unshift(note);
          localStorage.setItem('nova_materials', JSON.stringify(all));
        }
      } catch {}
      setStudent((s) => { if (s) reload(s); return s; });
    }

    function onNoteDeleted({ id }) {
      try {
        const all = JSON.parse(localStorage.getItem('nova_materials') || '[]');
        localStorage.setItem('nova_materials', JSON.stringify(all.filter((n) => n.id !== id)));
      } catch {}
      setStudent((s) => { if (s) reload(s); return s; });
    }

    socket.on('material:added',   onMaterialAdded);
    socket.on('material:updated', onMaterialUpdated);
    socket.on('material:deleted', onMaterialDeleted);
    socket.on('note:added',       onNoteAdded);
    socket.on('note:deleted',     onNoteDeleted);

    return () => {
      socket.off('material:added',   onMaterialAdded);
      socket.off('material:updated', onMaterialUpdated);
      socket.off('material:deleted', onMaterialDeleted);
      socket.off('note:added',       onNoteAdded);
      socket.off('note:deleted',     onNoteDeleted);
    };
  }, [reload]);

  if (!student) return null;

  /* ── Computed values ── */
  const visibleMaterials = materials.filter((m) => {
    const classOk  = classFilter === "mine"
      ? (!m.class || m.class === student.class || m.class.toLowerCase() === "all")
      : true;
    const searchOk = !search.trim() ||
      m.lectureTitle.toLowerCase().includes(search.toLowerCase()) ||
      m.chapter.toLowerCase().includes(search.toLowerCase()) ||
      (m.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return classOk && searchOk;
  });

  const visibleNotes = allNotes.filter((n) =>
    !n.visibility || n.visibility === "all" || n.visibility === student.class
  );

  const subjectCounts     = SUBJECTS.reduce((a, s) => { a[s] = visibleMaterials.filter((m) => m.subject === s).length; return a; }, {});
  const subjectNoteCounts = SUBJECTS.reduce((a, s) => { a[s] = visibleNotes.filter((n) => n.subject === s).length; return a; }, {});
  const subjectMaterials  = activeSubject ? visibleMaterials.filter((m) => m.subject === activeSubject) : [];
  const subjectNotes      = visibleNotes.filter((n) => n.subject === activeSubject);
  const chapters          = [...new Set([...subjectMaterials.map((m) => m.chapter), ...subjectNotes.map((n) => n.chapter)])];

  function getSubjectProgress(subject) {
    const mats = visibleMaterials.filter((m) => m.subject === subject);
    if (!mats.length) return 0;
    return Math.round((mats.filter((m) => completedIds.has(m.id)).length / mats.length) * 100);
  }

  /* ── Handlers ── */
  function toggleChapter(ch) { setExpandedChapters((p) => ({ ...p, [ch]: !p[ch] })); }

  function openVideo(material) {
    recordView(student.id, material.id);
    reload(student);
    setVideoModal(material);
  }

  async function openNote(note) {
    if (note.fileId) {
      const url = await getFileBlobUrl(note.fileId);
      if (url) {
        setPdfViewer({ viewerUrl: url, directUrl: null, title: note.title, chapter: note.chapter, materialType: note.materialType, noteId: note.id });
        return;
      }
      // fileId blob not found on this device — fall through to server URL
    }
    if (note.pdfUrl) {
      // Server-uploaded files (/uploads/...) — serve directly via Express
      // External URLs — use Google Docs viewer
      const isServerFile = note.pdfUrl.startsWith('/uploads/');
      const viewerUrl = isServerFile ? note.pdfUrl : getPdfViewerUrl(note.pdfUrl);
      setPdfViewer({ viewerUrl, directUrl: note.pdfUrl, title: note.title, chapter: note.chapter, materialType: note.materialType, noteId: note.id });
    }
  }

  function downloadNote(note) {
    if (note.pdfUrl) window.open(note.pdfUrl, "_blank", "noopener,noreferrer");
    else if (note.fileId) {
      getFileBlobUrl(note.fileId).then((url) => {
        if (!url) return;
        const a = document.createElement("a");
        a.href = url; a.download = (note.fileInfo?.name) || note.title + ".pdf"; a.click();
      });
    }
  }

  function handleNoteBookmark(noteId) {
    toggleBookmark(student.id, noteId);
    setBookmarkedNoteIds(getBookmarkIds(student.id));
  }

  function selectSubject(subject) { setActiveSubject(subject); setExpandedChapters({}); setSearch(""); setActiveFilter("all"); }

  function handleToggleComplete(e, material) {
    e.stopPropagation();
    const alreadyDone = completedIds.has(material.id);
    toggleComplete(student.id, material.id);
    const newCompleted = getCompletedIds(student.id);
    setCompletedIds(newCompleted);
    if (!alreadyDone) {
      const subjectMats = visibleMaterials.filter((m) => m.subject === material.subject);
      if (subjectMats.length > 0 && subjectMats.every((m) => newCompleted.has(m.id))) {
        setBadgeSubject(material.subject);
      }
    }
  }

  function handleTagClick(tag) { setSearch(tag); setActiveSubject(null); setActiveFilter("all"); }

  const color           = activeSubject ? getSubjectColor(activeSubject) : null;
  const subjectProgress = activeSubject ? (() => {
    const total = subjectMaterials.length;
    const done  = subjectMaterials.filter((m) => completedIds.has(m.id)).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  })() : null;

  const filterLists = {
    videos:     visibleMaterials,
    notes:      visibleNotes,
    completed:  visibleMaterials.filter((m) => completedIds.has(m.id)),
    bookmarked: visibleNotes.filter((n) => bookmarkedNoteIds.has(n.id)),
  };
  const showFilteredList = activeFilter !== "all" && !activeSubject && !search;

  const searchedNotes = search.trim() ? visibleNotes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.chapter.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase()) ||
    (n.materialType || "").toLowerCase().includes(search.toLowerCase())
  ) : [];

  /* ── Note row (reusable inline component) ── */
  function NoteRow({ note }) {
    const tm = TYPE_META[note.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };
    const c  = getSubjectColor(note.subject);
    return (
      <div className="study-note-card">
        <div className="study-note-card-icon" style={{ background: tm.bg, color: tm.color }}>{tm.icon}</div>
        <div className="study-note-card-info">
          <span className="study-note-card-type" style={{ color: tm.color }}>{note.materialType}</span>
          <p className="study-note-card-title">{note.title}</p>
          {note.description && <p className="study-note-card-desc">{note.description}</p>}
          {note.subject && <p className="study-note-card-desc" style={{ color: c.accent }}>{note.subject} · {note.chapter}</p>}
        </div>
        <div className="study-note-card-actions">
          <button className="study-note-btn study-note-btn--open" onClick={() => openNote(note)}>Open</button>
          <button className="study-note-btn study-note-btn--dl" onClick={() => downloadNote(note)} title="Download">↓</button>
          <button className={`study-note-btn study-note-btn--bm ${bookmarkedNoteIds.has(note.id) ? "saved" : ""}`} onClick={() => handleNoteBookmark(note.id)}>
            {bookmarkedNoteIds.has(note.id) ? "🔖" : "🏷️"}
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════
     RENDER
  ══════════════════════════════ */
  return (
    <div className="student-layout">
      <Header subtitle={`Class ${student.class} · Study Materials`} />
      <SyncToast material={syncToast} onClose={() => setSyncToast(null)} />
      <main className="study-student-main">

        {/* Top bar */}
        <div className="study-student-topbar">
          <div className="study-class-tabs">
            <button className={`study-class-tab ${classFilter === "mine" ? "active" : ""}`} onClick={() => setClassFilter("mine")}>
              My Class ({student.class})
            </button>
            <button className={`study-class-tab ${classFilter === "all" ? "active" : ""}`} onClick={() => setClassFilter("all")}>
              All Classes
            </button>
          </div>
          {streakData.streak > 0 && (
            <div className="study-streak-badge" title={`Best: ${streakData.longestStreak} days`}>
              🔥 {streakData.streak} day{streakData.streak !== 1 ? "s" : ""}
            </div>
          )}
          {activeSubject && (
            <button className="study-back-btn" onClick={() => { setActiveSubject(null); setSearch(""); setActiveFilter("all"); }}>
              ← All Subjects
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="study-search-wrap">
          <span className="study-search-ico"><SearchIcon size={16}/></span>
          <input
            className="study-search-field"
            placeholder={activeSubject ? `Search in ${activeSubject}…` : "Search lectures, notes, chapters, tags…"}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveFilter("all"); }}
          />
          {search && <button className="study-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>

        {/* Filter chips */}
        {!activeSubject && !search && (
          <div className="study-filter-chips">
            {[
              { id: "all",        label: "All"         },
              { id: "videos",     label: "📹 Videos"   },
              { id: "notes",      label: "📄 Notes"    },
              { id: "completed",  label: "✓ Completed" },
              { id: "bookmarked", label: "🔖 Saved"    },
            ].map((f) => (
              <button key={f.id} className={`study-filter-chip ${activeFilter === f.id ? "active" : ""}`} onClick={() => setActiveFilter(f.id)}>
                {f.label}
                {f.id !== "all" && (filterLists[f.id]?.length || 0) > 0 && (
                  <span className="study-filter-chip-count">{filterLists[f.id].length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Home screen ── */}
        {!activeSubject && !search && (
          <>
            {/* Live classes */}
            {liveClasses.length > 0 && activeFilter === "all" && (
              <section className="study-live-section">
                <div className="study-section-heading">
                  <span className="study-live-dot"/>
                  <span>Live Classes</span>
                </div>
                <div className="study-live-row">
                  {liveClasses.map((lc) => {
                    const now    = new Date();
                    const start  = new Date(lc.scheduledAt);
                    const isLive = now >= start && now <= new Date(start.getTime() + 7200000);
                    const c      = getSubjectColor(lc.subject);
                    return (
                      <div key={lc.id} className={`study-live-card ${isLive ? "study-live-card--live" : ""}`}>
                        {isLive && <span className="study-live-now-badge">🔴 Live Now</span>}
                        <p className="study-live-subject" style={{ color: c.accent }}>{lc.subject}</p>
                        <h4 className="study-live-title">{lc.title}</h4>
                        <p className="study-live-time">
                          {isLive
                            ? `Started ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                        {lc.description && <p className="study-live-desc">{lc.description}</p>}
                        <a href={lc.meetLink} target="_blank" rel="noopener noreferrer"
                          className={`study-live-join ${isLive ? "study-live-join--live" : ""}`}>
                          {isLive ? "Join Now →" : "→ Get Link"}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Filtered flat list */}
            {showFilteredList && (
              <div className="study-filter-list">
                {(activeFilter === "videos" || activeFilter === "completed") && (
                  filterLists[activeFilter].length === 0 ? (
                    <div className="study-student-empty">
                      <p className="study-empty-title">{activeFilter === "completed" ? "No completed videos yet" : "No videos available"}</p>
                      {activeFilter === "completed" && <p className="study-empty-sub">Mark lectures as done to track your progress.</p>}
                    </div>
                  ) : (
                    <div className="study-lectures">
                      {filterLists[activeFilter].map((lec) => (
                        <LectureCard key={lec.id} lec={lec} done={completedIds.has(lec.id)}
                          onWatch={() => openVideo(lec)} onPdf={() => window.open(lec.pdfUrl, "_blank")}
                          onToggleDone={(e) => handleToggleComplete(e, lec)}
                          accentColor={getSubjectColor(lec.subject).accent} showSubjectTag onTagClick={handleTagClick}/>
                      ))}
                    </div>
                  )
                )}
                {(activeFilter === "notes" || activeFilter === "bookmarked") && (
                  filterLists[activeFilter].length === 0 ? (
                    <div className="study-student-empty">
                      <p className="study-empty-title">{activeFilter === "bookmarked" ? "No saved notes yet" : "No notes available"}</p>
                      {activeFilter === "bookmarked" && <p className="study-empty-sub">Bookmark notes using the 🏷️ button.</p>}
                    </div>
                  ) : (
                    <div className="study-notes-grid">
                      {filterLists[activeFilter].map((note) => <NoteRow key={note.id} note={note}/>)}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Normal home content */}
            {activeFilter === "all" && (
              <>
                {/* Continue Learning */}
                {recentMaterials.length > 0 && (
                  <section className="study-continue-section">
                    <div className="study-section-heading">
                      <span className="study-section-icon">▶</span>
                      <span>Continue Learning</span>
                    </div>
                    <div className="study-continue-grid">
                      {recentMaterials.map((m) => {
                        const ytId = extractYouTubeId(m.youtubeUrl);
                        const c    = getSubjectColor(m.subject);
                        const done = completedIds.has(m.id);
                        return (
                          <div key={m.id} className="study-continue-card" onClick={() => openVideo(m)}>
                            <div className="study-continue-thumb" style={{ background: c.bg }}>
                              {ytId ? <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={m.lectureTitle} loading="lazy"/> : <div className="study-continue-thumb--empty"><BookOpenIcon size={20}/></div>}
                              <div className="study-continue-play-overlay"><PlayCircleIcon size={28}/></div>
                              {done && <span className="study-done-badge">✓</span>}
                            </div>
                            <div className="study-continue-info">
                              <p className="study-continue-subject" style={{ color: c.accent }}>{m.subject}</p>
                              <p className="study-continue-title">{m.lectureTitle}</p>
                              <p className="study-continue-chapter">{m.chapter}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Recently Added */}
                {recentlyAdded.length > 0 && (
                  <section className="study-recent-section">
                    <div className="study-section-heading">
                      <span className="study-section-icon study-section-icon--new">✦</span>
                      <span>Recently Added</span>
                    </div>
                    <div className="study-recent-row">
                      {recentlyAdded.map((item) => {
                        const c = getSubjectColor(item.subject);
                        if (item._type === "video") {
                          const ytId = extractYouTubeId(item.youtubeUrl);
                          return (
                            <div key={item.id} className="study-recent-card study-recent-card--video" onClick={() => openVideo(item)}>
                              <div className="study-recent-thumb" style={{ background: c.bg }}>
                                {ytId ? <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={item._title} loading="lazy"/> : <div className="study-recent-thumb-empty"><PlayCircleIcon size={18}/></div>}
                                <div className="study-recent-play"><PlayCircleIcon size={20}/></div>
                                <span className="study-recent-type-badge study-recent-type-badge--video">▶ Video</span>
                              </div>
                              <div className="study-recent-info">
                                <p className="study-recent-subject" style={{ color: c.accent }}>{item.subject}</p>
                                <p className="study-recent-title">{item._title}</p>
                                <p className="study-recent-chapter">{item.chapter}</p>
                              </div>
                            </div>
                          );
                        }
                        const tm = TYPE_META[item.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };
                        return (
                          <div key={item.id} className="study-recent-card study-recent-card--note" onClick={() => openNote(item)}>
                            <div className="study-recent-thumb study-recent-thumb--note" style={{ background: tm.bg }}>
                              <span className="study-recent-note-icon">{tm.icon}</span>
                              <span className="study-recent-type-badge" style={{ background: tm.bg, color: tm.color }}>{item.materialType}</span>
                            </div>
                            <div className="study-recent-info">
                              <p className="study-recent-subject" style={{ color: c.accent }}>{item.subject}</p>
                              <p className="study-recent-title">{item._title}</p>
                              <p className="study-recent-chapter">{item.chapter}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Subject grid */}
                <div className="study-section-heading" style={{ marginTop: (recentMaterials.length > 0 || recentlyAdded.length > 0) ? "2rem" : 0 }}>
                  <BookOpenIcon size={18}/><span>Choose a Subject</span>
                </div>
                {visibleMaterials.length === 0 && visibleNotes.length === 0 ? (
                  <div className="study-student-empty">
                    <div className="study-empty-icon"><BookOpenIcon size={40}/></div>
                    <p className="study-empty-title">No study material yet</p>
                    <p className="study-empty-sub">Your teacher hasn't uploaded any content yet.</p>
                  </div>
                ) : (
                  <div className="study-subject-grid">
                    {SUBJECTS.map((subject) => {
                      const c = getSubjectColor(subject);
                      const count = subjectCounts[subject], noteCount = subjectNoteCounts[subject];
                      if (count === 0 && noteCount === 0) return null;
                      const pct = getSubjectProgress(subject);
                      return (
                        <button key={subject} className="study-subject-card"
                          style={{ "--accent": c.accent, "--bg": c.bg, "--fg": c.fg }}
                          onClick={() => selectSubject(subject)}>
                          <span className="study-subject-icon">{c.icon}</span>
                          <span className="study-subject-name">{subject}</span>
                          <span className="study-subject-count">
                            {count > 0 && `${count} video${count !== 1 ? "s" : ""}`}
                            {count > 0 && noteCount > 0 && " · "}
                            {noteCount > 0 && `${noteCount} note${noteCount !== 1 ? "s" : ""}`}
                          </span>
                          {pct > 0 && (
                            <div className="study-subject-progress">
                              <div className="study-subject-progress-bar" style={{ width: pct + "%", background: c.accent }}/>
                              <span className="study-subject-progress-label" style={{ color: c.accent }}>{pct}% done</span>
                            </div>
                          )}
                          <span className="study-subject-arrow"><ChevronRightIcon size={18}/></span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Coming Soon (scheduled) */}
                {scheduledItems.length > 0 && (
                  <section className="study-locked-section">
                    <div className="study-section-heading" style={{ marginTop: "2rem" }}>
                      <span>🔒</span><span>Coming Soon</span>
                    </div>
                    <div className="study-locked-row">
                      {scheduledItems.slice(0, 4).map((m) => {
                        const c = getSubjectColor(m.subject);
                        return (
                          <div key={m.id} className="study-locked-card">
                            <div className="study-locked-thumb" style={{ background: c.bg }}>
                              <span className="study-locked-icon">🔒</span>
                            </div>
                            <div className="study-locked-info">
                              <p className="study-locked-subject" style={{ color: c.accent }}>{m.subject}</p>
                              <p className="study-locked-title">{m.lectureTitle}</p>
                              <p className="study-locked-countdown">Unlocks in {formatCountdown(m.scheduledAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ── Global search results ── */}
        {!activeSubject && search && (
          <>
            <div className="study-section-heading">
              <SearchIcon size={18}/>
              <span>{visibleMaterials.length + searchedNotes.length} result{(visibleMaterials.length + searchedNotes.length) !== 1 ? "s" : ""} for "{search}"</span>
            </div>
            {visibleMaterials.length === 0 && searchedNotes.length === 0 ? (
              <div className="study-student-empty">
                <div className="study-empty-icon"><SearchIcon size={40}/></div>
                <p className="study-empty-title">No results found</p>
                <p className="study-empty-sub">Try different keywords or browse by subject.</p>
              </div>
            ) : (
              <>
                {visibleMaterials.length > 0 && (
                  <>
                    {searchedNotes.length > 0 && <p className="study-search-group-label">📹 Videos ({visibleMaterials.length})</p>}
                    <div className="study-lectures">
                      {visibleMaterials.map((lec) => (
                        <LectureCard key={lec.id} lec={lec} done={completedIds.has(lec.id)}
                          onWatch={() => openVideo(lec)} onPdf={() => window.open(lec.pdfUrl, "_blank")}
                          onToggleDone={(e) => handleToggleComplete(e, lec)}
                          accentColor={getSubjectColor(lec.subject).accent} showSubjectTag onTagClick={handleTagClick}/>
                      ))}
                    </div>
                  </>
                )}
                {searchedNotes.length > 0 && (
                  <>
                    {visibleMaterials.length > 0 && <p className="study-search-group-label" style={{ marginTop: "1.25rem" }}>📄 Notes ({searchedNotes.length})</p>}
                    <div className="study-notes-grid">
                      {searchedNotes.map((note) => <NoteRow key={note.id} note={note}/>)}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Subject / Chapter view ── */}
        {activeSubject && (
          <>
            <div className="study-subject-header" style={{ background: color.bg }}>
              <span className="study-subject-header-icon">{color.icon}</span>
              <div>
                <p className="study-subject-header-label" style={{ color: color.accent }}>Class {student.class}</p>
                <h2 className="study-subject-header-title" style={{ color: color.fg }}>{activeSubject}</h2>
              </div>
              <div className="study-subject-header-right">
                {subjectProgress?.total > 0 && (
                  <div className="study-header-progress">
                    <div className="study-header-progress-bar">
                      <div className="study-header-progress-fill" style={{ width: subjectProgress.pct + "%", background: color.accent }}/>
                    </div>
                    <span className="study-header-progress-label" style={{ color: color.accent }}>
                      {subjectProgress.done}/{subjectProgress.total} done
                    </span>
                  </div>
                )}
              </div>
            </div>

            {chapters.length === 0 ? (
              <div className="study-student-empty"><p className="study-empty-title">No lectures match your search</p></div>
            ) : (
              <div className="study-chapters">
                {chapters.map((chapter) => {
                  const lectures     = subjectMaterials.filter((m) => m.chapter === chapter);
                  const chapterNotes = subjectNotes.filter((n) => n.chapter === chapter);
                  const isOpen       = expandedChapters[chapter] !== false;
                  const chapterDone  = lectures.filter((l) => completedIds.has(l.id)).length;
                  return (
                    <div key={chapter} className="study-chapter">
                      <button className="study-chapter-header" onClick={() => toggleChapter(chapter)}>
                        <div className="study-chapter-left">
                          <span className="study-chapter-dot" style={{ background: color.accent }}/>
                          <span className="study-chapter-name">{chapter}</span>
                          {lectures.length > 0 && <span className="study-chapter-badge">{lectures.length}</span>}
                          {chapterNotes.length > 0 && <span className="study-chapter-notes-badge">{chapterNotes.length} note{chapterNotes.length !== 1 ? "s" : ""}</span>}
                          {chapterDone > 0 && <span className="study-chapter-done" style={{ color: color.accent }}>{chapterDone}/{lectures.length} done</span>}
                        </div>
                        <span className={`study-chapter-chevron ${isOpen ? "open" : ""}`}><ChevronRightIcon size={16}/></span>
                      </button>

                      {isOpen && (
                        <div className="study-chapter-body">
                          {lectures.length > 0 && (
                            <div className="study-lectures">
                              {lectures.map((lec) => (
                                <LectureCard key={lec.id} lec={lec} done={completedIds.has(lec.id)}
                                  onWatch={() => openVideo(lec)} onPdf={() => window.open(lec.pdfUrl, "_blank")}
                                  onToggleDone={(e) => handleToggleComplete(e, lec)}
                                  accentColor={color.accent} onTagClick={handleTagClick}/>
                              ))}
                            </div>
                          )}
                          {chapterNotes.length > 0 && (
                            <div className="study-notes-section">
                              <div className="study-notes-heading"><FileTextIcon size={14}/> Notes & PDFs</div>
                              <div className="study-notes-grid">
                                {chapterNotes.map((note) => <NoteRow key={note.id} note={note}/>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <StudentNav />

      {/* Completion badge */}
      {badgeSubject && <CompletionBadge subject={badgeSubject} onClose={() => setBadgeSubject(null)} />}

      {/* PDF Viewer */}
      {pdfViewer && (
        <div className="study-pdf-overlay" onClick={() => setPdfViewer(null)}>
          <div className="study-pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="study-pdf-modal-header">
              <div className="study-pdf-modal-info">
                <p className="study-pdf-modal-type">{pdfViewer.materialType} · {pdfViewer.chapter}</p>
                <h3 className="study-pdf-modal-title">{pdfViewer.title}</h3>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button className={`study-note-btn study-note-btn--bm ${pdfViewer.noteId && bookmarkedNoteIds.has(pdfViewer.noteId) ? "saved" : ""}`}
                  onClick={() => pdfViewer.noteId && handleNoteBookmark(pdfViewer.noteId)}>
                  {pdfViewer.noteId && bookmarkedNoteIds.has(pdfViewer.noteId) ? "🔖" : "🏷️"}
                </button>
                <button className="study-video-close" onClick={() => setPdfViewer(null)}>✕</button>
              </div>
            </div>
            <div className="study-pdf-frame">
              {pdfViewer.viewerUrl ? (
                <iframe src={pdfViewer.viewerUrl} title={pdfViewer.title} frameBorder="0" allowFullScreen className="study-pdf-iframe"/>
              ) : (
                <div className="study-pdf-no-preview">
                  <p>Cannot preview inline.</p>
                  {pdfViewer.directUrl && <button className="study-note-btn study-note-btn--open" onClick={() => window.open(pdfViewer.directUrl, "_blank")}>Open in New Tab</button>}
                </div>
              )}
            </div>
            {pdfViewer.directUrl && (
              <div className="study-pdf-modal-footer">
                <button className="study-pdf-open-tab-btn" onClick={() => window.open(pdfViewer.directUrl, "_blank")}>↗ Open in New Tab</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player */}
      {videoModal && (
        <VideoModal
          material={videoModal}
          done={completedIds.has(videoModal.id)}
          onClose={() => setVideoModal(null)}
          onPdf={() => window.open(videoModal.pdfUrl, "_blank")}
          onToggleDone={(e) => handleToggleComplete(e, videoModal)}
          allNotes={allNotes}
          onOpenNote={openNote}
          studentId={student.id}
        />
      )}
    </div>
  );
}
