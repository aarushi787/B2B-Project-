// Verification Center — matches dashboard-verification.png UI design
import { Check, Mail, Smartphone, FileText, User, UploadCloud, File } from "lucide-react";
import { Card, GhostBtn } from "../ui/DesignSystem";

export function Contracts() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Top Stepper */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Verification Progress</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Complete all required legal steps to unlock high-tier matching priority.</p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>2 of 4 steps completed</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", paddingRight: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <Check style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Email Verified</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Legal Contact</p>
            </div>
          </div>
          <div style={{ height: 2, background: "#16a34a", flex: 1, margin: "0 16px" }} />

          {/* Step 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", padding: "0 16px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <Check style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Phone Verified</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>SMS Alerts</p>
            </div>
          </div>
          <div style={{ height: 2, borderTop: "2px dashed #2563EB", flex: 1, margin: "0 16px" }} />

          {/* Step 3 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", padding: "0 16px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", margin: 0 }}>Business Documents</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>In Review</p>
            </div>
          </div>
          <div style={{ height: 2, background: "#e2e8f0", flex: 1, margin: "0 16px" }} />

          {/* Step 4 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", paddingLeft: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e2e8f0", background: "#f8fafc" }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", margin: 0 }}>Government ID</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Pending</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Email */}
        <Card style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <Mail style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Email Verification</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 12 }}>Verified</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>enterprise@techvista.com • Verified on Jan 10, 2023</p>
            </div>
          </div>
          <Check style={{ width: 24, height: 24, color: "#16a34a" }} />
        </Card>

        {/* Phone */}
        <Card style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <Smartphone style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Phone Verification</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 12 }}>Verified</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>+91 22 5554-1234 • Verified on Jan 12, 2023</p>
            </div>
          </div>
          <Check style={{ width: 24, height: 24, color: "#16a34a" }} />
        </Card>

        {/* Business Docs */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                <FileText style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Business Documents</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706", background: "#fef3c7", padding: "2px 8px", borderRadius: 12 }}>In Review</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Under review — typically takes 2-3 business days</p>
              </div>
            </div>
            <GhostBtn style={{ color: "#0f172a" }}>Upload Additional Documents</GhostBtn>
          </div>
          <div style={{ display: "flex", gap: 16, marginLeft: 56 }}>
            {/* Doc 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", width: 260 }}>
              <File style={{ width: 24, height: 24, color: "#94a3b8" }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: "0 0 2px" }}>GST Certificate.pdf</p>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>1.4 MB • Uploaded Jan 14, 2026</p>
              </div>
            </div>
            {/* Doc 2 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", width: 260 }}>
              <File style={{ width: 24, height: 24, color: "#94a3b8" }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: "0 0 2px" }}>Company Registration.pdf</p>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>2.8 MB • Uploaded Jan 14, 2026</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Government ID */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <User style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Government ID</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 12 }}>Not Started</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Verify identity of the business founder or legal representative</p>
            </div>
          </div>
          
          <div style={{ margin: "0 56px", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc", padding: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <UploadCloud style={{ width: 32, height: 32, color: "#94a3b8", marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Drag and drop or click to upload</p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>Accepted formats: PDF, PNG, JPG (Max 5MB)</p>
            <button style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "8px 24px", borderRadius: 8, cursor: "pointer" }}>
              Upload
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
