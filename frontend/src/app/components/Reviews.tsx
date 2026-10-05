// Reviews: a star display, the form a company uses after a deal is completed, and a list of what others said.
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { friendlyError } from "../../lib/useLoad";

export interface Review {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  reviewerName?: string | null;
  reviewerVerified?: boolean;
  dealTitle?: string | null;
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden="true" style={{ color: "#f59e0b", fill: n <= Math.round(value) ? "#f59e0b" : "none" }} />
      ))}
    </span>
  );
}

/** "4.5 (12 reviews)" or "No reviews yet": never a made-up number. */
export function RatingSummary({ rating, count }: { rating: number | null; count: number }) {
  if (!count || rating == null) return <span style={{ fontSize: 13, color: "#64748b" }}>No reviews yet</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
      <Stars value={rating} size={14} /> {rating.toFixed(1)} <span style={{ fontWeight: 400, color: "#64748b" }}>({count})</span>
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Your rating" style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer", borderRadius: 8 }}
        >
          <Star size={30} aria-hidden="true" style={{ color: "#f59e0b", fill: n <= value ? "#f59e0b" : "none" }} />
        </button>
      ))}
    </div>
  );
}

interface DealReviews {
  given: { score: number; comment: string | null } | null;
  received: { score: number; comment: string | null } | null;
}

/** On a completed deal: rate the other company once, and see what they said about you. */
export function DealReviewPanel({ dealId, otherCompanyId, otherName }: { dealId: string; otherCompanyId?: string; otherName?: string | null }) {
  const [data, setData] = useState<DealReviews | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiClient.get<DealReviews>(`/reputation/deal/${dealId}`).then(setData).catch(() => setData({ given: null, received: null }));
  }, [dealId]);
  useEffect(load, [load]);

  const submit = async () => {
    if (!otherCompanyId) return;
    if (score < 1) { toast.error("Choose a star rating first."); return; }
    setBusy(true);
    try {
      await apiClient.post("/reputation/events", { companyId: otherCompanyId, dealId, score, comment: comment.trim() || undefined });
      toast.success("Thanks, your review was saved.");
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;
  const who = otherName || "the other company";
  return (
    <section aria-labelledby="review-heading" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 id="review-heading" className="text-base font-bold text-slate-900">Reviews for this deal</h3>
      {data.given ? (
        <div className="mt-3">
          <p className="text-sm text-slate-500">Your review of {who}</p>
          <Stars value={data.given.score} />
          {data.given.comment && <p className="mt-1 text-[15px] text-slate-700">{data.given.comment}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[15px] text-slate-600">How was it working with {who}? Your review helps other businesses decide.</p>
          <StarPicker value={score} onChange={setScore} />
          <label className="block text-sm font-semibold text-slate-700" htmlFor="review-comment">Comment (optional)</label>
          <textarea
            id="review-comment" value={comment} maxLength={1000} rows={3} onChange={(e) => setComment(e.target.value)}
            placeholder="What went well? What could be better?"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#6921A5]"
          />
          <button
            type="button" onClick={submit} disabled={busy || score < 1}
            className="rounded-xl bg-[#6921A5] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#492F77] disabled:opacity-50"
          >
            {busy ? "Saving..." : "Submit review"}
          </button>
        </div>
      )}
      <div className="mt-4 border-t border-slate-100 pt-3">
        {data.received ? (
          <>
            <p className="text-sm text-slate-500">What {who} said about you</p>
            <Stars value={data.received.score} />
            {data.received.comment && <p className="mt-1 text-[15px] text-slate-700">{data.received.comment}</p>}
          </>
        ) : (
          <p className="text-sm text-slate-500">{who} has not reviewed this deal yet.</p>
        )}
      </div>
    </section>
  );
}

/** Everything others have said about a company (used on its public profile). */
export function CompanyReviews({ companyId }: { companyId: string }) {
  const [state, setState] = useState<{ events: Review[]; summary: { totalReviews: number; averageScore: number | null } } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    apiClient.get<{ events: Review[]; summary: { totalReviews: number; averageScore: number | null } }>(`/reputation/company/${companyId}`)
      .then((r) => { if (alive) setState(r); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [companyId]);

  if (failed) return null;
  if (!state) return <p className="text-sm text-slate-500">Loading reviews...</p>;
  return (
    <div>
      <div className="mb-3"><RatingSummary rating={state.summary.averageScore} count={state.summary.totalReviews} /></div>
      {state.events.length === 0 ? (
        <p className="text-[15px] text-slate-500">Reviews appear here after businesses complete a deal with this company.</p>
      ) : (
        <ul className="space-y-3">
          {state.events.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.score} />
                <span className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-2 text-[15px] text-slate-700">{r.comment}</p>}
              <p className="mt-2 text-sm text-slate-500">
                {r.reviewerName ?? "A business"}{r.reviewerVerified ? " (verified)" : ""}{r.dealTitle ? ` · ${r.dealTitle}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
