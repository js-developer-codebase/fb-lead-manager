import axios from 'axios';
import { IAvailableForm, IFormMapping, ILead, IDashboardStats, IPageSetting } from '../types';

const api = axios.create({
  baseURL: '/api'
});

export const ApiService = {
  // Forms & Multi-Ad Mappings
  async getAvailableForms(): Promise<IAvailableForm[]> {
    const res = await api.get('/forms/available');
    return res.data.forms || [];
  },

  async getMappings(): Promise<IFormMapping[]> {
    const res = await api.get('/forms/mappings');
    return res.data.mappings || [];
  },

  async saveMapping(data: {
    formId: string;
    pageId?: string;
    formName?: string;
    projectName: string;
    location: string;
    targetFields?: any;
    customQuestionMappings?: any[];
    pushExisting?: boolean;
  }): Promise<{ success: boolean; mapping: IFormMapping; enqueuedForCrm: number }> {
    const res = await api.post('/forms/mappings', data);
    return res.data;
  },

  async pushAllLeadsForForm(formId: string): Promise<{ success: boolean; enqueuedCount: number; message?: string }> {
    const res = await api.post(`/forms/mappings/${formId}/push-all`);
    return res.data;
  },

  async deleteMapping(formId: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/forms/mappings/${formId}`);
    return res.data;
  },

  async previewPayload(data: {
    projectName: string;
    location: string;
    targetFields?: any;
  }): Promise<Record<string, any>> {
    const res = await api.post('/forms/preview', data);
    return res.data.payload;
  },

  // Leads
  async getLeads(params: {
    page?: number;
    limit?: number;
    status?: string;
    formId?: string;
    projectName?: string;
    location?: string;
    search?: string;
  }): Promise<{ data: ILead[]; pagination: { total: number; totalPages: number } }> {
    const res = await api.get('/leads', { params });
    return res.data;
  },

  async getLeadById(id: string): Promise<ILead> {
    const res = await api.get(`/leads/${id}`);
    return res.data.lead;
  },

  async retryLead(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/leads/${id}/retry`);
    return res.data;
  },

  async simulateLead(data: {
    formId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  }): Promise<any> {
    const res = await api.post('/leads/simulate', data);
    return res.data;
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<IDashboardStats> {
    const res = await api.get('/dashboard/stats');
    return res.data.stats;
  },

  // Settings
  async getSettings(): Promise<IPageSetting[]> {
    const res = await api.get('/settings');
    return res.data.pages || [];
  },

  async savePageSetting(data: any): Promise<any> {
    const res = await api.post('/settings/pages', data);
    return res.data;
  },

  async testCrm(data: { endpointUrl: string; authType: string; apiKey?: string }): Promise<any> {
    const res = await api.post('/settings/test-crm', data);
    return res.data;
  }
};
