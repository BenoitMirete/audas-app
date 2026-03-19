import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api');
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { api } from '../lib/api';
import { RunDetail } from '../routes/projects/$projectId/runs/$runId/index';

const mockRun = {
  id: 'run-1',
  projectId: 'proj-1',
  status: 'passed',
  startedAt: '2026-03-18T09:00:00Z',
  finishedAt: '2026-03-18T09:05:00Z',
  duration: 300000,
  branch: 'main',
  commitSha: 'abc123def456',
  commitMessage: 'fix: something',
  pipelineId: '999',
  triggeredBy: 'alice',
};

const mockTests = [
  { id: 't1', runId: 'run-1', title: 'should login', status: 'passed', duration: 1200, tags: ['smoke'], screenshots: [], videos: [], traces: [] },
  { id: 't2', runId: 'run-1', title: 'should fail', status: 'failed', duration: 300, tags: [], screenshots: [], videos: [], traces: [] },
];

describe('RunDetail', () => {
  beforeEach(() => {
    vi.mocked(api.runs.get).mockResolvedValue({ data: mockRun } as never);
    vi.mocked(api.testResults.list).mockResolvedValue({ data: mockTests } as never);
  });

  it('renders run status badge', async () => {
    renderWithQuery(<RunDetail projectId="proj-1" runId="run-1" />);
    await waitFor(() => expect(screen.getByText('passed')).toBeInTheDocument());
  });

  it('renders CI metadata when present', async () => {
    renderWithQuery(<RunDetail projectId="proj-1" runId="run-1" />);
    await waitFor(() => {
      expect(screen.getByText(/abc123de/)).toBeInTheDocument(); // first 8 chars of commitSha
      expect(screen.getByText(/fix: something/)).toBeInTheDocument();
      expect(screen.getByText(/alice/)).toBeInTheDocument();
    });
  });

  it('renders test result titles', async () => {
    renderWithQuery(<RunDetail projectId="proj-1" runId="run-1" />);
    await waitFor(() => {
      expect(screen.getByText('should login')).toBeInTheDocument();
      expect(screen.getByText('should fail')).toBeInTheDocument();
    });
  });

  it('does not render CI card when no CI fields present', async () => {
    vi.mocked(api.runs.get).mockResolvedValueOnce({
      data: { id: 'run-2', projectId: 'proj-1', status: 'passed', startedAt: '2026-03-18T09:00:00Z' },
    } as never);
    renderWithQuery(<RunDetail projectId="proj-1" runId="run-2" />);
    await waitFor(() => screen.getByText('should login'));
    expect(screen.queryByText(/commit/i)).not.toBeInTheDocument();
  });
});
