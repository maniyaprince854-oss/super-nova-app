import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminGuard from "./components/AdminGuard";
import AdminLogin from "./pages/Admin/Login";
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
  // Admin auth
  { path: "/admin/login", element: <AdminLogin /> },
  // Admin protected routes
  { path: "/admin",             element: <AdminGuard><AdminDashboard /></AdminGuard> },
  { path: "/admin/students",    element: <AdminGuard><AdminStudents /></AdminGuard> },
  { path: "/admin/attendance",  element: <AdminGuard><AdminAttendance /></AdminGuard> },
  { path: "/admin/study",       element: <AdminGuard><AdminStudyMaterials /></AdminGuard> },
  { path: "/admin/notes",       element: <AdminGuard><AdminManageNotes /></AdminGuard> },
  { path: "/admin/reports",     element: <AdminGuard><AdminReports /></AdminGuard> },
  { path: "/admin/messages",    element: <AdminGuard><AdminMessages /></AdminGuard> },
  { path: "/admin/settings",    element: <AdminGuard><Navigate to="/admin" replace /></AdminGuard> },
  // Student routes
  { path: "/student",           element: <Navigate to="/student/register" replace /> },
  { path: "/student/register",  element: <StudentRegister /> },
  { path: "/student/login",     element: <StudentLogin /> },
  { path: "/student/dashboard", element: <StudentDashboard /> },
  { path: "/student/study",     element: <StudentStudy /> },
  { path: "/student/library",   element: <StudentStudyHub /> },
]);

export default router;
