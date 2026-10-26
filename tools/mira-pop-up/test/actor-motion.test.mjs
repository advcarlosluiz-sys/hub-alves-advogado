import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyActorMotion } from "../engine/actor-motion.mjs";
import { validateStory } from "../engine/story.mjs";
function pivot() {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1 },
    children: [],
    userData: {},
  };
}
test("corrida leva o personagem ao destino e retorna ao início quando o tempo recua", () => {
  const p = pivot(),
    a = { x: -1, y: 0.025, motion: { type: "run", start: 2, end: 8, dx: 4 } };
  applyActorMotion(p, a, 8);
  assert.equal(p.position.x, 3);
  applyActorMotion(p, a, 2);
  assert.equal(p.position.x, -1);
});
test("casas em peças se erguem e se deitam na página durante a destruição", () => {
  const p = pivot();
  const piece = {
    position: {
      set(x, y, z) {
        Object.assign(this, { x, y, z });
      },
    },
    rotation: {
      set(x, y, z) {
        Object.assign(this, { x, y, z });
      },
    },
    scale: {
      set(x, y, z) {
        Object.assign(this, { x, y, z });
      },
    },
    userData: { base: { x: 0, y: 1, z: 0, row: 1, h: 1 } },
  };
  p.userData.pieces = [piece];
  applyActorMotion(p, { motion: { type: "build", start: 2, end: 10 } }, 0);
  assert.equal(piece.visible, false);
  applyActorMotion(p, { motion: { type: "build", start: 2, end: 10 } }, 12);
  assert.equal(piece.visible, true);
  assert.equal(piece.scale.y, 1);
  applyActorMotion(p, { motion: { type: "destroy", start: 8, end: 12 } }, 12);
  assert.equal(piece.rotation.x, -Math.PI / 2);
  assert.ok(piece.position.y < 0.1);
});
test("roteiro dos porquinhos registra dez cenas e apenas movimentos conhecidos", () => {
  const story = JSON.parse(
    readFileSync(new URL("../stories/tres-porquinhos.json", import.meta.url)),
  );
  assert.equal(validateStory(story).scenes.length, 10);
  assert.equal(story.duration + story.endCard.duration, 181);
  story.scenes[0].actors[0].motion = { type: "nao-existe", start: 1, end: 2 };
  assert.throws(() => validateStory(story), /Movimento desconhecido/);
});
