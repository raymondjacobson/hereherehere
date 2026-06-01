import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multipage static site: landing + the /friend redirect page.
export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        how: resolve(__dirname, 'how/index.html'),
        friend: resolve(__dirname, 'friend/index.html'),
      },
    },
  },
});
