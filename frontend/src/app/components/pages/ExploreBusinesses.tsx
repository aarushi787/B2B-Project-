import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Search, Star, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../../services/apiClient";

const CATEGORIES = ["Web Development", "App Development", "Software Sourcing", "Cybersecurity"];
const LOCATIONS = ["PAN INDIA", "DELHI", "CHENNAI", "Remote Only"];
const TABS = ["All Businesses", "Featured", "Verified", "New"];

function Navbar() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 32, height: 60 }}>
        <a href="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="B2B Logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>B2B</div>
            <div style={{ fontWeight: 700, fontSize: 8, color: "#0f172a", textTransform: "uppercase" }}>CORPORATES</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
          {[
            { label: "Home", href: "/landing" },
            { label: "Services", href: "/services" },
            { label: "Explore Businesses", href: "/explore", active: true },
            { label: "Help", href: "/landing#help" },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 14, fontWeight: (l as any).active ? 600 : 500, color: (l as any).active ? "#2563EB" : "#64748b", textDecoration: (l as any).active ? "underline" : "none", textUnderlineOffset: 4 }}>
              {l.label}
            </a>
          ))}
          <div style={{ flex: 1 }} />
          <a href="/auth" style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", textDecoration: "none" }}>Sign In</a>
          <a href="/auth" style={{ fontSize: 14, fontWeight: 600, background: "#2563EB", color: "#fff", padding: "8px 20px", borderRadius: 8, textDecoration: "none" }}>Post a Requirement</a>
        </div>
      </div>
    </nav>
  );
}

import { BusinessProfileModal } from "../BusinessProfileModal";

export function ExploreBusinesses() {
  const [activeTab, setActiveTab] = useState("All Businesses");
  const [selectedCats, setSelectedCats] = useState<string[]>(["Web Development"]);
  const [selectedLocs, setSelectedLocs] = useState<string[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);

  useEffect(() => {
    apiClient.get<any>('/companies')
      .then(res => {
        // Map backend companies to UI format
        const mapped = (res.data || res).map((c: any) => ({
          initials: c.name?.slice(0, 2).toUpperCase() || "B2B",
          name: c.name,
          tagline: c.tagline || c.description || "Premium business services",
          location: c.location || "Remote",
          rating: c.rating || (4.5 + Math.random() * 0.5).toFixed(1),
          tags: c.industries ? c.industries.split(',') : ["Business"],
          verified: c.verified || false
        }));
        setBusinesses(mapped);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load businesses");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "Inter, sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>Explore Businesses</h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 40px" }}>Discover trusted service providers across industries and locations</p>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>
          {/* Filters sidebar */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Filters</span>
              <button onClick={() => { setSelectedCats([]); setSelectedLocs([]); toast.success("Filters cleared"); }} style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>Clear All</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Category</p>
              {CATEGORIES.map(cat => (
                <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedCats.includes(cat)} onChange={() => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    style={{ accentColor: "#2563EB", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{cat}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Verification Status</p>
              {["Verified Partners", "Featured Agencies", "New Providers"].map(s => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "#2563EB", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{s}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Location</p>
              {LOCATIONS.map(loc => (
                <label key={loc} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedLocs.includes(loc)} onChange={() => setSelectedLocs(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc])}
                    style={{ accentColor: "#2563EB", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{loc}</span>
                </label>
              ))}
            </div>

            <button onClick={() => toast.success("Filters applied")} style={{ width: "100%", background: "#2563EB", color: "#fff", border: "none", padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Apply Filters
            </button>
          </div>

          {/* Main content */}
          <div>
            {/* Results header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                {businesses.filter(b => {
                  const matchCat = selectedCats.length === 0 || b.tags.some((t: string) => selectedCats.includes(t)) || selectedCats.includes(b.tags[0]);
                  const matchLoc = selectedLocs.length === 0 || selectedLocs.some(l => b.location.toUpperCase().includes(l.toUpperCase()));
                  return matchCat && matchLoc;
                }).length} businesses found
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Sort by:</span>
                <button onClick={() => toast("Sorting changed")} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
                  Relevance ▾
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", marginBottom: 24 }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? "#2563EB" : "#64748b",
                    borderBottom: activeTab === tab ? "2px solid #2563EB" : "2px solid transparent",
                    background: "none", border: "none", borderRadius: 0, cursor: "pointer", marginBottom: -1,
                  }}>
                  {tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
                <Loader2 style={{ width: 32, height: 32, color: "#94a3b8" }} className="animate-spin" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {businesses.filter(b => {
                  const matchCat = selectedCats.length === 0 || b.tags.some((t: string) => selectedCats.includes(t)) || selectedCats.includes(b.tags[0]);
                  const matchLoc = selectedLocs.length === 0 || selectedLocs.some(l => b.location.toUpperCase().includes(l.toUpperCase()));
                  return matchCat && matchLoc;
                }).map((b, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                  {/* Avatar + verified */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#2563EB" }}>
                      {b.initials}
                    </div>
                    {b.verified && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle style={{ width: 14, height: 14, color: "#16a34a" }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>Verified</span>
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{b.name}</h3>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>{b.tagline}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>📍 {b.location}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}>
                      <Star style={{ width: 11, height: 11, display: "inline", marginRight: 2 }} />
                      {b.rating}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {b.tags.map((tag: string) => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20 }}>{tag}</span>
                    ))}
                  </div>
                  <button onClick={() => setSelectedBusiness(b)} style={{ width: "100%", background: "none", border: "1px solid #2563EB", color: "#2563EB", padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    View Profile
                  </button>
                </div>
              ))}
              </div>
            )}

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 32 }}>
              {[1, 2, 3].map(p => (
                <button key={p} style={{ width: 36, height: 36, borderRadius: 8, border: p === 1 ? "2px solid #2563EB" : "1px solid #e2e8f0", background: p === 1 ? "#eff6ff" : "#fff", color: p === 1 ? "#2563EB" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p}</button>
              ))}
            </div>

            {/* By service / industry tags */}
            <div style={{ marginTop: 48 }}>
              {[
                { label: "Businesses by Service",  tags: ["React Developers", "iOS Experts", "Figma Designers", "DevOps Architects", "ML Engineers", "SEO Specialists"] },
                { label: "Businesses by Industry", tags: ["Fintech Services", "Healthcare Software", "E-commerce Brands", "SaaS Providers", "Logistics & Supply", "EdTech Solutions"] },
              ].map(group => (
                <div key={group.label} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{group.label}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {group.tags.map(tag => (
                      <button onClick={() => toast("Filtering by " + tag)} key={tag} style={{ background: "#f1f5f9", border: "none", color: "#374151", fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20, cursor: "pointer" }}>{tag}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BusinessProfileModal 
        business={selectedBusiness} 
        onClose={() => setSelectedBusiness(null)} 
      />
    </div>
  );
}
