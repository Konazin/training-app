# Ciclo de vida das fichas

Uma ficha inativa continua disponível para edição e pode ser ativada. Uma
ficha arquivada fica fora da seleção normal, mas não possui prazo de exclusão.
Uma ficha na lixeira fica inativa, deixa de ser editável e recebe
`deleted_at` e `purge_at` em UTC.

## Retenção e restauração

`purge_at` é calculado exatamente sete dias após `deleted_at`. Durante esse
prazo, a ficha pode ser restaurada e retorna como inativa, não arquivada e sem
datas de exclusão. O aviso da tela informa quantos dias restam.

As fichas ficam na lixeira por sete dias. Depois do prazo, são removidas na
próxima abertura do app ou atualização da tela. Não há serviço de exclusão em
background.

## Exclusão

A exclusão permanente remove a ficha, seus dias e suas configurações. Sessões
ativas ou pausadas vinculadas bloqueiam mover, excluir ou expurgar a ficha até
serem concluídas ou abandonadas. Sessões concluídas, séries e snapshots não
possuem chave estrangeira para a ficha e permanecem no histórico.

Esvaziar exige a palavra `ESVAZIAR` e cria primeiro um backup automático. Se o
backup falhar, nada é excluído.

## Backup e funcionamento offline

O formato `schemaVersion: 2` inclui fichas normais, arquivadas e na lixeira,
com os dois timestamps. A importação valida as invariantes do ciclo de vida.
Backups v1 continuam compatíveis e são interpretados com timestamps nulos.
Arquivos manuais usam `training-backup-<timestamp>.json`; arquivos automáticos
usam `training-auto-backup-<timestamp>.json`.

Todas as operações usam o SQLite local e funcionam sem conta, servidor ou
conexão. A integração opcional Wger não recebe dados das fichas.

## Criação e duplicação

Uma ficha pode ser criada vazia ou a partir de um template local. A ficha e os
sete dias são inseridos na mesma transação; falha em qualquer dia reverte tudo.
Templates definem somente nomes, descanso e foco semanal, sem criar exercícios.

Duplicações também são transacionais e sempre nascem inativas, não arquivadas
e fora da lixeira. Elas não copiam sessões, histórico ou snapshots:

- **Completa:** preserva toda a programação, cargas, RPE, notas e alternativas;
- **Apenas estrutura:** preserva exercícios, séries, repetições, descanso,
  duração, distância, tipo de série e atividades; limpa carga, RPE, notas de
  exercício e alternativa;
- **Sem cargas:** preserva toda a programação, exceto `plannedLoad`, que fica
  nulo.
