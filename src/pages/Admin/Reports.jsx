import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { getAllStudents } from "../../database/students";
import { getAllAttendance } from "../../database/attendance";
import "./Reports.css";

export default function AdminReports() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    setStudents(getAllStudents());
    setRecords(getAllAttendance());
  }, []);

  const totalSessions = records.length;
  const totalStudents = students.length;

  const studentStats = students.map((s) => {
    const present = records.filter((r) =>
      r.students.some((rs) => rs.id === s.id && rs.status === "present")
    ).length;
    return {
      ...s,
      present,
      absent: totalSessions - present,
      rate: totalSessions ? Math.round((present / totalSessions) * 100) : 0,
    };
  });

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header title="Reports" subtitle="Attendance and performance insights" />
        <main className="admin-main">

          <div className="reports-summary-grid">
            <div className="report-stat-card">
              <div className="rsc-icon rsc-icon--purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="rsc-info">
                <span className="rsc-value">{totalStudents}</span>
                <span className="rsc-label">Total Students</span>
              </div>
            </div>
            <div className="report-stat-card">
              <div className="rsc-icon rsc-icon--blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="rsc-info">
                <span className="rsc-value">{totalSessions}</span>
                <span className="rsc-label">Total Sessions</span>
              </div>
            </div>
            <div className="report-stat-card">
              <div className="rsc-icon rsc-icon--green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="rsc-info">
                <span className="rsc-value">
                  {totalStudents && totalSessions
                    ? Math.round(
                        studentStats.reduce((acc, s) => acc + s.rate, 0) / totalStudents
                      )
                    : 0}%
                </span>
                <span className="rsc-label">Avg Attendance Rate</span>
              </div>
            </div>
          </div>

          <section className="report-table-section">
            <div className="section-header">
              <h3 className="section-title">Student Attendance Report</h3>
            </div>
            {studentStats.length === 0 ? (
              <div className="report-empty">
                <p>No data yet. Register students and mark attendance to see reports.</p>
              </div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="report-student">
                            <div className="report-avatar">{s.name.charAt(0)}</div>
                            <div>
                              <div className="report-name">{s.name}</div>
                              <div className="report-username">@{s.username}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="class-badge">Class {s.class}</span></td>
                        <td><span className="present-count">{s.present}</span></td>
                        <td><span className="absent-count">{s.absent}</span></td>
                        <td>
                          <div className="rate-bar-wrap">
                            <div className="rate-bar">
                              <div className="rate-fill" style={{ width: `${s.rate}%` }}></div>
                            </div>
                            <span className="rate-text">{s.rate}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${s.rate >= 75 ? "good" : s.rate >= 50 ? "warn" : "bad"}`}>
                            {s.rate >= 75 ? "Good" : s.rate >= 50 ? "Average" : "Low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
