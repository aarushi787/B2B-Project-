// The e-signed agreement for a deal. Either party can generate it from the accepted terms; then both companies
// sign. Each signature records the typed name, the time, the IP and a fingerprint (SHA-256) of the exact text.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, FileSignature, PenLine } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { friendlyError } from "../../lib/useLoad";
import { formatDate } from "../../lib/format";

interface Party { companyId: string; name: string; role: "buyer" | "seller"; signed: boolean; signerName: string | null; signedAt: string | null }
interface Agreement { id: string; status: string; content: string; contentHash: string; createdAt: string; parties: Party[]; fullySigned: boolean; canSign: boolean }

export function AgreementPanel({ dealId, canGenerate }: { dealId: string; canGenerate: boolean }) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);

  const load = useCallback(async () => {
    try {
      setAgreement(await apiClient.get<Agreement | null>(`/documents/agreement/${dealId}`));
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    void load();
    socketService.connect();
    return socketService.on("documents:updated", () => { void load(); });
  }, [load]);

  const generate = async () => {
    setBusy(true); setError("");
    try { setAgreement(await apiClient.post<Agreement>("/documents/agreements", { dealId })); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  };

  const sign = async () => {
    if (!agreement) return;
    setBusy(true); setError("");
    try {
      await apiClient.post(`/documents/${agreement.id}/sign`, { signerName: name.trim(), agree: true });
      setName(""); setAgree(false);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" aria-labelledby="agreement-heading">
      <div className="flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-[#6921A5]" aria-hidden="true" />
        <h2 id="agreement-heading" className="text-sm font-bold text-slate-900">Agreement</h2>
        {agreement && (
          <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${agreement.fullySigned ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {agreement.fullySigned ? "Signed by both parties" : "Awaiting signatures"}
          </span>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500 mt-3">Loading...</p>
      ) : !agreement ? (
        <div className="mt-3">
          <p className="text-sm text-slate-500">No agreement yet. Create one from the terms you both accepted, then each company signs it here.</p>
          {canGenerate && (
            <button onClick={generate} disabled={busy} className="mt-3 text-sm font-semibold text-white bg-[#6921A5] hover:bg-[#492F77] rounded-lg px-4 py-2 disabled:opacity-60">
              {busy ? "Creating..." : "Create agreement"}
            </button>
          )}
        </div>
      ) : (
        <>
          <pre tabIndex={0} aria-label="Agreement text" className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {agreement.content}
          </pre>
          <p className="mt-2 text-xs text-slate-500 break-all">Fingerprint (SHA-256): {agreement.contentHash}</p>

          <ul className="mt-4 space-y-2">
            {agreement.parties.map((p) => (
              <li key={p.companyId} className="flex items-center gap-2 text-sm">
                {p.signed ? <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" /> : <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />}
                <span className="font-semibold text-slate-800">{p.name}</span>
                <span className="text-slate-500">({p.role === "buyer" ? "Client" : "Provider"})</span>
                <span className="ml-auto text-slate-500">
                  {p.signed ? `Signed by ${p.signerName} on ${formatDate(p.signedAt ?? "")}` : "Not signed yet"}
                </span>
              </li>
            ))}
          </ul>

          {agreement.canSign && (
            <div className="mt-5 rounded-xl border border-[#DBC5E7] bg-[#F8F9FB] p-4">
              <label htmlFor="signer-name" className="block text-sm font-semibold text-slate-800">Your full name</label>
              <input id="signer-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} autoComplete="name" placeholder="Type your name as the authorised representative"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                <span>I have read this agreement and I agree to it on behalf of my company.</span>
              </label>
              <button onClick={sign} disabled={busy || !agree || name.trim().length < 2}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#6921A5] hover:bg-[#492F77] rounded-lg px-4 py-2 disabled:opacity-50">
                <PenLine className="w-4 h-4" aria-hidden="true" /> {busy ? "Signing..." : "Sign agreement"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
