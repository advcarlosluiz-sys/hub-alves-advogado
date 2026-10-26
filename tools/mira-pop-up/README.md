# Alves Pop-up — extensão para Mira

Contos em um livro pop-up 3D: recortes ilustrados, peças com dobradiças, chão texturizado, sombras reais, crescimento do pé de feijão, câmera e viradas de página. Primeiro conto: **João e o Pé de Feijão**, adaptação original em quatro cenas (48 segundos), mais encerramento de 6 segundos: vídeo final de 54 segundos.

![Cena renderizada pelo motor WebGL](docs/preview.png)

[Vídeo de exemplo — João e o Pé de Feijão, 54 s](docs/joao-pop-up.mp4)

## Narração Thalita — português do Brasil

Voz configurada: **pt-BR-ThalitaMultilingualNeural**, com ritmo **-12%** e tom **-4 Hz**, seguindo o padrão de contos do `mira-history`.

**Narração já incluída:** os quatro MP3s reais da Thalita foram gerados e o vídeo de 54 segundos em `docs/joao-pop-up.mp4` já contém a voz. Basta abrir o MP4. Não precisa executar o gerador de voz no Windows.

Para apenas assistir, use `dist/joao-thalita-pronto-0.1.5.zip`: contém MP4, MP3s e instruções, sem scripts executáveis. O Windows não precisa executar `.cmd`, Node ou Python para reproduzir esses arquivos de mídia.

Para alterar a história e gerar a narração novamente, siga opcionalmente os passos abaixo. Os atalhos sem assinatura podem ser bloqueados pelo Controle Inteligente de Aplicativos do Windows; mantenha a proteção e use o vídeo já pronto. A edição da ferramenta requer ambiente de desenvolvimento adequado; esta distribuição não é um aplicativo Windows assinado.

No seu computador:

1. Instale Python 3, se ainda não tiver, e mantenha Node.js instalado.
2. Com internet, dê dois cliques em **GERAR-VOZ-THALITA.cmd** (Windows) ou **GERAR-VOZ-THALITA.command** (Mac).
3. O atalho prepara um ambiente Python local e instala `edge-tts==7.3.1`. Gera um MP3 por cena e ajusta a duração das cenas se a fala precisar de mais tempo. A operação não exige chave de API nem FFmpeg.
4. Reabra o livro e clique em **Ouvir narração**. Pausa e navegação também controlam o áudio.
5. **Exportar MP4** passa a incluir a voz. O navegador prefere AAC e usa Opus dentro do MP4 se AAC não estiver disponível; para maior compatibilidade com editores, o atalho alternativo FFmpeg exporta AAC.
6. Use **SALVAR-TUDO-ZIP**: os MP3s e o manifesto gerados são incluídos, e o ambiente Python `.tts-venv` é excluído. Depois de gerada, a narração funciona localmente sem acessar o serviço de voz.

Se a voz estiver ausente ou o texto tiver mudado, a exportação avisará e não criará silenciosamente um vídeo sem narração. Não altere o manifesto para identificar outra voz como Thalita.

## Música de fundo com redução durante as falas

A faixa **Gaitolé, Gaitolé Completa (1)**, enviada pelo autor, está em `assets/musica/gaitole.mp3` e já foi incluída no MP4. A música mantém ganho 0,18 nos intervalos e cai para 0,035 durante a narração (redução adicional de aproximadamente 14 dB). A queda começa 350 ms antes da fala; a recuperação leva 700 ms. Há fade-in de 1 segundo e fade-out de 2 segundos.

O mesmo envelope é usado no navegador e no renderizador FFmpeg. O botão **Ouvir narração** reproduz a mistura com música; **Exportar MP4** inclui os dois. A configuração fica em `music` no roteiro. O ZIP de mídia e o pacote completo incluem a faixa original. Não é necessário gerar novamente a voz para mudar os volumes da música.

## Encerramento do canal

O vídeo termina com seis segundos de tela da marca **Contos de Gaitolé**, YouTube **@gaitolé**, TikTok **@gaitole0** e a chamada **Inscreva-se e ative o sininho!**. A música continua e termina suavemente.

