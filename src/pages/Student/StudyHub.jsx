import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import StudentNav from "../../components/StudentNav";
import {
  getPublishedMaterials, MAT_SUBJECTS, SUBJECT_META, TYPE_META, MATERIAL_TYPES,
  getBookmarkIds, toggleBookmark, getRecentMaterialIds, recordMaterialView,
  recordDownload, getPdfViewerUrl,
} from "../../database/materials";
import { SearchIcon, BookOpenIcon, ChevronRightIcon, FileTextIcon } from "../../components/Icons";
import { getFileBlobUrl } from "../../database/fileStore";
import "./StudyHub.css";

export default function StudentStudyHub() {
  const navigate = useNavigate();
  const [student, setStudent]           = useState(null);
  const [materials, setMaterials]       = useState([]);
  const [bookmarkIds, setBookmarkIds]   = useState(new Set());
  const [recentIds, setRecentIds]       = useState([]);
  const [search, setSearch]             = useState("");
  const [activeTab, setActiveTab]       = useState("browse"); // browse | bookmarks
  const [activeSubject, setActiveSubject] = useState(null);
  const [openChapters, setOpenChapters] = useState({});
  const [viewer, setViewer]             = useState(null); // material to view

  const reload = useCallback((s) => {
    const all = getPublishedMaterials();
    setMaterials(all);
    setBookmarkIds(getBookmarkIds(s.id));
    setRecentIds(getRecentMaterialIds(s.id, 8));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("supernova_current_student");
    if (!raw) { navigate("/student/login"); return; }
    const s = JSON.parse(raw);
    setStudent(s);
    reload(s);
  }, [navigate, reload]);

  if (!student) return null;

  /* filtered by class */
  const classMats = materials.filter((m) =>
    !m.visibility || m.visibility === "all" || m.visibility === student.class
  );

  /* search filter */
  const q = search.trim().toLowerCase();
  const searchMats = q
    ? classMats.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.chapter.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.materialType || "").toLowerCase().includes(q)
      )
    : classMats;

  /* subject counts */
  const subjectCounts = MAT_SUBJECTS.reduce((acc, s) => {
    acc[s] = classMats.filter((m) => m.subject === s).length;
    return acc;
  }, {});

  /* materials for current subject */
  const subjectMats = activeSubject
    ? searchMats.filter((m) => m.subject === activeSubject)
    : searchMats;

  /* chapters in subject */
  const chapters = activeSubject
    ? [...new Set(subjectMats.map((m) => m.chapter))]
    : [];

  /* bookmarked materials */
  const bookmarkedMats = classMats.filter((m) => bookmarkIds.has(m.id));

  /* recent materials */
  const recentMats = recentIds
    .map((id) => classMats.find((m) => m.id === id))
    .filter(Boolean);

  function toggleChapter(ch) {
    setOpenChapters((p) => ({ ...p, [ch]: !p[ch] }));
  }

  function openViewer(mat) {
    recordMaterialView(student.id, mat.id);
    reload(student);
    if (mat.fileId) {
      getFileBlobUrl(mat.fileId).then((url) => {
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      });
      return;
    }
    setViewer(mat);
  }

  function closeViewer() { setViewer(null); }

  function handleBookmark(mat) {
    toggleBookmark(student.id, mat.id);
    setBookmarkIds(getBookmarkIds(student.id));
  }

  function handleDownload(mat) {
    recordDownload(mat.id);
    if (mat.fileId) {
      getFileBlobUrl(mat.fileId).then((url) => {
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = mat.fileInfo?.name || mat.title + ".pdf";
        a.click();
      });
    } else if (mat.pdfUrl) {
      window.open(mat.pdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  function selectSubject(s) {
    setActiveSubject(s);
    setOpenChapters({});
    setSearch("");
  }

  function goBack() {
    setActiveSubject(null);
    setSearch("");
  }

  /* group by type within chapter */
  function groupByType(mats) {
    return MATERIAL_TYPES.reduce((acc, t) => {
      const items = mats.filter((m) => m.materialType === t);
      if (items.length) acc[t] = items;
      return acc;
    }, {});
  }

  const sm = activeSubject ? SUBJECT_META[activeSubject] : null;

  return (
    <div className="student-layout">
      <Header subtitle="Notes & PDF Library" />
      <main className="sh-main">

        {/* ── Top bar ── */}
        <div className="sh-topbar">
          <div className="sh-tabs">
            <button className={`sh-tab ${activeTab === "browse" ? "active" : ""}`}
              onClick={() => { setActiveTab("browse"); setActiveSubject(null); setSearch(""); }}>
              Browse
            </button>
            <button className={`sh-tab ${activeTab === "bookmarks" ? "active" : ""}`}
              onClick={() => { setActiveTab("bookmarks"); setActiveSubject(null); }}>
              Bookmarks
              {bookmarkedMats.length > 0 && (
                <span className="sh-tab-badge">{bookmarkedMats.length}</span>
              )}
            </button>
          </div>
          {activeSubject && (
            <button className="sh-back-btn" onClick={goBack}>← All Subjects</button>
          )}
        </div>

        {/* ── Search ── */}
        {activeTab === "browse" && (
          <div className="sh-search-wrap">
            <span className="sh-search-ico"><SearchIcon size={16}/></span>
            <input
              className="sh-search-input"
              placeholder={activeSubject ? `Search in ${activeSubject}…` : "Search chapters, notes, type…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="sh-search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>
        )}

        {/* ══════════════ BROWSE TAB ══════════════ */}
        {activeTab === "browse" && (
          <>
            {/* Subject grid — no subject selected, no search */}
            {!activeSubject && !q && (
              <>
                {/* Recently viewed */}
                {recentMats.length > 0 && (
                  <section className="sh-recent-section">
                    <div className="sh-section-heading">
                      <span>🕐</span>
                      <span>Recently Viewed</span>
                    </div>
                    <div className="sh-recent-row">
                      {recentMats.slice(0, 4).map((m) => {
                        const tm = TYPE_META[m.materialType] || { icon: "📄", color: "#52525b", bg: "#f4f4f5" };
                        const sm2 = SUBJECT_META[m.subject] || {};
                        return (
                          <div key={m.id} className="sh-recent-card" onClick={() => openViewer(m)}>
                            <div className="sh-recent-type" style={{ background: tm.bg, color: tm.color }}>
                              {tm.icon}
                            </div>
                            <div className="sh-recent-info">
                              <p className="sh-recent-subject" style={{ color: sm2.accent }}>{m.subject}</p>
                              <p className="sh-recent-title">{m.title}</p>
                              <p className="sh-recent-type-label" style={{ color: tm.color }}>{m.materialType}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className="sh-section-heading" style={{ marginTop: recentMats.length > 0 ? "2rem" : 0 }}>
                  <BookOpenIcon size={18}/>
                  <span>Select a Subject</span>
                </div>

                {classMats.length === 0 ? (
                  <EmptyState title="No notes uploaded yet" sub="Your teacher hasn't added any notes. Check back soon!" />
                ) : (
                  <div className="sh-subject-grid">
                    {MAT_SUBJECTS.map((subj) => {
                      const count = subjectCounts[subj];
                      if (!count) return null;
                      const c = SUBJECT_META[subj] || {};
                      return (
                        <button key={subj} className="sh-subject-card"
                          style={{ "--accent": c.accent, "--bg": c.bg, "--fg": c.fg }}
                          onClick={() => selectSubject(subj)}>
                          <span className="sh-subject-emoji">{c.icon}</span>
                          <span className="sh-subject-name">{subj}</span>
                          <span className="sh-subject-count">{count} document{count !== 1 ? "s" : ""}</span>
                          <span className="sh-subject-arrow"><ChevronRightIcon size={18}/></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Search results — no subject */}
            {!activeSubject && q && (
              <>
                <div className="sh-section-heading">
                  <SearchIcon size={16}/>
                  <span>{searchMats.length} result{searchMats.length !== 1 ? "s" : ""} for "{search}"</span>
                </div>
                {searchMats.length === 0 ? (
                  <EmptyState title="No results" sub="Try a different keyword." />
                ) : (
                  <div className="sh-card-grid">
                    {searchMats.map((m) => (
                      <PdfCard key={m.id} mat={m} bookmarked={bookmarkIds.has(m.id)}
                        onOpen={() => openViewer(m)}
                        onDownload={() => handleDownload(m)}
                        onBookmark={() => handleBookmark(m)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Subject → Chapter → Materials */}
            {activeSubject && (
              <>
                {/* Subject header */}
                <div className="sh-subject-header" style={{ background: sm.bg }}>
                  <span className="sh-subject-header-emoji">{sm.icon}</span>
                  <div>
                    <p className="sh-subject-header-label" style={{ color: sm.accent }}>Class {student.class}</p>
                    <h2 className="sh-subject-header-title" style={{ color: sm.fg }}>{activeSubject}</h2>
                  </div>
                  <span className="sh-subject-header-count" style={{ color: sm.accent }}>
                    {subjectMats.length} doc{subjectMats.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {chapters.length === 0 ? (
                  <EmptyState title="No notes match your search" sub="" />
                ) : (
                  <div className="sh-chapters">
                    {chapters.map((chapter) => {
                      const chMats  = subjectMats.filter((m) => m.chapter === chapter);
                      const isOpen  = openChapters[chapter] !== false; // open by default
                      const grouped = groupByType(chMats);

                      return (
                        <div key={chapter} className="sh-chapter">
                          <button className="sh-chapter-btn" onClick={() => toggleChapter(chapter)}>
                            <div className="sh-chapter-left">
                              <span className="sh-chapter-dot" style={{ background: sm.accent }}/>
                              <span className="sh-chapter-name">{chapter}</span>
                              <span className="sh-chapter-badge">{chMats.length}</span>
                            </div>
                            <span className={`sh-chapter-chevron ${isOpen ? "open" : ""}`}>
                              <ChevronRightIcon size={16}/>
                            </span>
                          </button>

                          {isOpen && (
                            <div className="sh-chapter-content">
                              {Object.entries(grouped).map(([type, items]) => {
                                const tm = TYPE_META[type] || { icon: "📄", color: "#52525b", bg: "#f4f4f5" };
                                return (
                                  <div key={type} className="sh-type-group">
                                    <div className="sh-type-group-header">
                                      <span style={{ color: tm.color }}>{tm.icon}</span>
                                      <span className="sh-type-group-name" style={{ color: tm.color }}>{type}</span>
                                      <span className="sh-type-group-count">{items.length}</span>
                                    </div>
                                    <div className="sh-card-grid">
                                      {items.map((m) => (
                                        <PdfCard key={m.id} mat={m} bookmarked={bookmarkIds.has(m.id)}
                                          onOpen={() => openViewer(m)}
                                          onDownload={() => handleDownload(m)}
                                          onBookmark={() => handleBookmark(m)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════════ BOOKMARKS TAB ══════════════ */}
        {activeTab === "bookmarks" && (
          <>
            <div className="sh-section-heading">
              <span>🔖</span>
              <span>Saved Documents · {bookmarkedMats.length}</span>
            </div>
            {bookmarkedMats.length === 0 ? (
              <EmptyState
                title="No bookmarks yet"
                sub="Tap the bookmark icon on any PDF card to save it here."
              />
            ) : (
              <div className="sh-card-grid">
                {bookmarkedMats.map((m) => (
                  <PdfCard key={m.id} mat={m} bookmarked={true}
                    onOpen={() => openViewer(m)}
                    onDownload={() => handleDownload(m)}
                    onBookmark={() => handleBookmark(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </main>
      <StudentNav />

      {/* ══════════════ PDF VIEWER MODAL ══════════════ */}
      {viewer && (
        <PdfViewerModal
          mat={viewer}
          bookmarked={bookmarkIds.has(viewer.id)}
          onClose={closeViewer}
          onBookmark={() => handleBookmark(viewer)}
          onDownload={() => handleDownload(viewer)}
        />
      )}
    </div>
  );
}

/* ── PDF Card ── */
function PdfCard({ mat, bookmarked, onOpen, onDownload, onBookmark }) {
  const tm = TYPE_META[mat.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };
  const sm = SUBJECT_META[mat.subject]  || {};
  return (
    <div className="pdf-card">
      <div className="pdf-card-top">
        <div className="pdf-card-icon" style={{ background: tm.bg, color: tm.color }}>{tm.icon}</div>
        <button
          className={`pdf-card-bookmark ${bookmarked ? "saved" : ""}`}
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          title={bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {bookmarked ? "🔖" : "🏷️"}
        </button>
      </div>
      <div className="pdf-card-body">
        <span className="pdf-card-type" style={{ color: tm.color, background: tm.bg }}>{mat.materialType}</span>
        <h4 className="pdf-card-title">{mat.title}</h4>
        {mat.description && <p className="pdf-card-desc">{mat.description}</p>}
        <div className="pdf-card-meta-row">
          <span className="pdf-card-subject" style={{ color: sm.accent }}>{mat.subject}</span>
          <span className="pdf-card-views">{mat.views || 0} views</span>
        </div>
      </div>
      <div className="pdf-card-actions">
        <button className="pdf-btn pdf-btn--open" onClick={onOpen}>
          <FileTextIcon size={14}/> Open PDF
        </button>
        <button className="pdf-btn pdf-btn--download" onClick={onDownload}>
          ↓
        </button>
      </div>
    </div>
  );
}

/* ── PDF Viewer Modal ── */
function PdfViewerModal({ mat, bookmarked, onClose, onBookmark, onDownload }) {
  const [darkMode, setDarkMode] = useState(false);
  const viewerUrl = getPdfViewerUrl(mat.pdfUrl);
  const tm = TYPE_META[mat.materialType] || { icon: "📄", color: "#7c3aed", bg: "#ede9fe" };

  return (
    <div className="pv-overlay" onClick={onClose}>
      <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pv-header">
          <div className="pv-header-info">
            <span className="pv-header-icon" style={{ background: tm.bg, color: tm.color }}>{tm.icon}</span>
            <div>
              <p className="pv-header-type" style={{ color: tm.color }}>{mat.materialType} · {mat.subject}</p>
              <h3 className="pv-header-title">{mat.title}</h3>
              <p className="pv-header-chapter">{mat.chapter}</p>
            </div>
          </div>
          <div className="pv-header-actions">
            <button
              className={`pv-action-btn ${darkMode ? "active" : ""}`}
              onClick={() => setDarkMode((d) => !d)}
              title="Toggle dark mode"
            >🌙</button>
            <button className="pv-action-btn" onClick={onBookmark} title="Bookmark">
              {bookmarked ? "🔖" : "🏷️"}
            </button>
            <button className="pv-action-btn" onClick={onDownload} title="Download">
              ↓
            </button>
            <button className="pv-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Viewer */}
        <div className={`pv-frame-wrap ${darkMode ? "dark" : ""}`}>
          {viewerUrl ? (
            <iframe
              src={viewerUrl}
              title={mat.title}
              className="pv-iframe"
              frameBorder="0"
              allowFullScreen
            />
          ) : (
            <div className="pv-no-url">
              <FileTextIcon size={48}/>
              <p>Cannot preview this document inline.</p>
              {mat.pdfUrl && (
                <button
                  className="pdf-btn pdf-btn--open"
                  style={{ marginTop: "12px" }}
                  onClick={() => window.open(mat.pdfUrl, "_blank", "noopener,noreferrer")}
                >
                  Open in New Tab
                </button>
              )}
            </div>
          )}
        </div>
        {mat.pdfUrl && (
          <div className="pv-footer">
            <button
              className="pv-open-tab-btn"
              onClick={() => window.open(mat.pdfUrl, "_blank", "noopener,noreferrer")}
            >
              ↗ Open in New Tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ title, sub }) {
  return (
    <div className="sh-empty">
      <div className="sh-empty-icon"><BookOpenIcon size={40}/></div>
      <p className="sh-empty-title">{title}</p>
      {sub && <p className="sh-empty-sub">{sub}</p>}
    </div>
  );
}
