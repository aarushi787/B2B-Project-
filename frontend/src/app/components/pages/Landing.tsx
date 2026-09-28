import { Link } from "react-router";
import {
  Shield, CheckCircle, ArrowRight, Building2, Zap,
  Users, Globe, Star, Search, ChevronRight,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────
const features = [
  {
    icon: Shield,
    title: "Verified Service Providers",
    description: "Every vendor undergoes a comprehensive legal and structural identity check.",
  },
  {
    icon: Zap,
    title: "Smart Matching Engine",
    description: "Our AI matches your complex requirements to specialized, idle suppliers.",
  },
  {
    icon: CheckCircle,
    title: "Escrow-Protected Transfers",
    description: "Fund tasks systematically with absolute milestone-based clearance.",
  },
  {
    icon: Globe,
    title: "Vast Enterprise Network",
    description: "Connect seamlessly with verified suppliers and global contract manufacturers.",
  },
];

const serviceCategories = [
  { icon: "⚡", name: "Web Development",      providers: 0 },
  { icon: "📱", name: "App Development",      providers: 0 },
  { icon: "📣", name: "Digital Marketing",    providers: 0 },
  { icon: "🎨", name: "UI/UX Design",         providers: 0 },
  { icon: "☁️", name: "Cloud & DevOps",       providers: 0 },
  { icon: "🤖", name: "Data & AI",            providers: 0 },
  { icon: "💼", name: "Business Consulting",  providers: 0 },
  { icon: "🔒", name: "Cybersecurity",        providers: 0 },
];

const processSteps = [
  { num: "01", title: "Post Your Requirement",    desc: "Outline your project parameters, baseline budget, and timeline expectations." },
  { num: "02", title: "Receive Proposals",        desc: "Get curated and structured bid cards from highly qualified verified providers." },
  { num: "03", title: "Compare & Select",         desc: "Evaluate technical experience, historic ratings, and detailed project pricing." },
  { num: "04", title: "Collaborate & Deliver",    desc: "Initiate project milestones, unlock protected escrow payments, and deploy safely." },
];

const metrics = [
  { value: "0", label: "Registered Businesses" },
  { value: "0", label: "Services Listed" },
  { value: "0", label: "Requirements Fulfilled" },
  { value: "0", label: "Client Satisfaction" },
];

const trustedBy = ["AcmeCorp", "Intech", "Sayfent", "Hooli", "Umbrella", "Vehement"];

const footerCols = [
  {
    heading: "PLATFORM",
    links: ["About Us", "How It Works", "Pricing Models", "Success Stories"],
  },
  {
    heading: "FOR BUSINESSES",
    links: ["Post a Requirement", "Browse Agencies", "Vendor Qualification", "Enterprise Portal"],
  },
  {
    heading: "RESOURCES",
    links: ["Enterprise Blog", "Knowledge Center", "Developer API", "Documentation", "System Status"],
  },
  {
    heading: "LEGAL SYSTEM",
    links: ["Terms of Service", "Privacy Governance", "Global Compliance", "Cookie Preferences"],
  },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 32, height: 60 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="B2B Logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, lineHeight: "1.1", color: "#0f172a" }}>B2B</div>
            <div style={{ fontWeight: 700, fontSize: 8, lineHeight: "1.1", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>CORPORATES</div>
          </div>
        </div>

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
          <a href="/landing" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", textDecoration: "none" }}>Home</a>
          <a href="/services" style={{ fontSize: 14, fontWeight: 500, color: "#64748b", textDecoration: "none" }}>Services</a>
          <a href="/explore" style={{ fontSize: 14, fontWeight: 500, color: "#64748b", textDecoration: "none" }}>Explore Businesses</a>
          <a href="#help" style={{ fontSize: 14, fontWeight: 500, color: "#64748b", textDecoration: "none" }}>Help</a>
          <div style={{ flex: 1 }} />
          <Link to="/auth" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", textDecoration: "none" }}>Sign In</Link>
          <Link to="/auth"
            style={{
              fontSize: 14,
              fontWeight: 600,
              background: "#2563EB",
              color: "#fff",
              padding: "8px 20px",
              borderRadius: 8,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Post a Requirement <span style={{ fontSize: 12 }}>✕</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Main Landing Component ───────────────────────────────────────────────────
export function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "Inter, sans-serif", color: "#0f172a" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{ background: "#f8f9fc", paddingTop: 64, paddingBottom: 64, textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ width: 64, height: 64, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="B2B Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
            ENTERPRISE B2B MARKETPLACE
          </p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 20, color: "#0f172a" }}>
            Connecting Businesses with Trusted<br />Service Providers
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", marginBottom: 36, lineHeight: 1.6 }}>
            Discover verified businesses, explore professional services, and connect with the right providers for your next project.
          </p>

          {/* Search */}
          <div style={{ display: "flex", gap: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", maxWidth: 560, margin: "0 auto 36px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 16px", gap: 8 }}>
              <Search style={{ width: 16, height: 16, color: "#94a3b8", flexShrink: 0 }} />
              <input
                placeholder="Search services, businesses, or requirements..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent", padding: "14px 0" }}
              />
            </div>
            <div style={{ borderLeft: "1px solid #e2e8f0", padding: "0 16px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>All Categories</span>
              <ChevronRight style={{ width: 14, height: 14, color: "#94a3b8" }} />
            </div>
            <button onClick={() => window.location.href = '/explore'} style={{ background: "#2563EB", color: "#fff", border: "none", padding: "0 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Search
            </button>
          </div>


        </div>
      </section>

      {/* ── Value Props ── */}
      <section style={{ padding: "72px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              UNCOMPROMISED VALUE
            </p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, color: "#0f172a", marginBottom: 0 }}>
              Built for Complex B2B Enterprise<br />Transactions
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ width: 36, height: 36, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.icon style={{ width: 18, height: 18, color: "#2563EB" }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Categories ── */}
      <section style={{ padding: "72px 24px", background: "#f8f9fc" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                EXPLORE ECOSYSTEM
              </p>
              <h2 style={{ fontSize: "clamp(20px, 2.5vw, 30px)", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Popular Service Categories
              </h2>
            </div>
            <Link to="/services" style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View All Services <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {serviceCategories.map(cat => (
              <div key={cat.name} style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "20px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{cat.name}</p>
                <p style={{ fontSize: 12, color: "#2563EB", fontWeight: 500, margin: 0 }}>{cat.providers} providers</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section style={{ padding: "72px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              SECURE PIPELINE
            </p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, color: "#0f172a" }}>
              Efficient Project Execution<br />Blueprint
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {processSteps.map((step, i) => (
              <div key={step.num} style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i === 0 && <Shield style={{ width: 18, height: 18, color: "#2563EB" }} />}
                    {i === 1 && <Users style={{ width: 18, height: 18, color: "#2563EB" }} />}
                    {i === 2 && <Star style={{ width: 18, height: 18, color: "#2563EB" }} />}
                    {i === 3 && <CheckCircle style={{ width: 18, height: 18, color: "#2563EB" }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>{step.num}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark Metrics ── */}
      <section style={{ padding: "72px 24px", background: "#0f172a" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
              SECURE PLATFORM METRICS
            </p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, color: "#ffffff" }}>
              Powering Safe B2B Services Worldwide
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {metrics.map(m => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "32px 24px",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>{m.value}</p>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted By + Testimonial ── */}
      <section style={{ padding: "72px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", marginBottom: 32 }}>
            TRUSTED BY LEADING ENTERPRISES
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap", marginBottom: 56 }}>
            {trustedBy.map(brand => (
              <div key={brand} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #94a3b8" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{brand}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            background: "#f8f9fc",
            borderRadius: 16,
            padding: "40px",
            display: "flex",
            gap: 32,
            alignItems: "flex-start",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #e0e7ef 0%, #b0bec5 100%)", overflow: "hidden" }}>
                <img src="https://i.pravatar.cc/56?img=47" alt="Sarah Jenkins" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "10px 0 2px" }}>Sarah Jenkins</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>VP of Global Procurement</p>
              <a href="#" style={{ fontSize: 11, color: "#2563EB", textDecoration: "none" }}>Nexis Digital Logistics</a>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, color: "#d1d5db", lineHeight: 1, marginBottom: 8 }}>"</div>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "0 0 16px" }}>
                "ConnectPro completely transformed our vendor engagement process. Within 48 hours of posting our cloud migration requirement, we received three thoroughly validated bids, saving us over three weeks in typical RFI turnaround delays."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle style={{ width: 14, height: 14, color: "#16a34a" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>Verified Enterprise Partner</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#0f172a", padding: "56px 24px 32px", color: "#94a3b8" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <img src="/logo.png" alt="B2B Logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>B2B CORPORATES</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#64748b", maxWidth: 220 }}>
                Enterprise-grade secure marketplace matching international operators with premium vetted suppliers.
              </p>
            </div>
            {footerCols.map(col => (
              <div key={col.heading}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  {col.heading}
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>© 2026 ConnectPro Technologies Group, Inc. All rights reserved.</p>
            <div style={{ display: "flex", gap: 16 }}>
              {["twitter", "linkedin", "facebook"].map(s => (
                <a key={s} href="#" style={{ width: 28, height: 28, borderRadius: 6, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>✦</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
