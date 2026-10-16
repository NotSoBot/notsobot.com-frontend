import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In development, `/api/*` is proxied so the browser only ever talks to one origin, exactly like production.
  // VITE_DEV_API_PROXY is an origin that serves the API under `/api` (a local nginx, or production if you really
  // mean to). Without it, requests go straight to a local notsobot.api (API_PORT in its .env.example) with the
  // `/api` prefix stripped like its nginx does, so dev never touches production by accident.
  const apiProxyTarget = env.VITE_DEV_API_PROXY || `http://localhost:${env.VITE_DEV_API_PORT || 8080}`;
  const stripApiPrefix = !env.VITE_DEV_API_PROXY;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (stripApiPrefix) ? (path) => path.replace(/^\/api(?=[/?]|$)/, '').replace(/^(?!\/)/, '/') : undefined,
        },
      },
    },
    build: {
      outDir: 'dist',
      // nothing uploads source maps (no Sentry etc.), so don't publish the original source with the site
      sourcemap: false,
      rollupOptions: {
        output: {
          // the hover logo effects ship as `effect.<hash>.webp` so their filenames don't give away the command names
          assetFileNames: (asset) => {
            if (asset.originalFileNames.some((name) => name.startsWith('src/assets/logos/effects/'))) {
              return 'assets/effect.[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  };
});
