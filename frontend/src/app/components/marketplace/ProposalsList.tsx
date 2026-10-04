import { useState } from "react";
import { Link } from "react-router";
import { Send } from "lucide-react";
import { Card, EmptyState, Pagination } from "../ui/DesignSystem";
import { proposalsService } from "../../../services/requirementsService";
import { useLoad } from "../../../lib/useLoad";
import { formatDate, formatINR } from "../../../lib/format";
import { ListSkeleton, LoadError, PageHeader, ProposalStatusBadge, VerifiedMark, YourTurnTag, pageStyle } from "./parts";

const TABS = [
  { key: "", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

/** Proposals I sent (scope=sent) or received on my requirements (scope=received). */
export function ProposalsList({ scope }: { scope: "sent" | "received" }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const sent = scope === "sent";

  const { data, loading, error, reload } = useLoad(
    () => proposalsService.list({ scope, status: status || undefined, page, limit: 10 }),
    [scope, status, page]
  );

  return (
    <div style={pageStyle}>
      <PageHeader
        title={sent ? "Proposals I sent" : "Proposals I received"}
        subtitle={sent ? "Track your offers and respond to counter-offers." : "Compare offers on your requirements and negotiate."}
      />

      <div role="tablist" aria-label="Filter by status" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            type="button"
            onClick={() => { setStatus(t.key); setPage(1); }}
            style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${status === t.key ? "#2563EB" : "#cbd5e1"}`,
              background: status === t.key ? "#eff6ff" : "#fff",
              color: status === t.key ? "#1d4ed8" : "#334155",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton />
      ) : data && data.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Send}
            title={status ? "No proposals with this status" : sent ? "You have not sent any proposals" : "No proposals received yet"}
            desc={sent ? "Browse open requirements and send your first proposal." : "When companies respond to your requirements, their offers appear here."}
            action={
              !status ? (
                <Link to={sent ? "/app/opportunities/matching" : "/app/requirements/new"} style={{ background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8, textDecoration: "none" }}>
                  {sent ? "Find work" : "Post a requirement"}
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, opacity: loading ? 0.6 : 1 }}>
            {data?.data.map((p, i) => {
              const otherName = sent ? p.requesterName : p.proposerName;
              const myTurn = p.allowedActions.includes("accept");
              return (
                <li key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <Link to={`/app/opportunities/proposals/${p.id}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 24px", padding: "18px 24px", textDecoration: "none", color: "inherit" }}>
                    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{p.requirementTitle}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
                        {sent ? "To" : "From"} {otherName ?? "a company"}{!sent && <VerifiedMark verified={p.proposerVerified} />} · Updated {formatDate(p.updatedAt)}
                      </p>
                    </div>
                    <span style={{ flex: "0 0 auto", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{formatINR(p.amount)}</span>
                    <span style={{ flex: "0 0 auto", fontSize: 12, color: "#475569" }}>Round {p.version}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ProposalStatusBadge status={p.status} />
                      {myTurn && <YourTurnTag />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination currentPage={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
