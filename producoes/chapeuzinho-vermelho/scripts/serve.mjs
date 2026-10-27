import http from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep, extname } from "node:path";
export function startServer(
  root = fileURLToPath(new URL("../", import.meta.url)),
  port = 8137,
) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".css": "text/css",
  };
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        return res.end();
      }
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const target = await realpath(
        resolve(root, "." + (path === "/" ? "/index.html" : path)),
      );
      if (!target.startsWith((await realpath(root)) + sep)) {
        res.writeHead(403);
        return res.end();
      }
      if (!(await stat(target)).isFile()) {
        res.writeHead(404);
        return res.end();
      }
      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type": types[extname(target)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end("Arquivo não encontrado");
    }
  });
  return new Promise((yes, no) => {
    server.once("error", no);
    server.listen(port, "127.0.0.1", () => yes(server));
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = await startServer(
    undefined,
    Number(process.env.POPUP_PORT) || 8137,
  );
  console.log("Livro disponível localmente na porta " + server.address().port);
}
