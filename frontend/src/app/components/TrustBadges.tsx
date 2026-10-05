// Trust badges for a company profile. They only show what the platform has actually checked:
// - "Verified business": a platform admin reviewed the company's documents and approved it.
// - GST: the number has the right format and check digit. This is NOT a lookup in the government GST registry.
import { BadgeCheck, FileCheck2, FileQuestion, TriangleAlert } from "lucide-react";

export type GstStatus = "valid" | "invalid" | "missing";
export type Trust = { verified: boolean; gst: GstStatus };

const chip = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: bg, color, whiteSpace: "nowrap",
});

export function TrustBadges({ trust, compact = false }: { trust?: Trust | null; compact?: boolean }) {
  if (!trust) return null;
  const { verified, gst } = trust;
  if (compact && !verified && gst !== "valid") return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} aria-label="Trust checks">
      {verified && (
        <span style={chip("#F3E8F8", "#6921A5")} title="A platform admin reviewed this business's documents and approved it.">
          <BadgeCheck size={14} aria-hidden="true" /> Verified business
        </span>
      )}
      {gst === "valid" && (
        <span style={chip("#dcfce7", "#15803d")} title="The GST number has a valid format and check digit. This is not a lookup in the GST registry.">
          <FileCheck2 size={14} aria-hidden="true" /> GST number valid
        </span>
      )}
      {!compact && gst === "invalid" && (
        <span style={chip("#fef3c7", "#b45309")} title="The GST number on file does not pass the format and check-digit test.">
          <TriangleAlert size={14} aria-hidden="true" /> GST number looks incorrect
        </span>
      )}
      {!compact && gst === "missing" && (
        <span style={chip("#E2E8F0", "#475569")}>
          <FileQuestion size={14} aria-hidden="true" /> GST not provided
        </span>
      )}
    </div>
  );
}
