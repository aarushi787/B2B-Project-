// Purpose: This module (services/messagesService.ts) is used to implement frontend messaging API operations in a modular, maintainable way.
import { Message } from '../types/index';
import { apiClient } from './apiClient';

export const messagesService = {
  async getAllMessages(): Promise<Message[]> {
    return apiClient.get<Message[]>('/messages');
  },

  async getMessagesByUser(companyId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/messages/company/${companyId}`);
  },

  async getMessageThread(senderId: string, receiverId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/messages/thread?sender=${senderId}&receiver=${receiverId}`);
  },

  async getMessagesByDeal(dealId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/messages/deal/${dealId}`);
  },

  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    return apiClient.post<Message>('/messages/send', message);
  },

  async markAsRead(messageId: string): Promise<Message> {
    return apiClient.put<Message>(`/messages/${messageId}/read`, {});
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`);
  },
};

