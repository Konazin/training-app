# Anotações de treino

O app registra três níveis de anotação:

- observação da série, junto de carga, repetições ou duração;
- anotação do exercício específica da sessão;
- anotação geral da sessão.

Todas usam ação explícita de salvamento, limite de caracteres e bloqueio contra
toque duplicado. A tela usa rolagem compatível com teclado e rótulos
acessíveis. As notas sobrevivem a pausa, fechamento do processo, retomada,
conclusão e abandono.

## Persistência

A migration 7 adiciona `user_notes` e os campos do snapshot de substituição a
`workout_session_exercises`. As migrations 1 a 6 e seus checksums publicados
não foram alterados. Linhas antigas são lidas como texto vazio.

O campo `workout_sessions.notes` e `workout_set_logs.notes` existentes foram
reutilizados. Notas da ficha e do exercício canônico não são sobrescritas.

## Backup

Os novos campos entram no backup `schemaVersion: 2`. Backups v1 e v2 anteriores,
Os novos campos entram no backup `schemaVersion: 2`. Backups v1 e v2 anteriores,
Os novos campos entram no backup `schemaVersion: 2`. Backups v1 e v2 anteriores,
sem essas colunas, continuam válidos e restauram valores nulos ou vazios. A
restauração permanece transacional.
