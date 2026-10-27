# Contrato do roteiro 0.1

JSON: `title` (texto), `duration` (soma exata das cenas), `scenes` (lista).
Cada cena: `id` exclusivo, `duration` de 3 a 120 segundos, `caption`, `camera` com `from`, `to` e `target` (vetores de três números), `actors` (até 60).
Ator: `asset`, `x`, `z`, `width`, `height`; opcionais `y`, `enter` (segundos locais) e `walk` (deslocamento horizontal).
Ativos disponíveis: joao, mae, casa, vila, colinas, nuvem, vaca, castelo, gigante, galinha, feijao, folha.
Cena: `stalk:true` cria o pé de feijão; `fall:true` anima sua queda. São mecanismos específicos deste conto, não uma linguagem geral de ações. Os intervalos e durações devem considerar a entrada das peças e a virada da página.
A unidade é proporcional ao livro 12 × 8. O plano do chão é X/Z, altura é Y. Os recortes se erguem em torno da base; mantenha seus pés em Y próximo de zero.

## Ilustrações e movimentos dos porquinhos

Ativos adicionais: porquinho_palha, porquinho_madeira, porquinho_tijolos, lobo, casa_palha, casa_madeira, casa_tijolos, arvore, vento. O motor lê os atlas de ilustrações em assets/porquinhos.
Ator pode ter motion: {type, start, end, dx?, dy?} e flip:true. Intervalos são segundos locais da cena. Construção e destruição usam peças reais separadas, sem alterar os arquivos de imagem.
O campo slug determina o nome de exportação; showTitle:true mostra o título na abertura. videoBitrate permite ajustar a taxa do codificador sem alterar a resolução.

O Patinho Feio: exemplo stories/patinho-feio.json, com assets pata,
patinho_amarelo, patinho_cinza, cisne, celeiro, arvore_verde,
arvore_outono e arvore_inverno. Os atlas locais ficam em assets/patinho.
Cenas podem usar lake: true e season: spring/autumn/winter para o chão
ilustrado; cisnes no lago recebem reflexo de papel. subtitles contém
{start,end,text} em segundos locais; sem esse campo, exibe caption inteira.

Chapeuzinho Vermelho: assets chapeuzinho, mae_chapeuzinho, vovo, guarda,
lobo_floresta, lobo_cama, casa_vovo, arvore_floresta, biombo, mesa_lanche,
passarinho e borboleta. Os atlas estão em assets/chapeuzinho.
O mapa ASSET_FILES aceita cell/columns ou rect:[x,y,largura,altura] em pixels.
room:true usa piso e painel de quarto. soundEvents:[{type,time}] usa segundos
locais e tipos birds/steps/knock; effects:{file,volume} aponta a trilha WAV
sintetizada por scripts/effects.mjs. O volume máximo aceito é 0.5.
