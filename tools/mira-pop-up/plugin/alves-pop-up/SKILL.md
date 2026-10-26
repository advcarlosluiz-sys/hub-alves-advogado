---
name: alves-pop-up
description: Cria vídeos de contos em livro pop-up 3D, com cenários e personagens de papel, câmera, sombras e exportação MP4. Use para pedidos de livro animado ou conto pop-up.
---

# Livro pop-up 3D

Este agente trabalha com o motor executável instalado separadamente em `.mira/extensions/alves-pop-up/`. Não reescreva esse motor como SVG plano nem finja profundidade apenas escalando elementos. O nome `mira-` é reservado pelo Mira: o comando desta extensão é `/alves-pop-up`.

1. Leia o pedido e o material em `references/`. Use os agentes disponíveis do Mira para roteiro (`mira-history`), planejamento visual (`mira-storyboard`, se instalado) e ativos (`mira-asset-scout`, se instalado). A saída da preparação é um roteiro estruturado, não HTML inventado. Um conto tradicional admite adaptação original; não copie texto ou arte de uma adaptação comercial.
2. Use o esquema em `references/roteiro.md`. Consulte o exemplo `.mira/extensions/alves-pop-up/stories/joao.json`. Registre ações, legenda e câmera por cena. A biblioteca desta versão inclui apenas os ativos do conto João e o Pé de Feijão; para outra história, acrescente ilustrações SVG/PNG licenciadas ao motor e ao vocabulário com testes. Não prometa personagens ilimitados já disponíveis.
3. Gere um deck por `node .mira/extensions/alves-pop-up/scripts/create.mjs decks/<nome> --story <roteiro.json>`. Não sobrescreva um deck existente nem escreva nos projetos-fonte vinculados. Os assets e as bibliotecas acompanham o deck, sem CDN. Node 22+, navegador WebGL e servidor local são necessários.
4. Sirva o deck com `node decks/<nome>/scripts/serve.mjs`. Verifique o carregamento, cada cena, enquadramento, sombras e legibilidade. Compare visualmente com a referência; testes automáticos não comprovam fidelidade artística.
5. Para vídeo determinístico, instale as dependências de renderização na distribuição da extensão e execute `node .mira/extensions/alves-pop-up/scripts/render.mjs --deck decks/<nome> --out <arquivo.mp4>`. Requer Chromium e FFmpeg instalados; não baixar binários nem desabilitar verificações de integridade. Use `CHROME_PATH` e `FFMPEG_PATH` se necessário. Também pode seguir o fluxo do `mira-slide-to-video`, caso disponível, após validar compatibilidade.
6. Entregue MP4, roteiro e instruções. Esta versão suporta a voz pt-BR-ThalitaMultilingualNeural (-12%, -4Hz), como mira-history. Rode `node <deck>/scripts/narrate.mjs --deck <deck>` ou oriente o atalho GERAR-VOZ-THALITA antes de exportar. Requer Python e acesso a speech.platform.bing.com na geração; depois os MP3s ficam locais. Não identifique outra voz ou um sinal de teste como Thalita. Não afirme que o vídeo tem voz sem verificar a trilha. Não declare que instalar o `.mplug` sozinho instala o motor. Informe limitações e cenas realmente executadas.

7. **Sempre entregue um ZIP completo**, além do MP4: execute `node <deck>/scripts/package.mjs` (ou `npm run zip` na extensão). Inclua motor, arte, roteiro, atalhos e vídeos locais. Copie para `output/` os MP4s gerados fora do deck antes de empacotar. O pacote fica em `dist/` com data e hora e preserva o material anterior. Oriente o usuário a extrair tudo, abrir `COMECE-AQUI.txt`, usar `ABRIR-LIVRO.cmd` e clicar em **Exportar MP4** no Chrome/Edge. Para salvar novamente, usar `SALVAR-TUDO-ZIP.cmd`. No macOS, usar os atalhos `.command`. Não trate o `.mplug` isolado como pacote completo.

Direção visual: páginas e peças em 3D real; recortes ilustrados com bordas de papel; sombras projetadas sobre o chão; camadas dianteiras e traseiras; entradas por dobradiça; crescimento e movimentos coerentes com a narrativa. O objetivo é teatro de papel, não slides com ícones. Faça uma amostra visual antes de expandir arte de novas histórias.

## Voz Thalita

A voz padrão solicitada pelo autor é **Thalita em português do Brasil**. Ao entregar o conto, gere e confira os MP3s e exporte o áudio no MP4. O botão Ouvir narração controla a reprodução local; Exportar MP4 inclui a trilha (AAC preferencial, Opus quando necessário). O renderizador FFmpeg usa AAC. Se o serviço estiver bloqueado, informe o bloqueio e entregue o atalho de geração, sem apresentar o vídeo silencioso anterior como narrado. Ao alterar o texto, gere novamente: o manifesto verifica hash de texto, voz e cadência. O ZIP deve incluir os MP3s e o manifesto válidos; não inclua `.tts-venv` ou arquivos `.partial`.

## Entrega para Windows com Controle Inteligente de Aplicativos

Quando o usuário só precisar assistir, gere também `node <deck>/scripts/package.mjs --media`. Esse ZIP entrega `ASSISTA-AQUI.mp4`, falas e instruções, sem scripts ou instaladores. Não peça para desativar proteções nem force a execução de atalhos bloqueados. Para o exemplo João, a voz Thalita e o MP4 narrado já estão incluídos na versão 0.1.5; não peça para gerar novamente sem alteração do roteiro.

## Música de fundo

O autor forneceu Gaitolé, Gaitolé Completa (1) em assets/musica/gaitole.mp3. Preserve o original e inclua-o nos pacotes. No roteiro, music define arquivo, volume, duckVolume, attack, release, fadeIn e fadeOut. Use redução de volume durante as falas, com rampas, sem diminuir a voz. O navegador e o FFmpeg compartilham o envelope de engine/music.mjs. Para outras faixas fornecidas, ajuste o caminho e confira volumes e integridade. Entregue sempre o MP4 já misturado e o ZIP de mídia, sem exigir atalhos executáveis para assistir.

## Encerramento da marca

Preserve a tela final configurada no roteiro: Contos de Gaitolé, YouTube @gaitolé, TikTok @gaitole0 e Inscreva-se e ative o sininho! A marca está em assets/marca/gaitole-final.png. endCard.duration acrescenta seis segundos à história, sem alterar o manifesto da fala. O áudio da música cobre também o encerramento. Não remova a tela final nas exportações.
