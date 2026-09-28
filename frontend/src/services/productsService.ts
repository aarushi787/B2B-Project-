// Purpose: This module (services/productsService.ts) is used to implement frontend product API operations in a modular, maintainable way.
import { Product } from '../types/index';
import { apiClient } from './apiClient';

export const productsService = {
  async getAllProducts(): Promise<Product[]> {
    return apiClient.get<Product[]>('/products');
  },

  async getProductById(id: string): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    return apiClient.get<Product[]>(`/products/merchant/${merchantId}`);
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    return apiClient.post<Product>('/products', product);
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return apiClient.put<Product>(`/products/${id}`, updates);
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async searchProducts(query: string): Promise<Product[]> {
    return apiClient.get<Product[]>(`/products/search?q=${encodeURIComponent(query)}`);
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    return apiClient.get<Product[]>(`/products/category/${category}`);
  },

  async updateInventory(id: string, quantity: number): Promise<Product> {
    return apiClient.put<Product>(`/products/${id}/inventory`, { inventory: quantity });
  },
};

