// Sinal sintético apenas para teste técnico. Não representa nem simula a voz Thalita.
import puppeteer from "puppeteer-core";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createDeck } from "./create.mjs";
import { startServer } from "./serve.mjs";
import { narrationInputs } from "./narration-inputs.mjs";
import { ROOT } from "./create.mjs";
const temp = mkdtempSync(join(tmpdir(), "popup-audio-"));
let server, browser;
try {
  const root = createDeck(join(temp, "deck"));
  const story = JSON.parse(
    readFileSync(join(root, "stories/joao.json"), "utf8"),
  );
  story.narration = {
    voice: "pt-BR-SINAL-DE-TESTE",
    rate: "-12%",
    pitch: "-4Hz",
    manifest: "assets/narracao/manifest.json",
    required: true,
  };
  const pcm = Buffer.alloc(48000 * 2);
  for (let i = 0; i < 48000; i++)
    pcm.writeInt16LE(
      Math.round(Math.sin((i / 48000) * 440 * Math.PI * 2) * 6000),
      i * 2,
    );
  const header = Buffer.alloc(44);
  header.write("RIFF");
  header.writeUInt32LE(pcm.length + 36, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(48000, 24);
  header.writeUInt32LE(96000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  mkdirSync(join(root, "assets/narracao"), { recursive: true });
  writeFileSync(
    join(root, "assets/narracao/test.wav"),
    Buffer.concat([header, pcm]),
  );
  let start = 0;
  const clips = story.scenes.map((s) => {
    const c = {
      scene: s.id,
      file: "assets/narracao/test.wav",
      offset: start + 2,
      duration: 1,
      hash: createHash("sha256")
        .update(
          [
            s.caption,
            story.narration.voice,
            story.narration.rate,
            story.narration.pitch,
          ].join("|"),
        )
        .digest("hex"),
    };
    start += s.duration;
    return c;
  });
  writeFileSync(join(root, "stories/joao.json"), JSON.stringify(story));
  writeFileSync(
    join(root, "assets/narracao/manifest.json"),
    JSON.stringify({
      voice: story.narration.voice,
      duration: story.duration,
      clips,
    }),
  );
  server = await startServer(root, 0);
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    args: [
      ...(process.env.POPUP_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port + "/?render");
  await page.waitForFunction(() => window.popupReady && window.exportPopupMP4);
  const result = await page.evaluate(async () => {
    const buffer = await window.popupNarrator.getAudio(),
      data = buffer.getChannelData(0);
    const before = Math.max(...data.subarray(24000, 24500).map(Math.abs)),
      during = Math.max(...data.subarray(120000, 120500).map(Math.abs));
    const blob = await window.exportPopupMP4({ duration: 3, download: false });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { before, during, bytes: btoa(binary) };
  });
  assert.equal(result.before, 0);
  assert.ok(result.during > 0.1);
  assert.deepEqual(errors, []);
  const path = join(temp, "audio-test.mp4");
  writeFileSync(path, Buffer.from(result.bytes, "base64"));
  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name,codec_type",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  );
  assert.equal(probe.status, 0, probe.stderr);
  const streams = JSON.parse(probe.stdout).streams;
  assert.ok(streams.some((s) => s.codec_name === "h264"));
  assert.ok(streams.some((s) => ["aac", "opus"].includes(s.codec_name)));
  const alternative = join(temp, "aac-test.mp4");
  const muxed = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      join(ROOT, "docs/joao-pop-up.mp4"),
      ...narrationInputs(root, 3),
      "-c:v",
      "copy",
      "-t",
      "3",
      alternative,
    ],
    { encoding: "utf8" },
  );
  assert.equal(muxed.status, 0, muxed.stderr);
  const aac = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "json",
      alternative,
    ],
    { encoding: "utf8" },
  );
  assert.equal(JSON.parse(aac.stdout).streams[0].codec_name, "aac");
  console.log(
    "PASS: áudio sintético começa no instante correto e MP4 contém vídeo H.264 + áudio AAC/Opus; nenhum teste usa ou finge voz Thalita.",
  );
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
  rmSync(temp, { recursive: true, force: true });
}
