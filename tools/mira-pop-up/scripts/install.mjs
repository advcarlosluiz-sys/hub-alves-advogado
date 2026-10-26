import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./create.mjs";
export function install(project) {
  const dest = resolve(project);
  if (
    !existsSync(join(dest, "mira.config.json")) ||
    !existsSync(join(dest, ".mira/state.json"))
  )
    throw Error(
      "Instale primeiro o Mira nessa pasta: npx mira-animator install",
    );
  const state = JSON.parse(
    readFileSync(join(dest, ".mira/state.json"), "utf8"),
  );
  if (!(state.skillsDirs || []).length)
    throw Error("Mira sem diretórios de skills configurados");
  for (const dir of state.skillsDirs) {
    const p = resolve(dest, dir);
    if (!p.startsWith(dest + sep))
      throw Error("Diretório de skills fora do projeto");
  }
  const runtime = join(dest, ".mira/extensions/alves-pop-up"),
    plugin = join(dest, "mira-plugins/alves-pop-up");
  if (existsSync(runtime) || existsSync(plugin))
    throw Error("Extensão já existe; preserve a instalação antes de atualizar");
  for (const d of state.skillsDirs)
    if (existsSync(join(dest, d, "alves-pop-up")))
      throw Error("Skill já existe; instalação preservada");
  mkdirSync(runtime, { recursive: true });
  for (const item of [
    "index.html",
    "engine",
    "assets",
    "vendor",
    "stories",
    "scripts",
    "package.json",
    "package-lock.json",
    "LICENSE-MIRA",
    "plugin",
    "COMECE-AQUI.txt",
    "README.md",
    "ABRIR-LIVRO.cmd",
    "ABRIR-LIVRO.command",
    "SALVAR-TUDO-ZIP.cmd",
    "SALVAR-TUDO-ZIP.command",
    "EXPORTAR-MP4.cmd",
  ])
    cpSync(join(ROOT, item), join(runtime, item), { recursive: true });
  mkdirSync(dirname(plugin), { recursive: true });
  cpSync(join(ROOT, "plugin/alves-pop-up"), plugin, { recursive: true });
  for (const d of state.skillsDirs) {
    const target = join(dest, d, "alves-pop-up");
    if (existsSync(target)) throw Error("Skill já existe: " + target);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(plugin, target, { recursive: true });
  }
  return runtime;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (!process.argv[2])
      throw Error("Uso: node scripts/install.mjs /caminho/do/projeto-mira");
    console.log(install(process.argv[2]));
    console.log(
      "Execute npx mira-animator plugin sync e abra nova sessão: /alves-pop-up",
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
