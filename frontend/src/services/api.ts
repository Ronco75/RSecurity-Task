import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { CVE, ApiError } from '../types/cve';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  }
);

export const cveApi = {
  async getAllCVEs(): Promise<CVE[]> {
    try {
      const response: AxiosResponse<CVE[]> = await api.get('/api/cves');
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  async syncCVEs(): Promise<void> {
    try {
      await api.post('/api/cves/sync');
    } catch (error) {
      throw error as ApiError;
    }
  },

  async getSyncStatus(): Promise<{ status: string; message?: string }> {
    try {
      const response = await api.get('/api/cves/sync/status');
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },

  async getHealth(): Promise<{ status: string; database: boolean }> {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      throw error as ApiError;
    }
  },
};

export default api;