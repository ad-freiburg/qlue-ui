import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ['vscode-textmate', 'vscode-oniguruma'],
  },
  server: {
    allowedHosts: true,
    fs: {
      strict: false,
    },
    proxy: {
      '/admin': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
    },
  },
  plugins: [
    tailwindcss(),
    checker({
      typescript: {
        tsconfigPath: './tsconfig.json',
      },
    }),
  ],
  assetsInclude: ['**/*yaml'],
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
});
