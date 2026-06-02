import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // tsconfigPaths mirrors the `@/*` -> `./src/*` alias from tsconfig.json so the
  // mesh library imports resolve identically under Vitest and Metro.
  plugins: [tsconfigPaths()],
  resolve: {
    // The mesh/crypto code transitively imports native Expo modules at load
    // time (crypto/prng.ts imports expo-crypto). Swap them for tiny Node-backed
    // shims so the pure-TS protocol library is testable without a device.
    // Production code is untouched — these aliases exist only for tests.
    alias: {
      'expo-crypto': here('./test/shims/expo-crypto.ts'),
      'expo-secure-store': here('./test/shims/expo-secure-store.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
