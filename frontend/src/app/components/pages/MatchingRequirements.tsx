import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Store } from "lucide-react";
import { Card, EmptyState, Pagination } from "../ui/DesignSystem";
import { requirementsService } from "../../../services/requirementsService";
import { useLoad } from "../../../lib/useLoad";
import { budgetLabel, formatDate } from "../../../lib/format";
import { CATEGORIES } from "../marketplace/constants";
import { ListSkeleton, LoadError, PageHeader, VerifiedMark, pageStyle } from "../marketplace/parts";

/** Open requirements from other companies that you can send a proposal to. */
export function MatchingRequirements() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useLoad(
    () => requirementsService.list({ scope: "open", q: query, category, page, limit: 10 }),
    [query, category, page]
  );

  const filtered = !!query || !!category;

  return (
    <div style={pageStyle}>
      <PageHeader title="Find work" subtitle="Open requirements from other companies. Send a proposal to compete for the work." />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="search"
            aria-label="Search open requirements"
            placeholder="Search by title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
        </div>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, background: "#fff", color: "#0f172a" }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton />
      ) : data && data.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Store}
            title={filtered ? "No requirements match your filters" : "No open requirements right now"}
            desc={filtered ? "Try a different search or category." : "New requirements from other companies will appear here."}
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: loading ? 0.6 : 1 }}>
          {data?.data.map((r) => (
            <Card key={r.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <Link to={`/app/requirements/${r.id}`} style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                    {r.title}
                  </Link>
                  <p style={{ margin: "4px 0 8px", fontSize: 13, color: "#475569" }}>
                    {r.companyName ?? "A company"}<VerifiedMark verified={r.companyVerified} /> · {r.category ?? "General"} · Posted {formatDate(r.createdAt)}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.description}
                  </p>
                </div>
                <div style={{ flex: "0 0 auto", textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{budgetLabel(r.budgetMin, r.budgetMax)}</span>
                  {r.timeline && <span style={{ fontSize: 13, color: "#475569" }}>{r.timeline}</span>}
                  {r.myProposalId ? (
                    <Link to={`/app/opportunities/proposals/${r.myProposalId}`} style={{ fontSize: 13, fontWeight: 600, color: "#6921A5" }}>
                      View your proposal
                    </Link>
                  ) : (
                    <Link
                      to={`/app/opportunities/send/${r.id}`}
                      style={{ background: "#6921A5", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, textDecoration: "none" }}
                    >
                      Send proposal
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <Card><Pagination currentPage={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} /></Card>
        </div>
      )}
    </div>
  );
}
