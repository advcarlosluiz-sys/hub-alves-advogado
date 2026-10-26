# Contrato do roteiro 0.1

JSON: `title` (texto), `duration` (soma exata das cenas), `scenes` (lista).
Cada cena: `id` exclusivo, `duration` de 3 a 120 segundos, `caption`, `camera` com `from`, `to` e `target` (vetores de três números), `actors` (até 60).
Ator: `asset`, `x`, `z`, `width`, `height`; opcionais `y`, `enter` (segundos locais) e `walk` (deslocamento horizontal).
Ativos disponíveis: joao, mae, casa, vila, colinas, nuvem, vaca, castelo, gigante, galinha, feijao, folha.
Cena: `stalk:true` cria o pé de feijão; `fall:true` anima sua queda. São mecanismos específicos deste conto, não uma linguagem geral de ações. Os intervalos e durações devem considerar a entrada das peças e a virada da página.
A unidade é proporcional ao livro 12 × 8. O plano do chão é X/Z, altura é Y. Os recortes se erguem em torno da base; mantenha seus pés em Y próximo de zero.
