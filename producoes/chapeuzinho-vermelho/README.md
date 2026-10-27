# Chapeuzinho Vermelho — Contos de Gaitolé

Abra [o vídeo pronto](docs/chapeuzinho-vermelho.mp4) para assistir. Não precisa executar atalhos ou instalar programas. Duração: **3min07s**, 1280 × 720, 24 fps, H.264 e AAC estéreo.

O ZIP de mídia entrega `alves-pop-up/ASSISTA-AQUI.mp4` e os áudios sem executáveis. O ZIP de projeto inclui as ilustrações, o motor local, o roteiro e os áudios. A pasta `publicacao` traz título, descrição e miniatura 1280 × 720.

Adaptação original do conto tradicional em dez cenas, sem ferimentos ou armas. A vovó se protege atrás de um biombo, Chapeuzinho busca ajuda e o lobo foge vivo. A menina encontra acolhimento sem ser culpada pela mentira do lobo.

Narração: `pt-BR-ThalitaMultilingualNeural`, cadência -12%, tom -4Hz. Música fornecida pelo autor: `Gaitolé, Gaitolé Completa (1)`, com redução automática durante as falas. Os efeitos de pássaros, passos e batidas são sintetizados originalmente para a produção e incluídos no WAV local. A mistura do navegador e a do FFmpeg compartilham os ganhos. Legendas por frase usam os tempos fornecidos pelo serviço de voz; não há sincronização de boca.

`stories/joao.json` é o nome interno fixo lido pelo motor; seu conteúdo é Chapeuzinho Vermelho. `stories/chapeuzinho-vermelho.json` é a cópia com nome do conto. Ao editar, trabalhe no arquivo interno; gere voz, legendas e efeitos novamente.

Com Node 22+, Python, Chromium e FFmpeg instalados:

```
node scripts/narrate.mjs --deck .
node scripts/subtitles.mjs --deck .
node scripts/effects.mjs --deck .
node scripts/serve.mjs
node scripts/render-webcodecs.mjs --deck . --out docs/chapeuzinho-vermelho.mp4
node scripts/package.mjs --media --out dist/chapeuzinho-vermelho-assistir.zip
node scripts/package.mjs --out dist/chapeuzinho-vermelho-projeto.zip
```

O motor reutiliza recursos locais do Mira: Three.js, GSAP e mp4-muxer. Licenças preservadas em LICENSE-MIRA e vendor. As novas ilustrações são originais geradas para esta produção. Assistir ao MP4 não exige executar o projeto.
