import axios from 'axios';

const API_BASE = '/api';

export interface ServiceStatus {
  name: string;
  status: 'active' | 'inactive' | 'unknown';
  port: number;
  description: string;
}

export interface ServerInfo {
  server_ip: string;
  mail_server: string;
  chat_server: string;
  mail_ports: { smtp: number; imap: number; imap_ssl: number };
  chat_port: number;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  body?: string;
}

export const api = {
  async getServicesStatus(): Promise<Record<string, ServiceStatus>> {
    const response = await axios.get(`${API_BASE}/services/status`);
    return response.data;
  },

  async getServerInfo(): Promise<ServerInfo> {
    const response = await axios.get(`${API_BASE}/server-info`);
    return response.data;
  },

  async restartService(serviceName: string): Promise<{ success: boolean; status: string }> {
    const response = await axios.post(`${API_BASE}/services/restart/${serviceName}`);
    return response.data;
  },

  async sendTestEmail(to_email: string, subject: string, body: string, from_email?: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_BASE}/mail/test`, { to_email, subject, body, from_email });
    return response.data;
  },

  async getInbox(username: string, password: string): Promise<{ success: boolean; emails: EmailMessage[] }> {
    const response = await axios.post(`${API_BASE}/mail/inbox`, { username, password });
    return response.data;
  },

  async login(username: string, password: string): Promise<{ success: boolean }> {
    const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
    return response.data;
  },

  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_BASE}/auth/register`, { username, password });
    return response.data;
  },
};
