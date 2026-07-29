# Arquitetura de dados local

## Camadas

```text
Telas React Native
        ↓
Controllers React
        ↓
Portas training-domain
        ↓
Repositories training-local-db
        ↓
training.db (SQLite)
```

`training-domain` contém modelos, erros e regras puras. `training-local-db`
contém migrations, mappers e operações transacionais. A UI nunca recebe rows
cruas.

## Inicialização

O app abre `training.db`, ativa `foreign_keys`, seleciona WAL, cria
`schema_migrations`, valida checksums e aplica migrations ainda ausentes em
transações exclusivas. Uma falha mostra migration, repetição segura e
exportação de diagnóstico; o banco nunca é apagado automaticamente.

O seed `mobile/assets/seeds/exercises.v1.json` é controlado por `app_metadata`,
não por contagem de linhas. `installation.initialized` separa primeira
instalação de um banco que o usuário apagou; `seed.suppressed` impede o seed de
reaparecer depois de **Apagar todos os dados**. Somente a primeira instalação
ou **Recriar dados iniciais** executa o seed.

## Integridade

- IDs são `INTEGER PRIMARY KEY`;
- datas são ISO-8601 UTC em `TEXT`;
- booleanos usam `INTEGER` com `CHECK`;
- enums estáveis usam `CHECK`;
- campos JSON passam por serialização e validação centralizadas;
- `(training_plan_id, weekday)` impede dias duplicados;
- índice parcial impede duas fichas ativas;
- `active_slot = 1 UNIQUE` impede duas sessões ativas;
- operações compostas usam transação exclusiva;
- sessões guardam snapshots e não possuem foreign key para ficha/exercício
  mutável no histórico.

As migrations publicadas não são reescritas. A migration 3 adiciona
`app_metadata(key, value_json, updated_at)`, preservada por reset e restore.
Falhas de migration, seed, composição de repositories ou registro de startup
fecham a conexão antes de permitir retry.

## Estado transitório

AsyncStorage contém somente o cronômetro de descanso. O timestamp, ID da sessão,
exercício e série permitem retomada após processo morto. Séries e estado da
sessão permanecem exclusivamente no SQLite.

## Integrações futuras

Wger, IA, saúde e backup remoto são portas sem implementação real. Nenhuma
integração roda no bootstrap ou background. Um provedor futuro deverá partir
de ação explícita, explicar dados enviados, mostrar preview, validar a resposta
e persistir somente após confirmação.

Segredos futuros usam a porta `SecretsRepository` e deverão ser implementados
com SecureStore. Eles não podem entrar em SQLite, AsyncStorage, `EXPO_PUBLIC_*`
ou backups.
