# O Patinho Feio — Contos de Gaitolé

Abra [o vídeo pronto](docs/patinho-feio.mp4) para assistir. Não precisa executar atalhos ou instalar dependências.

O ZIP de projeto contém este diretório, ilustrações, voz Thalita e música. A pasta `publicacao` traz título, descrição e miniatura 1280 × 720. O ZIP de mídia entrega `alves-pop-up/ASSISTA-AQUI.mp4` e os áudios sem executáveis.

Adaptação original em dez cenas do conto tradicional. Ilustrações originais geradas para esta produção. O patinho merece carinho antes e depois de descobrir que é um cisne.

Para editar: `stories/joao.json` é o nome interno fixo usado pelo motor, mas seu conteúdo é O Patinho Feio. `stories/patinho-feio.json` é uma cópia legível desta produção. Ao mudar texto ou tempos, gere a narração novamente.

Com Node 22+, Python, Chromium e FFmpeg instalados:

```
node scripts/serve.mjs
node scripts/narrate.mjs --deck .
node scripts/render-webcodecs.mjs --deck . --out docs/patinho-feio.mp4
node scripts/package.mjs --out dist/patinho-feio-projeto.zip
node scripts/package.mjs --media --out dist/patinho-feio-assistir.zip
```

Narração real `pt-BR-ThalitaMultilingualNeural`, música fornecida `Gaitolé, Gaitolé Completa (1)`, volume reduzido durante falas. Legendas por frase, com divisão temporal proporcional estimada. Encerramento com canais e chamada solicitada.

Motor baseado nos recursos locais do Mira (Three.js, GSAP e mp4-muxer); licenças preservadas em LICENSE-MIRA e vendor.