A configuração está em `endCard`, no roteiro, e o compositor em `engine/end-card.mjs`. O navegador e a exportação MP4 desenham o mesmo encerramento. A arte de fundo foi composta a partir da imagem da marca enviada pelo autor; os textos dos perfis são renderizados pelo código para preservar a grafia. Prévia: `docs/encerramento.png`.

## Começar sem comandos

1. Baixe o pacote completo ZIP e **extraia tudo** para uma pasta local.
2. Abra **COMECE-AQUI.txt**. O vídeo narrado já pronto está em `docs/joao-pop-up.mp4`.
3. No Windows, dê dois cliques em **ABRIR-LIVRO.cmd**; no macOS, em **ABRIR-LIVRO.command**. Requer Node.js LTS 22+ instalado uma vez.
4. No navegador Chrome/Edge, clique em **Exportar MP4**. O vídeo é codificado pelo navegador com WebCodecs e pelo muxer distribuído pelo Mira, sem FFmpeg nem npm. É necessário suporte H.264; o computador pode levar alguns minutos. O navegador salva em Downloads ou no local escolhido.
5. Para guardar o projeto completo, use **SALVAR-TUDO-ZIP.cmd** ou **SALVAR-TUDO-ZIP.command**. O pacote vai para `dist/`, com data e hora. Copie vídeos baixados para `output/` antes, caso queira incluí-los no ZIP.

O pacote usa um servidor local para executar o livro; a integração com o assistente Mira segue abaixo. A exportação pelo navegador não adiciona um botão ao programa de terceiros: o botão fica na apresentação produzida pela extensão.

## Salvar tudo em ZIP automaticamente

```sh
npm run zip
# Somente vídeo, áudio e instruções, sem executáveis:
node scripts/package.mjs --media
# Um deck específico:
node scripts/package.mjs --deck /caminho/decks/meu-conto
```

Não exige Python, tar nem npm para o empacotamento: `node scripts/package.mjs` basta. Inclui código, bibliotecas, arte, roteiro, atalhos e vídeos locais. Exclui `node_modules`, `.git`, `dist`, arquivos `.env` e formatos comuns de chave privada. Não apaga pacotes anteriores. O agente `/alves-pop-up` foi orientado a entregar um ZIP completo em cada geração.

## O que acrescenta ao Mira

- Motor Three.js de palco tridimensional: livro, camadas, sombras e câmera em perspectiva.
- GSAP para a sequência de crescimento; tempo determinístico para exportação.
- Roteiro JSON validado, com câmera, personagens e legenda por cena.
- Agente `/alves-pop-up`, compatível com os plugins do Mira 0.1.69.
- Criação de decks autocontidos e renderização MP4 por Chromium + FFmpeg.

As cópias de **Three.js 0.160.0 e GSAP 3.13.0 são as distribuídas pelo Mira**, não dependências via CDN. A extensão usa o mecanismo oficial de agentes do Mira. Não é uma alteração oficial publicada pelo Sandeco nem uma nova versão do pacote npm `mira-animator`. Nenhuma parte do site de advocacia foi modificada.

## Experimentar o conto

Pré-requisitos: Node.js 22+, Chrome/Chromium com WebGL. Para assistir no navegador não precisa instalar pacotes:

```sh
cd tools/mira-pop-up
npm start
```

Abra `http://127.0.0.1:8137` no seu computador. O processo precisa continuar aberto. Não abra por `file://`: os módulos ES e o roteiro exigem HTTP local. A reprodução não acessa serviços externos. Pausar, recomeçar e percorrer a linha do tempo estão disponíveis.

## Instalar na sua pasta do Mira

Na pasta de trabalho das apresentações, com Mira já instalado por `npx mira-animator install`, execute o instalador desta extensão:

```sh
node /caminho/hub-alves-advogado/tools/mira-pop-up/scripts/install.mjs /caminho/minhas-apresentacoes
cd /caminho/minhas-apresentacoes
npx mira-animator plugin sync
```

Abra uma nova sessão do seu assistente e use **`/alves-pop-up`** (no Codex, mencione `alves-pop-up`). Exemplo: “Crie um vídeo de João e o Pé de Feijão em livro pop-up”.

