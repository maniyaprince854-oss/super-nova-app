// students.js — localStorage CRUD for student records

const STORAGE_KEY = "supernova_students";

function getAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function save(students) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

export function getAllStudents() {
  return getAll();
}

export function getStudentById(id) {
  return getAll().find((s) => s.id === id) || null;
}

export function getStudentByUsername(username) {
  return getAll().find((s) => s.username === username) || null;
}

export function createStudent({ name, username, password, studentClass }) {
  const students = getAll();

  // Check if username already exists
  if (students.some((s) => s.username === username)) {
    return { success: false, error: "Username already taken" };
  }

  const newStudent = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name,
    username,
    password,
    class: studentClass,
    joinDate: new Date().toISOString(),
    attendance: [],
  };

  students.push(newStudent);
  save(students);
  return { success: true, student: newStudent };
}

export function updateStudent(id, updates) {
  const students = getAll();
  const index = students.findIndex((s) => s.id === id);
  if (index === -1) return { success: false, error: "Student not found" };

  students[index] = { ...students[index], ...updates };
  save(students);
  return { success: true, student: students[index] };
}

export function deleteStudent(id) {
  const students = getAll();
  const filtered = students.filter((s) => s.id !== id);
  if (filtered.length === students.length) return { success: false, error: "Student not found" };

  save(filtered);
  return { success: true };
}

export function authenticateStudent(username, password) {
  const student = getAll().find((s) => s.username === username && s.password === password);
  if (!student) return { success: false, error: "Invalid username or password" };
  return { success: true, student };
}
