import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Search, Star, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { CATEGORIES } from "../marketplace/constants";
import { TrustBadges } from "../TrustBadges";

const TABS = [
  { label: "All Businesses", sort: "relevance", verified: false },
  { label: "Verified", sort: "verified", verified: true },
  { label: "New", sort: "newest", verified: false },
] as const;
const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A to Z" },
  { value: "verified", label: "Verified first" },
];
const PAGE_SIZE = 12;

function Navbar() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e2e8f0", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 32, height: 60 }}>
        <a href="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="B2BForCorporates logo" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 18, color: "#6921A5", letterSpacing: "-0.01em" }}>B2BForCorporates</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
          {[
            { label: "Home", href: "/landing" },
            { label: "Services", href: "/services" },
            { label: "Explore Businesses", href: "/explore", active: true },
            { label: "Help", href: "/landing#help" },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 14, fontWeight: (l as any).active ? 600 : 500, color: (l as any).active ? "#6921A5" : "#64748b", textDecoration: (l as any).active ? "underline" : "none", textUnderlineOffset: 4 }}>
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
import { BusinessProfileModal } from "../BusinessProfileModal";

export function ExploreBusinesses() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["label"]>("All Businesses");
  const initialQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);

  // Wait for a pause in typing before asking the server.
  useEffect(() => { const t = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => { const t = setTimeout(() => { setDebouncedLocation(location); setPage(1); }, 300); return () => clearTimeout(t); }, [location]);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (debouncedLocation) params.set("location", debouncedLocation);
    if (selectedCats.length) params.set("category", selectedCats.join(","));
    if (verifiedOnly) params.set("verified", "true");
    setLoading(true);
    return apiClient.get<any>(`/companies/directory?${params.toString()}`)
      .then(res => {
        setBusinesses((res.data || []).map((c: any) => ({
          id: c.id,
          initials: c.name?.slice(0, 2).toUpperCase() || "B2B",
          name: c.name,
          tagline: c.description || "",
          location: c.address || "Location not provided",
          rating: null,
          tags: c.industry ? String(c.industry).split(",").map((t: string) => t.trim()).filter(Boolean) : [],
          verified: !!c.verified,
          website: c.website,
          trust: c.trust,
        })));
        setTotal(res.total ?? 0);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load businesses");
      })
      .finally(() => setLoading(false));
  }, [page, sort, debouncedQuery, debouncedLocation, selectedCats, verifiedOnly]);

  useEffect(() => { load(); }, [load]);

  const changeTab = (tab: (typeof TABS)[number]) => {
    setActiveTab(tab.label);
    setSort(tab.sort);
    setVerifiedOnly(tab.verified);
    setPage(1);
  };
  const toggleCat = (cat: string) => { setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); setPage(1); };
  const clearAll = () => { setSelectedCats([]); setLocation(""); setQuery(""); setVerifiedOnly(false); setSort("relevance"); setActiveTab("All Businesses"); setPage(1); };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 500, color: "#6921A5", margin: "0 0 8px" }}>Explore Businesses</h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 24px" }}>Discover trusted service providers across industries and locations</p>

        <div style={{ position: "relative", maxWidth: 520, marginBottom: 32 }}>
          <Search style={{ position: "absolute", left: 12, top: 12, width: 16, height: 16, color: "#94a3b8" }} aria-hidden="true" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, service or industry" aria-label="Search businesses"
            style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#fff" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }} className="explore-grid">
          {/* Filters sidebar */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: 20, height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Filters</span>
              <button onClick={clearAll} style={{ fontSize: 13, fontWeight: 600, color: "#6921A5", background: "none", border: "none", cursor: "pointer" }}>Clear All</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Category</p>
              {CATEGORIES.map(cat => (
                <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedCats.includes(cat)} onChange={() => toggleCat(cat)}
                    style={{ accentColor: "#6921A5", width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{cat}</span>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Verification</p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); setPage(1); }} style={{ accentColor: "#6921A5", width: 14, height: 14 }} />
                <span style={{ fontSize: 13, color: "#374151" }}>Verified businesses only</span>
              </label>
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>Location</p>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or state" aria-label="Location"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>

          {/* Main content */}
          <div>
            {/* Results header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#64748b" }} role="status">{loading ? "Loading..." : `${total} ${total === 1 ? "business" : "businesses"} found`}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Sort by:</span>
                <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                  {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", marginBottom: 24 }}>
              {TABS.map(tab => (
                <button key={tab.label} onClick={() => changeTab(tab)}
                  style={{
                    padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab.label ? 600 : 500,
                    color: activeTab === tab.label ? "#6921A5" : "#64748b",
                    borderBottom: activeTab === tab.label ? "2px solid #6921A5" : "2px solid transparent",
                    background: "none", border: "none", borderRadius: 0, cursor: "pointer", marginBottom: -1,
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
                <Loader2 style={{ width: 32, height: 32, color: "#94a3b8" }} className="animate-spin" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {businesses.length === 0 && <p style={{ gridColumn: '1 / -1', fontSize: 14, color: '#64748b' }}>No businesses match these filters. Try clearing some of them.</p>}
                {businesses.map((b, i) => (
                <div key={b.id ?? i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, padding: 24 }}>
                  {/* Avatar + verified */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, background: "#F3E8F8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#6921A5" }}>
                      {b.initials}
                    </div>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{b.name}</h3>
                  <div style={{ marginBottom: 8 }}><TrustBadges trust={b.trust} compact /></div>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>{b.tagline}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>📍 {b.location}</span>
                    {b.rating != null && <span style={{ fontSize: 13, fontWeight: 600, color: "#d97706" }}>
                      <Star style={{ width: 11, height: 11, display: "inline", marginRight: 2 }} />
                      {b.rating}
                    </span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {b.tags.map((tag: string) => (
                      <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20 }}>{tag}</span>
                    ))}
                  </div>
                  <button onClick={() => setSelectedBusiness(b)} style={{ width: "100%", background: "none", border: "1px solid #6921A5", color: "#6921A5", padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    View Profile
                  </button>
                </div>
              ))}
              </div>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <nav aria-label="Pagination" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 32, flexWrap: "wrap" }}>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} aria-current={p === page ? "page" : undefined}
                    style={{ width: 36, height: 36, borderRadius: 6, border: p === page ? "2px solid #6921A5" : "1px solid #e2e8f0", background: p === page ? "#F3E8F8" : "#fff", color: p === page ? "#6921A5" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p}</button>
                ))}
              </nav>
            )}

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
                      <button onClick={() => { setQuery(tag); window.scrollTo({ top: 0, behavior: "smooth" }); }} key={tag} style={{ background: "#f1f5f9", border: "none", color: "#374151", fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 20, cursor: "pointer" }}>{tag}</button>
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
