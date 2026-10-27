// Envelope comum ao navegador e ao renderizador FFmpeg.
export function validateMusic(music) {
  if (!music) return null;
  if (!/^assets\/musica\/[a-zA-Z0-9_-]+\.(mp3|wav)$/.test(music.file))
    throw Error("Arquivo de música inválido");
  for (const key of [
    "volume",
    "duckVolume",
    "attack",
    "release",
    "fadeIn",
    "fadeOut",
  ])
    if (!Number.isFinite(music[key]) || music[key] < 0)
      throw Error("Parâmetro de música inválido: " + key);
  if (
    music.volume > 1 ||
    music.duckVolume > music.volume ||
    music.attack <= 0 ||
    music.release <= 0 ||
    music.fadeIn <= 0 ||
    music.fadeOut <= 0
  )
    throw Error("Volume ou transição da música inválido");
  return music;
}
const clamp = (x) => Math.min(1, Math.max(0, x));
export function musicGainAt(t, clips, music, duration) {
  validateMusic(music);
  let gain = music.volume;
  for (const c of clips) {
    const end = c.offset + c.duration;
    let g = music.volume;
    if (t >= c.offset - music.attack && t < c.offset)
      g =
        music.volume +
        (music.duckVolume - music.volume) *
          clamp((t - c.offset + music.attack) / music.attack);
    else if (t >= c.offset && t <= end) g = music.duckVolume;
    else if (t > end && t < end + music.release)
      g =
        music.duckVolume +
        (music.volume - music.duckVolume) * clamp((t - end) / music.release);
    gain = Math.min(gain, g);
  }
  return gain * clamp(t / music.fadeIn) * clamp((duration - t) / music.fadeOut);
}
export function musicVolumeExpression(clips, music, duration) {
  validateMusic(music);
  let expr = String(music.volume);
  for (const c of clips) {
    const a = c.offset - music.attack,
      b = c.offset,
      e = c.offset + c.duration,
      r = e + music.release;
    const down = `${music.volume}+(${music.duckVolume}-${music.volume})*(t-${a})/${music.attack}`,
      up = `${music.duckVolume}+(${music.volume}-${music.duckVolume})*(t-${e})/${music.release}`;
    const clip = `if(lt(t,${a}),${music.volume},if(lt(t,${b}),${down},if(lt(t,${e}),${music.duckVolume},if(lt(t,${r}),${up},${music.volume}))))`;
    expr = `min(${expr},${clip})`;
  }
  return `(${expr})*min(1,max(0,t/${music.fadeIn}))*min(1,max(0,(${duration}-t)/${music.fadeOut}))`;
}
