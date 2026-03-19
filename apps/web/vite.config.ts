import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@audas/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
});
