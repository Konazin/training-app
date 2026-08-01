# Marco 0.10.0 — catálogo e interface

Estado: **NO-GO**. O adaptador ExerciseDB/AscendAPI foi integrado como fonte
primária manual, com Wger como fallback, paginação, cancelamento, timeout,
schema validation, atribuição e importação local idempotente. Nenhuma chamada
é feita no bootstrap e a mídia continua remota até importação explícita.

Aliases locais PT-BR/EN existentes foram ampliados para `puxada alta`,
`lat pulldown`, `rosca direta`, `biceps curl` e equivalentes já curados.

Verificações: typecheck do domínio, ExerciseDB, local-db, Wger e mobile;
testes Wger (13) passaram; testes ExerciseDB adicionados. Testes SQLite não
executaram por incompatibilidade do binário nativo `better-sqlite3` com o Node
disponível. Expo Doctor e export Android não foram executados.

Risco de licença: ExerciseDB/AscendAPI exige revisão/aceite das condições de
redistribuição da mídia antes de persistir GIFs; o adaptador preserva fonte,
licença e atribuição, mas não declara aprovação jurídica.
