// Deals — the real deals your company is a party to
import { CoverArt } from "../CoverArt";
import { useState, useEffect } from "react";
import { FolderPlus, Clock, Calendar } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { StatusBadge, Card, SearchInput, FilterPill, PrimaryBtn, GhostBtn } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";

interface DealItem {
  id: string;
  notes?: string; // used as description
  title?: string;
  amount?: number;
  status: string;
  createdAt: string;
}

export function Deals() {
  const [search, setSearch] = useState("");
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();

    socketService.connect();
    const unsub = socketService.on('deals:updated', () => {
      fetchDeals();
    });

    return () => unsub();
  }, []);

  const fetchDeals = async () => {
    try {
      const res: any = await apiClient.get<DealItem[]>('/deals');
      setDeals(res?.data || res || []);
    } catch (error) {
      toast.error("Failed to load projects/deals");
    } finally {
      setLoading(false);
    }
  };

  const filtered = deals.filter(p => p.notes?.toLowerCase().includes(search.toLowerCase()) || p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <SearchInput placeholder="Search Portfolios..." value={search} onChange={setSearch} />
        <FilterPill label="All Types" />
        <div style={{ flex: 1 }} />
        <Link to="/app/requirements/new" style={{ textDecoration: "none" }}><PrimaryBtn><FolderPlus style={{ width: 16, height: 16 }} /> Post a requirement</PrimaryBtn></Link>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" }}>Loading portfolio...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          No deals yet. A deal starts when you accept a proposal on a requirement you posted.
        </div>
      )}

      {/* Portfolio Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
        {filtered.map((p) => (
          <Card key={p.id} className="deal-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ borderBottom: "1px solid #e2e8f0" }}><CoverArt name={p.title} /></div>
            
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, paddingRight: 16 }}>{p.title || "Project Title"}</h3>
                <StatusBadge status={p.status} />
              </div>

              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 16px", flex: 1 }}>
                {p.notes || p.title || "No description provided."}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar style={{ width: 14, height: 14, color: "#94a3b8" }} />
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Link to={`/app/deals/${p.id}`} style={{ textDecoration: "none" }}>
                <GhostBtn style={{ width: "100%", color: "#0f172a", padding: "10px 0" }}>Open deal</GhostBtn>
              </Link>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
}