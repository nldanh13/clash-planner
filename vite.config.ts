import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const warReportApiKey = env.WAR_REPORT_API_KEY || "";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      proxy: {
        "/warreport": {
          target: "https://clashapi.colinschmale.dev",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/warreport/, ""),
          headers: warReportApiKey ? { apikey: warReportApiKey } : undefined
        }
      }
    }
  };
});
