import { createRootRouteWithContext, Link, Outlet, redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { getToken } from '../lib/auth';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (!getToken() && location.pathname !== '/login') throw redirect({ to: '/login' });
  },
  component: () => (
    <div className="flex h-screen">
      <nav className="w-56 shrink-0 border-r p-4 flex flex-col gap-2">
        <Link to="/" className="font-bold text-lg mb-2">
          Audas
        </Link>
        <Link to="/" className="[&.active]:font-semibold">
          Dashboard
        </Link>
        <Link to="/settings/users" className="[&.active]:font-semibold">
          Users
        </Link>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  ),
});
