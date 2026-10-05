// Your contracts: every agreement on deals your company is part of, and where each one stands.
// Agreements are created and signed inside the deal; this page is the overview that gets you there.
import { useEffect } from "react";
import { Link } from "react-router";
import { CheckCircle2, Clock, FileSignature } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useLoad } from "../../../lib/useLoad";
import { formatDate, formatINR } from "../../../lib/format";
import { useAuth } from "../../../auth/AuthProvider";

interface AgreementRow {
  id: string; dealId: string; dealTitle: string; amount: number; status: "UPLOADED" | "SIGNED" | "REJECTED"; createdAt: string;
  counterparty: string; myRole: "buyer" | "seller"; mySigned: boolean; theirSigned: boolean;
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${done ? "text-green-700" : "text-amber-700"}`}>
      {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Clock className="h-4 w-4" aria-hidden="true" />} {label}
    </span>
  );
}

export function Contracts() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoad<AgreementRow[]>(() => apiClient.get<AgreementRow[]>("/documents/agreements"), [user?.companyId]);

  useEffect(() => {
    socketService.connect();
    return socketService.on("documents:updated", () => { void reload(); });
  }, [reload]);

  const rows = data ?? [];
  const waiting = rows.filter((r) => r.status !== "SIGNED" && !r.mySigned).length;

  return (
    <div className="mx-auto max-w-4xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-3xl text-[#0F1A2E]">Contracts</h1>
        <p className="mt-1 text-base text-slate-500">Agreements on your deals, and who has signed. Open a deal to read and sign its agreement.</p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800">
          {error} <button onClick={() => void reload()} className="font-semibold underline">Try again</button>
        </p>
      )}
      {waiting > 0 && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] font-semibold text-amber-900">
          {waiting} {waiting === 1 ? "agreement is" : "agreements are"} waiting for your signature.
        </p>
      )}

      {loading && !data ? (
        <p role="status" className="py-16 text-center text-slate-500">Loading...</p>
      ) : !user?.companyId ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-[15px] text-slate-600">Agreements belong to companies. Your account is not linked to a company.</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <FileSignature className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-slate-700">No agreements yet</p>
          <p className="mx-auto mt-1 max-w-md text-[15px] text-slate-500">When you accept a proposal a deal is created. Either side can then create the agreement from that deal's page.</p>
          <Link to="/app/deals" className="mt-5 inline-block rounded-lg bg-[#6921A5] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#492F77]">Go to your deals</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/app/deals/${r.dealId}`} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3E8F8] text-[#6921A5]"><FileSignature className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-[200px] flex-1">
                  <span className="block text-lg font-semibold text-slate-900">{r.dealTitle}</span>
                  <span className="block text-[15px] text-slate-500">{r.myRole === "buyer" ? "Provider" : "Client"}: {r.counterparty} · {formatINR(r.amount)} · created {formatDate(r.createdAt)}</span>
                </span>
                <span className="flex flex-col gap-1">
                  <Step done={r.mySigned} label={r.mySigned ? "You signed" : "Your signature needed"} />
                  <Step done={r.theirSigned} label={r.theirSigned ? `${r.counterparty} signed` : `Waiting for ${r.counterparty}`} />
                </span>
                <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${r.status === "SIGNED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {r.status === "SIGNED" ? "Fully signed" : "Awaiting signatures"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
