import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
    plugins: [react(), tailwindcss()],
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
