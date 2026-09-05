import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setupTests.ts'],
    // The auto base generator's deployment-hole auto-fix pass calls the
    // deployment analysis (a full-map flood fill) many times per hole
    // candidate — a one-shot "generate my base" action, not a per-frame
    // hot path, so a few extra seconds here is an acceptable cost of
    // modeling the map's grass border accurately, not a hang to chase down.
    testTimeout: 15000,
  },
})
