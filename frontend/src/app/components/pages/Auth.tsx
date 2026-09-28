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

export function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [resetData, setResetData] = useState({ email: "", token: "", newPassword: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    companyName: "", gstNumber: "", role: "buyer",
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
      { strength: 3, label: "Good", color: "bg-blue-500" },
      { strength: 4, label: "Strong", color: "bg-green-500" },
    ][s];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authService.login({ email: loginData.email, password: loginData.password });
      login(res.token, res.user as any);
      navigate("/app/dashboard");
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
        gstNumber: registerData.gstNumber, role: registerData.role,
      });
      login(res.token, res.user as any);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2 w-full">
            <img src="/logo.png" alt="B2BForCorporates Logo" className="h-16 w-auto object-contain" />
          </div>
          <p className="text-slate-500 text-sm">Enterprise Collaboration Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          {/* Tabs */}
          {(mode === "login" || mode === "register") && (
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              {(["login", "register"] as AuthMode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); setSuccessMsg(""); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <XCircle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={loginData.email} onChange={e => setLoginData(d => ({...d, email: e.target.value}))}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                    placeholder="you@company.com" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button type="button" onClick={() => { setMode("forgot-password"); setError(""); setSuccessMsg(""); }} className="text-xs text-blue-600 hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? "text" : "password"} required value={loginData.password}
                    onChange={e => setLoginData(d => ({...d, password: e.target.value}))}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">Quick Demo Login</p>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setLoginData({ email: "admin@example.com", password: "password123" })}
                    className="w-full text-left p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs text-slate-800 font-medium transition-colors">
                    <b>Admin Console</b> (admin@example.com)
                  </button>
                  <button type="button" onClick={() => setLoginData({ email: "rahul@example.com", password: "password123" })}
                    className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded text-xs text-blue-800 font-medium transition-colors">
                    <b>Acme Corp - Buyer</b> (rahul@example.com)
                  </button>
                  <button type="button" onClick={() => setLoginData({ email: "maya@example.com", password: "password123" })}
                    className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded text-xs text-purple-800 font-medium transition-colors">
                    <b>TechVista - Seller</b> (maya@example.com)
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin"/> Signing in...</> : "Sign In"}
              </button>
            </form>
          ) : mode === "forgot-password" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={resetData.email} onChange={e => setResetData(d => ({...d, email: e.target.value}))}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="you@company.com" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin"/> Sending...</> : "Send Reset Link"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-800">
                Back to Sign In
              </button>
            </form>
          ) : mode === "reset-password" ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reset Token</label>
                <input type="text" required value={resetData.token} onChange={e => setResetData(d => ({...d, token: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Paste token from email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin"/> Resetting...</> : "Reset Password"}
              </button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-800">
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text", icon: User, placeholder: "Arjun Sharma" },
                { label: "Email Address", key: "email", type: "email", icon: Mail, placeholder: "you@company.com" },
                { label: "Phone Number", key: "phone", type: "tel", icon: Phone, placeholder: "+91 98765 43210" },
                { label: "Company Name", key: "companyName", type: "text", icon: Building2, placeholder: "Acme Pvt Ltd" },
                { label: "GST Number (Optional)", key: "gstNumber", type: "text", icon: Building2, placeholder: "22AAAAA0000A1Z5" },
              ].map(({ label, key, type, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <div className="relative">
                    <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={type} required value={(registerData as any)[key]}
                      onChange={e => {
                        setRegisterData(d => ({...d, [key]: e.target.value}));
                        setFieldErrors(err => ({...err, [key]: ""}));
                      }}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 ${fieldErrors[key] ? 'border-red-500' : 'border-slate-200'}`}
                      placeholder={placeholder} />
                  </div>
                  {fieldErrors[key] && <p className="text-red-500 text-xs mt-1">{fieldErrors[key]}</p>}
                </div>
              ))}

              {[
                { label: "Password", key: "password", show: showPassword, setShow: setShowPassword },
                { label: "Confirm Password", key: "confirmPassword", show: showPassword, setShow: setShowPassword },
              ].map(({ label, key, show, setShow }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={show ? "text" : "password"} required minLength={8}
                      value={(registerData as any)[key]}
                      onChange={e => {
                        setRegisterData(d => ({...d, [key]: e.target.value}));
                        setFieldErrors(err => ({...err, [key]: ""}));
                      }}
                      className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 ${fieldErrors[key] ? 'border-red-500' : 'border-slate-200'}`}
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {fieldErrors[key] && <p className="text-red-500 text-xs mt-1">{fieldErrors[key]}</p>}
                </div>
              ))}

              {registerData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwStrength.strength ? pwStrength.color : "bg-slate-200"}`}/>
                    ))}
                  </div>
                  {pwStrength.label && <p className="text-xs text-slate-500">Strength: <span className="font-medium">{pwStrength.label}</span></p>}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin"/> Creating account...</> : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 B2BForCorporates · Enterprise Collaboration Platform
        </p>
      </div>
    </div>
  );
}
