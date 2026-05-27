import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import { AnalyticsIcon, ClockIcon, ClipboardIcon, UserIcon, ZapIcon } from "../../components/Icons";
import { getAllStudents } from "../../database/students";
import { getAllAttendance, getTodayDateString } from "../../database/attendance";
import "./Dashboard.css";

// ── SVG chart geometry ──────────────────────────────────────────────────────
// viewBox "0 0 560 180", data area: x 8→552, y 12→168
const CL = 8, CR = 552, CT = 12, CB = 168, CH = CB - CT;

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [records, setRecords]   = useState([]);

  useEffect(() => {
    setStudents(getAllStudents());
    setRecords(getAllAttendance());
  }, []);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const todayRecord   = records.find((r) => r.date === getTodayDateString());
  const todayPresent  = todayRecord
    ? todayRecord.students.filter((s) => s.status === "present").length : 0;
  const todayAbsent   = students.length - todayPresent;
  const attendanceRate = students.length
    ? Math.round((todayPresent / students.length) * 100) : 0;

  // ── Recent activity ───────────────────────────────────────────────────────
  const recentActivity = [];
  [...students]
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 5)
    .forEach((s) => recentActivity.push({
      id: "s-" + s.id, type: "student",
      headline: `${s.name} joined — Class ${s.class}`,
      sub: "Welcome to Supernova Foundation!",
      timestamp: new Date(s.joinDate),
    }));

  records.slice(0, 5).forEach((r) => {
    const pCount = r.students.filter((s) => s.status === "present").length;
    recentActivity.push({
      id: "a-" + r.date, type: "attendance",
      headline: `Attendance marked — ${pCount}/${r.students.length} present`,
      sub: `Class session • ${formatDate(r.date)}`,
      timestamp: new Date(r.savedAt || r.date),
    });
  });

  if (recentActivity.length === 0) recentActivity.push({
    id: "sys-1", type: "system",
    headline: "New activity recorded",
    sub: "System event logged successfully",
    timestamp: new Date(),
  });

  recentActivity.sort((a, b) => b.timestamp - a.timestamp);

  // ── Chart data (null = no record that day — skipped in path) ─────────────
  const chartDays = getLast7Days();
  const rawData   = chartDays.map(({ dateStr }) => {
    const rec = records.find((r) => r.date === dateStr);
    return rec ? rec.students.filter((s) => s.status === "present").length : null;
  });

  const realVals  = rawData.filter((v) => v !== null);
  const dataMax   = realVals.length ? Math.max(...realVals) : 0;
  const { maxVal, yLabels } = getNiceScale(dataMax);

  // Map value → SVG y (null → null)
  const ptX = (i) => CL + (i / (chartDays.length - 1)) * (CR - CL);
  const ptY = (v)  => v === null ? null
    : (maxVal === 0 ? CB : CB - (v / maxVal) * CH);

  const allPts = rawData.map((v, i) => ({ x: ptX(i), y: ptY(v), v }));

  // Split into consecutive non-null segments for clean path rendering
  const segments = [];
  let cur = [];
  allPts.forEach((p) => {
    if (p.y !== null) { cur.push(p); }
    else if (cur.length) { segments.push(cur); cur = []; }
  });
  if (cur.length) segments.push(cur);

  const dataPts  = allPts.filter((p) => p.y !== null);
  const hasData  = dataPts.length > 0;

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header title="Dashboard" subtitle="Overview of your foundation's activity" />
        <main className="admin-main">

          {/* ── Stat cards ── */}
          <div className="stats-grid">
            <Card icon="👥" title="Total Students" value={students.length}
              subtitle="Enrolled across all batches" variant="purple"
              trend={{ positive: true, value: 100, label: "vs last month" }} />
            <Card icon="📋" title="Attendance Records" value={records.length}
              subtitle={`${todayPresent} present today`} variant="blue"
              trend={{ positive: true, value: 100, label: "vs last month" }} />
            <Card icon="⚡" title="Recent Activity" value={recentActivity.length}
              subtitle="Tracked events" variant="pink"
              trend={{ positive: true, value: 100, label: "vs last month" }} />
          </div>

          {/* ── Bottom grid ── */}
          <div className="dashboard-bottom-grid">

            {/* Analytics panel */}
            <section className="analytics-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="section-icon"><AnalyticsIcon size={17} /></span>
                  Overview Analytics
                </h3>
                <select className="analytics-period">
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>

              {/* ── Chart ── */}
              <div className="chart-wrap">
                {/* Y-axis labels — 12 px padding matches CT / (180-CB) in SVG */}
                <div className="chart-ylabels">
                  {yLabels.map((v) => <span key={v}>{v}</span>)}
                </div>

                {/* SVG canvas */}
                <div className="chart-canvas-box">
                  <svg
                    width="100%" height="180"
                    viewBox="0 0 560 180"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {/* Line gradient — purple left → deeper purple right */}
                      <linearGradient id="lineG" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#a78bfa"/>
                        <stop offset="100%" stopColor="#6d28d9"/>
                      </linearGradient>

                      {/* Area fill — rich top fade */}
                      <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="rgba(139,92,246,0.28)"/>
                        <stop offset="55%"  stopColor="rgba(139,92,246,0.10)"/>
                        <stop offset="100%" stopColor="rgba(139,92,246,0.00)"/>
                      </linearGradient>

                      {/* Glow filter for the endpoint dot */}
                      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Horizontal grid lines aligned with Y labels */}
                    {yLabels.map((v, idx) => {
                      const gy = CT + (idx / (yLabels.length - 1)) * CH;
                      return (
                        <line key={v}
                          x1={CL} y1={gy} x2={CR} y2={gy}
                          stroke="rgba(0,0,0,0.055)" strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Bottom axis line */}
                    <line x1={CL} y1={CB} x2={CR} y2={CB}
                      stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>

                    {/* No-data placeholder */}
                    {!hasData && (
                      <text x="280" y="96" textAnchor="middle"
                        fill="rgba(196,181,253,0.9)" fontSize="12"
                        fontFamily="Inter,system-ui,sans-serif">
                        No attendance recorded this week
                      </text>
                    )}

                    {/* Area fills + stroke lines per segment */}
                    {segments.map((seg, si) => {
                      if (seg.length === 1) {
                        // Single point — draw a thin accent column
                        const p = seg[0];
                        const colW = 28;
                        return (
                          <g key={si}>
                            <rect
                              x={p.x - colW / 2} y={p.y}
                              width={colW} height={CB - p.y}
                              fill="url(#areaG)"
                            />
                            <line x1={p.x} y1={p.y} x2={p.x} y2={CB}
                              stroke="rgba(139,92,246,0.35)" strokeWidth="1.5"
                              strokeDasharray="3 3"/>
                          </g>
                        );
                      }
                      const linePath = smoothPath(seg);
                      const areaPath = `${linePath} L${seg.at(-1).x},${CB} L${seg[0].x},${CB} Z`;
                      return (
                        <g key={si}>
                          <path d={areaPath} fill="url(#areaG)"/>
                          <path d={linePath} fill="none"
                            stroke="url(#lineG)" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                      );
                    })}

                    {/* Dots on every real data point */}
                    {dataPts.map((p, i) => {
                      const isLast = i === dataPts.length - 1;
                      return (
                        <g key={i}>
                          {/* Soft glow ring behind last/peak dot */}
                          {isLast && (
                            <circle cx={p.x} cy={p.y} r={10}
                              fill="rgba(139,92,246,0.15)" filter="url(#glow)"/>
                          )}
                          <circle cx={p.x} cy={p.y}
                            r={isLast ? 5 : 4}
                            fill="#fff"
                            stroke={isLast ? "#7c3aed" : "#a78bfa"}
                            strokeWidth={isLast ? 2.5 : 2}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* X-axis date labels */}
              <div className="chart-xlabels">
                {chartDays.map((d) => <span key={d.dateStr}>{d.label}</span>)}
              </div>

              {/* ── Mini stat row ── */}
              <div className="analytics-summaries">
                <MiniStat icon={<UserIcon size={14}/>} color="purple"
                  val={students.length} label="Total Students"
                  trend={students.length ? "↑ 100%" : "—"} trendUp/>
                <MiniStat icon={<ClipboardIcon size={14}/>} color="blue"
                  val={todayPresent} label="Present Today"
                  trend={todayPresent ? "↑ 100%" : "—"} trendUp={!!todayPresent}/>
                <MiniStat icon={<ClockIcon size={14}/>} color="orange"
                  val={todayAbsent} label="Absent Today"
                  trend="— 0%" trendUp={false} neutral/>
                <MiniStat icon={<ZapIcon size={14}/>} color="green"
                  val={`${attendanceRate}%`} label="Attendance Rate"
                  trend={attendanceRate ? "↑ 100%" : "—"} trendUp={!!attendanceRate}/>
              </div>
            </section>

            {/* Recent Activity panel */}
            <section className="activity-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="section-icon"><ClockIcon size={17}/></span>
                  Recent Activity
                </h3>
                <button className="view-all-btn">View All</button>
              </div>

              <div className="activity-list">
                {recentActivity.slice(0, 5).map((item, idx) => (
                  <div className="activity-item" key={item.id}
                    style={{ animationDelay: `${idx * 0.07}s` }}>
                    <div className={`activity-avatar activity-avatar--${item.type}`}>
                      {item.type === "attendance" && <ClipboardIcon size={15}/>}
                      {item.type === "student"    && <UserIcon size={15}/>}
                      {item.type === "system"     && <ZapIcon size={15}/>}
                    </div>
                    <div className="activity-info">
                      <p className="activity-headline">
                        {item.headline.split("—")[0].trim()}
                      </p>
                      <p className="activity-sub">
                        {item.headline.includes("—")
                          ? item.headline.split("—")[1].trim()
                          : item.sub}
                      </p>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">{getTimeAgo(item.timestamp)}</span>
                      <span className={`activity-dot activity-dot--${item.type}`}/>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </main>
      </div>
    </div>
  );
}

// ── Reusable mini stat card ──────────────────────────────────────────────────
function MiniStat({ icon, color, val, label, trend, trendUp, neutral }) {
  return (
    <div className="summary-mini-card">
      <div className={`mini-icon-wrap ${color}`}>{icon}</div>
      <span className="mini-val">{val}</span>
      <span className="mini-label">{label}</span>
      <span className={`mini-trend ${neutral ? "neutral" : trendUp ? "up" : "down"}`}>
        {trend}
      </span>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getNiceScale(rawMax) {
  if (rawMax === 0) return { maxVal: 4, yLabels: [4, 3, 2, 1, 0] };
  const STEPS = [1, 2, 5, 10, 20, 25, 50, 100];
  const step  = STEPS.find((s) => s >= rawMax / 4) ?? 100;
  const maxVal = Math.ceil((rawMax * 1.3) / step) * step;
  const labels = [];
  for (let v = maxVal; v >= 0; v -= step) labels.push(v);
  return { maxVal, yLabels: labels };
}

function smoothPath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i];
    const mx = (p.x + q.x) / 2;
    d += ` C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`;
  }
  return d;
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 60000);
  if (diff < 1)  return "Just now";
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}
