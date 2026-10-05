// Everything contractual for one deal: the e-signed agreement, plus any other files filed against the deal.
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { formatDate } from "../../lib/format";
import { AgreementPanel } from "./AgreementPanel";

interface DealFile { id: string; dealId: string | null; fileName: string; docType: string | null; status: string; createdAt: string }

const STATUS: Record<string, string> = { UPLOADED: "Filed", SIGNED: "Signed", REJECTED: "Rejected" };

export function ContractDocs({ dealId, canGenerate }: { dealId: string; canGenerate: boolean }) {
  const [files, setFiles] = useState<DealFile[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiClient.get<DealFile[]>("/documents")
        .then((rows) => alive && setFiles((rows || []).filter((d) => d.dealId === dealId && d.docType !== "AGREEMENT")))
        .catch(() => alive && setFiles([])); // listing needs a company role; the agreement above works without it
    void load();
    socketService.connect();
    const off = socketService.on("documents:updated", () => { void load(); });
    return () => { alive = false; off(); };
  }, [dealId]);

  return (
    <div className="space-y-5">
      <AgreementPanel dealId={dealId} canGenerate={canGenerate} />
      {files.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" aria-labelledby="deal-files-heading">
          <h2 id="deal-files-heading" className="text-sm font-bold text-slate-900">Other documents</h2>
          <ul className="mt-3 space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-800">{f.fileName}</span>
                <span className="text-xs text-slate-500">{formatDate(f.createdAt)}</span>
                <span className="text-xs font-semibold text-slate-600">{STATUS[f.status] ?? f.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
