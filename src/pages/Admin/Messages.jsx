import { useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "./Messages.css";

const demoMessages = [
  {
    id: 1,
    sender: "Admin",
    avatar: "A",
    subject: "Welcome to Supernova Foundation",
    preview: "We are thrilled to have you join us. Please check the latest announcements.",
    time: "10:30 AM",
    date: "Today",
    read: false,
    color: "purple",
  },
  {
    id: 2,
    sender: "System",
    avatar: "S",
    subject: "Sunday Test Reminder",
    preview: "Prepare for the weekly test this Sunday. Syllabus: Chapters 1–3.",
    time: "9:00 AM",
    date: "Today",
    read: true,
    color: "blue",
  },
  {
    id: 3,
    sender: "Admin",
    avatar: "A",
    subject: "Homework Due: Chapter 3",
    preview: "Mathematics Chapter 3 questions are due by May 28. Please submit on time.",
    time: "Yesterday",
    date: "Yesterday",
    read: true,
    color: "orange",
  },
];

export default function AdminMessages() {
  const [selected, setSelected] = useState(demoMessages[0]);
  const [messages, setMessages] = useState(demoMessages);
  const [compose, setCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeSubject, setComposeSubject] = useState("");

  function selectMessage(msg) {
    setSelected(msg);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <Header title="Messages" subtitle="Foundation communications and announcements" />
        <main className="admin-main">

          <div className="messages-layout">
            {/* Inbox list */}
            <div className="messages-sidebar-panel">
              <div className="messages-panel-header">
                <h3 className="messages-panel-title">
                  Inbox
                  {unreadCount > 0 && (
                    <span className="inbox-badge">{unreadCount}</span>
                  )}
                </h3>
                <button className="compose-btn" onClick={() => setCompose(true)}>
                  + Compose
                </button>
              </div>
              <div className="messages-list">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    className={`message-item ${selected?.id === msg.id ? "active" : ""} ${!msg.read ? "unread" : ""}`}
                    onClick={() => selectMessage(msg)}
                  >
                    <div className={`msg-avatar msg-avatar--${msg.color}`}>{msg.avatar}</div>
                    <div className="msg-info">
                      <div className="msg-sender">{msg.sender}</div>
                      <div className="msg-subject">{msg.subject}</div>
                      <div className="msg-preview">{msg.preview}</div>
                    </div>
                    <div className="msg-meta">
                      <span className="msg-time">{msg.time}</span>
                      {!msg.read && <span className="msg-unread-dot"></span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message detail */}
            <div className="message-detail-panel">
              {compose ? (
                <div className="compose-panel">
                  <div className="compose-header">
                    <h3 className="compose-title">New Message</h3>
                    <button className="compose-close" onClick={() => setCompose(false)}>✕</button>
                  </div>
                  <div className="compose-form">
                    <input
                      type="text"
                      className="compose-input"
                      placeholder="Subject"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                    />
                    <textarea
                      className="compose-textarea"
                      placeholder="Write your message..."
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                    />
                    <button
                      className="compose-send-btn"
                      onClick={() => { setCompose(false); setComposeText(""); setComposeSubject(""); }}
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="message-view">
                  <div className="message-view-header">
                    <h2 className="message-view-subject">{selected.subject}</h2>
                    <span className="message-view-time">{selected.date} · {selected.time}</span>
                  </div>
                  <div className="message-view-sender">
                    <div className={`msg-avatar msg-avatar--${selected.color}`}>{selected.avatar}</div>
                    <div>
                      <div className="sender-name">{selected.sender}</div>
                      <div className="sender-label">Foundation Admin</div>
                    </div>
                  </div>
                  <div className="message-view-body">
                    <p>{selected.preview}</p>
                    <p>This is a system-generated notification from Supernova Foundation. Please do not reply directly to this message. For support, contact your class coordinator.</p>
                  </div>
                </div>
              ) : (
                <div className="message-empty">
                  <p>Select a message to read</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
