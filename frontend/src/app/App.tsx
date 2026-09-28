import React, { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../auth/AuthProvider";
import { Toaster } from "react-hot-toast";
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("App crashed:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
          <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
            <AlertCircle style={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto 16px" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Something went wrong.</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", maxWidth: 300 }}>We've encountered an unexpected error. Our engineering team has been notified.</p>
            <button onClick={() => window.location.href = '/'} style={{ background: "#2563EB", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>Reload Application</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SuspenseFallback = () => {
  const [showReload, setShowReload] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShowReload(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 24, height: 24, border: "2px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      {showReload && (
        <button onClick={() => window.location.reload()} style={{ background: "#2563EB", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
          Reload Page
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<SuspenseFallback />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
