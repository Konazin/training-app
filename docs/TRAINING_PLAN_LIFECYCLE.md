# Ciclo de vida das fichas

Uma ficha inativa continua disponível para edição e pode ser ativada. Uma
ficha arquivada fica fora da seleção normal, mas não possui prazo de exclusão.
Uma ficha na lixeira fica inativa, deixa de ser editável e recebe
`deleted_at` e `purge_at` em UTC.

## Retenção e restauração

`purge_at` é calculado exatamente sete dias após `deleted_at`. Durante esse
prazo, a ficha pode ser restaurada e retorna como inativa, não arquivada e sem
datas de exclusão. O aviso da tela informa quantos dias restam.

A ficha é removida após vencer o prazo na próxima inicialização ou abertura da
lixeira. Não há serviço de exclusão em background.

## Exclusão

A exclusão permanente remove a ficha, seus dias e suas configurações. Sessões
ativas ou pausadas vinculadas bloqueiam mover, excluir ou expurgar a ficha até
serem concluídas ou abandonadas. Sessões concluídas, séries e snapshots não
possuem chave estrangeira para a ficha e permanecem no histórico.

Esvaziar exige a palavra `ESVAZIAR` e cria primeiro um backup automático. Se o
backup falhar, nada é excluído.

## Backup e funcionamento offline

O backup v2 inclui fichas normais, arquivadas e na lixeira, com os dois
timestamps. A importação valida as invariantes do ciclo de vida. Backups v1
continuam compatíveis e são interpretados com timestamps nulos.

Todas as operações usam o SQLite local e funcionam sem conta, servidor ou
conexão. A integração opcional Wger não recebe dados das fichas.
