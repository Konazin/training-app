# Arquitetura do aplicativo principal

`mobile/` é o composition root do Training App local-only.

## Fluxo

1. `useLocalRuntime` abre `training.db`;
2. ativa foreign keys e WAL;
3. executa migrations ordenadas e verificadas por checksum;
4. instala o seed apenas no primeiro banco vazio;
5. cria repositories SQLite;
6. controllers carregam sessão ativa, fichas, biblioteca e dashboard;
7. a navegação é liberada.

As telas e controllers React dependem das portas de `training-domain`.
`training-local-db` faz mapeamento explícito entre rows e modelos. Nenhum dado
principal usa HTTP ou AsyncStorage.

O cronômetro de descanso usa AsyncStorage apenas como estado transitório
associado ao ID local da sessão. Snapshots completos preservam o histórico
quando ficha ou exercício são alterados.

O app não importa `mobile-api`, `trainingApi`, repositories HTTP ou o domínio
legado `Workout`.
