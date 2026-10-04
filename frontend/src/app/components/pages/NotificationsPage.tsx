import React from 'react';
import { useOutletContext } from 'react-router';
import { Card, StatusBadge } from '../ui/DesignSystem';
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useOutletContext<any>();
  const markAllAsRead = markAllRead;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>All Notifications</h1>
        <button 
          onClick={markAllAsRead}
          style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}
        >
          Mark all as read
        </button>
      </div>

      <Card>
        {(!notifications || notifications.length === 0) && <p style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 14 }}>No notifications yet. You will see proposals, offers, deals and document decisions here as they happen.</p>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {notifications?.map((n: any, i: number) => (
            <motion.div 
              key={n.id}
              onClick={() => markRead(n.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: 16, 
                padding: "20px 24px", 
                borderBottom: i < notifications.length - 1 ? "1px solid #f1f5f9" : "none",
                background: n.read ? "#ffffff" : "#f8fafc"
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: n.type === "success" ? "#dcfce7" : n.type === "warning" ? "#fef3c7" : "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {n.type === "success" && <CheckCircle style={{ width: 18, height: 18, color: "#16a34a" }} />}
                {n.type === "warning" && <AlertCircle style={{ width: 18, height: 18, color: "#d97706" }} />}
                {n.type === "info" && <Bell style={{ width: 18, height: 18, color: "#2563EB" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{n.title}</p>
                  <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock className="w-3 h-3" /> {n.time}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#475569", margin: "6px 0 0", lineHeight: 1.5 }}>{n.message}</p>
              </div>
              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB", marginTop: 6 }} />
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
