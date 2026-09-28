import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default environment for the majority of tests (API routes, services, repos).
    // Component tests (*.test.tsx in components/) override to jsdom via an
    // environmentMatchGlobs entry below.
    environment: 'node',
    globals: true,
    environmentMatchGlobs: [
      // React component tests run in jsdom
      ['components/**/*.test.tsx', 'jsdom'],
      ['app/**/*.component.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/hrgsms_test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
