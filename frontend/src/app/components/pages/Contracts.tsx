import React, { useState, useEffect, useRef } from "react";
import { Check, Mail, Smartphone, FileText, User, UploadCloud, File, AlertCircle } from "lucide-react";
import { Card, GhostBtn, PrimaryBtn, StatusBadge } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import { socketService } from "../../../services/socketService";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_BYTES) return reject(new Error('File is larger than 2 MB'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Contracts() {
  const { user } = useAuth();
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [businessDocs, setBusinessDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const kycInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!user?.companyId) return;
    try {
      const [kycRes, docRes] = await Promise.all([
        apiClient.get<any[]>(`/kyc/company/${user.companyId}`),
        apiClient.get<any[]>('/documents')
      ]);
      setKycDocs(kycRes || []);
      setBusinessDocs(docRes || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();

    socketService.connect();
    const unsubKyc = socketService.on('kyc:updated', () => fetchDocs());
    const unsubDoc = socketService.on('documents:updated', () => fetchDocs());
    return () => { unsubKyc(); unsubDoc(); };
  }, [user]);

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.companyId) return;
    setUploadingKyc(true);
    try {
      await apiClient.post('/kyc/upload', {
        companyId: user.companyId,
        documentType: 'GOV_ID',
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        contentBase64: await fileToBase64(file),
      });
      await fetchDocs();
    } catch (err) {
      console.error("Failed to upload KYC", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKyc(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.companyId) return;
    setUploadingDoc(true);
    try {
      await apiClient.post('/kyc/upload', {
        companyId: user.companyId,
        documentType: 'BUSINESS_REG',
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        contentBase64: await fileToBase64(file),
      });
      await fetchDocs();
    } catch (err) {
      console.error("Failed to upload document", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Derived status
  const emailVerified = user?.email ? true : false;
  const phoneVerified = user?.phone ? true : false; // Assuming phone verification uses user.phone
  
  // Check if KYC (Gov ID) is uploaded and verified
  const govIdDoc = kycDocs.find(d => d.documentType === 'GOV_ID');
  const govIdStatus = govIdDoc ? govIdDoc.status : 'PENDING';
  
  // Check if Business documents exist
  const businessDoc = kycDocs.find(d => d.documentType === 'BUSINESS_REG');
  const businessDocStatus = businessDoc ? businessDoc.status : 'PENDING';

  let completedSteps = 0;
  if (emailVerified) completedSteps++;
  if (phoneVerified) completedSteps++;
  if (businessDocStatus === 'VERIFIED') completedSteps++;
  if (govIdStatus === 'VERIFIED') completedSteps++;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Top Stepper */}
      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Verification Progress</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Complete all required legal steps to unlock high-tier matching priority.</p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>{completedSteps} of 4 steps completed</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", paddingRight: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: emailVerified ? "2px solid #16a34a" : "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: emailVerified ? "#16a34a" : "#cbd5e1" }}>
              <Check style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: emailVerified ? "#0f172a" : "#64748b", margin: 0 }}>Email Verified</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Legal Contact</p>
            </div>
          </div>
          <div style={{ height: 2, background: emailVerified ? "#16a34a" : "#e2e8f0", flex: 1, margin: "0 16px" }} />

          {/* Step 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", padding: "0 16px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: phoneVerified ? "2px solid #16a34a" : "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: phoneVerified ? "#16a34a" : "#cbd5e1" }}>
              <Check style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: phoneVerified ? "#0f172a" : "#64748b", margin: 0 }}>Phone Verified</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>SMS Alerts</p>
            </div>
          </div>
          <div style={{ height: 2, borderTop: businessDocStatus === 'VERIFIED' ? "2px solid #16a34a" : "2px dashed #2563EB", flex: 1, margin: "0 16px" }} />

          {/* Step 3 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", padding: "0 16px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: businessDocStatus === 'VERIFIED' ? "2px solid #16a34a" : "2px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: businessDocStatus === 'VERIFIED' ? "#16a34a" : "#2563EB" }}>
              {businessDocStatus === 'VERIFIED' ? <Check style={{ width: 16, height: 16 }} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB" }} />}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: businessDocStatus === 'VERIFIED' ? "#16a34a" : "#2563EB", margin: 0 }}>Business Documents</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{businessDocStatus === 'VERIFIED' ? 'Verified' : 'Upload Required'}</p>
            </div>
          </div>
          <div style={{ height: 2, background: govIdStatus === 'VERIFIED' ? "#16a34a" : "#e2e8f0", flex: 1, margin: "0 16px" }} />

          {/* Step 4 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", paddingLeft: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: govIdStatus === 'VERIFIED' ? "2px solid #16a34a" : "2px solid #e2e8f0", background: govIdStatus === 'VERIFIED' ? "#fff" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              {govIdStatus === 'VERIFIED' ? <Check style={{ width: 16, height: 16 }} /> : null}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: govIdStatus === 'VERIFIED' ? "#16a34a" : "#64748b", margin: 0 }}>Government ID</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{govIdStatus}</p>
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
            <GhostBtn style={{ color: "#0f172a" }} onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}>
              {uploadingDoc ? "Uploading..." : "Upload Additional Documents"}
            </GhostBtn>
            <input type="file" ref={docInputRef} style={{ display: "none" }} onChange={handleDocUpload} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginLeft: 56 }}>
            {kycDocs.filter(d => d.documentType === 'BUSINESS_REG').length === 0 ? (
               <p style={{ fontSize: 13, color: "#64748b" }}>No documents uploaded yet.</p>
            ) : kycDocs.filter(d => d.documentType === 'BUSINESS_REG').map(doc => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", width: 260 }}>
                <File style={{ width: 24, height: 24, color: "#2563EB" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Business registration document</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{doc.status === 'PENDING' ? 'Waiting for admin approval' : doc.status === 'VERIFIED' ? 'Approved' : 'Rejected'} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
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
            <input type="file" ref={kycInputRef} style={{ display: "none" }} onChange={handleKycUpload} />
            <button 
              onClick={() => kycInputRef.current?.click()}
              disabled={uploadingKyc}
              style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "8px 24px", borderRadius: 8, cursor: "pointer", opacity: uploadingKyc ? 0.7 : 1 }}>
              {uploadingKyc ? "Uploading..." : "Upload ID Document"}
            </button>
            {govIdDoc && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#16a34a", background: "#f0fdf4", padding: "6px 12px", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                <Check style={{ width: 14, height: 14 }} /> Document successfully uploaded and is {govIdDoc.status.toLowerCase()}.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
