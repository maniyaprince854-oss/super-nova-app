import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminSidebarLinks } from "../data/mockData";
import {
  DashboardIcon, StudentsIcon, AttendanceIcon,
  ReportsIcon, MessagesIcon, SettingsIcon, ChevronDownIcon,
  BookOpenIcon, NotesIcon,
} from "./Icons";
import { NovaLogoSidebar } from "./NovaLogo";
import "./Sidebar.css";

const iconMap = {
  dashboard:  DashboardIcon,
  students:   StudentsIcon,
  attendance: AttendanceIcon,
  study:      BookOpenIcon,
  notes:      NotesIcon,
  reports:    ReportsIcon,
  messages:   MessagesIcon,
  settings:   SettingsIcon,
};

function getVw() {
  return typeof window !== "undefined" ? window.innerWidth : 1200;
}

export default function Sidebar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [vw, setVw]           = useState(getVw);
  const [expanded, setExpanded] = useState(() => getVw() >= 1060);

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      setVw(w);
      if (w >= 1060) setExpanded(true);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isDesktop = vw >= 1060;
  const isMobile  = vw < 768;
  const isTablet  = vw >= 768 && vw < 1060;

  function isActive(path) {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  }

  function handleNav(path) {
    navigate(path);
    if (isMobile) setExpanded(false);
  }

  const cls = [
    "sidebar",
    !isDesktop && !expanded   ? "sidebar--icon"        : "",
    isMobile   && expanded    ? "sidebar--mobile-open"  : "",
    isMobile   && !expanded   ? "sidebar--mobile-closed": "",
  ].filter(Boolean).join(" ");

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && expanded && (
        <div className="sidebar-backdrop" onClick={() => setExpanded(false)} />
      )}

      {/* Floating hamburger — mobile only when closed */}
      {isMobile && !expanded && (
        <button className="sidebar-fab" onClick={() => setExpanded(true)} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="7"  x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="17" x2="21" y2="17"/>
          </svg>
        </button>
      )}

      <aside className={cls}>
        <div className="sidebar-header">
          <NovaLogoSidebar />
          {!isDesktop && (
            <button
              className="sidebar-toggle-btn"
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {expanded
                  ? <path d="M15 18l-6-6 6-6"/>
                  : <path d="M9 18l6-6-6-6"/>
                }
              </svg>
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {adminSidebarLinks.map((link) => {
            const Icon   = iconMap[link.icon];
            const active = isActive(link.path);
            return (
              <button
                key={link.id}
                className={`sidebar-link ${active ? "active" : ""}`}
                onClick={() => handleNav(link.path)}
                title={link.label}
              >
                <span className="sidebar-icon">
                  {Icon && <Icon size={20} />}
                </span>
                <span className="sidebar-label">{link.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <div className="promo-sparkles">
              <span className="promo-sp sp1"/>
              <span className="promo-sp sp2"/>
              <span className="promo-sp sp3"/>
            </div>
            <div className="promo-content">
              <p className="promo-eyebrow">Nova Classes</p>
              <h4 className="promo-title">Illuminate<br/>Every Mind</h4>
              <p className="promo-desc">Empowering students with knowledge every day.</p>
            </div>
            <div className="promo-bulb-icon">
              <svg width="38" height="38" viewBox="0 0 48 62" fill="none">
                <defs>
                  <radialGradient id="pbFill2" cx="38%" cy="28%" r="64%">
                    <stop offset="0%"   stopColor="#fffde0"/>
                    <stop offset="50%"  stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#f97316"/>
                  </radialGradient>
                </defs>
                <ellipse cx="24" cy="22" rx="18" ry="18" fill="rgba(251,191,36,0.25)"/>
                <path d="M24 3 C12 3 5.5 11 5.5 20 C5.5 28.5 10 34.5 16 38 L16 43 L32 43 L32 38 C38 34.5 42.5 28.5 42.5 20 C42.5 11 36 3 24 3 Z" fill="url(#pbFill2)"/>
                <rect x="16"   y="45.5" width="16" height="3.5" rx="1.75" fill="#9333ea"/>
                <rect x="16.5" y="49"   width="15" height="3"   rx="1.5"  fill="#7e22ce"/>
                <rect x="17"   y="52"   width="14" height="3"   rx="1.5"  fill="#6b21a8"/>
              </svg>
            </div>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">Admin User</span>
              <span className="user-role">Super Admin</span>
            </div>
            <button className="user-menu-btn">
              <ChevronDownIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
