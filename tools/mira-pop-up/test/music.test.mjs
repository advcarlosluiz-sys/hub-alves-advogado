import test from "node:test";
import assert from "node:assert/strict";
import { musicGainAt, validateMusic } from "../engine/music.mjs";
const m = {
  file: "assets/musica/gaitole.mp3",
  volume: 0.18,
  duckVolume: 0.035,
  attack: 0.35,
  release: 0.7,
  fadeIn: 1,
  fadeOut: 2,
};
const clips = [
  { offset: 2, duration: 7.224 },
  { offset: 14, duration: 7.992 },
];
test("música recua antes da fala, mantém volume reduzido e retorna gradualmente", () => {
  assert.equal(musicGainAt(1.4, clips, m, 48), 0.18);
  assert.ok(musicGainAt(1.8, clips, m, 48) < 0.18);
  assert.equal(musicGainAt(3, clips, m, 48), 0.035);
  assert.ok(musicGainAt(9.5, clips, m, 48) > 0.035);
  assert.equal(musicGainAt(10.5, clips, m, 48), 0.18);
  assert.equal(musicGainAt(0, clips, m, 48), 0);
  assert.equal(musicGainAt(48, clips, m, 48), 0);
  assert.equal(musicGainAt(47, clips, m, 48), 0.09);
});
test("recusa música externa e volume de fala acima do volume de fundo", () => {
  assert.throws(() =>
    validateMusic({ ...m, file: "https://externo/musica.mp3" }),
  );
  assert.throws(() => validateMusic({ ...m, duckVolume: 0.5 }));
});
