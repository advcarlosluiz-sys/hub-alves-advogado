import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mp3Duration } from "../scripts/mp3-duration.mjs";
import { narrationInputs } from "../scripts/narration-inputs.mjs";
test("áudio inválido não recebe duração inventada", () => {
  assert.equal(mp3Duration(Buffer.from("not audio")), 0);
});
test("exportação exige voz e recusa manifesto desatualizado", () => {
  const root = mkdtempSync(join(tmpdir(), "popup-voice-"));
  try {
    mkdirSync(join(root, "stories"));
    mkdirSync(join(root, "assets/narracao"), { recursive: true });
    const story = JSON.parse(
      readFileSync(new URL("../stories/joao.json", import.meta.url)),
    );
    writeFileSync(join(root, "stories/joao.json"), JSON.stringify(story));
    assert.throws(() => narrationInputs(root, 48), /Thalita ainda não gerada/);
    writeFileSync(
      join(root, "assets/narracao/manifest.json"),
      JSON.stringify({ voice: "outra voz", duration: 48, clips: [] }),
    );
    assert.throws(() => narrationInputs(root, 48), /desatualizada/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
