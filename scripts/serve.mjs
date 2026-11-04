import http from "node:http";
import { readFile } from "node:fs/promises";
const file = new URL("../demo.html", import.meta.url);
const port = Number(process.env.PORT) || 4178;
http
  .createServer(async (req, res) => {
    if (
      !["/", "/demo.html"].includes(
        new URL(req.url, "http://localhost").pathname,
      )
    ) {
      res.writeHead(404).end();
      return;
    }
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(await readFile(file));
    } catch {
      res.writeHead(500).end("Run npm run build first.");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`ASCII Worlds: http://127.0.0.1:${port}`),
  );
