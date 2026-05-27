import { useNavigate, useLocation } from "react-router-dom";
import { DashboardIcon, BookOpenIcon, LibraryIcon } from "./Icons";
import "./StudentNav.css";

const NAV_ITEMS = [
  { path: "/student/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { path: "/student/study",     label: "Videos",    Icon: BookOpenIcon  },
  { path: "/student/library",   label: "Library",   Icon: LibraryIcon   },
];

export default function StudentNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="student-nav">
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            className={`student-nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(path)}
          >
            <span className="student-nav-icon">
              <Icon size={22} />
            </span>
            <span className="student-nav-label">{label}</span>
            {active && <span className="student-nav-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
