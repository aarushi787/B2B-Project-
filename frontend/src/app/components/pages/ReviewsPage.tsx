// Reviews in one place: deals waiting for your review, and what other businesses said about you.
import { Link } from "react-router";
import { Star } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { useLoad } from "../../../lib/useLoad";
import { CompanyReviews } from "../Reviews";
import { ListSkeleton, LoadError, PageHeader, pageStyle } from "../marketplace/parts";

interface Pending { dealId: string; dealTitle: string; companyId: string; companyName: string }

export function ReviewsPage() {
  const { user } = useAuth();
  const pending = useLoad(() => apiClient.get<Pending[]>("/reputation/pending"), []);

  return (
    <div style={pageStyle}>
      <PageHeader title="Reviews" subtitle="Rate the businesses you finished a deal with, and see what they said about you." />

      <section aria-labelledby="to-review" style={{ marginBottom: 32 }}>
        <h2 id="to-review" style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>Waiting for your review</h2>
        {pending.error ? <LoadError message={pending.error} onRetry={pending.reload} />
          : pending.loading && !pending.data ? <ListSkeleton rows={2} />
          : (pending.data ?? []).length === 0 ? (
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>Nothing to review right now. When a deal is marked completed, it shows up here.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {pending.data!.map((p) => (
                <li key={p.dealId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{p.companyName}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 14, color: "#64748b" }}>{p.dealTitle}</p>
                  </div>
                  <Link to={`/app/deals/${p.dealId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#6921A5", color: "#fff", fontSize: 15, fontWeight: 600, padding: "9px 16px", borderRadius: 10, textDecoration: "none" }}>
                    <Star size={16} aria-hidden="true" /> Leave a review
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section aria-labelledby="about-you">
        <h2 id="about-you" style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>What others said about you</h2>
        {user?.companyId ? <CompanyReviews companyId={user.companyId} /> : <p style={{ color: "#64748b" }}>Create your company profile to collect reviews.</p>}
      </section>
    </div>
  );
}
