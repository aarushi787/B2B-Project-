// Business Settings — matches dashboard-business-settings.png UI design
import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Card, GhostBtn, Modal, Input, PrimaryBtn } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, background: checked ? "#2563EB" : "#e2e8f0",
        position: "relative", border: "none", cursor: "pointer", transition: "background 0.2s"
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 2, left: checked ? 22 : 2, transition: "left 0.2s"
      }} />
    </button>
  );
}

function SettingRow({ title, desc, action, border = true }: { title: string; desc: string; action: React.ReactNode; border?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: border ? "1px solid #f1f5f9" : "none" }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>{title}</p>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{desc}</p>
      </div>
      {action}
    </div>
  );
}

export function Settings() {
  const [toggles, setToggles] = useState({
    email: true, sms: false, proposal: true, req: true, marketing: false,
    publicProfile: true, dm: true, contact: false, search: true,
    tfa: true
  });
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);

  const toggle = (key: keyof typeof toggles) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleChangePassword = async () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) return toast.error("Please fill all fields");
    setLoading(true);
    try {
      await apiClient.put("/auth/profile", { 
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      toast.success("Password changed successfully!");
      setPwdModalOpen(false);
      setPwdForm({ currentPassword: "", newPassword: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Notification Preferences */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Notification Preferences</h2>
        <SettingRow title="Email notifications" desc="Receive system alerts, legal clearances, and transaction confirmations via email." action={<Toggle checked={toggles.email} onChange={() => toggle("email")} />} />
        <SettingRow title="SMS notifications" desc="Receive instant updates regarding proposal reviews on your registered phone." action={<Toggle checked={toggles.sms} onChange={() => toggle("sms")} />} />
        <SettingRow title="Proposal alerts" desc="Get notified immediately when a provider submits a proposal bid." action={<Toggle checked={toggles.proposal} onChange={() => toggle("proposal")} />} />
        <SettingRow title="Requirement updates" desc="Receive alert benchmarks when active projects hit payment milestones." action={<Toggle checked={toggles.req} onChange={() => toggle("req")} />} />
        <SettingRow title="Marketing emails" desc="Subscribe to receive newsletters, trends, and platform discount metrics." action={<Toggle checked={toggles.marketing} onChange={() => toggle("marketing")} />} border={false} />
      </Card>

      {/* Privacy Settings */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Privacy Settings</h2>
        <SettingRow title="Show business profile publicly" desc="Allow non-registered public users to view your company details and portfolio." action={<Toggle checked={toggles.publicProfile} onChange={() => toggle("publicProfile")} />} />
        <SettingRow title="Allow direct messages" desc="Enable messaging services allowing potential clients to reach you directly." action={<Toggle checked={toggles.dm} onChange={() => toggle("dm")} />} />
        <SettingRow title="Show contact information" desc="Display email addresses and office phone numbers publicly." action={<Toggle checked={toggles.contact} onChange={() => toggle("contact")} />} />
        <SettingRow title="Appear in search results" desc="Enable SEO index optimization for search queries matching your services." action={<Toggle checked={toggles.search} onChange={() => toggle("search")} />} border={false} />
      </Card>

      {/* Account Security */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Account Security</h2>
        
        <SettingRow 
          title="Change Password" 
          desc="It is recommended to update your security credentials periodically." 
          action={<GhostBtn onClick={() => setPwdModalOpen(true)} style={{ color: "#0f172a", padding: "8px 16px" }}>Change Password</GhostBtn>} 
        />
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Two-Factor Authentication</p>
              {toggles.tfa && <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>Enabled</span>}
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Secure your admin access using Google Authenticator or mobile tokens.</p>
          </div>
          <Toggle checked={toggles.tfa} onChange={() => toggle("tfa")} />
        </div>

        <div style={{ paddingTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Active Sessions</h3>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#f8fafc", borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Monitor style={{ width: 20, height: 20, color: "#64748b" }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>Chrome on macOS • Mumbai, India</p>
                <p style={{ fontSize: 11, color: "#16a34a", margin: 0 }}>Current active session</p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Smartphone style={{ width: 20, height: 20, color: "#64748b" }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>ConnectPro iOS App • Pune, India</p>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Last accessed: 2 hours ago</p>
              </div>
            </div>
            <button onClick={() => toast.success("Session revoked!")} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Revoke</button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card style={{ padding: 24, border: "1px solid #ef4444" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", margin: "0 0 8px" }}>Danger Zone</h2>
        
        <SettingRow 
          title="Deactivate Account" 
          desc="Temporarily suspend your portal services. You can reactivate anytime." 
          action={<GhostBtn onClick={() => toast("Account deactivation requested.")} style={{ color: "#0f172a", padding: "8px 16px" }}>Deactivate Account</GhostBtn>} 
        />
        
        <SettingRow 
          title="Delete Business Profile" 
          desc="Permanently erase all historical records, proposal documents, and verification parameters." 
          border={false}
          action={<GhostBtn onClick={() => toast.error("Profile deletion initiated!")} style={{ color: "#ef4444", borderColor: "#fca5a5", padding: "8px 16px" }}>Delete Business Profile</GhostBtn>} 
        />
      </Card>

      <Modal isOpen={pwdModalOpen} onClose={() => setPwdModalOpen(false)} title="Change Password">
        <Input 
          label="Current Password" 
          type="password" 
          value={pwdForm.currentPassword} 
          onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} 
        />
        <Input 
          label="New Password" 
          type="password" 
          value={pwdForm.newPassword} 
          onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} 
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <GhostBtn onClick={() => setPwdModalOpen(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleChangePassword} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
