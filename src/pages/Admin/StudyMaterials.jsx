import { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  getAllMaterials as getAllLectures, addMaterial as addLecture,
  updateMaterial as updateLecture, deleteMaterial as deleteLecture,
  SUBJECTS, STUDY_CLASSES, CONTENT_TYPES, extractYouTubeId,
  parseTimestampsStr, swapLectureOrder, getCompletionStats,
} from "../../database/studyMaterials";
import {
  getAllMaterials as getAllNotes, addMaterial as addNote,
  updateMaterial as updateNote, deleteMaterial as deleteNote,
  MATERIAL_TYPES, TYPE_META,
} from "../../database/materials";
import {
  getAllLiveClasses, addLiveClass, updateLiveClass, deleteLiveClass,
} from "../../database/liveClasses";
import { storeFile, deleteStoredFile, formatFileSize, getFileBlobUrl } from "../../database/fileStore";
import { BookOpenIcon, PlayCircleIcon, FileTextIcon, UploadIcon, SearchIcon, NotesIcon } from "../../components/Icons";
import NetworkStatus from "../../components/NetworkStatus";
import { syncMaterialToServer, deleteMaterialFromServer, syncNoteToServer, deleteNoteFromServer } from "../../lib/api";
import "./StudyMaterials.css";

/* ─────────────── shared helpers ─────────────── */
const SUBJECT_COLORS = {
  "Math":           { bg: "#ede9fe", fg: "#6d28d9", dot: "#8b5cf6" },
  "Science":        { bg: "#dcfce7", fg: "#15803d", dot: "#22c55e" },
  "English":        { bg: "#dbeafe", fg: "#1d4ed8", dot: "#3b82f6" },
  "Social Science": { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
};
function subjectColor(s) { return SUBJECT_COLORS[s] || { bg: "#f4f4f5", fg: "#52525b", dot: "#a1a1aa" }; }
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function StatusPill({ status, scheduledAt }) {
  if (status === "draft") return <span className="sm-status-pill sm-status-pill--draft">Draft</span>;
  if (scheduledAt && new Date(scheduledAt) > new Date()) return <span className="sm-status-pill sm-status-pill--scheduled">Scheduled</span>;
  return <span className="sm-status-pill sm-status-pill--live">Live</span>;
}

/* ─────────────── LECTURE form defaults ─────────────── */
const EMPTY_LEC = {
  subject: "", class: "", chapter: "", lectureTitle: "",
  youtubeUrl: "", pdfUrl: "", description: "",
  contentType: "YouTube Video", status: "published",
  scheduledAt: "", tags: "", visibility: "all",
  timestampsStr: "", relatedNoteIds: [],
};

/* ─────────────── NOTE form defaults ─────────────── */
const EMPTY_NOTE = {
  class: "", subject: "", chapter: "", materialType: "",
  title: "", description: "", pdfUrl: "", visibility: "all", status: "published",
};

/* ─────────────── LIVE CLASS form defaults ─────────────── */
const EMPTY_LC = {
  title: "", subject: "", class: "", scheduledAt: "",
  meetLink: "", description: "",
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AdminStudyMaterials() {
  const [activeTab, setActiveTab] = useState("lectures");

  /* ── Lectures state ── */
  const [lectures, setLectures]       = useState([]);
  const [showLecForm, setShowLecForm] = useState(false);
  const [editLecId, setEditLecId]     = useState(null);
  const [lecForm, setLecForm]         = useState(EMPTY_LEC);
  const [lecErrors, setLecErrors]     = useState({});
  const [lecSearch, setLecSearch]     = useState("");
  const [lecFClass, setLecFClass]     = useState("All");
  const [lecFSubject, setLecFSubject] = useState("All");
  const [lecFStatus, setLecFStatus]   = useState("All");
  const [lecSort, setLecSort]         = useState("newest");
  const [lecDelConfirm, setLecDelConfirm]   = useState(null);
  const [lecVideoPreview, setLecVideoPreview] = useState(null);
  const [completionStats, setCompletionStats] = useState({ counts: {}, totalStudents: 0 });

  /* ── Notes state ── */
  const [notes, setNotes]               = useState([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editNoteId, setEditNoteId]     = useState(null);
  const [noteForm, setNoteForm]         = useState(EMPTY_NOTE);
  const [noteErrors, setNoteErrors]     = useState({});
  const [noteSearch, setNoteSearch]     = useState("");
  const [noteFClass, setNoteFClass]     = useState("All");
  const [noteFSubject, setNoteFSubject] = useState("All");
  const [noteFType, setNoteFType]       = useState("All");
  const [noteSort, setNoteSort]         = useState("newest");
  const [noteDelConfirm, setNoteDelConfirm] = useState(null);
  const [fileSource, setFileSource]     = useState("url");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const fileRef = useRef(null);

  /* ── Live Classes state ── */
  const [liveClasses, setLiveClasses]     = useState([]);
  const [showLcForm, setShowLcForm]       = useState(false);
  const [editLcId, setEditLcId]           = useState(null);
  const [lcForm, setLcForm]               = useState(EMPTY_LC);
  const [lcErrors, setLcErrors]           = useState({});
  const [lcDelConfirm, setLcDelConfirm]   = useState(null);

  useEffect(() => { reloadAll(); }, []);

  function reloadAll()     { reloadLectures(); reloadNotes(); reloadLiveClasses(); }
  function reloadLectures() { setLectures(getAllLectures()); setCompletionStats(getCompletionStats()); }
  function reloadNotes()    { setNotes(getAllNotes()); }
  function reloadLiveClasses() { setLiveClasses(getAllLiveClasses()); }

  /* ══════════════════════
     LECTURES CRUD
  ══════════════════════ */
  function openAddLec() { setLecForm(EMPTY_LEC); setLecErrors({}); setEditLecId(null); setShowLecForm(true); }

  function openEditLec(m) {
    const tsStr = (m.timestamps || []).map((ts) => `${ts.time} ${ts.label}`).join("\n");
    setLecForm({
      subject: m.subject, class: m.class, chapter: m.chapter,
      lectureTitle: m.lectureTitle, youtubeUrl: m.youtubeUrl || "",
      pdfUrl: m.pdfUrl || "", description: m.description || "",
      contentType: m.contentType || "YouTube Video",
      status: m.status || "published",
      scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 16) : "",
      tags: m.tags ? m.tags.join(", ") : "",
      visibility: m.visibility || "all",
      timestampsStr: tsStr,
      relatedNoteIds: m.relatedNoteIds || [],
    });
    setLecErrors({}); setEditLecId(m.id); setShowLecForm(true);
  }

  function closeLecForm() { setShowLecForm(false); setEditLecId(null); }

  function handleLecChange(e) {
    const { name, value } = e.target;
    setLecForm((f) => ({ ...f, [name]: value }));
    setLecErrors((er) => ({ ...er, [name]: "" }));
  }

  function toggleRelatedNote(noteId) {
    setLecForm((f) => {
      const ids = f.relatedNoteIds || [];
      return { ...f, relatedNoteIds: ids.includes(noteId) ? ids.filter((id) => id !== noteId) : [...ids, noteId] };
    });
  }

  function validateLec() {
    const e = {};
    if (!lecForm.subject)             e.subject      = "Select a subject";
    if (!lecForm.class)               e.class        = "Select a class";
    if (!lecForm.chapter.trim())      e.chapter      = "Enter chapter name";
    if (!lecForm.lectureTitle.trim()) e.lectureTitle = "Enter lecture title";
    const needsVideo = lecForm.contentType === "YouTube Video" || lecForm.contentType === "Combined";
    const needsPdf   = lecForm.contentType === "PDF Notes"     || lecForm.contentType === "Combined";
    if (needsVideo && !lecForm.youtubeUrl.trim()) e.youtubeUrl = "YouTube link required";
    if (needsPdf   && !lecForm.pdfUrl.trim())     e.pdfUrl     = "PDF URL required";
    return e;
  }

  function handleSaveLec() {
    const e = validateLec();
    if (Object.keys(e).length) { setLecErrors(e); return; }
    const payload = {
      ...lecForm,
      tags:           lecForm.tags ? lecForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      scheduledAt:    lecForm.scheduledAt || null,
      timestamps:     parseTimestampsStr(lecForm.timestampsStr || ""),
      relatedNoteIds: lecForm.relatedNoteIds || [],
    };
    delete payload.timestampsStr;
    const saved = editLecId ? updateLecture(editLecId, payload) : addLecture(payload);
    reloadLectures(); closeLecForm();
    if (saved) syncMaterialToServer(saved);
  }

  function handleDeleteLec(id) { deleteLecture(id); setLecDelConfirm(null); reloadLectures(); deleteMaterialFromServer(id); }

  function handleReorder(idA, idB) { swapLectureOrder(idA, idB); reloadLectures(); }

  function resolveLecStatus(m) {
    if (m.status === "draft") return "draft";
    if (m.scheduledAt && new Date(m.scheduledAt) > new Date()) return "scheduled";
    return "published";
  }

  const filteredLectures = lectures
    .filter((m) => {
      const q = lecSearch.toLowerCase();
      const matchQ = !q ||
        m.lectureTitle.toLowerCase().includes(q) ||
        m.chapter.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchQ &&
        (lecFClass   === "All" || m.class   === lecFClass) &&
        (lecFSubject === "All" || m.subject === lecFSubject) &&
        (lecFStatus  === "All" || resolveLecStatus(m) === lecFStatus);
    })
    .sort((a, b) => {
      if (lecSort === "manual") return (a.sortOrder || 0) - (b.sortOrder || 0);
      return lecSort === "newest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt);
    });

  const lecCountBySubject = SUBJECTS.reduce((a, s) => {
    a[s] = lectures.filter((m) => m.subject === s).length; return a;
  }, {});

  /* ══════════════════════
     NOTES CRUD
  ══════════════════════ */
  function openAddNote() {
    setNoteForm(EMPTY_NOTE); setNoteErrors({});
    setEditNoteId(null); setFileSource("url");
    setSelectedFile(null); setShowNoteForm(true);
  }

  function openEditNote(m) {
    setNoteForm({
      class: m.class, subject: m.subject, chapter: m.chapter,
      materialType: m.materialType || "", title: m.title,
      description: m.description || "", pdfUrl: m.pdfUrl || "",
      visibility: m.visibility || "all", status: m.status || "published",
    });
    setFileSource(m.fileId ? "upload" : "url");
    setSelectedFile(null);
    setNoteErrors({}); setEditNoteId(m.id); setShowNoteForm(true);
  }

  function closeNoteForm() { setShowNoteForm(false); setEditNoteId(null); setSelectedFile(null); }

  function handleNoteChange(e) {
    const { name, value } = e.target;
    setNoteForm((f) => ({ ...f, [name]: value }));
    setNoteErrors((er) => ({ ...er, [name]: "" }));
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("File is too large. Maximum size is 50MB."); return; }
    setSelectedFile(file);
    setNoteErrors((er) => ({ ...er, fileOrUrl: "" }));
  }

  function validateNote() {
    const e = {};
    if (!noteForm.class)          e.class        = "Select a class";
    if (!noteForm.subject)        e.subject      = "Select a subject";
    if (!noteForm.chapter.trim()) e.chapter      = "Enter chapter name";
    if (!noteForm.materialType)   e.materialType = "Select material type";
    if (!noteForm.title.trim())   e.title        = "Enter a title";
    if (fileSource === "url"    && !noteForm.pdfUrl.trim())   e.fileOrUrl = "Paste a PDF / document URL";
    if (fileSource === "upload" && !selectedFile && !editNoteId) e.fileOrUrl = "Select a file to upload";
    return e;
  }

  async function handleSaveNote() {
    const e = validateNote();
    if (Object.keys(e).length) { setNoteErrors(e); return; }
    setUploading(true);
    try {
      const existing = editNoteId ? notes.find((n) => n.id === editNoteId) : null;
      let fileId   = existing?.fileId   || null;
      let fileInfo = existing?.fileInfo || null;

      if (fileSource === "upload" && selectedFile) {
        if (fileId) await deleteStoredFile(fileId);
        fileId   = "file_" + Date.now();
        fileInfo = { name: selectedFile.name, size: selectedFile.size };
        await storeFile(fileId, selectedFile);
      } else if (fileSource === "url") {
        if (fileId && !existing?.pdfUrl) {
          await deleteStoredFile(fileId);
          fileId = null; fileInfo = null;
        }
      }

      const payload = {
        ...noteForm,
        pdfUrl:   fileSource === "url" ? noteForm.pdfUrl : "",
        fileId:   fileSource === "upload" ? fileId : null,
        fileInfo: fileSource === "upload" ? fileInfo : null,
      };

      const savedNote = editNoteId ? updateNote(editNoteId, payload) : addNote(payload);
      reloadNotes(); closeNoteForm();
      if (savedNote) syncNoteToServer(savedNote);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteNote(id) {
    const note = notes.find((n) => n.id === id);
    if (note?.fileId) await deleteStoredFile(note.fileId);
    deleteNote(id); setNoteDelConfirm(null); reloadNotes();
    deleteNoteFromServer(id);
  }

  const filteredNotes = notes
    .filter((m) => {
      const q = noteSearch.toLowerCase();
      const matchQ = !q ||
        m.title.toLowerCase().includes(q) ||
        m.chapter.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.materialType || "").toLowerCase().includes(q);
      return matchQ &&
        (noteFClass   === "All" || m.class       === noteFClass) &&
        (noteFSubject === "All" || m.subject     === noteFSubject) &&
        (noteFType    === "All" || m.materialType === noteFType);
    })
    .sort((a, b) => noteSort === "newest"
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt));

  const noteCountBySubject = SUBJECTS.reduce((a, s) => {
    a[s] = notes.filter((m) => m.subject === s).length; return a;
  }, {});

  /* ══════════════════════
     LIVE CLASSES CRUD
  ══════════════════════ */
  function openAddLc() { setLcForm(EMPTY_LC); setLcErrors({}); setEditLcId(null); setShowLcForm(true); }

  function openEditLc(lc) {
    setLcForm({
      title: lc.title, subject: lc.subject || "", class: lc.class || "",
      scheduledAt: lc.scheduledAt ? lc.scheduledAt.slice(0, 16) : "",
      meetLink: lc.meetLink || "", description: lc.description || "",
    });
    setLcErrors({}); setEditLcId(lc.id); setShowLcForm(true);
  }

  function closeLcForm() { setShowLcForm(false); setEditLcId(null); }

  function handleLcChange(e) {
    const { name, value } = e.target;
    setLcForm((f) => ({ ...f, [name]: value }));
    setLcErrors((er) => ({ ...er, [name]: "" }));
  }

  function validateLc() {
    const e = {};
    if (!lcForm.title.trim())       e.title       = "Enter a title";
    if (!lcForm.class)              e.class       = "Select a class";
    if (!lcForm.scheduledAt)        e.scheduledAt = "Set a date and time";
    if (!lcForm.meetLink.trim())    e.meetLink    = "Paste the meeting link";
    return e;
  }

  function handleSaveLc() {
    const e = validateLc();
    if (Object.keys(e).length) { setLcErrors(e); return; }
    if (editLcId) updateLiveClass(editLcId, lcForm);
    else          addLiveClass(lcForm);
    reloadLiveClasses(); closeLcForm();
  }

  function handleDeleteLc(id) { deleteLiveClass(id); setLcDelConfirm(null); reloadLiveClasses(); }

  /* ══════════════════════
     RENDER
  ══════════════════════ */
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header
          title="Study Materials"
          subtitle={`${lectures.length} lecture${lectures.length !== 1 ? "s" : ""} · ${notes.length} note${notes.length !== 1 ? "s" : ""} · ${liveClasses.length} live`}
        />
        <main className="admin-main">

          {/* ── Sync status bar ── */}
          <div className="sm-sync-bar">
            <NetworkStatus role="admin" />
          </div>

          {/* ── Tab bar ── */}
          <div className="sm-tab-bar">
            <button className={`sm-tab-btn ${activeTab === "lectures" ? "active" : ""}`} onClick={() => setActiveTab("lectures")}>
              <PlayCircleIcon size={16}/> Video Lectures
              <span className="sm-tab-count">{lectures.length}</span>
            </button>
            <button className={`sm-tab-btn ${activeTab === "notes" ? "active" : ""}`} onClick={() => setActiveTab("notes")}>
              <NotesIcon size={16}/> Notes & PDFs
              <span className="sm-tab-count">{notes.length}</span>
            </button>
            <button className={`sm-tab-btn ${activeTab === "live" ? "active" : ""}`} onClick={() => setActiveTab("live")}>
              📡 Live Classes
              <span className="sm-tab-count">{liveClasses.length}</span>
            </button>
          </div>

          {/* ════════════ LECTURES TAB ════════════ */}
          {activeTab === "lectures" && (
            <>
              <div className="study-stats-row">
                {SUBJECTS.map((s) => {
                  const c = subjectColor(s);
                  return (
                    <div key={s} className="study-stat-chip"
                      style={{ background: c.bg, borderColor: c.dot + "33" }}
                      onClick={() => setLecFSubject(lecFSubject === s ? "All" : s)}>
                      <span className="study-stat-dot" style={{ background: c.dot }}/>
                      <span className="study-stat-label" style={{ color: c.fg }}>{s}</span>
                      <span className="study-stat-count" style={{ color: c.dot }}>{lecCountBySubject[s]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="study-toolbar">
                <div className="study-search-box">
                  <span className="study-search-icon"><SearchIcon size={16}/></span>
                  <input className="study-search-input" placeholder="Search lectures, chapters, tags…"
                    value={lecSearch} onChange={(e) => setLecSearch(e.target.value)}/>
                </div>
                <div className="study-filters">
                  <select className="study-filter-select" value={lecFClass} onChange={(e) => setLecFClass(e.target.value)}>
                    <option value="All">All Classes</option>
                    {STUDY_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select className="study-filter-select" value={lecFSubject} onChange={(e) => setLecFSubject(e.target.value)}>
                    <option value="All">All Subjects</option>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="study-filter-select" value={lecFStatus} onChange={(e) => setLecFStatus(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="published">Live</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                  <select className="study-filter-select" value={lecSort} onChange={(e) => setLecSort(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="manual">Manual Order</option>
                  </select>
                </div>
                <button className="study-upload-btn" onClick={openAddLec}>
                  <UploadIcon size={16}/> Add Lecture
                </button>
              </div>

              {filteredLectures.length === 0 ? (
                <EmptyState isEmpty={lectures.length === 0} emptyMsg="No lectures uploaded yet"
                  filterMsg="No lectures match your filters" onAdd={openAddLec} btnLabel="Add Lecture"/>
              ) : (
                <div className="study-list">
                  {filteredLectures.map((m, idx) => {
                    const color = subjectColor(m.subject);
                    const ytId  = extractYouTubeId(m.youtubeUrl);
                    const completedCount = completionStats.counts?.[m.id] || 0;
                    const totalStudents  = completionStats.totalStudents || 0;
                    const completePct    = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : null;
                    const prevId = idx > 0 ? filteredLectures[idx - 1].id : null;
                    const nextId = idx < filteredLectures.length - 1 ? filteredLectures[idx + 1].id : null;
                    return (
                      <div className="study-card" key={m.id}>
                        {ytId ? (
                          <div className="study-card-thumb">
                            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={m.lectureTitle} loading="lazy"/>
                            <div className="study-card-play"><PlayCircleIcon size={28}/></div>
                          </div>
                        ) : (
                          <div className="study-card-thumb study-card-thumb--empty"><BookOpenIcon size={28}/></div>
                        )}
                        <div className="study-card-body">
                          <div className="study-card-badges">
                            <span className="study-badge" style={{ background: color.bg, color: color.fg }}>{m.subject}</span>
                            <span className="study-badge study-badge--class">Class {m.class}</span>
                          </div>
                          <p className="study-card-chapter">{m.chapter}</p>
                          <h3 className="study-card-title">{m.lectureTitle}</h3>
                          {m.description && <p className="study-card-desc">{m.description}</p>}
                          <div className="study-card-row-bottom">
                            <div className="study-card-links">
                              {m.youtubeUrl && <span className="study-link-chip study-link-chip--video"><PlayCircleIcon size={13}/> Video</span>}
                              {m.pdfUrl     && <span className="study-link-chip study-link-chip--pdf"><FileTextIcon size={13}/> PDF</span>}
                              {(m.timestamps||[]).length > 0 && (
                                <span className="study-link-chip" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                                  ⏱ {m.timestamps.length} chapters
                                </span>
                              )}
                            </div>
                            {m.tags?.length > 0 && (
                              <div className="study-card-tags">
                                {m.tags.slice(0,3).map((t) => <span key={t} className="study-tag-chip">{t}</span>)}
                              </div>
                            )}
                          </div>
                          {/* Analytics */}
                          <div className="sm-analytics-row">
                            <span className="sm-analytics-chip sm-analytics-chip--views">👁 {m.views||0} views</span>
                            {completePct !== null && (
                              <span className="sm-analytics-chip sm-analytics-chip--complete">✓ {completePct}% completed</span>
                            )}
                            {(m.relatedNoteIds||[]).length > 0 && (
                              <span className="sm-analytics-chip">📎 {m.relatedNoteIds.length} note{m.relatedNoteIds.length !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>
                        <div className="study-card-meta">
                          <StatusPill status={m.status} scheduledAt={m.scheduledAt}/>
                          <span className="study-card-date">{fmtDate(m.createdAt)}</span>
                          {/* Reorder buttons (shown in manual sort mode) */}
                          {lecSort === "manual" && (
                            <div className="sm-reorder-btns">
                              <button className="sm-reorder-btn" disabled={!prevId} title="Move up"
                                onClick={() => prevId && handleReorder(m.id, prevId)}>▲</button>
                              <button className="sm-reorder-btn" disabled={!nextId} title="Move down"
                                onClick={() => nextId && handleReorder(m.id, nextId)}>▼</button>
                            </div>
                          )}
                          <div className="study-card-actions">
                            {ytId && (
                              <button className="study-action-btn study-action-btn--preview-video" onClick={() => setLecVideoPreview(m)}>
                                ▶ Preview
                              </button>
                            )}
                            <button className="study-action-btn study-action-btn--edit" onClick={() => openEditLec(m)}>Edit</button>
                            <button className="study-action-btn study-action-btn--delete" onClick={() => setLecDelConfirm(m)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ NOTES TAB ════════════ */}
          {activeTab === "notes" && (
            <>
              <div className="study-stats-row">
                {SUBJECTS.map((s) => {
                  const c = subjectColor(s);
                  return (
                    <div key={s} className="study-stat-chip"
                      style={{ background: c.bg, borderColor: c.dot + "33" }}
                      onClick={() => setNoteFSubject(noteFSubject === s ? "All" : s)}>
                      <span className="study-stat-dot" style={{ background: c.dot }}/>
                      <span className="study-stat-label" style={{ color: c.fg }}>{s}</span>
                      <span className="study-stat-count" style={{ color: c.dot }}>{noteCountBySubject[s]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="study-toolbar">
                <div className="study-search-box">
                  <span className="study-search-icon"><SearchIcon size={16}/></span>
                  <input className="study-search-input" placeholder="Search notes, chapters, types…"
                    value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)}/>
                </div>
                <div className="study-filters">
                  <select className="study-filter-select" value={noteFClass} onChange={(e) => setNoteFClass(e.target.value)}>
                    <option value="All">All Classes</option>
                    {STUDY_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select className="study-filter-select" value={noteFSubject} onChange={(e) => setNoteFSubject(e.target.value)}>
                    <option value="All">All Subjects</option>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select className="study-filter-select" value={noteFType} onChange={(e) => setNoteFType(e.target.value)}>
                    <option value="All">All Types</option>
                    {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <select className="study-filter-select" value={noteSort} onChange={(e) => setNoteSort(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <button className="study-upload-btn" onClick={openAddNote}>
                  <UploadIcon size={16}/> Upload Notes
                </button>
              </div>

              {filteredNotes.length === 0 ? (
                <EmptyState isEmpty={notes.length === 0} emptyMsg="No notes uploaded yet"
                  filterMsg="No notes match your filters" onAdd={openAddNote} btnLabel="Upload Notes"/>
              ) : (
                <div className="study-list">
                  {filteredNotes.map((m) => {
                    const tm = TYPE_META[m.materialType] || { icon: "📄", color: "#52525b", bg: "#f4f4f5" };
                    const sc = subjectColor(m.subject);
                    return (
                      <div className="study-card" key={m.id}>
                        <div className="study-card-thumb study-card-thumb--note" style={{ background: tm.bg }}>
                          <span className="study-card-note-icon">{tm.icon}</span>
                        </div>
                        <div className="study-card-body">
                          <div className="study-card-badges">
                            <span className="study-badge" style={{ background: sc.bg, color: sc.fg }}>{m.subject}</span>
                            <span className="study-badge study-badge--class">Class {m.class}</span>
                            <span className="study-badge" style={{ background: tm.bg, color: tm.color }}>{m.materialType}</span>
                            {m.status === "draft" && <span className="sm-status-pill sm-status-pill--draft">Draft</span>}
                          </div>
                          <p className="study-card-chapter">{m.chapter}</p>
                          <h3 className="study-card-title">{m.title}</h3>
                          {m.description && <p className="study-card-desc">{m.description}</p>}
                          <div className="study-card-row-bottom">
                            <div className="study-card-links">
                              {m.fileId && (
                                <span className="study-link-chip study-link-chip--file">
                                  <FileTextIcon size={12}/> Uploaded File
                                  {m.fileInfo && <span className="study-link-chip-size">{formatFileSize(m.fileInfo.size)}</span>}
                                </span>
                              )}
                              {m.pdfUrl && !m.fileId && <span className="study-link-chip study-link-chip--pdf"><FileTextIcon size={12}/> PDF URL</span>}
                            </div>
                            <div className="sm-analytics-row">
                              <span className="sm-analytics-chip sm-analytics-chip--views">👁 {m.views||0} views</span>
                              {(m.downloads||0) > 0 && <span className="sm-analytics-chip">↓ {m.downloads} dl</span>}
                            </div>
                          </div>
                        </div>
                        <div className="study-card-meta">
                          <span className="study-card-date">{fmtDate(m.createdAt)}</span>
                          <div className="study-card-actions">
                            {(m.fileId || m.pdfUrl) && (
                              <button className="study-action-btn study-action-btn--preview"
                                onClick={async () => {
                                  let url = m.pdfUrl || null;
                                  if (m.fileId) url = await getFileBlobUrl(m.fileId);
                                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                                }}>Preview</button>
                            )}
                            <button className="study-action-btn study-action-btn--edit" onClick={() => openEditNote(m)}>Edit</button>
                            <button className="study-action-btn study-action-btn--delete" onClick={() => setNoteDelConfirm(m)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ LIVE CLASSES TAB ════════════ */}
          {activeTab === "live" && (
            <>
              <div className="study-toolbar">
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#71717a" }}>
                    Post Meet/Zoom links with a scheduled time. Students see the Join button when the class is within 2 hours.
                  </p>
                </div>
                <button className="study-upload-btn" onClick={openAddLc}>
                  + Schedule Class
                </button>
              </div>

              {liveClasses.length === 0 ? (
                <div className="study-empty">
                  <div className="study-empty-icon">📡</div>
                  <p className="study-empty-title">No live classes scheduled yet</p>
                  <p className="study-empty-sub">Click "Schedule Class" to post a Google Meet or Zoom link for students.</p>
                  <button className="study-upload-btn" onClick={openAddLc}>+ Schedule Class</button>
                </div>
              ) : (
                <div className="study-list">
                  {liveClasses
                    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
                    .map((lc) => {
                      const now    = new Date();
                      const start  = new Date(lc.scheduledAt);
                      const isLive = now >= start && now <= new Date(start.getTime() + 7200000);
                      const isPast = now > new Date(start.getTime() + 7200000);
                      const c      = subjectColor(lc.subject);
                      return (
                        <div className="sm-lc-card" key={lc.id}>
                          <div className="sm-lc-card-left">
                            <div className="sm-lc-icon" style={{ background: c.bg }}>📡</div>
                            <div className="sm-lc-info">
                              <div className="sm-lc-badges">
                                {lc.subject && <span className="study-badge" style={{ background: c.bg, color: c.fg }}>{lc.subject}</span>}
                                {lc.class   && <span className="study-badge study-badge--class">Class {lc.class}</span>}
                                {isLive && <span className="sm-status-pill sm-status-pill--live">🔴 Live Now</span>}
                                {isPast && <span className="sm-status-pill sm-status-pill--draft">Ended</span>}
                              </div>
                              <h3 className="sm-lc-title">{lc.title}</h3>
                              <p className="sm-lc-time">🕐 {fmtDateTime(lc.scheduledAt)}</p>
                              {lc.description && <p className="sm-lc-desc">{lc.description}</p>}
                              <a href={lc.meetLink} target="_blank" rel="noopener noreferrer" className="sm-lc-link">
                                🔗 {lc.meetLink.length > 50 ? lc.meetLink.slice(0, 50) + "…" : lc.meetLink}
                              </a>
                            </div>
                          </div>
                          <div className="study-card-actions" style={{ alignSelf: "flex-start" }}>
                            <button className="study-action-btn study-action-btn--edit" onClick={() => openEditLc(lc)}>Edit</button>
                            <button className="study-action-btn study-action-btn--delete" onClick={() => setLcDelConfirm(lc)}>Delete</button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ════════════ LECTURE MODAL ════════════ */}
      {showLecForm && (
        <div className="study-modal-overlay" onClick={closeLecForm}>
          <div className="study-modal" onClick={(e) => e.stopPropagation()}>
            <div className="study-modal-header">
              <h2 className="study-modal-title">{editLecId ? "Edit Lecture" : "Add Video Lecture"}</h2>
              <button className="study-modal-close" onClick={closeLecForm}>✕</button>
            </div>
            <div className="study-modal-body">
              {/* Content type */}
              <div className="study-form-group">
                <label className="study-form-label">Content Type</label>
                <div className="study-type-pills">
                  {CONTENT_TYPES.map((t) => (
                    <button key={t} type="button"
                      className={`study-type-pill ${lecForm.contentType === t ? "active" : ""}`}
                      onClick={() => setLecForm((f) => ({ ...f, contentType: t }))}>
                      {t === "YouTube Video" && <PlayCircleIcon size={13}/>}
                      {t === "PDF Notes"     && <FileTextIcon size={13}/>}
                      {t === "Combined"      && <BookOpenIcon size={13}/>}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="study-form-row">
                <div className="study-form-group">
                  <label className="study-form-label">Subject</label>
                  <select name="subject" className={`study-form-input ${lecErrors.subject?"is-error":""}`}
                    value={lecForm.subject} onChange={handleLecChange}>
                    <option value="">Select subject</option>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {lecErrors.subject && <span className="study-form-error">{lecErrors.subject}</span>}
                </div>
                <div className="study-form-group">
                  <label className="study-form-label">Class</label>
                  <select name="class" className={`study-form-input ${lecErrors.class?"is-error":""}`}
                    value={lecForm.class} onChange={handleLecChange}>
                    <option value="">Select class</option>
                    {STUDY_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {lecErrors.class && <span className="study-form-error">{lecErrors.class}</span>}
                </div>
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Chapter</label>
                <input name="chapter" className={`study-form-input ${lecErrors.chapter?"is-error":""}`}
                  placeholder="e.g. Chapter 1: Algebra" value={lecForm.chapter} onChange={handleLecChange}/>
                {lecErrors.chapter && <span className="study-form-error">{lecErrors.chapter}</span>}
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Lecture Title</label>
                <input name="lectureTitle" className={`study-form-input ${lecErrors.lectureTitle?"is-error":""}`}
                  placeholder="e.g. Introduction to Algebra" value={lecForm.lectureTitle} onChange={handleLecChange}/>
                {lecErrors.lectureTitle && <span className="study-form-error">{lecErrors.lectureTitle}</span>}
              </div>
              {(lecForm.contentType === "YouTube Video" || lecForm.contentType === "Combined") && (
                <div className="study-form-group">
                  <label className="study-form-label"><span className="study-label-icon"><PlayCircleIcon size={14}/></span>YouTube Link</label>
                  <input name="youtubeUrl" className={`study-form-input ${lecErrors.youtubeUrl?"is-error":""}`}
                    placeholder="https://youtube.com/watch?v=…" value={lecForm.youtubeUrl} onChange={handleLecChange}/>
                  {lecErrors.youtubeUrl && <span className="study-form-error">{lecErrors.youtubeUrl}</span>}
                  {lecForm.youtubeUrl.trim() && (() => {
                    const ytId = extractYouTubeId(lecForm.youtubeUrl);
                    if (!ytId) return <div className="study-yt-invalid">❌ Invalid YouTube URL — paste a valid YouTube link</div>;
                    return (
                      <div className="study-yt-preview">
                        <div className="study-yt-preview-bar">
                          <span className="study-yt-preview-badge">▶ Live Preview</span>
                          <span className="study-yt-preview-id">ID: {ytId}</span>
                        </div>
                        <div className="study-yt-preview-frame">
                          <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} title="Video Preview"
                            allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {(lecForm.contentType === "PDF Notes" || lecForm.contentType === "Combined") && (
                <div className="study-form-group">
                  <label className="study-form-label"><span className="study-label-icon"><FileTextIcon size={14}/></span>PDF Notes URL</label>
                  <input name="pdfUrl" className={`study-form-input ${lecErrors.pdfUrl?"is-error":""}`}
                    placeholder="https://drive.google.com/…" value={lecForm.pdfUrl} onChange={handleLecChange}/>
                  {lecErrors.pdfUrl && <span className="study-form-error">{lecErrors.pdfUrl}</span>}
                </div>
              )}
              <div className="study-form-group">
                <label className="study-form-label">Description <span className="study-label-optional">(optional)</span></label>
                <textarea name="description" className="study-form-input study-form-textarea"
                  placeholder="Brief summary…" value={lecForm.description} onChange={handleLecChange} rows={2}/>
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Tags <span className="study-label-optional">(comma-separated)</span></label>
                <input name="tags" className="study-form-input" placeholder="algebra, basics"
                  value={lecForm.tags} onChange={handleLecChange}/>
              </div>

              {/* ── Video Timestamps ── */}
              <div className="study-form-group">
                <label className="study-form-label">
                  ⏱ Video Chapters / Timestamps <span className="study-label-optional">(optional)</span>
                </label>
                <textarea
                  name="timestampsStr"
                  className="study-form-input study-form-textarea"
                  placeholder={"0:00 Introduction\n5:30 Main Topic\n12:45 Examples\n20:00 Summary"}
                  value={lecForm.timestampsStr}
                  onChange={handleLecChange}
                  rows={4}
                />
                <p className="sm-url-hint">One per line: <code>0:00 Label</code> or <code>1:23:45 Label</code></p>
              </div>

              {/* ── Related Notes ── */}
              {notes.length > 0 && (
                <div className="study-form-group">
                  <label className="study-form-label">
                    📎 Attach Notes <span className="study-label-optional">(students see these inside the video player)</span>
                  </label>
                  <div className="sm-related-notes-list">
                    {notes
                      .filter((n) => !lecForm.subject || n.subject === lecForm.subject || n.subject === "")
                      .map((note) => {
                        const tm = TYPE_META[note.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };
                        const checked = (lecForm.relatedNoteIds || []).includes(note.id);
                        return (
                          <label key={note.id} className={`sm-related-note-item ${checked ? "checked" : ""}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleRelatedNote(note.id)}/>
                            <span className="sm-related-note-icon" style={{ background: tm.bg, color: tm.color }}>{tm.icon}</span>
                            <span className="sm-related-note-info">
                              <span className="sm-related-note-title">{note.title}</span>
                              <span className="sm-related-note-meta">{note.subject} · {note.chapter}</span>
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="study-form-row">
                <div className="study-form-group">
                  <label className="study-form-label">Status</label>
                  <select name="status" className="study-form-input" value={lecForm.status} onChange={handleLecChange}>
                    <option value="published">Publish Now</option>
                    <option value="draft">Save as Draft</option>
                    <option value="scheduled">Schedule</option>
                  </select>
                </div>
                <div className="study-form-group">
                  <label className="study-form-label">Visibility</label>
                  <select name="visibility" className="study-form-input" value={lecForm.visibility} onChange={handleLecChange}>
                    <option value="all">All Classes</option>
                    {STUDY_CLASSES.map((c) => <option key={c} value={c}>Class {c} Only</option>)}
                  </select>
                </div>
              </div>
              {lecForm.status === "scheduled" && (
                <div className="study-form-group">
                  <label className="study-form-label">Schedule Date & Time</label>
                  <input name="scheduledAt" type="datetime-local" className="study-form-input"
                    value={lecForm.scheduledAt} onChange={handleLecChange}/>
                </div>
              )}
            </div>
            <div className="study-modal-footer">
              <button className="study-cancel-btn" onClick={closeLecForm}>Cancel</button>
              <button className="study-publish-btn" onClick={handleSaveLec}>
                {editLecId ? "Save Changes" : lecForm.status === "draft" ? "Save Draft" : lecForm.status === "scheduled" ? "Schedule" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ NOTES MODAL ════════════ */}
      {showNoteForm && (
        <div className="study-modal-overlay" onClick={closeNoteForm}>
          <div className="study-modal" onClick={(e) => e.stopPropagation()}>
            <div className="study-modal-header">
              <h2 className="study-modal-title">{editNoteId ? "Edit Notes / PDF" : "Upload Notes / PDF"}</h2>
              <button className="study-modal-close" onClick={closeNoteForm}>✕</button>
            </div>
            <div className="study-modal-body">
              <div className="study-form-group">
                <label className="study-form-label">Material Type</label>
                <div className="sm-type-grid">
                  {MATERIAL_TYPES.map((t) => {
                    const tm = TYPE_META[t];
                    return (
                      <button key={t} type="button"
                        className={`sm-type-btn ${noteForm.materialType === t ? "active" : ""}`}
                        style={noteForm.materialType === t ? { background: tm.bg, borderColor: tm.color, color: tm.color } : {}}
                        onClick={() => setNoteForm((f) => ({ ...f, materialType: t }))}>
                        <span>{tm.icon}</span><span>{t}</span>
                      </button>
                    );
                  })}
                </div>
                {noteErrors.materialType && <span className="study-form-error">{noteErrors.materialType}</span>}
              </div>

              <div className="study-form-row">
                <div className="study-form-group">
                  <label className="study-form-label">Class</label>
                  <select name="class" className={`study-form-input ${noteErrors.class?"is-error":""}`}
                    value={noteForm.class} onChange={handleNoteChange}>
                    <option value="">Select class</option>
                    {STUDY_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {noteErrors.class && <span className="study-form-error">{noteErrors.class}</span>}
                </div>
                <div className="study-form-group">
                  <label className="study-form-label">Subject</label>
                  <select name="subject" className={`study-form-input ${noteErrors.subject?"is-error":""}`}
                    value={noteForm.subject} onChange={handleNoteChange}>
                    <option value="">Select subject</option>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {noteErrors.subject && <span className="study-form-error">{noteErrors.subject}</span>}
                </div>
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Chapter</label>
                <input name="chapter" className={`study-form-input ${noteErrors.chapter?"is-error":""}`}
                  placeholder="e.g. Chapter 1: Algebra" value={noteForm.chapter} onChange={handleNoteChange}/>
                {noteErrors.chapter && <span className="study-form-error">{noteErrors.chapter}</span>}
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Title</label>
                <input name="title" className={`study-form-input ${noteErrors.title?"is-error":""}`}
                  placeholder="e.g. Algebra Short Notes" value={noteForm.title} onChange={handleNoteChange}/>
                {noteErrors.title && <span className="study-form-error">{noteErrors.title}</span>}
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Description <span className="study-label-optional">(optional)</span></label>
                <textarea name="description" className="study-form-input study-form-textarea"
                  placeholder="Brief description…" value={noteForm.description} onChange={handleNoteChange} rows={2}/>
              </div>

              <div className="study-form-group">
                <label className="study-form-label">PDF / Document</label>
                <div className="sm-source-toggle">
                  <button type="button" className={`sm-source-btn ${fileSource === "url" ? "active" : ""}`}
                    onClick={() => { setFileSource("url"); setSelectedFile(null); }}>🔗 Paste URL</button>
                  <button type="button" className={`sm-source-btn ${fileSource === "upload" ? "active" : ""}`}
                    onClick={() => { setFileSource("upload"); setNoteForm((f) => ({ ...f, pdfUrl: "" })); }}>📤 Upload from PC</button>
                </div>

                {fileSource === "url" && (
                  <div>
                    <input name="pdfUrl" className={`study-form-input ${noteErrors.fileOrUrl?"is-error":""}`}
                      placeholder="https://drive.google.com/file/d/… or direct PDF link"
                      value={noteForm.pdfUrl} onChange={handleNoteChange}/>
                    <p className="sm-url-hint">📎 Google Drive, Dropbox, OneDrive, or any direct .pdf link</p>
                  </div>
                )}

                {fileSource === "upload" && (
                  <div
                    className={`sm-dropzone ${selectedFile ? "has-file" : ""} ${noteErrors.fileOrUrl ? "is-error" : ""}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileSelect({ target: { files: [file] } });
                    }}
                  >
                    <input type="file" ref={fileRef} accept=".pdf,.docx,.pptx,.ppt,.doc"
                      onChange={handleFileSelect} style={{ display: "none" }}/>
                    {selectedFile ? (
                      <div className="sm-dropzone-file">
                        <span className="sm-dropzone-file-icon">📄</span>
                        <div>
                          <p className="sm-dropzone-filename">{selectedFile.name}</p>
                          <p className="sm-dropzone-filesize">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button type="button" className="sm-dropzone-remove"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>✕</button>
                      </div>
                    ) : (
                      <div className="sm-dropzone-idle">
                        {editNoteId && notes.find((n) => n.id === editNoteId)?.fileId ? (
                          <p className="sm-dropzone-replace">Click to replace existing file</p>
                        ) : (
                          <>
                            <span className="sm-dropzone-upload-icon">📤</span>
                            <p className="sm-dropzone-main">Drag & drop your PDF here</p>
                            <p className="sm-dropzone-sub">or click to browse files</p>
                            <p className="sm-dropzone-types">PDF · DOCX · PPT · Max 50 MB</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {noteErrors.fileOrUrl && <span className="study-form-error">{noteErrors.fileOrUrl}</span>}
              </div>

              <div className="study-form-row">
                <div className="study-form-group">
                  <label className="study-form-label">Visibility</label>
                  <select name="visibility" className="study-form-input" value={noteForm.visibility} onChange={handleNoteChange}>
                    <option value="all">All Students</option>
                    {STUDY_CLASSES.map((c) => <option key={c} value={c}>Class {c} Only</option>)}
                  </select>
                </div>
                <div className="study-form-group">
                  <label className="study-form-label">Status</label>
                  <select name="status" className="study-form-input" value={noteForm.status} onChange={handleNoteChange}>
                    <option value="published">Publish Now</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="study-modal-footer">
              <button className="study-cancel-btn" onClick={closeNoteForm}>Cancel</button>
              <button className="study-publish-btn" onClick={handleSaveNote} disabled={uploading}>
                {uploading ? "Uploading…" : editNoteId ? "Save Changes" : noteForm.status === "draft" ? "Save Draft" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ LIVE CLASS MODAL ════════════ */}
      {showLcForm && (
        <div className="study-modal-overlay" onClick={closeLcForm}>
          <div className="study-modal study-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="study-modal-header">
              <h2 className="study-modal-title">{editLcId ? "Edit Live Class" : "Schedule Live Class"}</h2>
              <button className="study-modal-close" onClick={closeLcForm}>✕</button>
            </div>
            <div className="study-modal-body">
              <div className="study-form-group">
                <label className="study-form-label">Class Title</label>
                <input name="title" className={`study-form-input ${lcErrors.title?"is-error":""}`}
                  placeholder="e.g. Chapter 3 Doubt Session" value={lcForm.title} onChange={handleLcChange}/>
                {lcErrors.title && <span className="study-form-error">{lcErrors.title}</span>}
              </div>
              <div className="study-form-row">
                <div className="study-form-group">
                  <label className="study-form-label">Subject <span className="study-label-optional">(optional)</span></label>
                  <select name="subject" className="study-form-input" value={lcForm.subject} onChange={handleLcChange}>
                    <option value="">All Subjects</option>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="study-form-group">
                  <label className="study-form-label">Class</label>
                  <select name="class" className={`study-form-input ${lcErrors.class?"is-error":""}`}
                    value={lcForm.class} onChange={handleLcChange}>
                    <option value="">Select class</option>
                    {STUDY_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {lcErrors.class && <span className="study-form-error">{lcErrors.class}</span>}
                </div>
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Date & Time</label>
                <input name="scheduledAt" type="datetime-local" className={`study-form-input ${lcErrors.scheduledAt?"is-error":""}`}
                  value={lcForm.scheduledAt} onChange={handleLcChange}/>
                {lcErrors.scheduledAt && <span className="study-form-error">{lcErrors.scheduledAt}</span>}
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Meeting Link (Google Meet / Zoom)</label>
                <input name="meetLink" className={`study-form-input ${lcErrors.meetLink?"is-error":""}`}
                  placeholder="https://meet.google.com/… or https://zoom.us/j/…"
                  value={lcForm.meetLink} onChange={handleLcChange}/>
                {lcErrors.meetLink && <span className="study-form-error">{lcErrors.meetLink}</span>}
              </div>
              <div className="study-form-group">
                <label className="study-form-label">Description <span className="study-label-optional">(optional)</span></label>
                <textarea name="description" className="study-form-input study-form-textarea"
                  placeholder="What will be covered…" value={lcForm.description} onChange={handleLcChange} rows={2}/>
              </div>
            </div>
            <div className="study-modal-footer">
              <button className="study-cancel-btn" onClick={closeLcForm}>Cancel</button>
              <button className="study-publish-btn" onClick={handleSaveLc}>
                {editLcId ? "Save Changes" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Preview Modal ── */}
      {lecVideoPreview && (() => {
        const ytId = extractYouTubeId(lecVideoPreview.youtubeUrl);
        if (!ytId) return null;
        const color = subjectColor(lecVideoPreview.subject);
        return (
          <div className="study-modal-overlay" onClick={() => setLecVideoPreview(null)}>
            <div className="study-modal study-modal--video" onClick={(e) => e.stopPropagation()}>
              <div className="study-modal-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span className="study-badge" style={{ background: color.bg, color: color.fg }}>{lecVideoPreview.subject}</span>
                    <span className="study-badge study-badge--class">Class {lecVideoPreview.class}</span>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "#9333ea", fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {lecVideoPreview.chapter}
                  </p>
                  <h2 className="study-modal-title" style={{ fontSize: "1.05rem" }}>{lecVideoPreview.lectureTitle}</h2>
                </div>
                <button className="study-modal-close" onClick={() => setLecVideoPreview(null)}>✕</button>
              </div>
              <div className="study-preview-video-frame">
                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={lecVideoPreview.lectureTitle} allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
              </div>
              <div className="study-preview-video-footer">
                <button className="study-cancel-btn" onClick={() => setLecVideoPreview(null)}>Close</button>
                <button className="study-publish-btn" onClick={() => { setLecVideoPreview(null); openEditLec(lecVideoPreview); }}>Edit Lecture</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirms */}
      {lecDelConfirm && (
        <DeleteConfirm title={`"${lecDelConfirm.lectureTitle}"`}
          onCancel={() => setLecDelConfirm(null)} onConfirm={() => handleDeleteLec(lecDelConfirm.id)}/>
      )}
      {noteDelConfirm && (
        <DeleteConfirm title={`"${noteDelConfirm.title}"`}
          onCancel={() => setNoteDelConfirm(null)} onConfirm={() => handleDeleteNote(noteDelConfirm.id)}/>
      )}
      {lcDelConfirm && (
        <DeleteConfirm title={`"${lcDelConfirm.title}"`}
          onCancel={() => setLcDelConfirm(null)} onConfirm={() => handleDeleteLc(lcDelConfirm.id)}/>
      )}
    </div>
  );
}

function EmptyState({ isEmpty, emptyMsg, filterMsg, onAdd, btnLabel }) {
  return (
    <div className="study-empty">
      <div className="study-empty-icon"><BookOpenIcon size={36}/></div>
      <p className="study-empty-title">{isEmpty ? emptyMsg : filterMsg}</p>
      <p className="study-empty-sub">
        {isEmpty ? `Click "${btnLabel}" to get started.` : "Try adjusting your search or filters."}
      </p>
      {isEmpty && (
        <button className="study-upload-btn" onClick={onAdd}><UploadIcon size={15}/> {btnLabel}</button>
      )}
    </div>
  );
}

function DeleteConfirm({ title, onCancel, onConfirm }) {
  return (
    <div className="study-modal-overlay" onClick={onCancel}>
      <div className="study-modal study-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="study-modal-header">
          <h2 className="study-modal-title">Delete?</h2>
          <button className="study-modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="study-modal-body">
          <p className="study-delete-msg">Are you sure you want to delete <strong>{title}</strong>? This cannot be undone.</p>
        </div>
        <div className="study-modal-footer">
          <button className="study-cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="study-delete-confirm-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
