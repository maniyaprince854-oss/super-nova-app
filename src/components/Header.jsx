import { SearchIcon, BellIcon, SunIcon, CalendarIcon } from "./Icons";
import "./Header.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header({ title = "Dashboard", subtitle = "" }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-title-area">
          <p className="header-greeting">{getGreeting()}, Admin</p>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>

        <div className="header-controls">
          <div className="search-wrapper">
            <span className="search-icon-wrap"><SearchIcon size={16} /></span>
            <input type="text" placeholder="Search..." className="header-search" />
          </div>

          <button className="control-btn notification-btn" aria-label="Notifications">
            <BellIcon size={18} />
            <span className="notification-badge">3</span>
          </button>

          <button className="control-btn theme-btn" aria-label="Toggle theme">
            <SunIcon size={18} />
          </button>

          <div className="header-date-chip">
            <span className="cal-icon"><CalendarIcon size={14} /></span>
            <span>{dateStr}</span>
          </div>

          <div className="header-admin-avatar">A</div>
        </div>
      </div>
    </header>
  );
}
