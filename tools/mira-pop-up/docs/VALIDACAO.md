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

## Atualização 0.1.3 — Thalita gerada e vídeo pronto

- Consulta real ao catálogo confirmou pt-BR-ThalitaMultilingualNeural / pt-BR. A confiança TLS foi complementada com o bundle de CAs do sistema; a verificação de certificados permaneceu ativada. A síntese WebSocket foi configurada para usar o mesmo HTTPS_PROXY autorizado, sem conexões diretas.
- Quatro MP3s reais gerados: casa 7,224 s, crescimento 7,992 s, castelo 7,584 s e volta 7,992 s. Cadência -12%, tom -4 Hz. Nova execução reutilizou os quatro arquivos pelo cache.
- MP4 final mantém os 1152 quadros H.264 já validados e acrescenta a narração AAC nos segundos 2, 14, 26 e 38. Resultado: 48 s, 1280×720, 24 fps. FFmpeg decodificou integralmente sem erros e a medição confirmou áudio não silencioso.
- Acrescentado pacote somente de mídia, com vídeo ASSISTA-AQUI.mp4, MP3s e instruções. Esse pacote não contém atalhos, scripts ou instaladores e dispensa a execução de arquivos .cmd no Windows.

## Atualização 0.1.4 — música Gaitolé, Gaitolé

- MP3 fornecido pelo usuário copiado integralmente; SHA-256 do original e da cópia iguais. Duração original 168,384 s, estéreo/48 kHz. O vídeo usa os primeiros 48 segundos, com fade-in e fade-out.
- Mixagem preserva a narração e aplica ganho 0,18 na música, reduzido para 0,035 nas falas (ataque 350 ms antes do início e recuperação de 700 ms). O envelope segue as durações reais dos quatro MP3s da Thalita.
- Teste de integração com a faixa real mediu a relação RMS entre fonte e música processada em cinco instantes: normal/fala/normal/fala/normal. Tanto FFmpeg quanto navegador confirmaram 0,18/0,035/0,18/0,035/0,18, sem saturação da mistura.
- MP4 final preserva os quadros de vídeo já validados, com nova mistura AAC. Decodificação integral pelo FFmpeg sem erros. Pacotes de mídia e ferramenta incluem a música, sem scripts executáveis no pacote de mídia.

### Encerramento solicitado pelo autor

- Acrescentados seis segundos após a história: marca Contos de Gaitolé, YouTube @gaitolé, TikTok @gaitole0 e “Inscreva-se e ative o sininho!”. Composição de fundo baseada na imagem enviada pelo autor; handles e chamada desenhados pelo código. Tela conferida visualmente.
- Duração final 54 s / 1296 quadros a 24 fps. A história continua com 48 s e os mesmos quatro MP3s; o relógio de reprodução/exportação inclui a tela final. A música termina com fade-out no novo fim do vídeo.
- Mixagem final AAC estéreo: voz central e música estéreo. Decodificação integral sem erros. Encerramento também validado no navegador e incluído no compositor de exportação MP4.

## Atualização 0.1.5 — troca da música

- Substituída a faixa pela nova “Gaitolé, Gaitolé Completa (1).mp3”, enviada pelo usuário, duração original 187,224 s. SHA-256 da cópia em assets/musica/gaitole.mp3 igual ao arquivo recebido.
- Mantidos os 54 segundos do vídeo, a narração Thalita, a marca, os canais e a chamada final. A cópia dos pacotes de vídeo H.264 foi verificada por hash: nenhum quadro precisou ser renderizado novamente.
- Redução de música nas falas validada com a nova faixa no navegador e no FFmpeg. Nova mistura AAC estéreo e decodificação integral sem erros. O vídeo usa a faixa nova desde o início, com os mesmos fades e níveis anteriores.