O instalador acrescenta o motor em `.mira/extensions/alves-pop-up/`, o plugin em `mira-plugins/alves-pop-up/` e a skill nos diretórios configurados pelo Mira. Preserva a configuração do Mira e recusa sobrescrever uma instalação existente. O comando `plugin sync` registra a extensão no estado oficial do Mira. Para atualizar, preserve seus arquivos e remova somente a instalação anterior desta extensão antes de reinstalar.

**Formato da extensão:** `dist/alves-pop-up-0.1.5.mplug` contém apenas o agente. Isso respeita a restrição oficial de plugins `prompt-only`; um `.mplug` não pode incluir JavaScript. Portanto instale o motor pelo procedimento acima. O pacote completo é `dist/alves-pop-up-0.1.5.zip`, com o motor, agente, arte e scripts. Ao usar o ZIP, descompacte e execute os comandos dentro da pasta `alves-pop-up/` (equivalente a `tools/mira-pop-up/` no repositório). Instalar apenas o `.mplug` não basta para renderizar.

## Gerar outra apresentação

```sh
node scripts/create.mjs /caminho/minhas-apresentacoes/decks/joao-pop-up
# Ou um roteiro próprio compatível com o vocabulário atual:
node scripts/create.mjs /caminho/decks/meu-conto --story /caminho/roteiro.json
```

O arquivo `stories/joao.json` exemplifica o formato. O contrato está em `plugin/alves-pop-up/references/roteiro.md`. Para novos personagens e ações, é necessário ampliar a biblioteca e o motor: esta versão não converte arbitrariamente qualquer conto em arte inédita. As peças são planos ilustrados em espaço 3D; não são personagens volumétricos nem uma simulação física de dobraduras.

## Exportar MP4

Instale FFmpeg e Chrome/Chromium no computador. Instale as dependências desta extensão:

```sh
npm ci
npm run render
# Exportar um deck criado em outra pasta:
npm run render -- --deck /caminho/decks/joao-pop-up --out /caminho/video.mp4
```

O atalho **EXPORTAR-MP4.cmd** automatiza a instalação das dependências npm e este procedimento alternativo, caso FFmpeg e Chrome/Edge já estejam instalados.

Saída padrão: `output/joao-pop-up.mp4`, 1280×720, H.264, 24 fps. O renderizador inicia e encerra seu próprio servidor local. `CHROME_PATH` e `FFMPEG_PATH` permitem indicar executáveis instalados, inclusive no Windows. Caso o ambiente de execução em contêiner exija, `POPUP_NO_SANDBOX=1` é um opt-in explícito para Chromium; não é necessário no uso normal. `--preview` gera uma imagem; `--duration 3` permite um teste curto. Renderizar por software pode levar vários minutos.

**Áudio:** a versão 0.1.5 inclui geração de narração Thalita; os MP3s deste conto já estão incluídos; alterações de texto exigem gerar novamente. A música Gaitolé, Gaitolé Completa (1) acompanha o conto e diminui durante as falas. Não precisa de chave de IA para executar o exemplo. Gerar ou dirigir novos roteiros com a skill depende do assistente usado no Mira.

## Validação

```sh
npm test
npm run test:browser
```

Testes de contrato e criação/instalação; teste real de quatro cenas no Chromium com WebGL, quadros distintos, retorno determinístico ao mesmo instante e ausência de requisições externas. Também foram verificadas a validação e ativação pelo sincronizador do Mira 0.1.69. Os testes técnicos não significam que a arte reproduz exatamente o vídeo de referência; o estilo precisa ser avaliado visualmente.

## Origem e licença

Mira: `sandeco/mira-animator`, commit `d857f3270bdf29674cda28c31d2f7cf18a897811`, versão 0.1.69. Mantidos avisos e licença em `LICENSE-MIRA` e `vendor/`. Esta extensão é distribuída sob os mesmos termos não comerciais do Mira, respeitando as licenças próprias das bibliotecas. Ilustrações SVG e adaptação de João e o Pé de Feijão foram criadas para este projeto; não foram extraídas das imagens ou do vídeo de referência.
