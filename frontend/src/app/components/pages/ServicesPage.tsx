import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { apiClient } from "../../../services/apiClient";

const SERVICES = [
  { icon: "⚡", name: "Web Development",      desc: "Custom websites, web apps, and e-com...",              providers: 0 },
  { icon: "📱", name: "App Development",      desc: "iOS, Android, and cross-platform mobile a...",         providers: 0 },
  { icon: "💻", name: "Software Development", desc: "Enterprise software, SaaS, and custom so...",          providers: 0 },
  { icon: "🔒", name: "Cybersecurity",        desc: "Security audits, penetration testing, and c...",       providers: 0 },
  { icon: "🎨", name: "Graphic Design",       desc: "Brand identity, marketing materials, and p...",        providers: 0 },
  { icon: "🖥️", name: "UI/UX Design",         desc: "User interfaces, experience design, and p...",         providers: 0 },
  { icon: "📣", name: "Digital Marketing",    desc: "SEO, PPC, social media, and content mark...",          providers: 0 },
  { icon: "🎬", name: "Video & Animation",    desc: "Motion graphics, explainer videos, and pr...",         providers: 0 },
  { icon: "☁️", name: "Cloud & DevOps",       desc: "Cloud infrastructure, CI/CD, and server m...",         providers: 0 },
  { icon: "🔧", name: "IT Consulting",        desc: "Technology strategy, architecture, and ad...",          providers: 0 },
  { icon: "🤖", name: "Data & AI",            desc: "Machine learning, analytics, and data eng...",          providers: 0 },
  { icon: "💼", name: "Business Consulting",  desc: "Strategy, operations, and management co...",            providers: 0 },
  { icon: "📊", name: "Accounting & Finance", desc: "Bookkeeping, tax planning, and financial advisory",   providers: 0 },
  { icon: "⚖️", name: "Legal Services",       desc: "Contract drafting, IP protection, and compliance",    providers: 0 },
];

function Navbar() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffff", borderBottom: "1px solid #e2e8f0", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 32, height: 60 }}>
        <a href="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="B2BForCorporates logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 18, color: "#6921A5", letterSpacing: "-0.01em" }}>B2BForCorporates</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
          {[
            { label: "Home",              href: "/landing" },
            { label: "Services",          href: "/services", active: true },
            { label: "Explore Businesses",href: "/explore" },
            { label: "Help",            href: "/landing#help" },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 14, fontWeight: l.active ? 600 : 500, color: l.active ? "#6921A5" : "#64748b", textDecoration: l.active ? "underline" : "none", textUnderlineOffset: 4 }}>
              {l.label}
            </a>
          ))}
          <div style={{ flex: 1 }} />
          <UserProfileDropdown />
        </div>
      </div>
    </nav>
  );
}

import { UserProfileDropdown } from "../UserProfileDropdown";

export function ServicesPage() {
  const [query, setQuery] = useState("");
  const [servicesData, setServicesData] = useState(SERVICES);

  useEffect(() => {
    async function loadStats() {
      try {
        const products = await apiClient.get<any[]>('/products');
        const list = Array.isArray(products) ? products : (products as any).data || [];
        
        // Tally category counts based on products
        const categoryCounts = list.reduce((acc: Record<string, number>, p: any) => {
          if (p.category) {
            acc[p.category] = (acc[p.category] || 0) + 1;
          }
          return acc;
        }, {});

        // Provider counts come from real product categories
        setServicesData(prev => prev.map(s => {
          // simple match: if category string is somewhat similar
          const count = Object.entries(categoryCounts).find(([k]) => k.includes(s.name) || s.name.includes(k))?.[1] as number || 0;
          return { ...s, providers: count };
        }));
      } catch (err) {
        console.error("Failed to load products for services count:", err);
      }
    }
    loadStats();
  }, []);

  const filtered = servicesData.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>All Services</h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 28px" }}>Browse our comprehensive catalog of professional B2B services</p>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 400, marginBottom: 40 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8", pointerEvents: "none" }} />
          <input
            placeholder="Filter services..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", outline: "none" }}
          />
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {filtered.map((s, i) => (
            <div key={i} style={{
              background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, cursor: "pointer",
              transition: "box-shadow 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ fontSize: 28, marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{s.name}</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>{s.desc}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#6921A5" }}>{s.providers} providers</span>
            </div>
          ))}

          {/* Custom CTA card */}
          <div style={{ background: "#F3E8F8", border: "2px solid #6921A5", borderRadius: 12, padding: 24, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, background: "#6921A5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <span style={{ color: "#fff", fontSize: 20 }}>✦</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#6921A5", margin: "0 0 6px" }}>Request Custom Services</h3>
            <p style={{ fontSize: 13, color: "#6921A5", margin: "0 0 10px", lineHeight: 1.5 }}>Have a complex or custom enterprise requirement? Speak to our integration team directly.</p>
            <a href="/auth" style={{ fontSize: 13, fontWeight: 600, color: "#6921A5", textDecoration: "none" }}>Contact Support →</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#0f172a", padding: "40px 24px", marginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>B2BForCorporates</span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", maxWidth: 220, lineHeight: 1.6 }}>Enterprise-grade secure marketplace matching international operators with premium vetted suppliers.</p>
          </div>
          {[
            { heading: "PLATFORM", links: ["About Us", "How It Works", "Pricing Models", "Success Stories"] },
            { heading: "FOR BUSINESSES", links: ["Post a Requirement", "Browse Agencies", "Vendor Qualification", "Enterprise Portal"] },
            { heading: "RESOURCES", links: ["Enterprise Blog", "Knowledge Center", "Developer APIs", "System Status"] },
            { heading: "LEGAL", links: ["Terms of Service", "Privacy Governance", "Global Compliance", "Cookie Preferences"] },
          ].map(col => (
            <div key={col.heading}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{col.heading}</p>
              {col.links.map(l => <p key={l} style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px", cursor: "pointer" }}>{l}</p>)}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", borderTop: "1px solid #1e293b", paddingTop: 24 }}>
          <p style={{ fontSize: 13, color: "#475569" }}>© 2026 B2BForCorporates. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
