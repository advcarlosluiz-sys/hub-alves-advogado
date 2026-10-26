import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateStory, locateScene } from "../engine/story.mjs";
import { createDeck } from "../scripts/create.mjs";
import { install } from "../scripts/install.mjs";
const story = JSON.parse(
  readFileSync(new URL("../stories/joao.json", import.meta.url)),
);
test("roteiro completo e limites entre capítulos", () => {
  validateStory(story);
  assert.equal(locateScene(story, 0).scene.id, "casa");
  assert.equal(locateScene(story, 12).scene.id, "crescimento");
  assert.equal(locateScene(story, 24).scene.id, "castelo");
  assert.equal(locateScene(story, 48).scene.id, "volta");
  assert.equal(locateScene(story, 999).local, 12);
});
test("recusa ativo inesperado, cena duplicada e duração inconsistente", () => {
  for (const modify of [
    (s) => (s.scenes[0].actors[0].asset = "https://host/script"),
    (s) => (s.scenes[1].id = s.scenes[0].id),
    (s) => (s.duration = 10),
  ]) {
    const s = structuredClone(story);
    modify(s);
    assert.throws(() => validateStory(s));
  }
});
test("deck gerado leva bibliotecas locais, roteiro e servidor sem sobrescrever dados", () => {
  const root = mkdtempSync(join(tmpdir(), "popup-deck-"));
  try {
    const dest = join(root, "conto");
    createDeck(dest);
    for (const p of [
      "engine/pop-up.mjs",
      "vendor/three.module.js",
      "vendor/gsap.min.js",
      "stories/joao.json",
      "scripts/serve.mjs",
    ])
      assert.ok(existsSync(join(dest, p)), p);
    assert.throws(() => createDeck(dest), /já existe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("instalação exige Mira e preserva arquivo de configuração", () => {
  const root = mkdtempSync(join(tmpdir(), "popup-install-"));
  try {
    assert.throws(() => install(root), /Instale primeiro/);
    mkdirSync(join(root, ".mira"));
    writeFileSync(join(root, "mira.config.json"), "{}");
    writeFileSync(
      join(root, ".mira/state.json"),
      JSON.stringify({
        version: "0.1.69",
        skillsDirs: [".claude/skills"],
        agents: [],
      }),
    );
    install(root);
    assert.equal(readFileSync(join(root, "mira.config.json"), "utf8"), "{}");
    assert.ok(existsSync(join(root, ".claude/skills/alves-pop-up/SKILL.md")));
    assert.ok(
      existsSync(join(root, ".mira/extensions/alves-pop-up/engine/pop-up.mjs")),
    );
    assert.throws(() => install(root), /já existe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
