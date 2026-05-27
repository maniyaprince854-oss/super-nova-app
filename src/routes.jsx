import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminStudents from "./pages/Admin/Students";
import AdminAttendance from "./pages/Admin/Attendance";
import AdminStudyMaterials from "./pages/Admin/StudyMaterials";
import AdminManageNotes from "./pages/Admin/ManageNotes";
import AdminReports from "./pages/Admin/Reports";
import AdminMessages from "./pages/Admin/Messages";
import StudentRegister from "./pages/Student/Register";
import StudentLogin from "./pages/Student/Login";
import StudentDashboard from "./pages/Student/Dashboard";
import StudentStudy from "./pages/Student/Study";
import StudentStudyHub from "./pages/Student/StudyHub";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/student/register" replace /> },
  // Admin routes
  { path: "/admin",             element: <AdminDashboard /> },
  { path: "/admin/students",    element: <AdminStudents /> },
  { path: "/admin/attendance",  element: <AdminAttendance /> },
  { path: "/admin/study",       element: <AdminStudyMaterials /> },
  { path: "/admin/notes",       element: <AdminManageNotes /> },
  { path: "/admin/reports",     element: <AdminReports /> },
  { path: "/admin/messages",    element: <AdminMessages /> },
  { path: "/admin/settings",    element: <Navigate to="/admin" replace /> },
  // Student routes
  { path: "/student",           element: <Navigate to="/student/register" replace /> },
  { path: "/student/register",  element: <StudentRegister /> },
  { path: "/student/login",     element: <StudentLogin /> },
  { path: "/student/dashboard", element: <StudentDashboard /> },
  { path: "/student/study",     element: <StudentStudy /> },
  { path: "/student/library",   element: <StudentStudyHub /> },
]);

export default router;
