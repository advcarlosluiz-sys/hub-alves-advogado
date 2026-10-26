# Validação da versão 0.1.0

- Quatro testes Node executados e aprovados: contrato/limites de cena, rejeição de roteiro inválido, geração de deck autocontido sem sobrescrita e instalação que preserva a configuração existente.
- Chromium real com WebGL: quatro capítulos produzem quadros diferentes; voltar ao mesmo instante produz o mesmo quadro; sem erros JavaScript ou requisições externas.
- Integração com Mira 0.1.69 no commit d857f3270bdf29674cda28c31d2f7cf18a897811: usados Writer.installSkill, installRuntime e installTemplates do próprio Mira em uma área de trabalho separada, com mira-history, mira-3d, mira-slide-to-video, mira-animator e mira-offline. O agente alves-pop-up passou em validatePlugin e syncPlugins do Mira; a segunda sincronização não refez ativações. O .mplug em dist foi produzido pelo comando oficial `mira plugin pack alves-pop-up`.
- Não foram executados serviços de IA ou geração de narração. As ilustrações são próprias e simplificadas. A aprovação visual pelo autor ainda é necessária; não se alega equivalência artística com o vídeo de referência.

- Vídeo final decodificado integralmente pelo FFmpeg sem erros: H.264, 1280×720, 24 fps, 1152 quadros, 48 segundos. Sem trilha de áudio, conforme escopo desta versão.
