# Arquitetura mobile

O aplicativo continua em migração incremental para MVC por feature.

## Sessão de treino

Antes, tipos, HTTP, estado e tela de sessão ficavam em `models/training.ts`,
`services/trainingApi.ts`, `controllers/useTrainingController.ts` e
`screens/SessionScreen.tsx`.

Agora, `src/features/workout-session` contém:

- `model`: contratos e regras de dados da sessão;
- `repository`: interface independente da origem dos dados;
- `service`: implementação HTTP do repository;
- `controller`: estado e ações sem recarregar as demais features;
- `views`: edição e execução da sessão.

`src/core/api` concentra o cliente HTTP compartilhado, `src/core/storage`
persiste somente o cronômetro de descanso e `src/core/navigation` tipa a
navegação.

## Migração restante

`useTrainingController` ainda coordena dashboard, fichas, biblioteca e o fluxo
legado de `Workout`. O próximo ponto de extração recomendado é
`training-plan`, pois concentra a montagem semanal usada para iniciar sessões.

As telas `WorkoutsScreen` e `ExerciseScreen` ainda dependem de `Workout` e
`Exercise`. Esse domínio é legado e não deve receber novas funcionalidades.
Sessões novas usam `TrainingPlan`, `TrainingPlanDay` e `WorkoutSession`.
