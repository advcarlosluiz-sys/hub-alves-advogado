import puppeteer from "puppeteer-core";
import { startServer } from "./serve.mjs";
import { ROOT } from "./create.mjs";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { musicVolumeExpression } from "../engine/music.mjs";
const story = JSON.parse(readFileSync(join(ROOT, "stories/joao.json"))),
  manifest = JSON.parse(
    readFileSync(join(ROOT, "assets/narracao/manifest.json")),
  ),
  temp = mkdtempSync(join(tmpdir(), "popup-music-"));
let browser, server;
function rms(data, t) {
  const a = Math.floor(t * 48000) * 2,
    b = a + 480 * 2;
  let sum = 0;
  for (let i = a; i < b; i++) sum += data[i] ** 2;
  return Math.sqrt(sum / (b - a));
}
try {
  const original = join(temp, "original.f32"),
    ducked = join(temp, "ducked.f32");
  for (const [out, filters] of [
    [original, []],
    [
      ducked,
      [
        "-af",
        `volume='${musicVolumeExpression(manifest.clips, story.music, 48)}':eval=frame`,
      ],
    ],
  ]) {
    const r = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        join(ROOT, story.music.file),
        ...filters,
        "-t",
        "48",
        "-vn",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-f",
        "f32le",
        out,
      ],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 0, r.stderr);
  }
  const a = readFileSync(original),
    b = readFileSync(ducked),
    source = new Float32Array(a.buffer, a.byteOffset, a.length / 4),
    bed = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  for (const [time, gain] of [
    [1.4, 0.18],
    [3, 0.035],
    [10.5, 0.18],
    [15, 0.035],
    [23, 0.18],
  ])
    assert.ok(
      Math.abs(rms(bed, time) / rms(source, time) - gain) < 0.0002,
      "FFmpeg " + time,
    );
  server = await startServer(ROOT, 0);
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
  await page.goto("http://127.0.0.1:" + server.address().port + "/?render");
  await page.waitForFunction(() => window.popupReady || window.popupError);
  const result = await page.evaluate(async () => {
    const { loadNarration } = await import("./engine/narration.mjs");
    const story = await (await fetch("stories/joao.json")).json(),
      voiceOnly = structuredClone(story);
    delete voiceOnly.music;
    const voice = (await loadNarration(voiceOnly)).buffer,
      mixed = await window.popupNarrator.getAudio();
    const ctx = new OfflineAudioContext(2, 1, 48000),
      original = await ctx.decodeAudioData(
        await (await fetch(story.music.file)).arrayBuffer(),
      );
    const v = voice.getChannelData(0),
      m = mixed.getChannelData(0),
      s = original.getChannelData(0);
    const ratios = [];
    for (const time of [1.4, 3, 10.5, 15, 23]) {
      const start = Math.floor(time * 48000);
      let a = 0,
        b = 0;
      for (let i = start; i < start + 480; i++) {
        a += (m[i] - v[i]) ** 2;
        b += s[i] ** 2;
      }
      ratios.push(Math.sqrt(a / b));
    }
    let peak = 0;
    for (let i = 0; i < m.length; i++) peak = Math.max(peak, Math.abs(m[i]));
    return { ratios, peak };
  });
  for (const [i, gain] of [0.18, 0.035, 0.18, 0.035, 0.18].entries())
    assert.ok(Math.abs(result.ratios[i] - gain) < 0.0002, "Navegador " + i);
  assert.ok(result.peak < 1);
  console.log(
    "PASS: FFmpeg e navegador reduzem a música de 0,18 para 0,035 nas falas e restauram nos intervalos; mistura sem saturação.",
  );
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
  rmSync(temp, { recursive: true, force: true });
}
