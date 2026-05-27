const KEY = "nova_study_streaks";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function recordStudyDay(studentId) {
  const data  = load();
  const today = new Date().toDateString();
  const s     = data[studentId] || { streak: 0, lastDate: null, longestStreak: 0 };
  if (s.lastDate === today) return s;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  s.streak = (s.lastDate === yesterday) ? s.streak + 1 : 1;
  s.lastDate = today;
  s.longestStreak = Math.max(s.longestStreak || 0, s.streak);
  data[studentId] = s;
  localStorage.setItem(KEY, JSON.stringify(data));
  return s;
}

export function getStreak(studentId) {
  const data = load();
  const s    = data[studentId] || { streak: 0, lastDate: null, longestStreak: 0 };
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (s.lastDate && s.lastDate !== today && s.lastDate !== yesterday) {
    return { ...s, streak: 0 };
  }
  return s;
}
