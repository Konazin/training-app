# Backup e restauração

O formato atual é `training-backup-v1.json`.

Ele contém versão, versão do app, data de exportação, exercícios, metadados de
mídia, fichas, dias, configurações, atividades, sessões, snapshots, séries e
preferências.

Não contém chaves, tokens, arquivos de vídeo, caches ou estado do player.

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
5. cria um backup automático do estado atual;
6. restaura tudo em uma transação.

JSON inválido não toca no banco. Erros durante a transação fazem rollback.

## Apagar ou recriar

As duas ações exigem confirmação e geram backup automático. **Apagar** deixa o
banco sem dados do usuário. **Recriar dados iniciais** reinstala o catálogo
próprio e a ficha demonstrativa.
