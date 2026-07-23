import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { resolveDevApiTarget } from './src/config/devApiTarget';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = resolveDevApiTarget(env.VITE_DEV_API_TARGET ?? process.env.VITE_DEV_API_TARGET);

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
