import axios from 'axios';
import { User, AnalysisResult, OutOfStockAlert, ShelfHealthMetrics } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth Service
export const authService = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token } = response.data;
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Scanner Service
export const scannerService = {
  uploadImage: async (file: File, aisle: string, shelf: string): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('aisle', aisle);
    formData.append('shelf', shelf);
    
    const response = await apiClient.post('/analysis/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAnalysisHistory: async (): Promise<AnalysisResult[]> => {
    const response = await apiClient.get('/analysis/history');
    return response.data;
  },
};

// Dashboard Service
export const dashboardService = {
  getShelfHealth: async (): Promise<ShelfHealthMetrics> => {
    const response = await apiClient.get('/dashboard/shelf-health');
    return response.data;
  },

  getOutOfStockAlerts: async (): Promise<OutOfStockAlert[]> => {
    const response = await apiClient.get('/dashboard/alerts/out-of-stock');
    return response.data;
  },

  getScanTasks: async () => {
    const response = await apiClient.get('/dashboard/scan-tasks');
    return response.data;
  },
};

// Initialize token from localStorage if exists
const token = localStorage.getItem('token');
if (token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default apiClient;
