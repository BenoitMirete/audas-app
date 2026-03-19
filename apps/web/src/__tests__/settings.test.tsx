import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from './test-utils';

vi.mock('../lib/api');
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

import { api } from '../lib/api';
import { ProjectSettings } from '../routes/projects/$projectId/settings';
import { UsersTable } from '../routes/settings/users';

const mockProject = { id: 'p1', name: 'My Project', slug: 'my-project', slackWebhook: '' };
const mockMembers = [
  { id: 'm1', email: 'alice@example.com', role: 'admin' as const },
  { id: 'm2', email: 'bob@example.com', role: 'viewer' as const },
];
const mockUsers = [
  { id: 'u1', email: 'alice@example.com', role: 'admin' as const },
  { id: 'u2', email: 'bob@example.com', role: 'viewer' as const },
];

describe('ProjectSettings', () => {
  beforeEach(() => {
    vi.mocked(api.projects.get).mockResolvedValue({ data: mockProject } as never);
    vi.mocked(api.members.list).mockResolvedValue({ data: mockMembers } as never);
    vi.mocked(api.projects.update).mockResolvedValue({ data: mockProject } as never);
    vi.mocked(api.members.remove).mockResolvedValue({} as never);
  });

  it('renders project name in input', async () => {
    renderWithQuery(<ProjectSettings projectId="p1" />);
    await waitFor(() => {
      const input = screen.getByDisplayValue('My Project');
      expect(input).toBeInTheDocument();
    });
  });

  it('renders member emails', async () => {
    renderWithQuery(<ProjectSettings projectId="p1" />);
    await waitFor(() => screen.getByDisplayValue('My Project'));
    await userEvent.click(screen.getByRole('tab', { name: /members/i }));
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('calls api.projects.update when name is saved', async () => {
    renderWithQuery(<ProjectSettings projectId="p1" />);
    await waitFor(() => screen.getByDisplayValue('My Project'));
    const input = screen.getByDisplayValue('My Project');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(api.projects.update).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'New Name' })),
    );
  });

  it('calls api.members.remove when Remove is clicked', async () => {
    renderWithQuery(<ProjectSettings projectId="p1" />);
    await waitFor(() => screen.getByDisplayValue('My Project'));
    await userEvent.click(screen.getByRole('tab', { name: /members/i }));
    await waitFor(() => screen.getByText('alice@example.com'));
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await userEvent.click(removeButtons[0]);
    await waitFor(() => expect(api.members.remove).toHaveBeenCalledWith('p1', 'm1'));
  });
});

describe('UsersTable', () => {
  beforeEach(() => {
    vi.mocked(api.users.list).mockResolvedValue({ data: mockUsers } as never);
    vi.mocked(api.users.update).mockResolvedValue({ data: mockUsers[0] } as never);
    vi.mocked(api.users.delete).mockResolvedValue({} as never);
  });

  it('renders user emails', async () => {
    renderWithQuery(<UsersTable />);
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('calls api.users.delete when Delete is clicked', async () => {
    renderWithQuery(<UsersTable />);
    await waitFor(() => screen.getByText('alice@example.com'));
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    await waitFor(() => expect(api.users.delete).toHaveBeenCalledWith('u1'));
  });
});
