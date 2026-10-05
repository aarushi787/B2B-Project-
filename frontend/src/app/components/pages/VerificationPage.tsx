// Company verification: email, phone, business documents and a government ID. Everything here is real:
// statuses come from the account and from the KYC documents an admin reviews, and uploads go to the same review queue.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { BadgeCheck, CheckCircle2, Clock, FileText, Mail, Phone, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";

interface KycDoc { id: string; documentType: string; status: string; createdAt: string; verifiedAt?: string | null; }
type State = "verified" | "review" | "rejected" | "none" | "added" | "unverified";

const GOV_ID = "GOVERNMENT_ID";
const MAX_BYTES = 2 * 1024 * 1024; // the API accepts about 2 MB per file
const ACCEPT = ".pdf,.png,.jpg,.jpeg";
const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
const BUSINESS_TYPES = [
  { value: "BUSINESS_REGISTRATION", label: "Business registration" },
  { value: "GST_CERTIFICATE", label: "GST certificate" },
  { value: "PAN_CARD", label: "PAN card" },
  { value: "ADDRESS_PROOF", label: "Address proof" },
  { value: "OTHER", label: "Other" },
];

const PILL: Record<State, { label: string; bg: string; color: string }> = {
  verified: { label: "Verified", bg: "#dcfce7", color: "#15803d" },
  review: { label: "In Review", bg: "#fef3c7", color: "#b45309" },
  rejected: { label: "Rejected", bg: "#fee2e2", color: "#b91c1c" },
  none: { label: "Not Started", bg: "#F3E8F8", color: "#6921A5" },
  added: { label: "Added", bg: "#E2E8F0", color: "#475569" },
  unverified: { label: "Not verified", bg: "#fef3c7", color: "#b45309" },
};

const labelOf = (t: string) => BUSINESS_TYPES.find((b) => b.value === t)?.label ?? (t === GOV_ID ? "Government ID" : t.replace(/_/g, " ").toLowerCase());

/** Overall state of a group of documents: anything waiting wins, then verified, then rejected. */
function stateOf(docs: KycDoc[]): State {
  const s = docs.map((d) => d.status?.toUpperCase());
  if (s.includes("PENDING")) return "review";
  if (s.includes("VERIFIED") || s.includes("APPROVED")) return "verified";
  if (s.includes("REJECTED")) return "rejected";
  return "none";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function Pill({ state }: { state: State }) {
  const p = PILL[state];
  return <span style={{ fontSize: 12, fontWeight: 700, color: p.color, background: p.bg, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{p.label}</span>;
}

function Card({ icon, title, state, children }: { icon: React.ReactNode; title: string; state: State; children?: React.ReactNode }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "#F3E8F8", color: "#6921A5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0F1A2E", margin: 0, flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h2>
        <Pill state={state} />
      </div>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>{children}</p>;
}

/** Drag-and-drop or click-to-choose uploader. Validates type and size before anything is sent. */
function Dropzone({ onFile, busy, buttonLabel }: { onFile: (f: File) => void; busy: boolean; buttonLabel: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const pick = () => !busy && input.current?.click();
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={buttonLabel}
        onClick={pick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) onFile(f); }}
        style={{
          border: `2px dashed ${over ? "#6921A5" : "#DBC5E7"}`, background: over ? "#F3E8F8" : "#F8F9FB", borderRadius: 12, padding: "28px 16px",
          textAlign: "center", cursor: busy ? "wait" : "pointer", transition: "all .15s",
        }}
      >
        <Upload size={26} color="#6921A5" aria-hidden="true" />
        <p style={{ fontSize: 14, fontWeight: 600, color: "#0F1A2E", margin: "8px 0 2px" }}>{busy ? "Uploading..." : "Drag and drop or click to upload"}</p>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Accepted formats: PDF, PNG, JPG (max 2 MB)</p>
      </div>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
    </div>
  );
}

function DocRow({ d }: { d: KycDoc }) {
  const st: State = stateOf([d]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, background: "#F8F9FB" }}>
      <FileText size={20} color="#64748B" aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#0F1A2E", margin: 0, textTransform: "capitalize" }}>{labelOf(d.documentType)}</p>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>
          Submitted {formatDate(d.createdAt)}{d.verifiedAt ? ` · reviewed ${formatDate(d.verifiedAt)}` : ""}
        </p>
      </div>
      <Pill state={st} />
    </div>
  );
}


