import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api');
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

import { api } from '../lib/api';
import { FlakyTestsTable } from '../routes/projects/$projectId/flaky';

const mockFlaky = [
  {
    title: 'login test',
    rate: 0.3,
    occurrences: [
      { status: 'passed' },
      { status: 'failed' },
      { status: 'passed' },
    ],
  },
  {
    title: 'checkout flow',
    rate: 0.5,
    occurrences: [
      { status: 'failed' },
      { status: 'passed' },
    ],
  },
];

describe('FlakyTestsTable', () => {
  beforeEach(() => {
    vi.mocked(api.flaky.list).mockResolvedValue({ data: mockFlaky } as never);
  });

  it('renders flaky test titles', async () => {
    renderWithQuery(<FlakyTestsTable projectId="p1" />);
    await waitFor(() => {
      expect(screen.getByText('login test')).toBeInTheDocument();
      expect(screen.getByText('checkout flow')).toBeInTheDocument();
    });
  });

  it('renders flaky rate as percentage', async () => {
    renderWithQuery(<FlakyTestsTable projectId="p1" />);
    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('renders occurrence dots', async () => {
    renderWithQuery(<FlakyTestsTable projectId="p1" />);
    await waitFor(() => {
      const dotContainers = screen.getAllByLabelText('occurrence history');
      expect(dotContainers).toHaveLength(2);
    });
  });

  it('shows empty state when no flaky tests', async () => {
    vi.mocked(api.flaky.list).mockResolvedValueOnce({ data: [] } as never);
    renderWithQuery(<FlakyTestsTable projectId="p1" />);
    await waitFor(() => {
      expect(screen.getByText(/no flaky tests detected/i)).toBeInTheDocument();
    });
  });
});
