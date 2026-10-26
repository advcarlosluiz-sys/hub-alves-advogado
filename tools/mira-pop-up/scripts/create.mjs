import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStory } from "../engine/story.mjs";
export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export function createDeck(
  destination,
  storyFile = join(ROOT, "stories/joao.json"),
) {
  const dest = resolve(destination);
  if (existsSync(dest)) throw Error("Destino já existe: " + dest);
  const story = validateStory(JSON.parse(readFileSync(storyFile, "utf8")));
  mkdirSync(dest, { recursive: true });
  for (const path of [
    "index.html",
    "engine",
    "assets",
    "vendor",
    "stories",
    "scripts/serve.mjs",
  ]) {
    mkdirSync(resolve(dest, path, ".."), { recursive: true });
    cpSync(join(ROOT, path), join(dest, path), { recursive: true });
  }
  writeFileSync(
    join(dest, "stories/joao.json"),
    JSON.stringify(story, null, 2) + "\n",
  );
  mkdirSync(join(dest, "references"));
  return dest;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (!args[0])
      throw Error(
        "Uso: node scripts/create.mjs decks/nome [--story roteiro.json]",
      );
    const i = args.indexOf("--story");
    console.log(createDeck(args[0], i < 0 ? undefined : args[i + 1]));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
