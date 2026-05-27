import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  getAllMaterials, addMaterial, updateMaterial, deleteMaterial,
  MAT_CLASSES, MAT_SUBJECTS, MATERIAL_TYPES, TYPE_META, SUBJECT_META,
} from "../../database/materials";
import { SearchIcon, UploadIcon, FileTextIcon, BookOpenIcon } from "../../components/Icons";
import "./ManageNotes.css";

const EMPTY_FORM = {
  class: "", subject: "", chapter: "", materialType: "",
  title: "", description: "", pdfUrl: "", visibility: "all", status: "published",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminManageNotes() {
  const [materials, setMaterials] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [search, setSearch]       = useState("");
  const [fClass,   setFClass]     = useState("All");
  const [fSubject, setFSubject]   = useState("All");
  const [fType,    setFType]      = useState("All");
  const [fStatus,  setFStatus]    = useState("All");
  const [delConfirm, setDelConfirm] = useState(null);

  useEffect(() => { setMaterials(getAllMaterials()); }, []);

  function reload() { setMaterials(getAllMaterials()); }

  function openAdd() {
    setForm(EMPTY_FORM); setErrors({}); setEditingId(null); setShowForm(true);
  }

  function openEdit(m) {
    setForm({
      class: m.class, subject: m.subject, chapter: m.chapter,
      materialType: m.materialType, title: m.title,
      description: m.description || "", pdfUrl: m.pdfUrl || "",
      visibility: m.visibility || "all", status: m.status || "published",
    });
    setErrors({}); setEditingId(m.id); setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.class)            e.class        = "Select a class";
    if (!form.subject)          e.subject      = "Select a subject";
    if (!form.chapter.trim())   e.chapter      = "Enter chapter name";
    if (!form.materialType)     e.materialType = "Select material type";
    if (!form.title.trim())     e.title        = "Enter a title";
    if (!form.pdfUrl.trim())    e.pdfUrl       = "Paste a PDF / document URL";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (editingId) updateMaterial(editingId, form);
    else           addMaterial(form);
    reload(); closeForm();
  }

  function handleDelete(id) {
    deleteMaterial(id); setDelConfirm(null); reload();
  }

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      m.title.toLowerCase().includes(q) ||
      m.chapter.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      (m.materialType || "").toLowerCase().includes(q);
    const matchC = fClass   === "All" || m.class       === fClass;
    const matchS = fSubject === "All" || m.subject     === fSubject;
    const matchT = fType    === "All" || m.materialType === fType;
    const matchSt = fStatus === "All" || (m.status || "published") === fStatus;
    return matchQ && matchC && matchS && matchT && matchSt;
  });

  const countBySubject = MAT_SUBJECTS.reduce((a, s) => {
    a[s] = materials.filter((m) => m.subject === s).length;
    return a;
  }, {});

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header
          title="Notes & PDF Library"
          subtitle={`${materials.length} document${materials.length !== 1 ? "s" : ""} uploaded`}
        />
        <main className="admin-main">

          {/* Subject stats */}
          <div className="mn-stats-row">
            {MAT_SUBJECTS.map((s) => {
              const c = SUBJECT_META[s] || {};
              return (
                <div key={s} className="mn-stat-chip"
                  style={{ background: c.bg, borderColor: (c.accent || "#ccc") + "44" }}
                  onClick={() => setFSubject(fSubject === s ? "All" : s)}
                >
                  <span className="mn-stat-icon">{c.icon}</span>
                  <span className="mn-stat-label" style={{ color: c.fg }}>{s}</span>
                  <span className="mn-stat-count" style={{ color: c.accent }}>{countBySubject[s] || 0}</span>
                </div>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="mn-toolbar">
            <div className="mn-search-box">
              <span className="mn-search-icon"><SearchIcon size={16}/></span>
              <input className="mn-search-input" placeholder="Search notes, chapters, types…"
                value={search} onChange={(e) => setSearch(e.target.value)}/>
            </div>
            <div className="mn-filters">
              <select className="mn-select" value={fClass} onChange={(e) => setFClass(e.target.value)}>
                <option value="All">All Classes</option>
                {MAT_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="mn-select" value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
                <option value="All">All Subjects</option>
                {MAT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="mn-select" value={fType} onChange={(e) => setFType(e.target.value)}>
                <option value="All">All Types</option>
                {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="mn-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <button className="mn-upload-btn" onClick={openAdd}>
              <UploadIcon size={16}/> Upload Notes
            </button>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="mn-empty">
              <div className="mn-empty-icon"><BookOpenIcon size={40}/></div>
              <p className="mn-empty-title">
                {materials.length === 0 ? "No documents uploaded yet" : "No results found"}
              </p>
              <p className="mn-empty-sub">
                {materials.length === 0
                  ? "Click \"Upload Notes\" to add your first PDF."
                  : "Try adjusting your search or filters."}
              </p>
              {materials.length === 0 && (
                <button className="mn-upload-btn" onClick={openAdd}><UploadIcon size={15}/> Upload Notes</button>
              )}
            </div>
          ) : (
            <div className="mn-list">
              {filtered.map((m) => {
                const tm = TYPE_META[m.materialType] || { icon: "📄", color: "#52525b", bg: "#f4f4f5" };
                const sm = SUBJECT_META[m.subject] || {};
                return (
                  <div className="mn-card" key={m.id}>
                    <div className="mn-card-type-icon" style={{ background: tm.bg, color: tm.color }}>
                      {tm.icon}
                    </div>
                    <div className="mn-card-body">
                      <div className="mn-card-badges">
                        <span className="mn-badge" style={{ background: sm.bg, color: sm.fg }}>{m.subject}</span>
                        <span className="mn-badge mn-badge--class">Class {m.class}</span>
                        <span className="mn-badge" style={{ background: tm.bg, color: tm.color }}>{m.materialType}</span>
                        {(m.status === "draft") && (
                          <span className="mn-badge mn-badge--draft">Draft</span>
                        )}
                      </div>
                      <p className="mn-card-chapter">{m.chapter}</p>
                      <h3 className="mn-card-title">{m.title}</h3>
                      {m.description && <p className="mn-card-desc">{m.description}</p>}
                      <div className="mn-card-link-row">
                        {m.pdfUrl && (
                          <span className="mn-link-chip">
                            <FileTextIcon size={12}/> PDF linked
                          </span>
                        )}
                        <span className="mn-views">{m.views || 0} views · {m.downloads || 0} downloads</span>
                      </div>
                    </div>
                    <div className="mn-card-meta">
                      <span className="mn-card-date">{formatDate(m.createdAt)}</span>
                      <div className="mn-card-actions">
                        <button className="mn-btn mn-btn--edit" onClick={() => openEdit(m)}>Edit</button>
                        <button className="mn-btn mn-btn--delete" onClick={() => setDelConfirm(m)}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Upload / Edit Modal */}
      {showForm && (
        <div className="mn-overlay" onClick={closeForm}>
          <div className="mn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mn-modal-header">
              <h2 className="mn-modal-title">{editingId ? "Edit Document" : "Upload Notes / PDF"}</h2>
              <button className="mn-modal-close" onClick={closeForm}>✕</button>
            </div>

            <div className="mn-modal-body">
              {/* Material Type */}
              <div className="mn-form-group">
                <label className="mn-label">Material Type</label>
                <div className="mn-type-grid">
                  {MATERIAL_TYPES.map((t) => {
                    const tm = TYPE_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`mn-type-btn ${form.materialType === t ? "active" : ""}`}
                        style={form.materialType === t ? { background: tm.bg, borderColor: tm.color, color: tm.color } : {}}
                        onClick={() => setForm((f) => ({ ...f, materialType: t }))}
                      >
                        <span>{tm.icon}</span>
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.materialType && <span className="mn-error">{errors.materialType}</span>}
              </div>

              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label className="mn-label">Class</label>
                  <select name="class" className={`mn-input ${errors.class ? "err" : ""}`}
                    value={form.class} onChange={handleChange}>
                    <option value="">Select class</option>
                    {MAT_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {errors.class && <span className="mn-error">{errors.class}</span>}
                </div>
                <div className="mn-form-group">
                  <label className="mn-label">Subject</label>
                  <select name="subject" className={`mn-input ${errors.subject ? "err" : ""}`}
                    value={form.subject} onChange={handleChange}>
                    <option value="">Select subject</option>
                    {MAT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {errors.subject && <span className="mn-error">{errors.subject}</span>}
                </div>
              </div>

              <div className="mn-form-group">
                <label className="mn-label">Chapter</label>
                <input name="chapter" className={`mn-input ${errors.chapter ? "err" : ""}`}
                  placeholder="e.g. Chapter 1: Algebra" value={form.chapter} onChange={handleChange}/>
                {errors.chapter && <span className="mn-error">{errors.chapter}</span>}
              </div>

              <div className="mn-form-group">
                <label className="mn-label">Title</label>
                <input name="title" className={`mn-input ${errors.title ? "err" : ""}`}
                  placeholder="e.g. Algebra Short Notes" value={form.title} onChange={handleChange}/>
                {errors.title && <span className="mn-error">{errors.title}</span>}
              </div>

              <div className="mn-form-group">
                <label className="mn-label">Description <span className="mn-label-opt">(optional)</span></label>
                <textarea name="description" className="mn-input mn-textarea"
                  placeholder="Brief description of this document…"
                  value={form.description} onChange={handleChange} rows={2}/>
              </div>

              {/* PDF URL */}
              <div className="mn-form-group">
                <label className="mn-label">PDF / Document URL</label>
                <input name="pdfUrl" className={`mn-input ${errors.pdfUrl ? "err" : ""}`}
                  placeholder="https://drive.google.com/file/d/... or direct PDF link"
                  value={form.pdfUrl} onChange={handleChange}/>
                {errors.pdfUrl && <span className="mn-error">{errors.pdfUrl}</span>}
                <p className="mn-url-hint">
                  📎 Supported: Google Drive, Dropbox, OneDrive, or any direct .pdf link
                </p>
              </div>

              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label className="mn-label">Visibility</label>
                  <select name="visibility" className="mn-input" value={form.visibility} onChange={handleChange}>
                    <option value="all">All Students</option>
                    {MAT_CLASSES.map((c) => <option key={c} value={c}>Class {c} Only</option>)}
                  </select>
                </div>
                <div className="mn-form-group">
                  <label className="mn-label">Status</label>
                  <select name="status" className="mn-input" value={form.status} onChange={handleChange}>
                    <option value="published">Publish Now</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mn-modal-footer">
              <button className="mn-cancel-btn" onClick={closeForm}>Cancel</button>
              <button className="mn-save-btn" onClick={handleSave}>
                {editingId ? "Save Changes" : form.status === "draft" ? "Save Draft" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div className="mn-overlay" onClick={() => setDelConfirm(null)}>
          <div className="mn-modal mn-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="mn-modal-header">
              <h2 className="mn-modal-title">Delete Document?</h2>
              <button className="mn-modal-close" onClick={() => setDelConfirm(null)}>✕</button>
            </div>
            <div className="mn-modal-body">
              <p className="mn-delete-msg">
                Delete <strong>"{delConfirm.title}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="mn-modal-footer">
              <button className="mn-cancel-btn" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="mn-del-confirm-btn" onClick={() => handleDelete(delConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
