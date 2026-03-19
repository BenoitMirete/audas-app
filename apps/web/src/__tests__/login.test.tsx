import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: () => () => ({}),
}));
vi.mock('../lib/api', () => ({ api: { auth: { login: vi.fn() } } }));
vi.mock('../lib/auth', () => ({
  setToken: vi.fn(),
  getToken: vi.fn(() => null),
  clearToken: vi.fn(),
}));

import { api } from '../lib/api';
import { setToken } from '../lib/auth';
import { LoginForm } from '../routes/login';

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders fields and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls api.auth.login with credentials', async () => {
    vi.mocked(api.auth.login).mockResolvedValueOnce({ data: { token: 'jwt' } } as never);
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(api.auth.login).toHaveBeenCalledWith('alice@example.com', 'secret');
  });

  it('stores token on success', async () => {
    vi.mocked(api.auth.login).mockResolvedValueOnce({ data: { token: 'jwt-abc' } } as never);
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(setToken).toHaveBeenCalledWith('jwt-abc'));
  });

  it('shows error on failed login', async () => {
    vi.mocked(api.auth.login).mockRejectedValueOnce(
      Object.assign(new Error(), { response: { data: { message: 'Invalid credentials' } } }),
    );
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i),
    );
  });

  it('disables button while loading', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolve!: (v: any) => void;
    vi.mocked(api.auth.login).mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    resolve({ data: { token: 'jwt' } });
  });
});
