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
};
