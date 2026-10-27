// ZIP portátil: apenas Node.js, sem npm, Python, tar ou ferramentas externas.
import {
  readFileSync,
  readdirSync,
  lstatSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { resolve, join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { ROOT } from "./create.mjs";
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const excluded = new Set([
  "node_modules",
  ".tts-venv",
  ".git",
  "dist",
  ".aws",
  ".codex",
  ".agents",
]);
const secretName = (name) =>
  /^\.env(?:\.|$)/i.test(name) ||
  /^(?:credentials|id_rsa|id_ed25519)(?:\.|$)/i.test(name) ||
  /\.(?:pem|key|p12|pfx)$/i.test(name);
export function collectFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (excluded.has(entry.name) || secretName(entry.name) || /\.partial(?:\.|$)/i.test(entry.name)) continue;
      const path = join(dir, entry.name);
      if (lstatSync(path).isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  walk(root);
  return files;
}
export function packageZip(root = ROOT, destination, mediaOnly = false) {
  root = resolve(root);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  destination = resolve(
    destination ||
      join(root, "dist", "alves-pop-up-completo-" + stamp + ".zip"),
  );
  if (existsSync(destination))
    throw Error("Arquivo de destino já existe; escolha outro nome");
  const locals = [],
    central = [];
  let offset = 0;
  const allFiles = collectFiles(root);
  let slug = "joao-pop-up";
  try {
    slug =
      JSON.parse(readFileSync(join(root, "stories/joao.json"), "utf8")).slug ||
      slug;
  } catch {}
  const canonical = existsSync(join(root, "docs", slug + ".mp4"))
    ? join(root, "docs", slug + ".mp4")
    : join(root, "docs/joao-pop-up.mp4");
  const mediaVideo = [
    ...(existsSync(canonical) ? [canonical] : []),
    ...allFiles.filter((p) =>
      /^output\/.*\.mp4$/i.test(relative(root, p).split("\\").join("/")),
    ),
  ].sort((a, b) => lstatSync(b).mtimeMs - lstatSync(a).mtimeMs)[0];
  if (mediaOnly && !mediaVideo)
    throw Error("Exporte um MP4 para output antes de criar o ZIP de mídia");
  const files = allFiles.filter((p) => {
    if (resolve(p) === destination) return false;
    if (!mediaOnly) return true;
    const name = relative(root, p).split("\\").join("/");
    return (
      p === mediaVideo ||
      name === "COMECE-AQUI-VIDEO.txt" ||
      /^assets\/(narracao|musica|efeitos)\/[a-zA-Z0-9_-]+\.(mp3|wav|srt|json|txt)$/.test(name)
    );
  });
  if (files.length > 65535)
    throw Error("Número de arquivos excede ZIP clássico");
  for (const path of files) {
    const name = Buffer.from(
      "alves-pop-up/" +
        (mediaOnly && path === mediaVideo
          ? "ASSISTA-AQUI.mp4"
          : relative(root, path).split("\\").join("/")),
    );
    const data = readFileSync(path),
      compressed = deflateRawSync(data),
      crc = crc32(data);
    if (data.length > 0xffffffff)
      throw Error("Arquivo grande demais para ZIP clássico");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    locals.push(header, name, compressed);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(33, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compressed.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    if (path.endsWith(".command")) {
      ch.writeUInt16LE(0x0314, 4);
      ch.writeUInt32LE((0o100755 * 65536) >>> 0, 38);
    }
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += header.length + name.length + compressed.length;
    if (offset > 0xffffffff) throw Error("Pacote excede ZIP clássico");
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  mkdirSync(resolve(destination, ".."), { recursive: true });
  writeFileSync(destination, Buffer.concat([...locals, directory, end]), {
    flag: "wx",
  });
  return { path: destination, files: files.length };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2),
      i = args.indexOf("--out"),
      d = args.indexOf("--deck");
    const result = packageZip(
      d < 0 ? ROOT : args[d + 1],
      i < 0 ? undefined : args[i + 1],
      args.includes("--media"),
    );
    console.log(
      "Projeto completo salvo em:\n" +
        result.path +
        "\n" +
        result.files +
        " arquivos.",
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
