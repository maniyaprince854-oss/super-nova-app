import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import StudentNav from "../../components/StudentNav";
import Card from "../../components/Card";
import { getStudentAttendanceStats } from "../../database/attendance";
import { getPublishedMaterials, SUBJECTS, getCompletedIds } from "../../database/studyMaterials";
import { getPublishedMaterials as getLibMaterials } from "../../database/materials";
import { homeworkData, announcementData } from "../../data/mockData";
import { BookOpenIcon, ChevronRightIcon, LibraryIcon } from "../../components/Icons";
import "./Dashboard.css";

const SUBJECT_COLORS = {
  "Math":           { bg: "#ede9fe", accent: "#8b5cf6", icon: "📐" },
  "Science":        { bg: "#dcfce7", accent: "#22c55e", icon: "🔬" },
  "English":        { bg: "#dbeafe", accent: "#3b82f6", icon: "📖" },
  "Social Science": { bg: "#fef3c7", accent: "#f59e0b", icon: "🌍" },
};

function GradIllustration() {
  return (
    <svg viewBox="0 0 130 118" fill="none" className="sd-grad-svg" aria-hidden="true">
      {/* Book stack */}
      <rect x="14" y="90" width="90" height="16" rx="6" fill="#3b0764"/>
      <rect x="14" y="90" width="8"  height="16" rx="4" fill="rgba(255,255,255,0.12)"/>
      <rect x="18" y="74" width="82" height="16" rx="6" fill="#4c1d95"/>
      <rect x="18" y="74" width="8"  height="16" rx="4" fill="rgba(255,255,255,0.12)"/>
      <rect x="22" y="58" width="74" height="16" rx="6" fill="#5b21b6"/>
      <rect x="22" y="58" width="8"  height="16" rx="4" fill="rgba(255,255,255,0.14)"/>
      {/* Cap shadow */}
      <ellipse cx="65" cy="56" rx="32" ry="5" fill="rgba(0,0,0,0.22)"/>
      {/* Cap board */}
      <polygon points="65,28 104,46 65,54 26,46" fill="url(#sdCapGrad)"/>
      <line x1="26" y1="46" x2="104" y2="46" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
      {/* Cap top */}
      <rect x="57" y="10" width="16" height="20" rx="3.5" fill="#d97706"/>
      <rect x="57" y="10" width="16" height="9"  rx="3.5" fill="#fbbf24"/>
      {/* Tassel cord */}
      <path d="M104 46 C108 50 109 56 109 63 L109 72" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Tassel strands */}
      <line x1="106" y1="72" x2="104" y2="86" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="109" y1="72" x2="109" y2="88" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
      <line x1="112" y1="72" x2="114" y2="85" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      {/* Stars */}
      <text x="3"   y="30" fontSize="13" fill="rgba(251,191,36,0.7)">✦</text>
      <text x="116" y="14" fontSize="9"  fill="rgba(255,255,255,0.3)">✦</text>
      <text x="5"   y="56" fontSize="7"  fill="rgba(255,255,255,0.2)">✦</text>
      <defs>
        <linearGradient id="sdCapGrad" x1="26" y1="28" x2="104" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fcd34d"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent]           = useState(null);
  const [attStats, setAttStats]         = useState({ total: 0, present: 0, percentage: 0 });
  const [studySummary, setStudySummary] = useState({ total: 0, subjects: [] });
  const [libCount, setLibCount]         = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("supernova_current_student");
    if (!raw) { navigate("/student/login"); return; }
    const s = JSON.parse(raw);
    setStudent(s);
    setAttStats(getStudentAttendanceStats(s.id));

    const mats      = getPublishedMaterials().filter((m) => m.class === s.class);
    const completed = getCompletedIds(s.id);
    const subjects  = SUBJECTS
      .map((subj) => {
        const list = mats.filter((m) => m.subject === subj);
        return { subj, count: list.length, done: list.filter((m) => completed.has(m.id)).length };
      })
      .filter((x) => x.count > 0);
    setStudySummary({ total: mats.length, subjects });

    const libMats = getLibMaterials().filter(
      (m) => !m.visibility || m.visibility === "all" || m.visibility === s.class
    );
    setLibCount(libMats.length);
  }, [navigate]);

  function handleLogout() {
    sessionStorage.removeItem("supernova_current_student");
    navigate("/student/login");
  }

  if (!student) return null;

  const totalDone = studySummary.subjects.reduce((a, x) => a + x.done, 0);

  return (
    <div className="student-layout">
      <Header subtitle="Student Dashboard" />
      <main className="student-main">

        {/* ── Welcome Banner ── */}
        <div className="student-greeting">
          <div className="student-greeting-top">
            <div className="sd-welcome-text">
              <p className="sd-welcome-line">Welcome back,</p>
              <h2 className="sd-student-name">{student.name}</h2>
              <p className="sd-student-meta">Class {student.class} · @{student.username}</p>
            </div>
            <GradIllustration />
            <button className="sd-logout-btn" onClick={handleLogout}>
              ⎋ Logout
            </button>
          </div>
        </div>

        {/* ── Study Materials Banner ── */}
        <button className="study-banner" onClick={() => navigate("/student/study")}>
          <div className="study-banner-left">
            <div className="study-banner-icon-wrap">
              <BookOpenIcon size={26} />
            </div>
            <div>
              <p className="study-banner-label">Study Materials</p>
              <p className="study-banner-sub">
                {studySummary.total > 0
                  ? `${studySummary.total} lecture${studySummary.total !== 1 ? "s" : ""} · ${totalDone} completed`
                  : "Browse your lectures & notes"}
              </p>
            </div>
          </div>
          <span className="study-banner-arrow"><ChevronRightIcon size={20}/></span>
        </button>

        {/* ── Notes & PDF Library Banner ── */}
        <button className="study-banner study-banner--library" onClick={() => navigate("/student/library")}>
          <div className="study-banner-left">
            <div className="study-banner-icon-wrap study-banner-icon-wrap--library">
              <LibraryIcon size={26} />
            </div>
            <div>
              <p className="study-banner-label">Notes & PDF Library</p>
              <p className="study-banner-sub">
                {libCount > 0
                  ? `${libCount} document${libCount !== 1 ? "s" : ""} — notes, formulas, PYQs & more`
                  : "Chapter notes, formulas, PYQs & assignments"}
              </p>
            </div>
          </div>
          <span className="study-banner-arrow"><ChevronRightIcon size={20}/></span>
        </button>

        {/* ── Subject quick chips ── */}
        {studySummary.subjects.length > 0 && (
          <div className="study-quick-row">
            {studySummary.subjects.map(({ subj, count, done }) => {
              const c   = SUBJECT_COLORS[subj] || { bg: "#f4f4f5", accent: "#a1a1aa", icon: "📚" };
              const pct = count ? Math.round((done / count) * 100) : 0;
              return (
                <button
                  key={subj}
                  className="study-quick-chip"
                  style={{ background: c.bg }}
                  onClick={() => navigate("/student/study")}
                >
                  <span className="study-quick-icon">{c.icon}</span>
                  <div className="study-quick-info">
                    <span className="study-quick-name"  style={{ color: c.accent }}>{subj}</span>
                    <span className="study-quick-count" style={{ color: c.accent }}>{count} lecture{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="study-quick-progress">
                    <div className="study-quick-progress-fill" style={{ width: pct + "%", background: c.accent }}/>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Stats grid ── */}
        <div className="student-grid">
          <Card icon="📊" title="Attendance" variant="purple">
            <div className="class-info">
              <div className="class-subject">
                {attStats.present}/{attStats.total} Days Present
              </div>
              <div className="att-bar-wrapper">
                <div className="att-bar">
                  <div className="att-bar-fill" style={{ width: `${attStats.percentage}%` }}/>
                </div>
                <span className="att-bar-label">{attStats.percentage}%</span>
              </div>
              {attStats.total === 0 && (
                <p className="att-no-data">No attendance recorded yet</p>
              )}
            </div>
          </Card>

          <Card icon="📝" title="Today's Homework" variant="blue">
            <div className="homework-info">
              <div className="homework-title">{homeworkData.title}</div>
              <div className="homework-meta">
                <span>{homeworkData.subject}</span>
                <span className="homework-due">Due: {homeworkData.dueDate}</span>
              </div>
              <span className="homework-status">{homeworkData.status}</span>
            </div>
          </Card>

          <Card icon="📢" title="Announcements" variant="green">
            <div className="announcement-info">
              <div className="announcement-title">{announcementData.title}</div>
              <p className="announcement-body">{announcementData.message}</p>
              <span className="announcement-date">{announcementData.date}</span>
            </div>
          </Card>
        </div>

      </main>
      <StudentNav />
    </div>
  );
}
