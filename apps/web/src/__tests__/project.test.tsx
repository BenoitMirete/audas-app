import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api');

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to, params }: { children: React.ReactNode; to: string; params?: Record<string, string> }) =>
    <a href={to}>{children}</a>,
}));

import { api } from '../lib/api';
import { ProjectRunsTable } from '../routes/projects/$projectId/index';

const mockRuns = [
  {
    id: 'r1',
    projectId: 'p1',
    status: 'passed',
    startedAt: '2026-03-18T09:00:00Z',
    branch: 'main',
  },
  {
    id: 'r2',
    projectId: 'p1',
    status: 'failed',
    startedAt: '2026-03-18T08:00:00Z',
    branch: 'feat/x',
  },
];

describe('ProjectRunsTable', () => {
  beforeEach(() => vi.mocked(api.runs.list).mockResolvedValue({ data: mockRuns } as never));

  it('renders all runs by default', async () => {
    renderWithQuery(<ProjectRunsTable projectId="p1" />);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // header + 2
  });

  it('shows status badges', async () => {
    renderWithQuery(<ProjectRunsTable projectId="p1" />);
    await waitFor(() => {
      expect(screen.getByText('passed')).toBeInTheDocument();
    });
  });

  it('calls api.runs.list with branch filter when selected', async () => {
    renderWithQuery(<ProjectRunsTable projectId="p1" />);
    await waitFor(() => screen.getAllByRole('row'));
    await userEvent.click(screen.getByRole('combobox', { name: /branch/i }));
    await userEvent.click(screen.getByRole('option', { name: 'main' }));
    await waitFor(() =>
      expect(api.runs.list).toHaveBeenCalledWith('p1', expect.objectContaining({ branch: 'main' })),
    );
  });

  it('calls api.runs.list with status filter when selected', async () => {
    renderWithQuery(<ProjectRunsTable projectId="p1" />);
    await waitFor(() => screen.getAllByRole('row'));
    await userEvent.click(screen.getByRole('combobox', { name: /status/i }));
    await userEvent.click(screen.getByRole('option', { name: 'failed' }));
    await waitFor(() =>
      expect(api.runs.list).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ status: 'failed' }),
      ),
    );
  });
});
