import { defineWorkspace } from 'vitest/config';
import path from 'path';

export default defineWorkspace([
  /* ── Node environment: all existing tests ── */
  {
    test: {
      name: 'node-tests',
      environment: 'node',
      include: [
        '**/*.test.ts',
        '!components/**/*.test.tsx',
        '!app/**/*.component.test.tsx',
      ],
      globals: true,
      env: {
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/hrgsms_test',
      },
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './') },
    },
  },

  /* ── JSDOM environment: React component tests ── */
  {
    test: {
      name: 'react-tests',
      environment: 'jsdom',
      include: ['components/**/*.test.tsx', 'app/**/*.component.test.tsx'],
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
      env: {
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/hrgsms_test',
      },
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './') },
    },
  },
]);
