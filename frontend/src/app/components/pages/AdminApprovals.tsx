// Admin screen: documents waiting for approval and a live feed of what users are doing. Everything is real data
// from /api/admin/*, refreshed whenever the server pushes 'admin:activity'.
import React, { useCallback, useEffect, useState } from "react";
import { apiClient, API_BASE_URL } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";

type Approval = { id: string; companyName: string | null; documentType: string; status: string; createdAt: string; uploadedByEmail: string | null };
type Activity = { id: string; action: string; actorEmail: string | null; metadata: { title?: string; message?: string } | null; createdAt: string };

const badge: Record<string, string> = { PENDING: "#d97706", VERIFIED: "#16a34a", REJECTED: "#dc2626" };

export function AdminApprovals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([apiClient.get<Approval[]>("/admin/approvals"), apiClient.get<Activity[]>("/admin/activity")]);
      setApprovals(a || []);
      setActivity(b || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }, []);

  useEffect(() => {
    load();
    socketService.connect();
    return socketService.on("admin:activity", () => load());
  }, [load]);

  const decide = async (id: string, status: "VERIFIED" | "REJECTED") => {
    let reason: string | undefined;
    if (status === "REJECTED") {
      reason = window.prompt("Reason for rejecting (shown to the company):") ?? undefined;
      if (reason === undefined) return;
    }
    setBusy(id);
    try {
      await apiClient.put(`/kyc/${id}/verify`, { status, reason: reason || undefined });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const pending = approvals.filter((a) => a.status === "PENDING");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Documents waiting for approval ({pending.length})</h2>
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {approvals.length === 0 && <p style={{ fontSize: 13, color: "#64748b" }}>Nothing submitted yet. New documents appear here instantly.</p>}
          {approvals.map((a) => (
            <div key={a.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{a.companyName ?? "Unknown company"} · {a.documentType}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{a.uploadedByEmail} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: badge[a.status] ?? "#64748b" }}>{a.status}</span>
              <a href={`${API_BASE_URL}/kyc/${a.id}/file`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "#2563EB" }}>View file</a>
              {a.status === "PENDING" && (
                <>
                  <button disabled={busy === a.id} onClick={() => decide(a.id, "VERIFIED")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Approve</button>
                  <button disabled={busy === a.id} onClick={() => decide(a.id, "REJECTED")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Reject</button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live activity</h2>
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          {activity.length === 0 && <p style={{ fontSize: 13, color: "#64748b" }}>No activity yet.</p>}
          {activity.map((x) => (
            <div key={x.id} style={{ display: "flex", gap: 12, fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>{new Date(x.createdAt).toLocaleTimeString()}</span>
              <span style={{ fontWeight: 600 }}>{x.metadata?.title ?? x.action}</span>
              <span style={{ color: "#64748b" }}>{x.metadata?.message}{x.actorEmail ? ` (${x.actorEmail})` : ""}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
