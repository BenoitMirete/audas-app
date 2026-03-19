import axios from 'axios';
import { getToken, clearToken } from './auth';
import type { RunStatus, TestStatus } from '@audas/shared';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

apiClient.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.replace('/login');
    }
    return Promise.reject(err);
  },
);

// Response shapes
export interface Project {
  id: string;
  name: string;
  slug: string;
  slackWebhook?: string;
}
export interface Run {
  id: string;
  projectId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  pipelineId?: string;
  pipelineUrl?: string;
  mrId?: string;
  mrUrl?: string;
  triggeredBy?: string;
}
export interface TestResult {
  id: string;
  runId: string;
  title: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
  tags: string[];
  screenshots: string[];
  videos: string[];
  traces: string[];
}
export interface FlakyTest {
  title: string;
  rate: number;
  occurrences: Array<{ status: TestStatus }>;
}
export interface ProjectMember {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
}
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
}
export interface DashboardStats {
  totalRuns: number;
  passRate: number;
  projects: Array<{ project: Project; latestRun: Run | null }>;
  recentFlakyTests: FlakyTest[];
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post<{ token: string }>('/auth/login', { email, password }),
  },
  dashboard: { get: () => apiClient.get<DashboardStats>('/dashboard') },
  projects: {
    list: () => apiClient.get<Project[]>('/projects'),
    get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
    update: (id: string, d: Partial<Project>) => apiClient.patch<Project>(`/projects/${id}`, d),
  },
  runs: {
    list: (pid: string, p?: { branch?: string; tag?: string; status?: RunStatus }) =>
      apiClient.get<Run[]>(`/projects/${pid}/runs`, { params: p }),
    get: (pid: string, rid: string) => apiClient.get<Run>(`/projects/${pid}/runs/${rid}`),
  },
  testResults: {
    list: (pid: string, rid: string) =>
      apiClient.get<TestResult[]>(`/projects/${pid}/runs/${rid}/tests`),
    get: (pid: string, rid: string, tid: string) =>
      apiClient.get<TestResult>(`/projects/${pid}/runs/${rid}/tests/${tid}`),
    history: (pid: string, tid: string) =>
      apiClient.get<TestResult[]>(`/projects/${pid}/tests/${tid}/history`),
  },
  flaky: { list: (pid: string) => apiClient.get<FlakyTest[]>(`/projects/${pid}/flaky`) },
  members: {
    list: (pid: string) => apiClient.get<ProjectMember[]>(`/projects/${pid}/members`),
    add: (pid: string, email: string, role: string) =>
      apiClient.post(`/projects/${pid}/members`, { email, role }),
    remove: (pid: string, mid: string) => apiClient.delete(`/projects/${pid}/members/${mid}`),
  },
  users: {
    list: () => apiClient.get<User[]>('/users'),
    update: (id: string, d: Partial<User>) => apiClient.patch<User>(`/users/${id}`, d),
    delete: (id: string) => apiClient.delete(`/users/${id}`),
  },
};
