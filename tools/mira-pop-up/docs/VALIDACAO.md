# Validação da versão 0.1.0

- Quatro testes Node executados e aprovados: contrato/limites de cena, rejeição de roteiro inválido, geração de deck autocontido sem sobrescrita e instalação que preserva a configuração existente.
- Chromium real com WebGL: quatro capítulos produzem quadros diferentes; voltar ao mesmo instante produz o mesmo quadro; sem erros JavaScript ou requisições externas.
- Integração com Mira 0.1.69 no commit d857f3270bdf29674cda28c31d2f7cf18a897811: usados Writer.installSkill, installRuntime e installTemplates do próprio Mira em uma área de trabalho separada, com mira-history, mira-3d, mira-slide-to-video, mira-animator e mira-offline. O agente alves-pop-up passou em validatePlugin e syncPlugins do Mira; a segunda sincronização não refez ativações. O .mplug em dist foi produzido pelo comando oficial `mira plugin pack alves-pop-up`.
- Não foram executados serviços de IA ou geração de narração. As ilustrações são próprias e simplificadas. A aprovação visual pelo autor ainda é necessária; não se alega equivalência artística com o vídeo de referência.

- Vídeo final decodificado integralmente pelo FFmpeg sem erros: H.264, 1280×720, 24 fps, 1152 quadros, 48 segundos. Sem trilha de áudio, conforme escopo desta versão.

## Atualização 0.1.1 — pacote local e exportação no navegador

- Cinco testes Node aprovados, incluindo leitura independente das entradas ZIP comprimidas, nomes Unicode, inclusão do vídeo, exclusões e proteção contra sobrescrita do pacote.
- MP4 H.264 de 1 segundo exportado pelo próprio navegador e inspecionado por FFprobe: 1280×720, 24 quadros. Outro MP4 de 3 segundos foi exportado e carregado como vídeo pelo Chromium, com duração e resolução verificadas.
- As quatro cenas, a navegação determinística e a ausência de requisições externas continuam verificadas. Os URLs blob locais usados para validar o MP4 não são acessos externos.
- Atalhos Windows/macOS fornecidos; não foram executados nesses sistemas neste ambiente Linux. Requerem Node.js 22+ instalado. A exportação direta exige Chrome/Edge com H.264 via WebCodecs.
- O procedimento de ZIP está incluído na skill do agente. O navegador não pode salvar seu MP4 automaticamente dentro da pasta do projeto: copie o vídeo para output/ se quiser incluí-lo no próximo ZIP.

## Atualização 0.1.2 — voz Thalita

- Configurada pt-BR-ThalitaMultilingualNeural, ritmo -12%, tom -4Hz, conforme mira-history.
- Geração real bloqueada: a consulta ao serviço speech.platform.bing.com retornou HTTP 403 do proxy. Não foram gerados MP3s da Thalita nem um vídeo narrado; o vídeo de demonstração continua sendo o anterior, silencioso.
- Integração técnica de áudio testada com sinal sintético explicitamente identificado. Verifica silêncio antes do instante programado, sinal no instante da fala e MP4 contendo vídeo H.264 e áudio. O Chromium desta máquina não oferece encoder AAC: o caminho do navegador usa Opus no MP4, suportado pelo muxer do Mira. O caminho FFmpeg verifica AAC.
- Manifesto vincula cada arquivo ao hash do texto, voz, ritmo e tom; exportação exige os arquivos e rejeita narração desatualizada. O pacote inclui o gerador local e os atalhos Windows/macOS. Não foram executados em Windows/macOS neste ambiente Linux.
