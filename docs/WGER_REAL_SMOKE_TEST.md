# Smoke real Wger — 29/07/2026

## API e cliente

- [x] OpenAPI atual consultado (`GET /api/v2/schema`, 422.787 bytes).
- [x] `exerciseinfo` confirmado como endpoint recomendado.
- [x] Cliente real consultou página de 5 itens: total remoto 828, 5 mapeados,
  próxima página presente.
- [x] Exercício 983 validou português: “Joelhos para cima”, idioma `pt`.
- [x] A primeira página validou fallback inglês com aviso.
- [x] Exercício 1962 validou imagem.
- [x] Exercício 512 validou vídeo sem reprodução automática.
- [x] Licença individual CC-BY-SA 4 preservada na amostra.
- [x] Requisições continham somente filtros do catálogo e não tinham body.

## Persistência automatizada

- [x] Importação de exercício e mídia em SQLite.
- [x] Reimportação sem duplicata.
- [x] ID local e ID de mídia preservados.
- [x] Atualização preserva `archived` e nota local.
- [x] Rollback integral em falha do lote.
- [x] Ficha e snapshot de sessão continuam referenciando o ID local.

## Aparelho Android

Status: **pendente de aparelho ou emulador conectado**. Em 29/07/2026,
`adb devices -l` não listou dispositivo; portanto seleção de três itens,
fechar/reabrir, modo avião, ficha, série, sessão e atualização no mesmo aparelho
não foram marcados como executados.

Nenhum dado pessoal foi usado neste smoke.
