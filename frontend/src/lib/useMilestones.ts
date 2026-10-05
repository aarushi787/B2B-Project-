import { useEffect } from "react";
import { apiClient } from "../services/apiClient";
import { socketService } from "../services/socketService";
import { useLoad } from "./useLoad";
import type { DealMilestones } from "../types/milestones";

/** A deal's milestones, kept fresh when either party changes one. */
export function useMilestones(dealId: string) {
  const state = useLoad<DealMilestones>(() => apiClient.get<DealMilestones>(`/milestones/deal/${dealId}`), [dealId]);
  const { reload } = state;

  useEffect(() => {
    socketService.connect();
    return socketService.on("milestones:updated", (e: any) => {
      if (!e?.dealId || e.dealId === dealId) void reload();
    });
  }, [dealId, reload]);

  return state;
}
