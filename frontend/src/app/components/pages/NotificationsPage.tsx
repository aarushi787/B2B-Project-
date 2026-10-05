import React from 'react';
import { useOutletContext } from 'react-router';
import { Card, StatusBadge } from '../ui/DesignSystem';
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useOutletContext<any>();
  const markAllAsRead = markAllRead;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>All Notifications</h1>
        <button 
          onClick={markAllAsRead}
          disabled={!notifications?.some((n: any) => !n.read)}
          style={{ fontSize: 15, fontWeight: 600, color: "#6921A5", background: "none", border: "none", cursor: "pointer" }}
        >
          Mark all as read
        </button>
      </div>

      <Card>
        {(!notifications || notifications.length === 0) && <p style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 14 }}>No notifications yet. You will see proposals, offers, deals and document decisions here as they happen.</p>}
        <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", margin: 0, padding: 0 }} aria-live="polite">
          {notifications?.map((n: any, i: number) => (
            <li key={n.id} style={{ borderBottom: i < notifications.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            <button
              type="button"
              onClick={() => !n.read && markRead(n.id)}
              aria-label={`${n.read ? "" : "Unread: "}${n.title}. ${n.read ? "" : "Press to mark as read."}`}
              style={{ 
                width: "100%", textAlign: "left", border: "none", cursor: n.read ? "default" : "pointer", font: "inherit",
                display: "flex", 
                alignItems: "flex-start", 
                gap: 16, 
                padding: "20px 24px", 
                background: n.read ? "#ffffff" : "#f8fafc"
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: n.type === "success" ? "#dcfce7" : n.type === "warning" ? "#fef3c7" : "#DBC5E7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {n.type === "success" && <CheckCircle style={{ width: 18, height: 18, color: "#16a34a" }} />}
                {n.type === "warning" && <AlertCircle style={{ width: 18, height: 18, color: "#d97706" }} />}
                {n.type === "info" && <Bell style={{ width: 18, height: 18, color: "#6921A5" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{n.title}</p>
                  <span style={{ fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {n.time}
                  </span>
                </div>
                <p style={{ fontSize: 15, color: "#475569", margin: "6px 0 0", lineHeight: 1.5 }}>{n.message}</p>
              </div>
              {!n.read && (
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#6921A5", marginTop: 6 }} />
              )}
            </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
