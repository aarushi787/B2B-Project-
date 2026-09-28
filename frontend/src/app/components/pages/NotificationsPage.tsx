import React, { useState } from 'react';
import { Card, StatusBadge } from '../ui/DesignSystem';
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: "success", title: "Proposal Accepted", message: "Your proposal for 'Enterprise CRM' was accepted by Acme Corp.", time: "10 minutes ago", read: false },
    { id: 2, type: "info", title: "New Requirement Posted", message: "A new requirement matching your services was posted.", time: "2 hours ago", read: false },
    { id: 3, type: "warning", title: "Escrow Payment Pending", message: "You need to release funds for Milestone 1.", time: "1 day ago", read: true },
    { id: 4, type: "info", title: "System Update", message: "We've added new features to the dashboard.", time: "3 days ago", read: true },
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

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
        <div style={{ display: "flex", flexDirection: "column" }}>
          {notifications.map((n, i) => (
            <motion.div 
              key={n.id}
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
