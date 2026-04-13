import { UserProfile, Job, Application } from './types';

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const fetchWithTimeout = async (url: string, options: any = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  auth: {
    register: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    login: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'Login failed';
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch (e) {
          errorMsg = `Server error (${res.status}): ${text.substring(0, 100)}...`;
        }
        throw new Error(errorMsg);
      }
      return res.json();
    },
    me: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        const message = errorData.error || `Failed to fetch user`;
        throw new Error(`${message} (Status: ${res.status})`);
      }
      return res.json();
    },
    updateProfile: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');
      return res.json();
    },
    verifyEmail: async (token: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    resendVerification: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    forgotPassword: async (email: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    resetPassword: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    changePassword: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
  },
  jobs: {
    list: async (): Promise<Job[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/jobs`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json();
    },
    get: async (id: string): Promise<Job> => {
      const res = await fetchWithTimeout(`${API_BASE}/jobs/${id}`, { headers: getHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Job not found' }));
        throw new Error(errorData.error || 'Job not found');
      }
      return res.json();
    },
    create: async (data: any): Promise<Job> => {
      const res = await fetchWithTimeout(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create job');
      return res.json();
    },
    update: async (id: string, data: any): Promise<Job> => {
      const res = await fetchWithTimeout(`${API_BASE}/jobs/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update job');
      return res.json();
    },
    myJobs: async (): Promise<Job[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/my-jobs`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch your jobs');
      return res.json();
    },
    save: async (id: string): Promise<{ savedJobs: string[], isSaved: boolean }> => {
      const res = await fetchWithTimeout(`${API_BASE}/jobs/${id}/save`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to save job');
      return res.json();
    },
    savedJobs: async (): Promise<Job[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/my-saved-jobs`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch saved jobs');
      return res.json();
    },
  },
  applications: {
    create: async (data: any): Promise<Application> => {
      const res = await fetchWithTimeout(`${API_BASE}/applications`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    myApplications: async (): Promise<Application[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/my-applications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/applications/${id}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update application status');
      return res.json();
    },
  },
  notifications: {
    list: async (): Promise<any[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    markAsRead: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/notifications/${id}/read`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
      return res.json();
    },
  },
  employer: {
    listApplicants: async (): Promise<any[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/employer/applicants`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch applicants');
      return res.json();
    },
  },
  subscription: {
    submitReceipt: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/receipts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit receipt');
      return res.json();
    },
    myReceipts: async (): Promise<any[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/my-receipts`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch receipts');
      return res.json();
    },
  },
  admin: {
    listReceipts: async (): Promise<any[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/receipts`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch admin receipts');
      return res.json();
    },
    approveReceipt: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/receipts/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to approve receipt');
      return res.json();
    },
    rejectReceipt: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/receipts/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to reject receipt');
      return res.json();
    },
    approveJob: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/jobs/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to approve job');
      return res.json();
    },
    rejectJob: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/jobs/${id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to reject job');
      return res.json();
    },
    listUsers: async (): Promise<UserProfile[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    createUser: async (data: any): Promise<UserProfile> => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create user');
      return res.json();
    },
    deleteUser: async (uid: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users/${uid}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete user');
      return res.json();
    },
    updateUserStatus: async (uid: string, isBanned: boolean) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users/${uid}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isBanned }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user status');
      return res.json();
    },
    updateUser: async (uid: string, data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/users/${uid}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user');
      return res.json();
    },
    getAnalytics: async (): Promise<any> => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/analytics`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    listNotifications: async (): Promise<any[]> => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    deleteNotification: async (id: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete notification');
      return res.json();
    },
    clearAllNotifications: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/notifications/clear-all`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to clear notifications');
      return res.json();
    },
    getSystemSettings: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/system-settings`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch system settings');
      return res.json();
    },
    updateSystemSettings: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/system-settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update system settings');
      return res.json();
    },
    setupBotWebhook: async (data: any) => {
      const res = await fetchWithTimeout(`${API_BASE}/bot-setup-webhook`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return res;
    },
    reinitializeBot: async (token: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/bot/reinitialize`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to reinitialize bot');
      return res.json();
    },
    sendBotTest: async (chatId: string, message: string) => {
      const res = await fetchWithTimeout(`${API_BASE}/admin/bot/send-test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ chatId, message }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to send test message');
      return res.json();
    },
  },
};
