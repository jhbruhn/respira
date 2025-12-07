import { defineConfig } from 'vite';

// For Electron Forge's Vite plugin, this config is used for main and preload processes
// The renderer config is in vite.config.mts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
