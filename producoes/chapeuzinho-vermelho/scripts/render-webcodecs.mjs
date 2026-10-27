// Renderização determinística via canvas/WebCodecs; FFmpeg adiciona a mistura AAC.
import puppeteer from "puppeteer-core";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  appendFileSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { startServer } from "./serve.mjs";
import { ROOT } from "./create.mjs";
import { narrationInputs } from "./narration-inputs.mjs";
const args = process.argv.slice(2),
  opt = (name, fallback) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = resolve(opt("--deck", ROOT)),
  story = JSON.parse(readFileSync(join(root, "stories/joao.json"))),
  out = resolve(
    opt("--out", join(root, "output", (story.slug || "conto") + ".mp4")),
  ),
  silent = out + ".video.partial.mp4",
  mixed = out + ".mix.partial.mp4";
let server, browser;
try {
  mkdirSync(dirname(out), { recursive: true });
  rmSync(silent, { force: true });
  server = await startServer(root, 0);
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      ...(process.env.POPUP_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
    protocolTimeout: 3600000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.exposeFunction("popupReportProgress", (frame, total) =>
    console.log(
      Math.floor((frame / total) * 100) + "% · " + frame + "/" + total,
    ),
  );
  await page.exposeFunction("saveMP4Chunk", (base64) =>
    appendFileSync(silent, Buffer.from(base64, "base64")),
  );
  await page.goto(
    "http://127.0.0.1:" + server.address().port + "/?render&video-only",
    { waitUntil: "networkidle0" },
  );
  await page.waitForFunction(() => window.popupReady || window.popupError, {
    timeout: 60000,
  });
  const info = await page.evaluate(() => ({
    duration: window.popupDuration,
    error: window.popupError,
  }));
  if (info.error) throw Error(info.error);
  const duration = Number(opt("--duration", String(info.duration)));
  if (!Number.isFinite(duration) || duration <= 0 || duration > info.duration)
    throw Error("Duração inválida");
  console.log("Renderizando " + story.title + " · " + duration + " s");
  await page.evaluate(async (duration) => {
    const blob = await window.exportPopupMP4({
      duration,
      fps: 24,
      download: false,
      allowSilent: true,
    });
    for (let i = 0; i < blob.size; i += 1048576) {
      const bytes = new Uint8Array(
          await blob.slice(i, i + 1048576).arrayBuffer(),
        ),
        parts = [];
      for (let j = 0; j < bytes.length; j += 16384)
        parts.push(String.fromCharCode(...bytes.subarray(j, j + 16384)));
      await window.saveMP4Chunk(btoa(parts.join("")));
    }
  }, duration);
  if (errors.length) throw Error(errors.join("\n"));
  await browser.close();
  browser = null;
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const result = spawnSync(
    ffmpeg,
    [
      "-y",
      "-v",
      "error",
      "-i",
      silent,
      ...narrationInputs(root, duration),
      "-c:v",
      "copy",
      "-t",
      String(duration),
      "-movflags",
      "+faststart",
      mixed,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw Error("Mixagem FFmpeg falhou");
  renameSync(mixed, out);
  rmSync(silent, { force: true });
  console.log("PASS: vídeo H.264 com mistura AAC salvo em " + out);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
  rmSync(silent, { force: true });
  rmSync(mixed, { force: true });
}
