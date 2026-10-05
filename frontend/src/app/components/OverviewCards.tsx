// The row of headline numbers at the top of the dashboard. The numbers are passed in, so the cards stay dumb and every
// figure comes from real data in the page that uses them.
import type { LucideIcon } from "lucide-react";

export interface OverviewItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  /** Small note under the number, such as "2 need your attention". */
  hint?: string;
}

export function OverviewCards({ items }: { items: OverviewItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
      {items.map(({ label, value, icon: Icon, iconBg, iconColor, hint }) => (
        <div key={label} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#64748b", margin: 0 }}>{label}</p>
            <div style={{ width: 36, height: 36, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: 18, height: 18, color: iconColor }} aria-hidden="true" />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 30, fontWeight: 800, color: "#0F1A2E", margin: 0, lineHeight: "1.1" }}>{value}</p>
            {hint && <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>{hint}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
