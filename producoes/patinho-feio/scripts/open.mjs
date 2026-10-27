import { spawn } from "node:child_process";
import { startServer } from "./serve.mjs";
const server = await startServer(undefined, 0);
const url = "http://127.0.0.1:" + server.address().port;
const command =
  process.platform === "win32"
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];
const child = spawn(command[0], command[1], { stdio: "ignore" });
child.on("error", () => console.log("Abra no navegador: " + url));
child.unref();
console.log(
  "Livro aberto. Mantenha esta janela aberta enquanto usar a apresentação.\nPara gerar o vídeo, clique em Exportar MP4 no navegador.\nPara encerrar, feche esta janela.",
);
