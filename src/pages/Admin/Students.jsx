import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import StudentCard from "../../components/StudentCard";
import AttendanceTable from "../../components/AttendanceTable";
import { getAllStudents, deleteStudent } from "../../database/students";
import { getStudentAttendanceStats } from "../../database/attendance";
import { classOptions } from "../../data/mockData";
import "./Students.css";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", class: "" });

  useEffect(() => {
    loadStudents();
  }, []);

  function loadStudents() {
    setStudents(getAllStudents());
  }

  function handleDelete(student) {
    if (confirm(`Delete ${student.name}? This cannot be undone.`)) {
      deleteStudent(student.id);
      loadStudents();
      if (selectedStudent?.id === student.id) setSelectedStudent(null);
    }
  }

  function handleView(student) {
    const stats = getStudentAttendanceStats(student.id);
    setSelectedStudent({ ...student, attendanceStats: stats });
    setEditingStudent(null);
  }

  function handleEdit(student) {
    setEditingStudent(student);
    setEditForm({ name: student.name, class: student.class });
    setSelectedStudent(null);
  }

  function handleEditSave() {
    if (!editForm.name.trim() || !editForm.class) return;
    const allStudents = getAllStudents();
    const idx = allStudents.findIndex((s) => s.id === editingStudent.id);
    if (idx !== -1) {
      allStudents[idx].name = editForm.name.trim();
      allStudents[idx].class = editForm.class;
      localStorage.setItem("supernova_students", JSON.stringify(allStudents));
    }
    setEditingStudent(null);
    loadStudents();
  }

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter === "All" || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header title="Students" subtitle={`${students.length} student${students.length !== 1 ? "s" : ""} enrolled`} />
        <main className="admin-main">
          {/* Filters */}
          <div className="students-toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Class:</label>
              <select
                className="filter-select"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="All">All</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student List */}
          <div className="students-list">
            {filtered.length === 0 ? (
              <div className="students-empty">
                <span className="students-empty-icon">👥</span>
                <p>{students.length === 0 ? "No students registered yet" : "No students match your filter"}</p>
              </div>
            ) : (
              filtered.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Student Profile Modal */}
          {selectedStudent && (
            <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedStudent(null)}>✕</button>
                <div className="profile-header">
                  <div className="profile-avatar">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="profile-name">{selectedStudent.name}</h3>
                  <span className="profile-meta">@{selectedStudent.username} • Class {selectedStudent.class}</span>
                </div>

                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="profile-stat-value">
                      {selectedStudent.attendanceStats.percentage}%
                    </span>
                    <span className="profile-stat-label">Attendance Rate</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-value">
                      {selectedStudent.attendanceStats.present}/{selectedStudent.attendanceStats.total}
                    </span>
                    <span className="profile-stat-label">Days Present</span>
                  </div>
                </div>

                <div className="profile-attendance">
                  <h4 className="profile-section-title">Attendance History</h4>
                  <AttendanceTable history={selectedStudent.attendanceStats.history} />
                </div>
              </div>
            </div>
          )}

          {/* Edit Student Modal */}
          {editingStudent && (
            <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
              <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setEditingStudent(null)}>✕</button>
                <h3 className="modal-title">Edit Student</h3>
                <div className="edit-form">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select
                      className="form-input form-select"
                      value={editForm.class}
                      onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                    >
                      {classOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button className="register-btn" onClick={handleEditSave}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
