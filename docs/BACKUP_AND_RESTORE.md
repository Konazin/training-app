# Backup e restauração

O formato atual é `training-backup-v2.json`. Backups v1 continuam aceitos e
recebem `deleted_at` e `purge_at` nulos durante a restauração.

Ele contém versão, versão do app, data de exportação, exercícios, metadados de
mídia, fichas, dias, configurações, atividades, sessões, snapshots, séries e
preferências. A v2 inclui também fichas na lixeira e seus prazos.

Não contém chaves, tokens, arquivos de vídeo, caches ou estado do player.

O arquivo é limitado a 25 MB. A validação rejeita IDs repetidos ou não
positivos, referências quebradas, enums/datas/números inválidos, ordens
duplicadas, fichas sem sete dias únicos, mais de uma ficha ou sessão ativa,
`secret.*`, `app_metadata`, `NaN`, `Infinity` e coleções acima dos limites:

- 10.000 exercícios;
- 20.000 mídias;
- 1.000 fichas;
- 20.000 sessões;
- 500.000 séries.

## Exportar

Abra **Mais → Exportar backup** e escolha onde salvar/compartilhar o arquivo.
Faça isso regularmente e antes de desinstalar o app.

## Importar

Abra **Mais → Importar backup** e selecione um JSON. Antes de alterar o SQLite,
o app:

1. lê e parseia o arquivo;
2. valida `schemaVersion`;
3. valida coleções, IDs e referências;
4. garante no máximo uma sessão ativa;
5. valida o ciclo de vida das fichas na v2;
6. cria um backup automático do estado atual;
7. restaura tudo em uma transação;
8. remove fichas cujo prazo já venceu, preservando sessões e snapshots.

JSON inválido não toca no banco. Erros durante a transação fazem rollback.

## Backups automáticos

Antes de importar, apagar, recriar o seed ou esvaziar a lixeira, o app grava um JSON em seu
diretório de documentos. A seção **Mais → Backups automáticos** mostra data,
motivo e tamanho e permite restaurar, compartilhar ou excluir. Somente os cinco
mais recentes são mantidos. Restaurar um deles cria antes outro backup do
estado atual.

## Apagar ou recriar

As duas ações exigem confirmação e geram backup automático. **Apagar** remove
somente dados do usuário, preserva migrations/metadados e suprime o seed nas
próximas aberturas. **Recriar dados iniciais** apaga os dados do usuário,
reinstala catálogo/ficha demonstrativa e reativa explicitamente o seed.

Esvaziar a lixeira só prossegue após o backup automático ter sido criado. Uma
falha no backup cancela a exclusão.
