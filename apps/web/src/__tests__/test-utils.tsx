import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

export function renderWithQuery(ui: React.ReactElement) {
  const qc = createTestQueryClient();
  return { qc, ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}
