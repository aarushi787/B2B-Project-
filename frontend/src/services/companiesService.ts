// Purpose: This module (services/companiesService.ts) is used to implement frontend company API operations in a modular, maintainable way.
import { Company } from '../types/index';
import { apiClient } from './apiClient';

export const companiesService = {
  async getAllCompanies(): Promise<Company[]> {
    return apiClient.get<Company[]>('/companies');
  },

  async getCompanyById(id: string): Promise<Company> {
    return apiClient.get<Company>(`/companies/${id}`);
  },

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    return apiClient.post<Company>('/companies', company);
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    return apiClient.put<Company>(`/companies/${id}`, updates);
  },

  async deleteCompany(id: string): Promise<void> {
    await apiClient.delete(`/companies/${id}`);
  },

  async verifyCompany(id: string, verified = true): Promise<Company> {
    return apiClient.put<Company>(`/companies/${id}/verify`, { verified });
  },

  async searchCompanies(query: string): Promise<Company[]> {
    return apiClient.get<Company[]>(`/companies/search?q=${encodeURIComponent(query)}`);
  },

  async getCompaniesByDomain(domain: string): Promise<Company[]> {
    return apiClient.get<Company[]>(`/companies/domain/${domain}`);
  },
};

