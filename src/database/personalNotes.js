const KEY = "nova_personal_notes";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function getPersonalNote(studentId, lectureId) {
  return (load()[studentId] || {})[lectureId] || "";
}

export function savePersonalNote(studentId, lectureId, text) {
  const data = load();
  if (!data[studentId]) data[studentId] = {};
  if (text.trim()) data[studentId][lectureId] = text;
  else delete data[studentId][lectureId];
  localStorage.setItem(KEY, JSON.stringify(data));
}