/** Verifies a mobile number with a 6-digit code. The page updates by itself when the code is accepted, here or on another device. */
function PhoneVerifier({ phone, verified, onVerified }: { phone: string; verified: boolean; onVerified: () => Promise<void> }) {
  const [number, setNumber] = useState(phone);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setNumber(phone); }, [phone]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (verified) return <Muted>{phone} is verified.</Muted>;

  const send = async () => {
    setBusy(true); setError("");
    try {
      const r = await apiClient.post<{ phone: string; resendInSeconds: number; devCode?: string; alreadyVerified?: boolean }>("/auth/phone/send", number.trim() && number.trim() !== phone ? { phone: number.trim() } : {});
      if (r.alreadyVerified) { await onVerified(); return; }
      setSentTo(r.phone); setCooldown(r.resendInSeconds); setDevCode(r.devCode ?? null); setCode("");
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await apiClient.post("/auth/phone/verify", { code }); await onVerified(); setSentTo(null); }
    catch (err) { setError(friendlyError(err)); } finally { setBusy(false); }
  };

  const input = { padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 16, background: "#fff" } as const;
  return (
    <div>
      {!sentTo ? (
        <>
          <Muted>Verify your mobile number so other businesses can trust it. We will text you a 6-digit code.</Muted>
          <label style={{ display: "block", marginTop: 12, fontSize: 14, fontWeight: 600, color: "#0F1A2E" }}>Mobile number
            <input type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+919876543210" style={{ ...input, display: "block", marginTop: 6, width: "100%", maxWidth: 320 }} />
          </label>
          <button onClick={() => void send()} disabled={busy || !number.trim()} style={{ marginTop: 12, padding: "10px 18px", borderRadius: 8, border: "none", background: "#6921A5", color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy || !number.trim() ? 0.6 : 1 }}>
            {busy ? "Sending..." : "Send code"}
          </button>
        </>
      ) : (
        <form onSubmit={verify}>
          <Muted>We sent a code to {sentTo}. It expires in 10 minutes.</Muted>
          <label style={{ display: "block", marginTop: 12, fontSize: 14, fontWeight: 600, color: "#0F1A2E" }}>6-digit code
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-describedby="otp-hint"
              style={{ ...input, display: "block", marginTop: 6, width: 180, letterSpacing: "0.4em", fontSize: 22, textAlign: "center" }} />
          </label>
          {devCode && <p id="otp-hint" style={{ margin: "8px 0 0", fontSize: 13, color: "#64748B" }}>Development mode: no text message is sent. Your code is <strong>{devCode}</strong>.</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={busy || code.length !== 6} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#6921A5", color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy || code.length !== 6 ? 0.6 : 1 }}>{busy ? "Checking..." : "Verify"}</button>
            <button type="button" onClick={() => void send()} disabled={busy || cooldown > 0} style={{ background: "none", border: "none", color: "#6921A5", fontSize: 15, fontWeight: 600, cursor: cooldown > 0 ? "default" : "pointer", opacity: cooldown > 0 ? 0.6 : 1 }}>
              {cooldown > 0 ? `Send again in ${cooldown}s` : "Send a new code"}
            </button>
            <button type="button" onClick={() => { setSentTo(null); setError(""); }} style={{ background: "none", border: "none", color: "#64748B", fontSize: 15, cursor: "pointer" }}>Change number</button>
          </div>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: 10, fontSize: 14, color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}

export function VerificationPage() {
  const { user, refreshUser } = useAuth();
  const companyId = user?.companyId;
  const { data, loading, error, reload } = useLoad<KycDoc[]>(
    () => (companyId ? apiClient.get<KycDoc[]>(`/kyc/company/${companyId}`) : Promise.resolve([])),
    [companyId]
  );
  const [docType, setDocType] = useState(BUSINESS_TYPES[0].value);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    socketService.connect();
    return socketService.on("kyc:updated", () => { void reload(); });
  }, [reload]);

  const docs = data ?? [];
  const govDocs = useMemo(() => docs.filter((d) => d.documentType === GOV_ID), [docs]);
  const businessDocs = useMemo(() => docs.filter((d) => d.documentType !== GOV_ID), [docs]);

  const emailState: State = user?.emailVerified ? "verified" : "none";
  const phoneState: State = user?.phoneVerified ? "verified" : user?.phone ? "unverified" : "none";
  const businessState = stateOf(businessDocs);
  const govState = stateOf(govDocs);
  const steps = [emailState === "verified", businessState === "verified", govState === "verified"];
  const done = steps.filter(Boolean).length;

  const upload = async (file: File, type: string, slot: string) => {
    setMessage(null);
    if (!companyId) return setMessage({ kind: "err", text: "Your account is not linked to a company yet." });
    if (!ALLOWED.includes(file.type)) return setMessage({ kind: "err", text: "Please choose a PDF, PNG or JPG file." });
    if (file.size > MAX_BYTES) return setMessage({ kind: "err", text: "That file is larger than 2 MB. Please choose a smaller one." });
    setUploading(slot);
    try {
      await apiClient.post("/kyc/upload", {
        companyId, documentType: type, fileName: file.name, mimeType: file.type, sizeBytes: file.size, contentBase64: await fileToBase64(file),
      });
      setMessage({ kind: "ok", text: `${file.name} uploaded. It is now waiting for review.` });
      await reload();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Upload failed. Please try again." });
    } finally {
      setUploading(null);
    }
  };

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const r = await apiClient.post<{ sent?: boolean; alreadyVerified?: boolean }>("/auth/resend-verification", {});
      if (r?.alreadyVerified) { await refreshUser(); setMessage({ kind: "ok", text: "Your email is already verified." }); }
      else setMessage({ kind: "ok", text: `Verification link sent to ${user?.email}. Check your inbox.` });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Could not send the email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Verification</h1>
        <p style={{ fontSize: 15, color: "#64748B", margin: "6px 0 0" }}>Verify your business so other companies can trust you. Verified businesses show a badge across the platform.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#0F1A2E", marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={16} color="#6921A5" aria-hidden="true" /> {done} of {steps.length} steps complete</span>
          <span style={{ color: "#6921A5" }}>{Math.round((done / steps.length) * 100)}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((done / steps.length) * 100)} style={{ height: 8, borderRadius: 999, background: "#F3E8F8", overflow: "hidden" }}>
          <div style={{ width: `${(done / steps.length) * 100}%`, height: "100%", background: "#6921A5", transition: "width .3s" }} />
        </div>
      </div>

      {message && (
        <p role={message.kind === "err" ? "alert" : "status"} style={{ fontSize: 14, margin: "0 0 16px", padding: "10px 14px", borderRadius: 8, background: message.kind === "ok" ? "#dcfce7" : "#fee2e2", color: message.kind === "ok" ? "#15803d" : "#b91c1c" }}>
          {message.text}
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 14, color: "#b91c1c" }}>
          {error} <button onClick={() => void reload()} style={{ color: "#6921A5", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Retry</button>
        </p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        <Card icon={<Mail size={20} aria-hidden="true" />} title="Email Verification" state={emailState}>
          <Muted>{user?.email}{user?.emailVerified ? " is verified." : " is not verified yet. We will email you a link to confirm it."}</Muted>
          {!user?.emailVerified && (
            <button onClick={resend} disabled={sending} style={{ marginTop: 12, padding: "9px 16px", borderRadius: 8, border: "none", background: "#6921A5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending..." : "Send verification email"}
            </button>
          )}
        </Card>

        <Card icon={<Phone size={20} aria-hidden="true" />} title="Phone Verification" state={phoneState}>
          <PhoneVerifier phone={user?.phone ?? ""} verified={!!user?.phoneVerified} onVerified={refreshUser} />
        </Card>

        <Card icon={<FileText size={20} aria-hidden="true" />} title="Business Documents" state={businessState}>
          <Muted>
            {businessState === "review" && "Under review. This typically takes 2 to 3 business days."}
            {businessState === "verified" && "Your business documents are verified."}
            {businessState === "rejected" && "A document was rejected. Please upload a corrected copy below."}
            {businessState === "none" && "Upload your registration, GST or PAN so we can verify your business."}
          </Muted>
          {loading && !data ? <Muted>Loading...</Muted> : businessDocs.length > 0 && (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{businessDocs.map((d) => <DocRow key={d.id} d={d} />)}</div>
          )}
        </Card>

        <Card icon={<Upload size={20} aria-hidden="true" />} title="Upload Additional Documents" state={businessDocs.length ? "review" : "none"}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#0F1A2E", marginBottom: 6 }} htmlFor="doc-type">Document type</label>
          <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, marginBottom: 12, background: "#fff", minWidth: 220 }}>
            {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {businessDocs.length === 0 && <Muted>No documents uploaded yet.</Muted>}
          <div style={{ marginTop: 10 }}>
            <Dropzone onFile={(f) => void upload(f, docType, "business")} busy={uploading === "business"} buttonLabel="Upload business document" />
          </div>
        </Card>

        <Card icon={<BadgeCheck size={20} aria-hidden="true" />} title="Government ID" state={govState}>
          <Muted>
            {govState === "none" && "Verify the identity of the business founder or legal representative."}
            {govState === "review" && "Under review. This typically takes 2 to 3 business days."}
            {govState === "verified" && "Identity verified."}
            {govState === "rejected" && "Your ID was rejected. Please upload a clearer copy."}
          </Muted>
          {govDocs.length > 0 && <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{govDocs.map((d) => <DocRow key={d.id} d={d} />)}</div>}
          {govState !== "verified" && govState !== "review" && (
            <div style={{ marginTop: 14 }}>
              <Dropzone onFile={(f) => void upload(f, GOV_ID, "gov")} busy={uploading === "gov"} buttonLabel="Upload ID document" />
            </div>
          )}
        </Card>
      </div>

      <p style={{ fontSize: 13, color: "#64748B", marginTop: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <CheckCircle2 size={14} aria-hidden="true" /> Files are stored encrypted and only platform admins can open them.
        <Clock size={14} style={{ marginLeft: 8 }} aria-hidden="true" /> You will be notified when a document is reviewed.
      </p>
    </motion.div>
  );
}
