import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api');
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { api } from '../lib/api';
import { TestDetail } from '../routes/projects/$projectId/runs/$runId/tests/$testId';

const mockTest = {
  id: 'test-1',
  runId: 'run-1',
  title: 'should navigate to dashboard',
  status: 'failed',
  duration: 1500,
  errorMessage: 'Expected element to be visible',
  stackTrace: 'Error at line 42',
  tags: ['smoke'],
  screenshots: ['uploads/test-1/screenshot.png'],
  videos: [],
  traces: [],
};

const mockHistory = [
  { id: 'h1', runId: 'run-0', title: 'should navigate to dashboard', status: 'passed', duration: 1200, tags: [], screenshots: [], videos: [], traces: [] },
  { id: 'h2', runId: 'run-1', title: 'should navigate to dashboard', status: 'failed', duration: 1500, tags: [], screenshots: [], videos: [], traces: [] },
];

describe('TestDetail', () => {
  beforeEach(() => {
    vi.mocked(api.testResults.get).mockResolvedValue({ data: mockTest } as never);
    vi.mocked(api.testResults.history).mockResolvedValue({ data: mockHistory } as never);
  });

  it('renders test title and status badge', async () => {
    renderWithQuery(<TestDetail projectId="p1" runId="run-1" testId="test-1" />);
    await waitFor(() => {
      expect(screen.getByText('should navigate to dashboard')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('renders error message and stack trace', async () => {
    renderWithQuery(<TestDetail projectId="p1" runId="run-1" testId="test-1" />);
    await waitFor(() => {
      expect(screen.getByText(/expected element to be visible/i)).toBeInTheDocument();
      expect(screen.getByText(/error at line 42/i)).toBeInTheDocument();
    });
  });

  it('renders occurrence dots for history', async () => {
    renderWithQuery(<TestDetail projectId="p1" runId="run-1" testId="test-1" />);
    await waitFor(() => {
      const dots = screen.getByLabelText('occurrence history');
      expect(dots.children).toHaveLength(2);
    });
  });

  it('renders screenshot tab when screenshots present', async () => {
    renderWithQuery(<TestDetail projectId="p1" runId="run-1" testId="test-1" />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /screenshots/i })).toBeInTheDocument();
    });
  });
});
