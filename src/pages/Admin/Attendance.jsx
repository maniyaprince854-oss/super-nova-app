import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { getAllStudents } from "../../database/students";
import {
  saveAttendance,
  getAttendanceByDate,
  getTodayDateString,
  getAllAttendance,
} from "../../database/attendance";
import "./Attendance.css";

export default function AdminAttendance() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [saved, setSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const all = getAllStudents();
    setStudents(all);

    // Load existing attendance for selected date
    const existing = getAttendanceByDate(selectedDate);
    if (existing) {
      const map = {};
      existing.students.forEach((s) => {
        map[s.id] = s.status;
      });
      setAttendance(map);
    } else {
      // Default all to absent
      const map = {};
      all.forEach((s) => {
        map[s.id] = "absent";
      });
      setAttendance(map);
    }

    setSaved(false);
  }, [selectedDate]);

  useEffect(() => {
    setHistory(getAllAttendance());
  }, [saved]);

  function toggleAttendance(studentId) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
    setSaved(false);
  }

  function markAll(status) {
    const map = {};
    students.forEach((s) => {
      map[s.id] = status;
    });
    setAttendance(map);
    setSaved(false);
  }

  function handleSave() {
    const attendanceList = students.map((s) => ({
      id: s.id,
      name: s.name,
      status: attendance[s.id] || "absent",
    }));

    saveAttendance(selectedDate, attendanceList);
    setSaved(true);

    setTimeout(() => setSaved(false), 2500);
  }

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = students.length - presentCount;

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header title="Attendance" subtitle="Track daily student attendance" />
        <main className="admin-main">
          <div className="admin-greeting">
            <h2 className="page-title">Attendance</h2>
            <p className="page-desc">Mark and track student attendance</p>
          </div>

          {/* Date Selector */}
          <div className="att-controls">
            <div className="att-date-picker">
              <label className="filter-label">Date:</label>
              <input
                type="date"
                className="att-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="att-quick-actions">
              <button className="att-quick-btn att-quick-btn--present" onClick={() => markAll("present")}>
                ✓ Mark All Present
              </button>
              <button className="att-quick-btn att-quick-btn--absent" onClick={() => markAll("absent")}>
                ✗ Mark All Absent
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="att-summary">
            <div className="att-summary-item">
              <span className="att-summary-count">{students.length}</span>
              <span className="att-summary-label">Total</span>
            </div>
            <div className="att-summary-item att-summary--present">
              <span className="att-summary-count">{presentCount}</span>
              <span className="att-summary-label">Present</span>
            </div>
            <div className="att-summary-item att-summary--absent">
              <span className="att-summary-count">{absentCount}</span>
              <span className="att-summary-label">Absent</span>
            </div>
          </div>

          {/* Attendance Checklist */}
          {students.length === 0 ? (
            <div className="students-empty">
              <span className="students-empty-icon">📋</span>
              <p>No students registered yet</p>
            </div>
          ) : (
            <div className="att-checklist">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`att-check-item ${
                    attendance[student.id] === "present" ? "att-check-item--present" : ""
                  }`}
                  onClick={() => toggleAttendance(student.id)}
                >
                  <div className="att-checkbox">
                    {attendance[student.id] === "present" ? (
                      <span className="att-check-on">✓</span>
                    ) : (
                      <span className="att-check-off"></span>
                    )}
                  </div>
                  <div className="att-check-info">
                    <span className="att-check-name">{student.name}</span>
                    <span className="att-check-class">Class {student.class}</span>
                  </div>
                  <span
                    className={`att-status-tag att-status-tag--${attendance[student.id] || "absent"}`}
                  >
                    {attendance[student.id] === "present" ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          {students.length > 0 && (
            <button
              className={`att-save-btn ${saved ? "att-save-btn--saved" : ""}`}
              onClick={handleSave}
            >
              {saved ? "✓ Attendance Saved!" : "Save Attendance"}
            </button>
          )}

          {/* Recent Records */}
          {history.length > 0 && (
            <section className="att-history-section">
              <h3 className="section-title">Recent Records</h3>
              <div className="att-history-list">
                {history.slice(0, 7).map((record, i) => {
                  const dateObj = new Date(record.date + "T00:00:00");
                  const formatted = dateObj.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const pCount = record.students.filter((s) => s.status === "present").length;
                  return (
                    <div
                      key={i}
                      className={`att-history-item ${
                        record.date === selectedDate ? "att-history-item--active" : ""
                      }`}
                      onClick={() => setSelectedDate(record.date)}
                    >
                      <span className="att-history-date">{formatted}</span>
                      <span className="att-history-stats">
                        {pCount}/{record.students.length} present
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
