import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/server/**/*.test.ts'],
    environment: 'node',
    globals: false,
    passWithNoTests: true,
    // Los tests de rendimiento (P3) miden tiempos y no toleran la contienda de
    // CPU del paralelismo entre ficheros. Correr en un solo fork hace que las
    // mediciones sean estables y reproducibles.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
