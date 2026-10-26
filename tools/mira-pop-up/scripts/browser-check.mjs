import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { startServer } from "./serve.mjs";
import { ROOT } from "./create.mjs";
const server = await startServer(ROOT, 0);
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      ...(process.env.POPUP_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:") &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:http://127.0.0.1:")
    )
      external.push(r.url());
  });
  await page.goto("http://127.0.0.1:" + server.address().port + "/?render", {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => window.popupReady || window.popupError);
  assert.equal(await page.evaluate(() => window.popupError), undefined);
  const hashes = [];
  for (const [time, id] of [
    [8, "casa"],
    [20, "crescimento"],
    [32, "castelo"],
    [44, "volta"],
  ]) {
    await page.evaluate((t) => window.renderAt(t), time);
    assert.equal(await page.evaluate(() => window.popupState.scene), id);
    hashes.push(
      createHash("sha256")
        .update(await page.screenshot())
        .digest("hex"),
    );
  }
  assert.equal(new Set(hashes).size, 4);
  await page.evaluate(() => window.renderAt(8));
  assert.equal(
    createHash("sha256")
      .update(await page.screenshot())
      .digest("hex"),
    hashes[0],
    "Seek não determinístico",
  );
  const missingVoice = await page.evaluate(async () => {
    try {
      await window.exportPopupMP4({ duration: 1, download: false });
      return "";
    } catch (e) {
      return e.message;
    }
  });
  if (!existsSync(join(ROOT, "assets/narracao/manifest.json")))
    assert.match(missingVoice, /Thalita ainda não gerada/);
  const closing = await page.evaluate(async () => {
    const story = await (await fetch("stories/joao.json")).json();
    if (!story.endCard) return null;
    window.renderAt(story.duration + 1);
    return {
      visible: window.popupEndCard.style.display,
      duration: window.popupDuration,
      expected: story.duration + story.endCard.duration,
      caption: document.getElementById("caption").style.opacity,
    };
  });
  if (closing) {
    assert.equal(closing.visible, "block");
    assert.equal(closing.duration, closing.expected);
    assert.equal(closing.caption, "0");
  }
  const exported = await page.evaluate(async () => {
    const blob = await window.exportPopupMP4({
      duration: 3,
      download: false,
      allowSilent: true,
    });
    const url = URL.createObjectURL(blob),
      video = document.createElement("video");
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    const result = {
      size: blob.size,
      type: blob.type,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
    URL.revokeObjectURL(url);
    return result;
  });
  assert.ok(exported.size > 10000);
  assert.equal(exported.type, "video/mp4");
  assert.ok(Math.abs(exported.duration - 3) < 0.1);
  assert.equal(exported.width, 1280);
  assert.equal(exported.height, 720);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "PASS: quatro cenas WebGL distintas; seek determinístico; MP4 de 3 s exportado no navegador; sem erros JS ou pedidos externos",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
