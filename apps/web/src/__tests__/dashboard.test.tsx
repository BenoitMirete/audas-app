import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api', () => ({
  api: {
    dashboard: { get: vi.fn() },
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  createFileRoute: () => () => ({}),
}));

import { api } from '../lib/api';
import { Dashboard } from '../routes/index';

const mockStats = {
  totalRuns: 42,
  passRate: 0.87,
  projects: [
    {
      project: { id: 'p1', name: 'My Project', slug: 'my-project' },
      latestRun: { id: 'r1', projectId: 'p1', status: 'passed', startedAt: '2026-03-18T09:00:00Z' },
    },
  ],
  recentFlakyTests: [{ title: 'login test', rate: 0.3, occurrences: [] }],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.dashboard.get).mockResolvedValue({ data: mockStats } as never);
  });

  it('renders pass rate', async () => {
    renderWithQuery(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/87%/)).toBeInTheDocument());
  });

  it('renders total runs', async () => {
    renderWithQuery(<Dashboard />);
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('renders project name', async () => {
    renderWithQuery(<Dashboard />);
    await waitFor(() => expect(screen.getByText('My Project')).toBeInTheDocument());
  });

  it('renders flaky test title', async () => {
    renderWithQuery(<Dashboard />);
    await waitFor(() => expect(screen.getByText('login test')).toBeInTheDocument());
  });
});
