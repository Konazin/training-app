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

## Fichas de treino

`src/features/training-plan` contém os modelos, o contrato de repository, o
serviço HTTP, o controller e as telas da montagem semanal. Suas mutações
atualizam somente o estado da própria feature.

## Migração restante

`useTrainingController` ainda coordena dashboard, biblioteca e o fluxo legado
de `Workout`.

As telas `WorkoutsScreen` e `ExerciseScreen` ainda dependem de `Workout` e
`Exercise`. Esse domínio é legado e não deve receber novas funcionalidades.
Sessões novas usam `TrainingPlan`, `TrainingPlanDay` e `WorkoutSession`.
