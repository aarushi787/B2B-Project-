// Escrow for milestones. The client's card is only AUTHORISED (money held), and it is released to the provider when
// the client confirms the milestone. If the platform has no payment provider set up, this says so plainly and
// offers nothing to click: no payment status is ever faked.
import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Landmark, Lock, X } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { friendlyError, useLoad } from "../../lib/useLoad";
import { formatINR } from "../../lib/format";
import type { DealMilestones, Milestone } from "../../types/milestones";

interface PaymentConfig { enabled: boolean; publishableKey: string | null }

function CardForm({ milestoneId, onDone }: { milestoneId: string; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setError("");
    const result = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (result.error) {
      setError(result.error.message ?? "The payment could not be completed.");
      setBusy(false);
      return;
    }
    try {
      // We never trust the browser's word: the server asks the payment provider whether the money is really held.
      await apiClient.post(`/payments/milestones/${milestoneId}/confirm`, {});
      onDone();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!stripe || busy} className="w-full rounded-lg bg-[#6921A5] hover:bg-[#492F77] text-white text-sm font-semibold py-2.5 disabled:opacity-50">
        {busy ? "Holding funds..." : "Hold funds in escrow"}
      </button>
      <p className="text-xs text-slate-500">Your card is authorised, not charged. The money is only released to the provider when you confirm this milestone.</p>
    </form>
  );
}

function CheckoutModal({ milestone, stripePromise, onClose, onDone }: { milestone: Milestone; stripePromise: Promise<Stripe | null>; onClose: () => void; onDone: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiClient.post<{ clientSecret?: string; funded?: boolean }>(`/payments/milestones/${milestone.id}/escrow`, {})
      .then((r) => { if (!alive) return; if (r.funded) onDone(); else setClientSecret(r.clientSecret ?? null); })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => { alive = false; };
  }, [milestone.id, onDone]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fund ${milestone.title}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Fund "{milestone.title}"</h3>
            <p className="text-sm text-slate-600 mt-1">{formatINR(milestone.amount)} will be held until you confirm the work.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="ml-auto p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {!error && !clientSecret && <p className="text-sm text-slate-500">Preparing secure payment...</p>}
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { variables: { colorPrimary: "#6921A5" } } }}>
            <CardForm milestoneId={milestone.id} onDone={onDone} />
          </Elements>
        )}
      </div>
    </div>
  );
}

export function EscrowPayment({ data, reload }: { data: DealMilestones | null; reload: () => Promise<void> }) {
  const { data: config } = useLoad<PaymentConfig>(() => apiClient.get<PaymentConfig>("/payments/config"), []);
  const [funding, setFunding] = useState<Milestone | null>(null);
  const stripePromise = useMemo(() => (config?.enabled && config.publishableKey ? loadStripe(config.publishableKey) : null), [config]);

  const summary = data?.summary;
  const fundable = (data?.milestones ?? []).filter((m) => m.can.fund);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5" aria-labelledby="escrow-heading">
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-[#6921A5]" aria-hidden="true" />
        <h2 id="escrow-heading" className="text-sm font-bold text-slate-900">Escrow</h2>
      </div>

      {summary && summary.count > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["Planned", formatINR(summary.plannedAmount)],
            ["Held", formatINR(summary.heldInEscrow)],
            ["Released", formatINR(summary.released)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-[#F8F9FB] border border-slate-100 py-2">
              <dt className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{k}</dt>
              <dd className="text-sm font-bold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {config && !config.enabled ? (
        <p className="mt-3 text-sm text-slate-500">
          Escrow is not switched on for this platform yet, so no money is held. You can still plan and confirm milestones.
        </p>
      ) : !summary || summary.count === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Add milestones first. Each one can then be funded into escrow and released when it is confirmed.</p>
      ) : fundable.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {fundable.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-slate-700">{m.title} <span className="text-slate-500">({formatINR(m.amount)})</span></span>
              <button onClick={() => setFunding(m)} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#6921A5] hover:bg-[#492F77] rounded-lg px-3 py-1.5">
                <Lock className="w-3 h-3" aria-hidden="true" /> Fund
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Nothing to fund right now.</p>
      )}

      {funding && stripePromise && (
        <CheckoutModal
          milestone={funding}
          stripePromise={stripePromise}
          onClose={() => setFunding(null)}
          onDone={() => { setFunding(null); void reload(); }}
        />
      )}
    </section>
  );
}
