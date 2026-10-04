import { useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Check, FileText } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useLoad } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";

interface KycDoc { id: string; documentType: string; status: string; createdAt: string; verifiedAt?: string | null; }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  VERIFIED: { label: "Verified", bg: "#dcfce7", color: "#16a34a" },
  APPROVED: { label: "Verified", bg: "#dcfce7", color: "#16a34a" },
  PENDING: { label: "In review", bg: "#fef3c7", color: "#d97706" },
  REJECTED: { label: "Rejected", bg: "#fee2e2", color: "#dc2626" },
};

export function VerificationPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const { data, loading, error, reload } = useLoad<KycDoc[]>(
    () => (companyId ? apiClient.get<KycDoc[]>(`/kyc/company/${companyId}`) : Promise.resolve([])),
    [companyId]
  );

  useEffect(() => {
    socketService.connect();
    return socketService.on("kyc:updated", () => { void reload(); });
  }, [reload]);

  const docs = data ?? [];
  const verified = docs.filter(d => STATUS[d.status?.toUpperCase()]?.label === "Verified").length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 900, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Verification</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>Documents your company has submitted for review.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Business documents</h2>
          <Link to="/app/contracts" style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>Upload documents</Link>
        </div>

        {!companyId ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Your account is not linked to a company yet.</p>
        ) : error ? (
          <p role="alert" style={{ fontSize: 13, color: "#dc2626" }}>
            {error} <button onClick={() => void reload()} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Retry</button>
          </p>
        ) : loading && !data ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Loading...</p>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>No documents submitted yet.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>{verified} of {docs.length} documents verified.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docs.map(d => {
                const s = STATUS[d.status?.toUpperCase()] ?? { label: d.status, bg: "#f1f5f9", color: "#64748b" };
                return (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                    <FileText size={20} color="#64748b" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{d.documentType}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                        Submitted {formatDate(d.createdAt)}{d.verifiedAt ? ` - reviewed ${formatDate(d.verifiedAt)}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "2px 8px", borderRadius: 12 }}>{s.label}</span>
                    {s.label === "Verified" && <Check color="#16a34a" size={18} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
