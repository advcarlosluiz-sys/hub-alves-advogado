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
