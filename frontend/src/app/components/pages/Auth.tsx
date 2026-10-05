import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, User, Phone, Building2, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { authService } from "../../../services/authService";
import { apiClient } from "../../../services/apiClient";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  companyName: z.string().min(2, "Company name is required"),
  gstNumber: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

// Dev convenience only: set VITE_TEST_PASSWORD in frontend/.env.local. Never set it in production builds.
const DEV_TEST_PASSWORD: string = import.meta.env.DEV ? (import.meta.env.VITE_TEST_PASSWORD ?? "") : "";

export function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  // A password-reset email links to /auth?mode=reset-password&token=..., so open straight on that form.
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const linkToken = urlParams.get("mode") === "reset-password" ? urlParams.get("token") ?? "" : "";
  const [mode, setMode] = useState<AuthMode>(linkToken ? "reset-password" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [resetData, setResetData] = useState({ email: "", token: linkToken, newPassword: "" });
  const [loginData, setLoginData] = useState({ email: "", password: DEV_TEST_PASSWORD });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    companyName: "", gstNumber: "",
  });

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "", color: "" };
    let s = 0;
    if (password.length >= 8) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return [
      { strength: 0, label: "", color: "" },
      { strength: 1, label: "Weak", color: "bg-red-500" },
      { strength: 2, label: "Fair", color: "bg-yellow-500" },
      { strength: 3, label: "Good", color: "bg-[#6921A5]" },
      { strength: 4, label: "Strong", color: "bg-green-500" },
    ][s];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authService.login({ email: loginData.email, password: loginData.password });
      login({ user: res.user as any, csrfToken: res.csrfToken });
      navigate(String((res.user as any)?.role ?? "").toLowerCase() === "admin" ? "/admin" : "/app/dashboard");
    } catch (err: any) {
      setError(err.message?.replace("API Error: 401 Unauthorized - ", "") || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    
    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      const formatted = result.error.format();
      const newErrors: Record<string, string> = {};
      if (formatted.name?._errors[0]) newErrors.name = formatted.name._errors[0];
      if (formatted.email?._errors[0]) newErrors.email = formatted.email._errors[0];
      if (formatted.phone?._errors[0]) newErrors.phone = formatted.phone._errors[0];
      if (formatted.password?._errors[0]) newErrors.password = formatted.password._errors[0];
      if (formatted.confirmPassword?._errors[0]) newErrors.confirmPassword = formatted.confirmPassword._errors[0];
      if (formatted.companyName?._errors[0]) newErrors.companyName = formatted.companyName._errors[0];
      if (formatted.gstNumber?._errors[0]) newErrors.gstNumber = formatted.gstNumber._errors[0];
      
      setFieldErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      const res = await authService.register({
        name: registerData.name, email: registerData.email, phone: registerData.phone,
        password: registerData.password, companyName: registerData.companyName,
        // GST is optional: leave it out entirely when blank (the API rejects an empty string).
        gstNumber: registerData.gstNumber.trim() || undefined,
      });
      login({ user: res.user as any, csrfToken: res.csrfToken });
      navigate("/app/dashboard");
    } catch (err: any) {
      const msg = err.message || "";
      setError(msg.includes("{") ? JSON.parse(msg.match(/\{.*\}/)?.[0] || "{}").message || "Registration failed" : msg || "Registration failed");
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMsg(""); setLoading(true);
    try {
      const res = await apiClient.post<any>("/auth/request-password-reset", { email: resetData.email });
      setSuccessMsg(res.message);
      setMode("reset-password");
    } catch (err: any) {
      setError(err.message || "Failed to request password reset");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMsg(""); setLoading(true);
    try {
      const res = await apiClient.post<any>("/auth/reset-password", { token: resetData.token, newPassword: resetData.newPassword });
      setSuccessMsg(res.message);
      setMode("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally { setLoading(false); }
  };

  const pwStrength = getPasswordStrength(mode === "login" ? loginData.password : registerData.password);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(rgba(73,47,119,0.8), rgba(73,47,119,0.8)), url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80) center/cover", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 448 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8, width: "100%" }}>
            <img src="/logo.png" alt="B2BForCorporates Logo" style={{ height: 64, width: "auto", objectFit: "contain" }} />
          </div>
          <p style={{ color: "#DBC5E7", fontSize: 14, fontFamily: "Fraunces, serif" }}>Enterprise Collaboration Platform</p>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: 4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9", padding: 32 }}>
          {/* Tabs */}
          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", borderRadius: 12, backgroundColor: "#f1f5f9", padding: 4, marginBottom: 24 }}>
              {(["login", "register"] as AuthMode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); setSuccessMsg(""); }}
                  style={{ flex: 1, padding: "8px 0", fontSize: 14, fontWeight: 500, borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.2s", 
                    backgroundColor: mode === m ? "#ffffff" : "transparent", 
                    color: mode === m ? "#0f172a" : "#64748b",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, color: "#b91c1c", fontSize: 14 }}>
              <XCircle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, color: "#15803d", fontSize: 14 }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="email" required value={loginData.email} onChange={e => setLoginData(d => ({...d, email: e.target.value}))}
                    style={{ width: "100%", padding: "10px 16px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    placeholder="you@company.com" />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155" }}>Password</label>
                  <button type="button" onClick={() => { setMode("forgot-password"); setError(""); setSuccessMsg(""); }} style={{ fontSize: 13, color: "#6921A5", background: "none", border: "none", cursor: "pointer" }}>Forgot password?</button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type={showPassword ? "text" : "password"} required value={loginData.password}
                    onChange={e => setLoginData(d => ({...d, password: e.target.value}))}
                    style={{ width: "100%", padding: "10px 40px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: 8 }}>
                <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Test accounts (fills the email and, in dev, the password)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button type="button" onClick={() => setLoginData({ email: "test.buyer@example.com", password: DEV_TEST_PASSWORD })}
                    style={{ width: "100%", textAlign: "left", padding: 8, backgroundColor: "#F3E8F8", border: "1px solid #DBC5E7", borderRadius: 4, fontSize: 13, color: "#6921A5", fontWeight: 500, cursor: "pointer" }}>
                    <b>Test buyer</b> (test.buyer@example.com)
                  </button>
                  <button type="button" onClick={() => setLoginData({ email: "test.seller@example.com", password: DEV_TEST_PASSWORD })}
                    style={{ width: "100%", textAlign: "left", padding: 8, backgroundColor: "#F3E8F8", border: "1px solid #DBC5E7", borderRadius: 4, fontSize: 13, color: "#6921A5", fontWeight: 500, cursor: "pointer" }}>
                    <b>Test seller</b> (test.seller@example.com)
                  </button>
                  <button type="button" onClick={() => setLoginData({ email: "admin@example.com", password: DEV_TEST_PASSWORD })}
                    style={{ width: "100%", textAlign: "left", padding: 8, backgroundColor: "#F3E8F8", border: "1px solid #DBC5E7", borderRadius: 4, fontSize: 13, color: "#6921A5", fontWeight: 500, cursor: "pointer" }}>
                    <b>Admin</b> (admin@example.com)
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "10px", backgroundColor: "#6921A5", color: "#ffffff", fontWeight: 500, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>
                {loading ? <><Loader2 size={16} /> Signing in...</> : "Sign In"}
              </button>
            </form>
          ) : mode === "forgot-password" ? (
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>Email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="email" required value={resetData.email} onChange={e => setResetData(d => ({...d, email: e.target.value}))}
                    style={{ width: "100%", padding: "10px 16px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    placeholder="you@company.com" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "10px", backgroundColor: "#6921A5", color: "#ffffff", fontWeight: 500, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>
                {loading ? <><Loader2 size={16} /> Sending...</> : "Send Reset Link"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                style={{ width: "100%", padding: "8px", fontSize: 14, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>
                Back to Sign In
              </button>
            </form>
          ) : mode === "reset-password" ? (
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>Reset Token</label>
                <input type="text" required value={resetData.token} onChange={e => setResetData(d => ({...d, token: e.target.value}))}
                  style={{ width: "100%", padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  placeholder="Paste token from email" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type={showPassword ? "text" : "password"} required value={resetData.newPassword}
                    onChange={e => setResetData(d => ({...d, newPassword: e.target.value}))}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "10px", backgroundColor: "#6921A5", color: "#ffffff", fontWeight: 500, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>
                {loading ? <><Loader2 size={16} /> Resetting...</> : "Reset Password"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                style={{ width: "100%", padding: "8px", fontSize: 14, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Full Name", key: "name", type: "text", icon: User, placeholder: "Arjun Sharma" },
                { label: "Email Address", key: "email", type: "email", icon: Mail, placeholder: "you@company.com" },
                { label: "Phone Number", key: "phone", type: "tel", icon: Phone, placeholder: "+91 98765 43210" },
                { label: "Company Name", key: "companyName", type: "text", icon: Building2, placeholder: "Acme Pvt Ltd" },
                { label: "GST Number (Optional)", key: "gstNumber", type: "text", icon: Building2, placeholder: "22AAAAA0000A1Z5" },
              ].map(({ label, key, type, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <Icon size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type={type} required={key !== "gstNumber"} value={(registerData as any)[key]}
                      onChange={e => {
                        setRegisterData(d => ({...d, [key]: e.target.value}));
                        setFieldErrors(err => ({...err, [key]: ""}));
                      }}
                      style={{ width: "100%", padding: "10px 16px 10px 36px", border: `1px solid ${fieldErrors[key] ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      placeholder={placeholder} />
                  </div>
                  {fieldErrors[key] && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{fieldErrors[key]}</p>}
                </div>
              ))}

              {[
                { label: "Password", key: "password", show: showPassword, setShow: setShowPassword },
                { label: "Confirm Password", key: "confirmPassword", show: showPassword, setShow: setShowPassword },
              ].map(({ label, key, show, setShow }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 4 }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input type={show ? "text" : "password"} required minLength={8}
                      value={(registerData as any)[key]}
                      onChange={e => {
                        setRegisterData(d => ({...d, [key]: e.target.value}));
                        setFieldErrors(err => ({...err, [key]: ""}));
                      }}
                      style={{ width: "100%", padding: "10px 40px 10px 36px", border: `1px solid ${fieldErrors[key] ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
                      {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {fieldErrors[key] && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{fieldErrors[key]}</p>}
                </div>
              ))}

              {registerData.password && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= pwStrength.strength ? (pwStrength.color === "bg-red-500" ? "#ef4444" : pwStrength.color === "bg-yellow-500" ? "#eab308" : pwStrength.color === "bg-[#6921A5]" ? "#6921A5" : "#22c55e") : "#e2e8f0" }}/>
                    ))}
                  </div>
                  {pwStrength.label && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Strength: <span style={{ fontWeight: 500 }}>{pwStrength.label}</span></p>}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "10px", backgroundColor: "#6921A5", color: "#ffffff", fontWeight: 500, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1 }}>
                {loading ? <><Loader2 size={16} /> Creating account...</> : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: 24 }}>
          © 2026 B2BForCorporates · Enterprise Collaboration Platform
        </p>
      </div>
    </div>
  );
}
