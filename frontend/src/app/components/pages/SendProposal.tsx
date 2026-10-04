import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import { Card } from "../ui/DesignSystem";
import { requirementsService } from "../../../services/requirementsService";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { budgetLabel, parseAmount } from "../../../lib/format";
import { ListSkeleton, LoadError, PageHeader, pageStyle } from "../marketplace/parts";

const fieldStyle = { width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none", color: "#0f172a" } as const;
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 } as const;

export function SendProposal() {
  const { id } = useParams<{ id: string }>();
  // The old route had no requirement id; send people to pick one instead of showing an empty form.
  if (!id) return <Navigate to="/app/opportunities/matching" replace />;
  return <SendProposalForm requirementId={id} />;
}

function SendProposalForm({ requirementId }: { requirementId: string }) {
  const navigate = useNavigate();
  const { data: req, error, reload } = useLoad(() => requirementsService.get(requirementId), [requirementId]);

  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; message?: string }>({});

  if (error) return <div style={pageStyle}><LoadError message={error} onRetry={reload} /></div>;
  if (!req) return <div style={pageStyle}><ListSkeleton rows={3} /></div>;

  if (req.isMine) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Send a proposal" />
        <Card style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>You posted this requirement, so you cannot send a proposal to it.</p>
          <Link to={`/app/requirements/${req.id}`} style={{ display: "inline-block", marginTop: 12, fontSize: 14, fontWeight: 600, color: "#1d4ed8" }}>View proposals you received</Link>
        </Card>
      </div>
    );
  }
  if (req.myProposalId) return <Navigate to={`/app/opportunities/proposals/${req.myProposalId}`} replace />;
  if (req.status !== "open") {
    return (
      <div style={pageStyle}>
        <PageHeader title="Send a proposal" />
        <Card style={{ padding: 24 }}><p style={{ margin: 0, fontSize: 14, color: "#334155" }}>This requirement is no longer accepting proposals.</p></Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmount(amount);
    const next: typeof errors = {};
    if (!parsed || parsed <= 0) next.amount = "Enter your price in rupees, for example 50000 or 1.5L.";
    if (!message.trim()) next.message = "Tell the buyer how you would approach this.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const created = await requirementsService.sendProposal(requirementId, {
        amount: parsed!,
        timeline: timeline.trim() || undefined,
        message: message.trim(),
        deliverables: deliverables.map((d) => d.trim()).filter(Boolean),
      });
      toast.success("Proposal sent.");
      navigate(`/app/opportunities/proposals/${created.id}`);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...pageStyle, maxWidth: 820 }}>
      <PageHeader title="Send a proposal" subtitle={`For “${req.title}” from ${req.companyName ?? "a company"}`} />

      <Card style={{ padding: 20, marginBottom: 20, background: "#f8fafc" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
          Budget: <b style={{ color: "#0f172a" }}>{budgetLabel(req.budgetMin, req.budgetMax)}</b>
          {req.timeline && <> · Timeline: <b style={{ color: "#0f172a" }}>{req.timeline}</b></>}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{req.description}</p>
      </Card>

      <form onSubmit={submit} noValidate>
        <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label htmlFor="amount" style={labelStyle}>Your price (₹) *</label>
            <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000 or 1.5L" aria-invalid={!!errors.amount} aria-describedby="amount-error" style={{ ...fieldStyle, borderColor: errors.amount ? "#dc2626" : "#cbd5e1" }} />
            {errors.amount && <p id="amount-error" role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>{errors.amount}</p>}
          </div>
          <div>
            <label htmlFor="timeline" style={labelStyle}>Delivery timeline</label>
            <input id="timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 4 weeks" maxLength={100} style={fieldStyle} />
          </div>
          <div>
            <label htmlFor="message" style={labelStyle}>Your approach *</label>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={5000} aria-invalid={!!errors.message} aria-describedby="message-error" placeholder="How will you do the work, and why are you a good fit?" style={{ ...fieldStyle, resize: "vertical", borderColor: errors.message ? "#dc2626" : "#cbd5e1" }} />
            {errors.message && <p id="message-error" role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>{errors.message}</p>}
          </div>
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={labelStyle}>Deliverables</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deliverables.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input aria-label={`Deliverable ${i + 1}`} value={d} onChange={(e) => setDeliverables((all) => all.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. Production-ready web app" maxLength={300} style={fieldStyle} />
                  {deliverables.length > 1 && (
                    <button type="button" aria-label={`Remove deliverable ${i + 1}`} onClick={() => setDeliverables((all) => all.filter((_, j) => j !== i))} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              {deliverables.length < 10 && (
                <button type="button" onClick={() => setDeliverables((all) => [...all, ""])} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#1d4ed8", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  <Plus size={14} aria-hidden="true" /> Add deliverable
                </button>
              )}
            </div>
          </fieldset>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate(-1)} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ background: "#2563EB", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, padding: "10px 22px", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Sending…" : "Send proposal"}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}
