import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import wasm from 'vite-plugin-wasm';

let gitCommitHash = process.env.VITE_GIT_COMMIT || '';
if (!gitCommitHash) {
  try {
    gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // git not available
  }
}

export default defineConfig({
  // Relative asset URLs so the build resolves against the runtime <base href>,
  // allowing the same image to be served from any sub-path.
  base: './',
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommitHash),
  },
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    allowedHosts: true,
    fs: {
      strict: false,
    },
    proxy: {
      '/ui-api': {
        // Overridable so the e2e suite can proxy to its own fixture backend
        // rather than whatever happens to be on the default dev port.
        target: process.env.UI_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
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
