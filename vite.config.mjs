import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');

export default defineConfig({
  root: src,
  // Relative asset paths: the panel is loaded from file:// in the packaged app.
  base: './',
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        panel: path.join(src, 'index.html'),
        editor: path.join(src, 'editor.html'),
      },
    },
  },
  server: {
    port: 5199,
    strictPort: true,
  },
});
