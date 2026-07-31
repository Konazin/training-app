# Inteligência local de treino

O Marco 6 adiciona referências históricas, sugestões de progressão e
substituições calculadas integralmente no aparelho. Não há IA generativa,
telemetria, conta, nuvem ou chamada de rede nesse fluxo.

## Referência anterior

Durante a sessão, cada exercício procura a sessão concluída mais recente com o
mesmo exercício efetivo (`substituto ?? planejado`). A mesma ficha tem prioridade; na ausência dela,
é usada a última sessão concluída disponível. Sessões ativas, pausadas e
abandonadas não alimentam a referência.

A interface mostra data, última carga válida, repetições concluídas, quantidade
de séries, último RPE e anotação do exercício. Esses dados vêm do snapshot
histórico imutável e são apresentados como **Último desempenho**, nunca como
prescrição.

## Sugestões determinísticas

As sugestões usam somente sessões concluídas:

- RPE médio até 7 e todas as séries concluídas: aumento conservador;
- RPE médio entre 8 e 9: manter;
- RPE acima de 9 ou séries incompletas: repetir ou reduzir;
- RPE ausente ou incompleto: manter ou repetir, nunca aumentar;
- exercícios temporizados ou de peso corporal: priorizar repetições;
- sem histórico: não sugerir valor.

Em exercícios com carga, o aumento é de 2,5%, arredondado para 0,5 kg. A ação
**Aplicar nesta sessão** altera as séries ainda incompletas em uma única
transação SQLite. Séries concluídas e a ficha original nunca mudam.

## Substituições

As opções vêm somente da biblioteca local e excluem o próprio exercício,
arquivados e duplicados. A ordenação considera músculo primário, categoria,
equipamento, favorito, uso recente e nome estável. A escolha e o desfazer são
explícitos e afetam somente o snapshot da sessão; o exercício original
permanece registrado no histórico. Carga, repetições, mídia e referências
futuras pertencem ao exercício efetivamente realizado.
