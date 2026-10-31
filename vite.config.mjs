import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');

export default defineConfig({
  root: src,
  // `.env` 放仓库根目录，不藏进 src/，打包时 VITE_SITE_URL 才读得到。
  envDir: root,
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
      },
    },
  },
  server: {
    port: 5199,
    strictPort: true,
  },
});
