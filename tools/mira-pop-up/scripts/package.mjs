// Use the Mira CLI to build the prompt-only .mplug. The complete distribution
// is a ZIP because the runtime is executable and must not go inside a .mplug.
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./create.mjs";
const temp = mkdtempSync(join(tmpdir(), "alves-pack-"));
try {
  cpSync(join(ROOT, "plugin/alves-pop-up"), join(temp, "alves-pop-up"), {
    recursive: true,
  });
  mkdirSync(join(ROOT, "dist"), { recursive: true });
  execFileSync(
    "tar",
    ["-czf", join(ROOT, "dist/alves-pop-up-0.1.0.mplug"), "alves-pop-up"],
    { cwd: temp, stdio: "inherit" },
  );
  console.log(
    "Agente prompt-only empacotado. O motor é distribuído separadamente no ZIP.",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
