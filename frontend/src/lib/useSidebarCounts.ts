import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import { socketService } from "../services/socketService";
import { proposalsService } from "../services/requirementsService";
import { useAuth } from "../auth/AuthProvider";
import type { DealAlert } from "../types/milestones";

export interface SidebarCounts {
  /** Proposals other businesses sent you that are waiting for a reply. */
  proposals: number;
  /** Things on your deals that need an action from you (confirm, sign, change). */
  alerts: number;
  /** Completed deals where you have not reviewed the other company yet. */
  reviews: number;
  /** How many of the three profile checks are done (email, phone, business verified). */
  verificationDone: number;
  verificationTotal: number;
}

const EVENTS = ["proposals:updated", "proposals:new", "milestones:updated", "documents:updated", "deals:updated", "notifications:new", "user:updated", "company:updated"];

/** The numbers shown on sidebar badges. All real, refreshed whenever the server says something changed. */
export function useSidebarCounts(): SidebarCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>({ proposals: 0, alerts: 0, reviews: 0, verificationDone: 0, verificationTotal: 3 });

  const load = useCallback(async () => {
    const companyId = user?.companyId;
    const [proposals, alerts, company, reviews] = await Promise.allSettled([
      companyId ? proposalsService.list({ scope: "received", status: "submitted", limit: 1 }) : Promise.resolve({ total: 0 }),
      companyId ? apiClient.get<DealAlert[]>("/milestones/alerts") : Promise.resolve([] as DealAlert[]),
      companyId ? apiClient.get<{ verified?: boolean | number }>(`/companies/${companyId}`) : Promise.resolve({ verified: false }),
      companyId ? apiClient.get<unknown[]>("/reputation/pending") : Promise.resolve([] as unknown[]),
    ]);
    setCounts({
      proposals: proposals.status === "fulfilled" ? Number((proposals.value as { total?: number }).total) || 0 : 0,
      alerts: alerts.status === "fulfilled" ? alerts.value.filter((a) => a.severity === "action").length : 0,
      reviews: reviews.status === "fulfilled" && Array.isArray(reviews.value) ? reviews.value.length : 0,
      verificationDone: Number(!!user?.emailVerified) + Number(!!user?.phoneVerified) + Number(company.status === "fulfilled" && !!company.value.verified),
      verificationTotal: 3,
    });
  }, [user?.companyId, user?.emailVerified, user?.phoneVerified]);

  useEffect(() => {
    void load();
    socketService.connect();
    const offs = EVENTS.map((e) => socketService.on(e, () => { void load(); }));
    return () => offs.forEach((o) => o());
  }, [load]);

  return counts;
}
