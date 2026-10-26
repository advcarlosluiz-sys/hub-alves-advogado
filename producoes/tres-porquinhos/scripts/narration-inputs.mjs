import { validateMusic, musicVolumeExpression } from "../engine/music.mjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { createHash } from "node:crypto";
export function narrationInputs(root, duration) {
  const story = JSON.parse(
    readFileSync(join(root, "stories/joao.json"), "utf8"),
  );
  if (!story.narration) return [];
  const config = story.narration;
  const path = join(root, "assets/narracao/manifest.json");
  if (!existsSync(path))
    throw Error(
      "Voz Thalita ainda não gerada. Execute GERAR-VOZ-THALITA antes de exportar.",
    );
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (
    manifest.voice !== config.voice ||
    manifest.duration !== story.duration ||
    manifest.clips?.length !== story.scenes.length
  )
    throw Error("Narração desatualizada");
  const inputs = [],
    filters = [];
  let start = 0;
  for (const s of story.scenes) {
    const c = manifest.clips.find((c) => c.scene === s.id);
    const hash = createHash("sha256")
      .update([s.caption, config.voice, config.rate, config.pitch].join("|"))
      .digest("hex");
    if (
      !c ||
      c.hash !== hash ||
      !Number.isFinite(c.duration) ||
      c.duration <= 0 ||
      !Number.isFinite(c.offset) ||
      Math.abs(c.offset - start - 2) > 0.01 ||
      c.offset + c.duration > start + s.duration - 0.5 ||
      !/^assets\/narracao\/[a-zA-Z0-9_-]+\.(mp3|wav)$/.test(c.file)
    )
      throw Error("Áudio ou texto inválido em " + s.id);
    const file = resolve(root, c.file);
    if (!file.startsWith(resolve(root) + sep) || !existsSync(file))
      throw Error("Arquivo de voz ausente");
    inputs.push("-i", file);
    filters.push(
      `[${inputs.length / 2}:a]adelay=${Math.round(c.offset * 1000)}:all=1[voz${filters.length}]`,
    );
    start += s.duration;
  }
  const labels = filters.map((_, i) => `[voz${i}]`).join("");
  let combined =
    filters.join(";") +
    ";" +
    labels +
    `amix=inputs=${filters.length}:normalize=0,apad,atrim=duration=${duration}[narracao]`;
  if (story.music) {
    const music = validateMusic(story.music),
      file = resolve(root, music.file);
    if (!file.startsWith(resolve(root) + sep) || !existsSync(file))
      throw Error("Arquivo de música ausente");
    const musicIndex = inputs.length / 2 + 1;
    inputs.push("-stream_loop", "-1", "-i", file);
    const voice = combined.replace(/\[narracao\]$/, "[vozMixRaw]");
    combined =
      voice +
      `;[vozMixRaw]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[vozMix];[${musicIndex}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS,volume='${musicVolumeExpression(manifest.clips, music, duration)}':eval=frame[musica];[vozMix][musica]amix=inputs=2:normalize=0,atrim=duration=${duration}[narracao]`;
  }

  return [
    ...inputs,
    "-filter_complex",
    combined,
    "-map",
    "0:v:0",
    "-map",
    "[narracao]",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
  ];
}
