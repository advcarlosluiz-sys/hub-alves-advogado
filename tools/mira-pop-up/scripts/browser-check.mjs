import puppeteer from "puppeteer-core";
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
      !r.url().startsWith("data:")
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
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "PASS: quatro cenas WebGL distintas; seek determinístico; sem erros JS ou pedidos externos",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
