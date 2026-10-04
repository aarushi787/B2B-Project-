import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FileText, Plus, Search } from "lucide-react";
import { Card, EmptyState, Pagination, PrimaryBtn } from "../ui/DesignSystem";
import { requirementsService } from "../../../services/requirementsService";
import { useLoad } from "../../../lib/useLoad";
import { budgetLabel, formatDate } from "../../../lib/format";
import type { RequirementStatus } from "../../../types";
import { ListSkeleton, LoadError, PageHeader, RequirementStatusBadge, pageStyle } from "./parts";

/** The signed-in company's own requirements, filtered by status. Used by the Active and Closed pages. */
export function RequirementsList({
  title, subtitle, statuses, emptyTitle, emptyDesc, showPostButton,
}: {
  title: string;
  subtitle: string;
  statuses: RequirementStatus[];
  emptyTitle: string;
  emptyDesc: string;
  showPostButton?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useLoad(
    () => requirementsService.list({ scope: "mine", status: statuses, q: query, page, limit: 10 }),
    [query, page, statuses.join(",")]
  );

  const postButton = (
    <Link to="/app/requirements/new" style={{ textDecoration: "none" }}>
      <PrimaryBtn><Plus size={16} aria-hidden="true" /> Post requirement</PrimaryBtn>
    </Link>
  );

  return (
    <div style={pageStyle}>
      <PageHeader title={title} subtitle={subtitle} actions={showPostButton ? postButton : undefined} />

      <div style={{ position: "relative", maxWidth: 420, marginBottom: 20 }}>
        <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        <input
          type="search"
          aria-label="Search requirements"
          placeholder="Search by title or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none" }}
        />
      </div>

      {error ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton />
      ) : data && data.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title={query ? "No requirements match your search" : emptyTitle}
            desc={query ? "Try a different word or clear the search." : emptyDesc}
            action={!query && showPostButton ? postButton : undefined}
          />
        </Card>
      ) : (
        <Card>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, opacity: loading ? 0.6 : 1 }}>
            {data?.data.map((r, i) => (
              <li key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                <Link
                  to={`/app/requirements/${r.id}`}
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 24px", padding: "18px 24px", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{r.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
                      {r.category ?? "General"} · Posted {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <span style={{ flex: "0 0 auto", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{budgetLabel(r.budgetMin, r.budgetMax)}</span>
                  <span style={{ flex: "0 0 auto", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
                    {r.proposalCount ?? 0} {r.proposalCount === 1 ? "proposal" : "proposals"}
                  </span>
                  <RequirementStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination currentPage={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
