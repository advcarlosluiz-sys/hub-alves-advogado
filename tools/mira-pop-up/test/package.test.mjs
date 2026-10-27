import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inflateRawSync } from "node:zlib";
import { packageZip } from "../scripts/package.mjs";
test("ZIP inclui roteiro, Unicode e vídeo, exclui dependências, segredos comuns e ZIPs anteriores", () => {
  const root = mkdtempSync(join(tmpdir(), "popup-zip-"));
  try {
    for (const dir of ["stories", "output", "node_modules", "dist"])
      mkdirSync(join(root, dir));
    writeFileSync(join(root, "stories/João.json"), "João e o Pé de Feijão");
    writeFileSync(join(root, "output/video.mp4"), Buffer.from([1, 2, 3, 4]));
    writeFileSync(join(root, ".env.local"), "SECRET");
    writeFileSync(join(root, "private.key"), "SECRET");
    writeFileSync(join(root, "node_modules/lib.js"), "ignored");
    writeFileSync(join(root, "dist/old.zip"), "ignored");
    writeFileSync(join(root, "voice.mp3.partial"), "unfinished");
    writeFileSync(join(root, "video.partial.mp4"), "unfinished");
    const result = packageZip(root, join(root, "dist/new.zip"));
    assert.equal(result.files, 2);
    const zip = readFileSync(result.path),
      entries = new Map();
    let i = 0;
    while (zip.readUInt32LE(i) === 0x04034b50) {
      const size = zip.readUInt32LE(i + 18),
        nameLen = zip.readUInt16LE(i + 26),
        extra = zip.readUInt16LE(i + 28),
        start = i + 30 + nameLen + extra;
      entries.set(
        zip.subarray(i + 30, i + 30 + nameLen).toString(),
        inflateRawSync(zip.subarray(start, start + size)),
      );
      i = start + size;
    }
    assert.equal(
      entries.get("alves-pop-up/stories/João.json").toString(),
      "João e o Pé de Feijão",
    );
    assert.deepEqual(
      entries.get("alves-pop-up/output/video.mp4"),
      Buffer.from([1, 2, 3, 4]),
    );
    assert.throws(() => packageZip(root, result.path), /já existe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("pacote de mídia entrega MP4 na raiz e exclui todos os executáveis", () => {
  const root = mkdtempSync(join(tmpdir(), "popup-media-"));
  try {
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, "docs/joao-pop-up.mp4"), "video");
    writeFileSync(join(root, "COMECE-AQUI-VIDEO.txt"), "Abra o MP4");
    writeFileSync(join(root, "atalho.cmd"), "nao incluir");
    writeFileSync(join(root, "script.py"), "nao incluir");
    mkdirSync(join(root, "assets/efeitos"), {recursive:true});
    writeFileSync(join(root, "assets/efeitos/ambiente.wav"), "audio");
    const result = packageZip(root, join(root, "dist/media.zip"), true);
    assert.equal(result.files, 3);
    const archive = readFileSync(result.path);
    assert.ok(archive.includes(Buffer.from("alves-pop-up/ASSISTA-AQUI.mp4")));
    assert.equal(archive.includes(Buffer.from("atalho.cmd")), false);
    assert.equal(archive.includes(Buffer.from("script.py")), false);
    assert.ok(archive.includes(Buffer.from("assets/efeitos/ambiente.wav")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
