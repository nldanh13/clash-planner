import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  if (command !== 'build' && !env.WAR_REPORT_API_KEY) {
    console.warn("CẢNH BÁO: Thiếu biến môi trường WAR_REPORT_API_KEY. Tính năng API sẽ không hoạt động đầy đủ.");
  }

  const proxyConfig = {
    '/api/warreport': {
      target: 'https://clashapi.colinschmale.dev',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/warreport\//, ''),
      configure: (proxy: any) => {
        proxy.on('proxyReq', (proxyReq: any) => {
          proxyReq.setHeader('apikey', env.WAR_REPORT_API_KEY || '');
        });
      }
    }
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'COC Planner Pro',
          short_name: 'COC Planner',
          description: 'Công cụ lập kế hoạch nâng cấp và phân tích Clash of Clans.',
          theme_color: '#0d1822',
          background_color: '#0d1822',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      })
    ],
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      proxy: proxyConfig
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      proxy: proxyConfig
    }
  };
});
