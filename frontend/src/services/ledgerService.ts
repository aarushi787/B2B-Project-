// Purpose: This module (services/ledgerService.ts) is used to implement frontend ledger API operations in a modular, maintainable way.
import { LedgerEntry } from '../types/index';
import { apiClient } from './apiClient';

export const ledgerService = {
  async getAllEntries(): Promise<LedgerEntry[]> {
    return apiClient.get<LedgerEntry[]>('/ledger');
  },

  async getEntriesByCompany(companyId: string): Promise<LedgerEntry[]> {
    return apiClient.get<LedgerEntry[]>(`/ledger/company/${companyId}`);
  },

  async getEntriesByDeal(dealId: string): Promise<LedgerEntry[]> {
    return apiClient.get<LedgerEntry[]>(`/ledger/deal/${dealId}`);
  },

  async createEntry(entry: Omit<LedgerEntry, 'id' | 'timestamp'>): Promise<LedgerEntry> {
    return apiClient.post<LedgerEntry>('/ledger', entry);
  },

  async getBalance(companyId: string): Promise<{ balance: number; currency: string }> {
    return apiClient.get<{ balance: number; currency: string }>(`/ledger/balance/${companyId}`);
  },

  async getEntriesByType(companyId: string, type: string): Promise<LedgerEntry[]> {
    return apiClient.get<LedgerEntry[]>(`/ledger/company/${companyId}/type/${type}`);
  },

  async getMonthlyReport(companyId: string, month: string): Promise<LedgerEntry[]> {
    return apiClient.get<LedgerEntry[]>(`/ledger/company/${companyId}/month/${month}`);
  },
};

