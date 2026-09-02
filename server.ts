import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Proxy Route for War Report
  app.get("/api/warreport/*all", async (req, res) => {
    try {
      const apiKey = process.env.WAR_REPORT_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "WAR_REPORT_API_KEY is not set." });
      }

      // Extract the path after /api/warreport/
      const apiPath = req.params.all;
      const targetUrl = `https://clashapi.colinschmale.dev/${apiPath}`;
      
      const queryParams = new URLSearchParams(req.query as any).toString();
      const finalUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

      const response = await fetch(finalUrl, {
        method: req.method,
        headers: {
          "apikey": apiKey,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      res.status(response.status).send(responseData);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(502).json({ error: "Failed to connect to War Report API." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
