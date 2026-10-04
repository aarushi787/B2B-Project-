import { useState } from "react";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { Card } from "../ui/DesignSystem";
import { proposalsService } from "../../../services/requirementsService";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { formatDate, formatINR, parseAmount } from "../../../lib/format";
import { AcceptDialog, ProposalActionButtons, useProposalActions } from "../marketplace/actions";
import { ListSkeleton, LoadError, PageHeader, ProposalStatusBadge, VerifiedMark, YourTurnTag, pageStyle } from "../marketplace/parts";

const fieldStyle = { width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none", color: "#0f172a" } as const;

/** One proposal: current terms, whose turn it is, the full negotiation history, and the actions you may take. */
export function ProposalDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: p, error, reload } = useLoad(() => proposalsService.get(id), [id]);
  const { run, busyId } = useProposalActions(reload);
  const [accepting, setAccepting] = useState(false);
  const [countering, setCountering] = useState(false);

  if (error) return <div style={pageStyle}><LoadError message={error} onRetry={reload} /></div>;
  if (!p) return <div style={pageStyle}><ListSkeleton rows={3} /></div>;

  const isRequester = p.side === "requester";
  const other = isRequester ? p.proposerName : p.requesterName;
  const myTurn = p.allowedActions.includes("accept");
  const active = p.status === "submitted" || p.status === "shortlisted";
  const canOpenRequirement = isRequester || p.requirementStatus === "open";

  const banner = !active
    ? p.status === "accepted"
      ? "This proposal was accepted and a deal was created."
      : `This proposal is ${p.status}.`
    : p.requirementStatus !== "open"
      ? "The requirement is no longer open, so this proposal can no longer change."
      : myTurn
        ? `${other ?? "The other company"} made the latest offer. It is your turn: accept it, or send a counter-offer.`
        : `Waiting for ${other ?? "the other company"} to respond to your latest offer.`;

  return (
    <div style={{ ...pageStyle, maxWidth: 900 }}>
      <Link to={isRequester ? "/app/opportunities/received" : "/app/opportunities/sent"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 12 }}>
        <ArrowLeft size={14} aria-hidden="true" /> {isRequester ? "Proposals I received" : "Proposals I sent"}
      </Link>

      <PageHeader
        title={p.requirementTitle}
        subtitle={isRequester ? `Proposal from ${p.proposerName ?? "a company"}` : `Your proposal to ${p.requesterName ?? "a company"}`}
        actions={
          <>
            <ProposalStatusBadge status={p.status} />
            {myTurn && active && <YourTurnTag />}
          </>
        }
      />

      <div role="status" aria-label="Negotiation status" style={{ background: myTurn && active ? "#fffbeb" : "#f8fafc", border: `1px solid ${myTurn && active ? "#fde68a" : "#e2e8f0"}`, borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#334155", marginBottom: 20 }}>
        {banner}
      </div>

      <Card style={{ padding: 24, marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Current offer · round {p.version}</p>
        <p style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{formatINR(p.amount)}</p>
        <p style={{ margin: "4px 0 16px", fontSize: 14, color: "#475569" }}>
          {p.timeline ? `Delivery: ${p.timeline}` : "No delivery timeline given"} · {p.proposerName ?? "—"}<VerifiedMark verified={p.proposerVerified} />
        </p>
        {p.message && <p style={{ margin: "0 0 16px", fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.message}</p>}
        {p.deliverables.length > 0 && (
          <>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#334155" }}>Deliverables</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#334155", lineHeight: 1.7 }}>
              {p.deliverables.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </>
        )}
        <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <ProposalActionButtons
            proposal={p}
            busy={busyId === p.id}
            onAction={(a) => (a === "accept" ? setAccepting(true) : void run(p, a))}
            onCounter={() => setCountering(true)}
          />
          {p.dealId && p.status === "accepted" && (
            <Link to={`/app/deals/${p.dealId}`} style={{ fontSize: 14, fontWeight: 600, color: "#1d4ed8" }}>Open the deal</Link>
          )}
          {canOpenRequirement && (
            <Link to={`/app/requirements/${p.requirementId}`} style={{ fontSize: 14, fontWeight: 600, color: "#1d4ed8" }}>View requirement</Link>
          )}
        </div>
      </Card>

      {countering && (
        <CounterForm
          initialAmount={p.amount}
          initialTimeline={p.timeline ?? ""}
          onCancel={() => setCountering(false)}
          onSend={async (input) => {
            try {
              await proposalsService.counter(p.id, input);
              toast.success("Counter-offer sent.");
              setCountering(false);
            } catch (e) {
              toast.error(friendlyError(e));
            }
            await reload();
          }}
        />
      )}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "8px 0 12px" }}>Negotiation history</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...(p.revisions ?? [])].reverse().map((r) => {
            const mine = r.offeredBy === p.side;
            return (
              <li key={r.version}>
                <Card style={{ padding: 18, borderLeft: `4px solid ${r.offeredBy === "proposer" ? "#2563EB" : "#2563EB"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {formatINR(r.amount)} <span style={{ fontWeight: 500, color: "#475569" }}>· {mine ? "You" : r.authorCompanyName} {r.version === 1 ? "proposed" : "countered"}</span>
                    </p>
                    <span style={{ fontSize: 12, color: "#475569" }}>Round {r.version} · {formatDate(r.createdAt)}</span>
                  </div>
                  {r.timeline && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>Delivery: {r.timeline}</p>}
                  {r.message && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.message}</p>}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <AcceptDialog
        proposal={accepting ? p : null}
        busy={busyId === p.id}
        onCancel={() => setAccepting(false)}
        onConfirm={() => void run(p, "accept").then(() => setAccepting(false))}
      />
    </div>
  );
}

function CounterForm({
  initialAmount, initialTimeline, onCancel, onSend,
}: {
  initialAmount: number;
  initialTimeline: string;
  onCancel: () => void;
  onSend: (input: { amount: number; timeline?: string; message?: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(initialAmount));
  const [timeline, setTimeline] = useState(initialTimeline);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed || parsed <= 0) { setError("Enter an amount in rupees, for example 48000 or 1.5L."); return; }
    setError("");
    setSending(true);
    await onSend({ amount: parsed, timeline: timeline.trim() || undefined, message: message.trim() || undefined });
    setSending(false);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Counter-offer">
      <Card style={{ padding: 24, marginBottom: 20, border: "1px solid #bfdbfe" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Your counter-offer</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div>
            <label htmlFor="counter-amount" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Amount (₹)</label>
            <input id="counter-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!error} aria-describedby="counter-error" style={{ ...fieldStyle, borderColor: error ? "#dc2626" : "#cbd5e1" }} />
            {error && <p id="counter-error" role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>{error}</p>}
          </div>
          <div>
            <label htmlFor="counter-timeline" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Delivery timeline</label>
            <input id="counter-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} maxLength={100} style={fieldStyle} />
          </div>
        </div>
        <label htmlFor="counter-message" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Message (optional)</label>
        <textarea id="counter-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={5000} placeholder="Explain your counter-offer" style={{ ...fieldStyle, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 14, fontWeight: 600, padding: "9px 18px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={sending} style={{ background: "#2563EB", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, padding: "9px 20px", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "Send counter-offer"}
          </button>
        </div>
      </Card>
    </form>
  );
}
