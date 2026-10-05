import { useState } from "react";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import { ArrowLeft, Inbox } from "lucide-react";
import { Card, EmptyState } from "../ui/DesignSystem";
import { requirementsService } from "../../../services/requirementsService";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { budgetLabel, formatDate, formatINR } from "../../../lib/format";
import type { MarketProposal } from "../../../types";
import { ProposalCompare, budgetDelta } from "../marketplace/ProposalCompare";
import { RatingSummary } from "../Reviews";
import { AcceptDialog, ProposalActionButtons, useProposalActions } from "../marketplace/actions";
import {
  ListSkeleton, LoadError, PageHeader, ProposalStatusBadge, RequirementStatusBadge, VerifiedMark, YourTurnTag, pageStyle,
} from "../marketplace/parts";

type Sort = "amount" | "date" | "timeline";

export function RequirementDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const [sort, setSort] = useState<Sort>("amount");
  const [accepting, setAccepting] = useState<MarketProposal | null>(null);
  const [closing, setClosing] = useState(false);
  const [onlyShortlisted, setOnlyShortlisted] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const requirement = useLoad(() => requirementsService.get(id), [id]);
  const req = requirement.data;
  const isMine = !!req?.isMine;

  const proposals = useLoad<MarketProposal[]>(
    async () => (isMine ? (await requirementsService.proposals(id, sort)).data : []),
    [id, isMine, sort]
  );

  const refresh = () => { void requirement.reload(); void proposals.reload(); };
  const { run, busyId } = useProposalActions(refresh);

  const close = async () => {
    if (!window.confirm("Close this requirement? Open proposals will be rejected.")) return;
    setClosing(true);
    try {
      await requirementsService.close(id);
      toast.success("Requirement closed.");
      refresh();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setClosing(false);
    }
  };

  if (requirement.error) {
    return <div style={pageStyle}><LoadError message={requirement.error} onRetry={requirement.reload} /></div>;
  }
  if (!req) return <div style={pageStyle}><ListSkeleton rows={3} /></div>;

  const all = proposals.data ?? [];
  const shortlistedCount = all.filter((p) => p.status === "shortlisted").length;
  const list = onlyShortlisted ? all.filter((p) => p.status === "shortlisted") : all;
  const togglePick = (pid: string) => setPicked((cur) => cur.includes(pid) ? cur.filter((x) => x !== pid) : cur.length >= 3 ? cur : [...cur, pid]);
  const pickedProposals = all.filter((p) => picked.includes(p.id));
  const lowest = list.filter((p) => p.status !== "rejected" && p.status !== "withdrawn").reduce<number | null>(
    (min, p) => (min === null || p.amount < min ? p.amount : min), null
  );

  return (
    <div style={pageStyle}>
      <Link to={isMine ? "/app/requirements/active" : "/app/opportunities/matching"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 12 }}>
        <ArrowLeft size={14} aria-hidden="true" /> {isMine ? "My requirements" : "Find work"}
      </Link>

      <PageHeader
        title={req.title}
        subtitle={`${isMine ? "Posted by you" : req.companyName ?? "A company"} · ${req.category ?? "General"} · Posted ${formatDate(req.createdAt)}`}
        actions={
          <>
            <RequirementStatusBadge status={req.status} />
            {isMine && req.status === "open" && (
              <button type="button" onClick={close} disabled={closing} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
                Close requirement
              </button>
            )}
            {isMine && req.status === "awarded" && req.dealId && (
              <Link to={`/app/deals/${req.dealId}`} style={{ background: "#6921A5", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}>
                Open deal
              </Link>
            )}
          </>
        }
      />

      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 40px", marginBottom: 16 }}>
          <Fact label="Budget" value={budgetLabel(req.budgetMin, req.budgetMax)} />
          <Fact label="Timeline" value={req.timeline ?? "Flexible"} />
          <Fact label="Posted by" value={<>{req.companyName ?? "—"}<VerifiedMark verified={req.companyVerified} /></>} />
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{req.description}</p>
      </Card>

      {!isMine && (
        <Card style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          {req.myProposalId ? (
            <>
              <span style={{ fontSize: 14, color: "#334155" }}>You have already sent a proposal for this requirement.</span>
              <Link to={`/app/opportunities/proposals/${req.myProposalId}`} style={{ fontSize: 14, fontWeight: 600, color: "#6921A5" }}>View your proposal</Link>
            </>
          ) : req.status === "open" ? (
            <>
              <span style={{ fontSize: 14, color: "#334155" }}>Interested? Send your price, timeline and approach.</span>
              <Link to={`/app/opportunities/send/${req.id}`} style={{ background: "#6921A5", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 8, textDecoration: "none" }}>
                Send proposal
              </Link>
            </>
          ) : (
            <span style={{ fontSize: 14, color: "#475569" }}>This requirement is no longer accepting proposals.</span>
          )}
        </Card>
      )}

      {isMine && (
        <section aria-labelledby="proposals-heading">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <h2 id="proposals-heading" style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Proposals {list.length > 0 && <span style={{ color: "#475569", fontWeight: 600 }}>({list.length})</span>}
            </h2>
            <label style={{ fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={onlyShortlisted} onChange={(e) => setOnlyShortlisted(e.target.checked)} />
              Shortlisted only ({shortlistedCount})
            </label>
            <label style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, background: "#fff" }}>
                <option value="amount">Lowest price</option>
                <option value="date">Newest</option>
                <option value="timeline">Timeline</option>
              </select>
            </label>
          </div>

          {proposals.error ? (
            <LoadError message={proposals.error} onRetry={proposals.reload} />
          ) : proposals.loading && !proposals.data ? (
            <ListSkeleton rows={3} />
          ) : list.length === 0 ? (
            <Card>
              <EmptyState icon={Inbox} title={onlyShortlisted ? "No shortlisted proposals" : "No proposals yet"} desc={onlyShortlisted ? "Shortlist a proposal to keep it here." : "Companies that match your requirement can send proposals. You will see them here to compare."} />
            </Card>
          ) : (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button" disabled={picked.length < 2} onClick={() => setComparing(true)}
                style={{ background: picked.length < 2 ? "#e2e8f0" : "#6921A5", color: picked.length < 2 ? "#64748b" : "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: picked.length < 2 ? "not-allowed" : "pointer" }}
              >
                Compare selected ({picked.length})
              </button>
              <span style={{ fontSize: 13, color: "#64748b" }}>Tick two or three proposals to see them side by side.</span>
            </div>
            {comparing && pickedProposals.length >= 2 && (
              <ProposalCompare
                proposals={pickedProposals}
                onClose={() => setComparing(false)}
                renderActions={(p) => (
                  <ProposalActionButtons
                    proposal={{ ...p, allowedActions: p.allowedActions.filter((a) => a === "accept" || a === "shortlist") }}
                    busy={busyId === p.id}
                    onAction={(a) => (a === "accept" ? setAccepting(p) : void run(p, a))}
                  />
                )}
              />
            )}
            <Card>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <caption style={{ position: "absolute", left: -9999 }}>Proposals for this requirement, side by side</caption>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      {["Compare", "Company", "Offer", "Timeline", "Status", "Round", ""].map((h) => (
                        <th key={h} scope="col" style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => (
                      <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", verticalAlign: "top" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <input
                            type="checkbox" checked={picked.includes(p.id)} onChange={() => togglePick(p.id)}
                            disabled={!picked.includes(p.id) && picked.length >= 3}
                            aria-label={`Select ${p.proposerName ?? "this company"} to compare`}
                            style={{ width: 18, height: 18 }}
                          />
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                          {p.proposerName ?? "—"}<VerifiedMark verified={p.proposerVerified} />
                          <div style={{ marginTop: 4 }}><RatingSummary rating={p.proposerRating} count={p.proposerReviews} /></div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {formatINR(p.amount)}
                          {budgetDelta(p.amount, p.requirementBudgetMin, p.requirementBudgetMax) && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>{budgetDelta(p.amount, p.requirementBudgetMin, p.requirementBudgetMax)}</div>
                          )}
                          {lowest !== null && p.amount === lowest && p.allowedActions.length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>Lowest</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#334155" }}>{p.timeline ?? "—"}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <ProposalStatusBadge status={p.status} />
                            {p.allowedActions.includes("accept") && <YourTurnTag />}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#475569" }}>v{p.version}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                            <Link to={`/app/opportunities/proposals/${p.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#6921A5" }}>
                              Review and negotiate
                            </Link>
                            <ProposalActionButtons
                              proposal={{ ...p, allowedActions: p.allowedActions.filter((a) => a === "accept" || a === "shortlist") }}
                              busy={busyId === p.id}
                              onAction={(a) => (a === "accept" ? setAccepting(p) : void run(p, a))}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </>
          )}
        </section>
      )}

      <AcceptDialog
        proposal={accepting}
        busy={!!accepting && busyId === accepting.id}
        onCancel={() => setAccepting(null)}
        onConfirm={() => { if (accepting) void run(accepting, "accept").then(() => setAccepting(null)); }}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{value}</p>
    </div>
  );
}
