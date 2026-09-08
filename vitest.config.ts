import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'parity/**/*.test.ts'],
    environment: 'node',
  },
})
