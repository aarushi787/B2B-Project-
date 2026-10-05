// The page an email verification link opens. It reads the token from the URL, asks the server to verify it, and says
// plainly what happened. If the user is signed in on another tab, that tab updates by itself (see AuthProvider).
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { friendlyError } from "../../../lib/useLoad";
import { useAuth } from "../../../auth/AuthProvider";

type State = { kind: "working" } | { kind: "done" } | { kind: "failed"; message: string };

export function VerifyEmail() {
  const [params] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<State>({ kind: "working" });
  const started = useRef(false); // the link is single-use, so never send it twice (React StrictMode runs effects twice in dev)

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    if (!token) { setState({ kind: "failed", message: "This verification link is incomplete. Open it again from your email." }); return; }
    apiClient.post("/auth/verify-email", { token })
      .then(async () => { setState({ kind: "done" }); await refreshUser().catch(() => {}); })
      .catch((e) => setState({ kind: "failed", message: friendlyError(e) }));
  }, [params, refreshUser]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <main style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 32, maxWidth: 440, width: "100%", textAlign: "center" }} aria-live="polite">
        {state.kind === "working" && (<><Loader2 className="animate-spin" size={36} color="#6921A5" style={{ margin: "0 auto" }} /><h1 style={{ fontSize: 22, margin: "16px 0 0" }}>Verifying your email...</h1></>)}
        {state.kind === "done" && (
          <>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto" }} aria-hidden="true" />
            <h1 style={{ fontSize: 24, margin: "16px 0 8px" }}>Email verified</h1>
            <p style={{ color: "#64748B", margin: 0 }}>Thank you. Your email address is now confirmed.</p>
            <Link to={user ? "/app/verification" : "/auth"} style={{ display: "inline-block", marginTop: 24, background: "#6921A5", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
              {user ? "Continue verification" : "Sign in"}
            </Link>
          </>
        )}
        {state.kind === "failed" && (
          <>
            <XCircle size={40} color="#dc2626" style={{ margin: "0 auto" }} aria-hidden="true" />
            <h1 style={{ fontSize: 24, margin: "16px 0 8px" }}>We could not verify your email</h1>
            <p role="alert" style={{ color: "#64748B", margin: 0 }}>{state.message}</p>
            <Link to={user ? "/app/verification" : "/auth"} style={{ display: "inline-block", marginTop: 24, background: "#6921A5", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
              {user ? "Request a new link" : "Sign in to request a new link"}
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
