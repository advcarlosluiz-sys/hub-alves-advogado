// Mesma voz e cadência do mira-history. Não substitui Thalita por outra voz.
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./create.mjs";
import { mp3Duration } from "./mp3-duration.mjs";
const args = process.argv.slice(2),
  at = args.indexOf("--deck"),
  root = resolve(at < 0 ? ROOT : args[at + 1]),
  python =
    process.env.POPUP_PYTHON ||
    (process.platform === "win32" ? "python" : "python3");
function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, { stdio: "inherit", ...options });
  if (result.status !== 0)
    throw Error(
      command +
        " falhou. Verifique a instalação do Python e o acesso a speech.platform.bing.com. Nenhuma voz alternativa será usada.",
    );
}
try {
  const path = join(root, "stories/joao.json"),
    story = JSON.parse(readFileSync(path, "utf8")),
    voice = story.narration?.voice || "pt-BR-ThalitaMultilingualNeural",
    rate = story.narration?.rate || "-12%",
    pitch = story.narration?.pitch || "-4Hz";
  const venv = join(root, ".tts-venv"),
    exe = join(
      venv,
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  if (!existsSync(exe)) run(python, ["-m", "venv", venv]);
  if (
    spawnSync(
      exe,
      [
        "-c",
        'import importlib.metadata; assert importlib.metadata.version("edge-tts")=="7.3.1"',
      ],
      { stdio: "ignore" },
    ).status !== 0
  )
    run(exe, [
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      "edge-tts==7.3.1",
    ]);
  const dir = join(root, "assets/narracao");
  mkdirSync(dir, { recursive: true });
  const clips = [];
  let start = 0;
  for (const s of story.scenes) {
    if (!/^[a-zA-Z0-9_-]+$/.test(s.id)) throw Error("ID de cena inválido");
    const text = s.caption,
      hash = createHash("sha256")
        .update([text, voice, rate, pitch].join("|"))
        .digest("hex"),
      file = "assets/narracao/" + s.id + "-" + hash.slice(0, 12) + ".mp3",
      dest = join(root, file);
    if (!existsSync(dest)) {
      const temp = dest + ".partial";
      rmSync(temp, { force: true });
      for (let attempt=1; attempt<=3; attempt++) {
        try {
          run(exe, [
        join(root, "scripts/edge-voice.py"),
        "--voice",
        voice,
        "--rate=" + rate,
        "--pitch=" + pitch,
        "--text",
        text,
        "--write-media",
        temp,
        "--write-subtitles",
        dest + ".srt",
      ]);
          if (mp3Duration(readFileSync(temp)) <= 0) throw Error("Áudio vazio");
          break;
        } catch (error) {
          rmSync(temp, {force:true});
          if (attempt===3) throw error;
          console.log("Nova tentativa de síntese: " + s.id);
        }
      }
      const measured = mp3Duration(readFileSync(temp));
      if (measured <= 0) throw Error("Áudio inválido recebido para " + s.id);
      renameSync(temp, dest);
    }
    const duration = mp3Duration(readFileSync(dest));
    if (duration <= 0) throw Error("Áudio inválido: " + file);
    s.duration = Math.max(s.duration, Math.ceil(duration + 2.9));
    clips.push({ scene: s.id, file, offset: start + 2, duration, hash });
    start += s.duration;
    console.log("Voz Thalita: " + s.id + " · " + duration.toFixed(2) + " s");
  }
  story.duration = start;
  story.narration = {
    voice,
    rate,
    pitch,
    manifest: "assets/narracao/manifest.json",
    required: true,
  };
  writeFileSync(path, JSON.stringify(story, null, 2) + "\n");
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify(
      { version: 1, voice, rate, pitch, duration: start, clips },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Narração Thalita pt-BR gerada. Abra o livro e exporte o MP4; salve o ZIP para guardar também os áudios.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
