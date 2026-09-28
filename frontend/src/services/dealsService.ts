// Purpose: This module (services/dealsService.ts) is used to implement frontend deal API operations in a modular, maintainable way.
import { Deal } from '../types/index';
import { apiClient } from './apiClient';

export const dealsService = {
  async getAllDeals(): Promise<Deal[]> {
    return apiClient.get<Deal[]>('/deals');
  },

  async getDealById(id: string): Promise<Deal> {
    return apiClient.get<Deal>(`/deals/${id}`);
  },

  async getDealsByBuyer(buyerId: string): Promise<Deal[]> {
    return apiClient.get<Deal[]>(`/deals/buyer/${buyerId}`);
  },

  async getDealsBySeller(sellerId: string): Promise<Deal[]> {
    return apiClient.get<Deal[]>(`/deals/seller/${sellerId}`);
  },

  async createDeal(deal: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> {
    return apiClient.post<Deal>('/deals', deal);
  },

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
    return apiClient.put<Deal>(`/deals/${id}`, updates);
  },

  async deleteDeal(id: string): Promise<void> {
    await apiClient.delete(`/deals/${id}`);
  },

  async updateDealStatus(id: string, status: string): Promise<Deal> {
    return apiClient.put<Deal>(`/deals/${id}/status`, { status });
  },

  async approveDeal(id: string): Promise<Deal> {
    return apiClient.put<Deal>(`/deals/${id}/approve`, {});
  },

  async rejectDeal(id: string, reason: string): Promise<Deal> {
    return apiClient.put<Deal>(`/deals/${id}/reject`, { reason });
  },

  async getDealsByStatus(status: string): Promise<Deal[]> {
    return apiClient.get<Deal[]>(`/deals/status/${status}`);
  },
};

