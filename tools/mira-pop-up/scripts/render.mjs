import puppeteer from "puppeteer-core";
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { once } from "node:events";
import { startServer } from "./serve.mjs";
import { ROOT } from "./create.mjs";
const args = process.argv.slice(2),
  arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const root = resolve(arg("--deck", ROOT)),
  out = resolve(arg("--out", join(root, "output/joao-pop-up.mp4"))),
  fps = Number(arg("--fps", "24"));
let browser, server, encoder;
try {
  if (!Number.isInteger(fps) || fps < 1 || fps > 60)
    throw Error("FPS deve ser inteiro entre 1 e 60");
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  if (spawnSync(ffmpeg, ["-version"], { stdio: "ignore" }).status !== 0)
    throw Error("Instale FFmpeg e/ou defina FFMPEG_PATH");
  const chrome =
    process.env.CHROME_PATH ||
    [
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ].find(existsSync);
  if (!chrome)
    throw Error("Defina CHROME_PATH para o Chromium/Chrome instalado");
  server = await startServer(root, 0);
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: [
      ...(process.env.POPUP_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port + "/?render", {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => window.popupReady || window.popupError, {
    timeout: 60000,
  });
  const error = await page.evaluate(() => window.popupError);
  if (error) throw Error(error);
  const duration = Number(
    arg("--duration", String(await page.evaluate(() => window.popupDuration))),
  );
  if (!Number.isFinite(duration) || duration <= 0)
    throw Error("Duração inválida");
  mkdirSync(dirname(out), { recursive: true });
  await page.evaluate(() => window.renderAt(8));
  await page.screenshot({ path: join(dirname(out), "preview.png") });
  if (args.includes("--preview")) {
    console.log("Preview: " + join(dirname(out), "preview.png"));
  } else {
    encoder = spawn(
      ffmpeg,
      [
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "19",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let log = "";
    encoder.stderr.on("data", (d) => {
      log = (log + d).slice(-6000);
    });
    let encodeError;
    encoder.stdin.on("error", (e) => {
      encodeError = e;
    });
    const completion = new Promise((yes, no) => {
      encoder.on("error", no);
      encoder.on("close", (code) =>
        code === 0 ? yes() : no(Error("FFmpeg: " + log)),
      );
    });
    completion.catch(() => {});
    const count = Math.ceil(duration * fps);
    for (let n = 0; n < count; n++) {
      if (encodeError || encoder.exitCode !== null)
        throw encodeError || Error(log);
      await page.evaluate((t) => window.renderAt(t), n / fps);
      const frame = await page.screenshot({ type: "jpeg", quality: 95 });
      if (!encoder.stdin.write(frame))
        await Promise.race([
          once(encoder.stdin, "drain"),
          completion.then(() => {
            throw Error("FFmpeg encerrou antes do fim");
          }),
        ]);
      if (n % (fps * 4) === 0)
        console.log(Math.round((n / count) * 100) + "% · " + n + "/" + count);
    }
    encoder.stdin.end();
    await completion;
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      "MP4 validado: " + out + " (" + duration + "s, " + fps + "fps)",
    );
  }
} catch (e) {
  if (encoder) encoder.kill();
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
