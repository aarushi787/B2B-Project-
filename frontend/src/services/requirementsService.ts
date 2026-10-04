import { apiClient } from './apiClient';
import type { MarketProposal, Paged, Requirement, RequirementStatus } from '../types';

export interface RequirementInput {
  title: string;
  description: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
}

export interface OfferInput {
  amount: number;
  timeline?: string;
  message?: string;
  deliverables?: string[];
}

function qs(params: Record<string, string | number | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

export const requirementsService = {
  list(params: { scope?: 'mine' | 'open'; status?: RequirementStatus[]; q?: string; category?: string; page?: number; limit?: number }) {
    return apiClient.get<Paged<Requirement>>(`/requirements${qs({ ...params, status: params.status?.join(',') })}`);
  },
  get(id: string) {
    return apiClient.get<Requirement>(`/requirements/${id}`);
  },
  create(input: RequirementInput) {
    return apiClient.post<Requirement>('/requirements', input);
  },
  close(id: string) {
    return apiClient.post<Requirement>(`/requirements/${id}/close`, {});
  },
  proposals(id: string, sort: 'amount' | 'date' | 'timeline' = 'amount') {
    return apiClient.get<{ data: MarketProposal[] }>(`/requirements/${id}/proposals${qs({ sort })}`);
  },
  sendProposal(requirementId: string, input: OfferInput) {
    return apiClient.post<MarketProposal>(`/requirements/${requirementId}/proposals`, input);
  },
};

export const proposalsService = {
  list(params: { scope: 'sent' | 'received'; status?: string; page?: number; limit?: number }) {
    return apiClient.get<Paged<MarketProposal>>(`/proposals${qs(params)}`);
  },
  get(id: string) {
    return apiClient.get<MarketProposal>(`/proposals/${id}`);
  },
  counter(id: string, input: OfferInput) {
    return apiClient.post<MarketProposal>(`/proposals/${id}/offers`, input);
  },
  shortlist: (id: string) => apiClient.post<MarketProposal>(`/proposals/${id}/shortlist`, {}),
  reject: (id: string) => apiClient.post<MarketProposal>(`/proposals/${id}/reject`, {}),
  withdraw: (id: string) => apiClient.post<MarketProposal>(`/proposals/${id}/withdraw`, {}),
  accept: (id: string) => apiClient.post<MarketProposal & { dealId: string }>(`/proposals/${id}/accept`, {}),
};
