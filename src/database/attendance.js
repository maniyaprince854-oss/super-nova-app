// attendance.js — localStorage CRUD for attendance records

const STORAGE_KEY = "supernova_attendance";

function getAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function save(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getAllAttendance() {
  return getAll();
}

export function getAttendanceByDate(date) {
  return getAll().find((r) => r.date === date) || null;
}

export function saveAttendance(date, students) {
  // students: [{id, name, status: "present"|"absent"}]
  const records = getAll();
  const existingIndex = records.findIndex((r) => r.date === date);

  const record = { date, students, savedAt: new Date().toISOString() };

  if (existingIndex !== -1) {
    records[existingIndex] = record;
  } else {
    records.unshift(record); // newest first
  }

  save(records);
  return { success: true, record };
}

export function getStudentAttendance(studentId) {
  const records = getAll();
  const history = [];

  records.forEach((record) => {
    const entry = record.students.find((s) => s.id === studentId);
    if (entry) {
      history.push({
        date: record.date,
        status: entry.status,
      });
    }
  });

  // Sort by date descending
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  return history;
}

export function getStudentAttendanceStats(studentId) {
  const history = getStudentAttendance(studentId);
  const total = history.length;
  const present = history.filter((h) => h.status === "present").length;
  const absent = total - present;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return { total, present, absent, percentage, history };
}

export function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // "YYYY-MM-DD"
}
