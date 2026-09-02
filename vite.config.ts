import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// War Report sử dụng khóa này trong chính ứng dụng web công khai của họ.
// Proxy chạy ở Node.js để tránh giới hạn CORS của trình duyệt.
const WAR_REPORT_WEB_KEY = "A4U6KQYBG64+Fn2aQYjEFiip";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/warreport": {
        target: "https://clashapi.colinschmale.dev",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/warreport/, ""),
        headers: { apikey: WAR_REPORT_WEB_KEY }
      }
    }
  }
});
