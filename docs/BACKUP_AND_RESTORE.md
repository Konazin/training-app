# Backup e restauração

O formato permanece em `schemaVersion: 2`; backups v1 e v2 anteriores continuam
aceitos. O JSON contém exercícios, metadados de mídia, fichas, dias, atividades,
sessões, substituições, anotações, séries, configurações, favoritos, recentes e
aliases opcionais. Bytes de imagens não são incorporados.

## Restauração

A validação rejeita coleções acima dos limites, referências quebradas, IDs ou
datas inválidos, duplicações, múltiplas sessões/fichas ativas e chaves
`secret.*` ou `app_metadata`.

Em uma única transação SQLite, a restauração substitui os dados, remove fichas
vencidas e arquiva definições geradas legadas. Ela nunca recria catálogo,
consulta provider ou baixa mídia. Uma URI local ausente cai para a URL remota
preservada ou para o estado sem mídia.

Falhas antes do commit preservam integralmente o banco anterior. Depois do
commit, uma falha ao aplicar preferências visuais mantém um retry separado da
mensagem visível. Exportar ou compartilhar não destrói essa pendência; ela só
some quando:

- o retry funciona;
- o usuário a dispensa explicitamente;
- uma restauração mais nova a substitui.

O retry nunca repete a restauração SQLite.

## Operações destrutivas

**Apagar todos os dados** cria antes um backup automático e retorna o aplicativo
ao estado vazio. Não há ação para recriar seed, ficha demonstrativa ou catálogo
gerado. Backups automáticos também são criados antes de restaurações e de
esvaziar a lixeira.
