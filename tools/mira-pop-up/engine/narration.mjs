import { totalDuration } from "./end-card.mjs";
import { validateMusic, musicGainAt } from "./music.mjs";
export async function narrationHash(text, voice, rate, pitch) {
  const bytes = new TextEncoder().encode([text, voice, rate, pitch].join("|"));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function loadNarration(story, base = location.href) {
  if (!story.narration) return null;
  const config = story.narration;
  const manifestUrl = new URL(config.manifest, base);
  if (manifestUrl.origin !== location.origin)
    throw Error("O áudio deve estar no projeto local");
  const r = await fetch(manifestUrl);
  if (!r.ok)
    throw Error(
      "Voz Thalita ainda não gerada. Execute GERAR-VOZ-THALITA e reabra o livro.",
    );
  const manifest = await r.json();
  if (
    manifest.voice !== config.voice ||
    manifest.clips?.length !== story.scenes.length ||
    manifest.duration !== story.duration
  )
    throw Error("Narração desatualizada; gere a voz novamente");
  const rate = 48000,
    frames = Math.ceil(totalDuration(story) * rate);
  const offline = new OfflineAudioContext(2, frames, rate);
  let start = 0;
  for (const scene of story.scenes) {
    const clip = manifest.clips.find((c) => c.scene === scene.id);
    if (
      !clip ||
      !Number.isFinite(clip.offset) ||
      Math.abs(clip.offset - (start + 2)) > 0.01 ||
      !Number.isFinite(clip.duration) ||
      clip.duration <= 0 ||
      clip.offset + clip.duration > start + scene.duration - 0.5
    )
      throw Error("Tempo de narração inválido em " + scene.id);
    const hash = await narrationHash(
      scene.caption,
      config.voice,
      config.rate,
      config.pitch,
    );
    if (clip.hash !== hash)
      throw Error("Texto ou voz mudou; gere a narração novamente");
    if (!/^assets\/narracao\/[a-zA-Z0-9_-]+\.(mp3|wav)$/.test(clip.file))
      throw Error("Arquivo de narração inválido");
    const url = new URL(clip.file, base);
    if (url.origin !== location.origin)
      throw Error("Áudio externo não permitido");
    const audio = await fetch(url);
    if (!audio.ok) throw Error("Arquivo de voz ausente: " + clip.file);
    const decoded = await offline.decodeAudioData(await audio.arrayBuffer());
    if (Math.abs(decoded.duration - clip.duration) > 0.2)
      throw Error("Duração do áudio não corresponde ao manifesto");
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(clip.offset);
    start += scene.duration;
  }
  const buffer = await offline.startRendering();
  if (story.music) {
    const music = validateMusic(story.music),
      url = new URL(music.file, base);
    if (url.origin !== location.origin)
      throw Error("Música externa não permitida");
    const response = await fetch(url);
    if (!response.ok) throw Error("Arquivo de música ausente");
    const decoded = await offline.decodeAudioData(await response.arrayBuffer());
    if (!decoded.length) throw Error("Música sem amostras");
    // A soma usa o mesmo relógio da fala; o vídeo exportado recebe essa mistura.
    const gains = new Float32Array(buffer.length);
    for (let i = 0; i < gains.length; i++)
      gains[i] = musicGainAt(
        i / rate,
        manifest.clips,
        music,
        totalDuration(story),
      );
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const dest = buffer.getChannelData(channel),
        source = decoded.getChannelData(
          Math.min(channel, decoded.numberOfChannels - 1),
        );
      for (let i = 0; i < dest.length; i++)
        dest[i] += source[i % source.length] * gains[i];
    }
  }
  return { buffer, manifest };
}
export function createNarrator(story) {
  let ready = loadNarration(story);
  ready.catch(() => {});
  let ctx,
    source,
    origin = 0,
    enabled = false,
    revision = 0;
  return {
    async getAudio() {
      const result = await ready;
      return result?.buffer || null;
    },
    async enable() {
      const result = await ready;
      if (!result) throw Error("Este roteiro não tem narração configurada");
      ctx ??= new AudioContext();
      await ctx.resume();
      enabled = true;
      return result.manifest.voice;
    },
    disable() {
      enabled = false;
      this.pause();
    },
    pause() {
      revision++;
      if (source) {
        source.stop();
        source = null;
      }
    },
    sync(time, playing) {
      if (!enabled || !ctx) return;
      if (!playing || time >= totalDuration(story)) {
        this.pause();
        return;
      }
      const drift = ctx.currentTime - origin - time;
      if (!source || Math.abs(drift) > 0.18) {
        this.pause();
        const token = revision;
        ready
          .then((result) => {
            if (!enabled || !result || source || token !== revision) return;
            const current = ctx.createBufferSource();
            source = current;
            source.buffer = result.buffer;
            source.connect(ctx.destination);
            source.start(0, Math.max(0, time));
            origin = ctx.currentTime - time;
            source.onended = () => {
              if (source === current) source = null;
            };
          })
          .catch(() => {});
      }
    },
    get enabled() {
      return enabled;
    },
    get configured() {
      return !!story.narration;
    },
  };
}
