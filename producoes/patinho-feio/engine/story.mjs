import { MOTIONS } from "./actor-motion.mjs";
export const ASSETS = Object.freeze([
  "joao",
  "mae",
  "casa",
  "vila",
  "colinas",
  "nuvem",
  "vaca",
  "castelo",
  "gigante",
  "galinha",
  "feijao",
  "folha",
  "porquinho_palha",
  "porquinho_madeira",
  "porquinho_tijolos",
  "lobo",
  "casa_palha",
  "casa_madeira",
  "casa_tijolos",
  "arvore",
  "vento",
  "pata", "patinho_amarelo", "patinho_cinza", "cisne",
  "celeiro", "arvore_verde", "arvore_outono", "arvore_inverno",
]);
export function validateStory(story) {
  if (
    !story ||
    typeof story.title !== "string" ||
    !story.title.trim() ||
    !Array.isArray(story.scenes) ||
    !story.scenes.length
  )
    throw Error("Roteiro precisa de título e cenas");
  if (
    story.endCard &&
    (!Number.isFinite(story.endCard.duration) ||
      story.endCard.duration < 3 ||
      story.endCard.duration > 15 ||
      typeof story.endCard.youtube?.name !== "string" ||
      typeof story.endCard.youtube?.handle !== "string" ||
      typeof story.endCard.tiktok?.handle !== "string")
  )
    throw Error("Tela final inválida");
  const ids = new Set();
  let duration = 0;
  for (const s of story.scenes) {
    if (!s.id || ids.has(s.id))
      throw Error("Identificador de cena ausente ou repetido");
    ids.add(s.id);
    if (!Number.isFinite(s.duration) || s.duration < 3 || s.duration > 120)
      throw Error("Duração de cena inválida");
    if (typeof s.caption !== "string") throw Error("Legenda ausente");
    for (const key of ["from", "to", "target"])
      if (
        !Array.isArray(s.camera?.[key]) ||
        s.camera[key].length !== 3 ||
        !s.camera[key].every(Number.isFinite)
      )
        throw Error("Câmera inválida");
    if (!Array.isArray(s.actors) || s.actors.length > 60)
      throw Error("Atores inválidos");
    for (const a of s.actors) {
      if (a.motion) {
        if (!MOTIONS.includes(a.motion.type))
          throw Error("Movimento desconhecido");
        if (
          !Number.isFinite(a.motion.start) ||
          !Number.isFinite(a.motion.end) ||
          a.motion.start < 0 ||
          a.motion.end <= a.motion.start
        )
          throw Error("Intervalo de movimento inválido");
        for (const field of ["dx", "dy"])
          if (
            a.motion[field] !== undefined &&
            !Number.isFinite(a.motion[field])
          )
            throw Error("Deslocamento inválido");
      }

      if (!ASSETS.includes(a.asset))
        throw Error("Asset desconhecido: " + a.asset);
      for (const k of ["x", "z", "width", "height"])
        if (!Number.isFinite(a[k])) throw Error("Dimensão/posição inválida");
      if (a.width <= 0 || a.height <= 0 || a.width > 25 || a.height > 25)
        throw Error("Dimensão fora dos limites");
      for (const k of ["y", "walk", "enter"])
        if (a[k] !== undefined && !Number.isFinite(a[k]))
          throw Error("Parâmetro de ator inválido");
    }
    duration += s.duration;
  }
  if (
    !Number.isFinite(story.duration) ||
    Math.abs(duration - story.duration) > 0.001
  )
    throw Error("Duração total difere da soma das cenas");
  return story;
}
export function locateScene(story, time) {
  const t = Math.min(story.duration, Math.max(0, Number(time) || 0));
  let start = 0;
  for (let index = 0; index < story.scenes.length; index++) {
    const scene = story.scenes[index];
    if (t < start + scene.duration || index === story.scenes.length - 1)
      return { index, scene, local: t - start, start, time: t };
    start += scene.duration;
  }
}

export const ASSET_FILES = {
  porquinho_palha: {
    file: "assets/porquinhos/personagens.png",
    cell: 0,
    columns: 4,
  },
  porquinho_madeira: {
    file: "assets/porquinhos/personagens.png",
    cell: 1,
    columns: 4,
  },
  porquinho_tijolos: {
    file: "assets/porquinhos/personagens.png",
    cell: 2,
    columns: 4,
  },
  lobo: { file: "assets/porquinhos/personagens.png", cell: 3, columns: 4 },
  casa_palha: { file: "assets/porquinhos/casas.png", cell: 0, columns: 4 },
  casa_madeira: { file: "assets/porquinhos/casas.png", cell: 1, columns: 4 },
  casa_tijolos: { file: "assets/porquinhos/casas.png", cell: 2, columns: 4 },
  arvore: { file: "assets/porquinhos/casas.png", cell: 3, columns: 4 },
};

Object.assign(ASSET_FILES, Object.fromEntries(["pata", "patinho_amarelo", "patinho_cinza", "cisne"].map((name, cell) => [name, {file: "assets/patinho/personagens.png", cell, columns: 4}])));
Object.assign(ASSET_FILES, Object.fromEntries(["celeiro", "arvore_verde", "arvore_outono", "arvore_inverno"].map((name, cell) => [name, {file: "assets/patinho/cenarios.png", cell, columns: 4}])));
