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

Os formulários da ficha usam `useUnsavedChangesGuard`, baseado no
`usePreventRemove` da navegação, para proteger alterações reais ainda não
salvas. A biblioteca permanece como dependência somente de leitura; o seletor
da ficha usa `FlatList`, busca e filtro sem extrair uma nova feature.

Testes de funções puras usam Vitest:

```bash
npm run test
```

## Modo Umamusume

`src/features/umamusume` mantém seus modelos, repository HTTP, controller e
telas isolados. O modo inicia a sessão real pelo backend e entrega a resposta
ao controller de sessão com `adoptSession`, sem repetir a requisição ou a tela
de execução. A origem tipada da rota `Session` determina se o encerramento
retorna ao histórico normal ou à carreira; essa origem é recuperada comparando
o ID da sessão ativa com o snapshot do turno pendente.

O controller mantém a seleção entre carreiras atuais e anteriores. O histórico
é carregado por ID com token de requisição próprio, limpa dados anteriores ao
trocar de carreira e expõe loading e erro separados. Atividades aceitas podem
ser concluídas ou canceladas pelos snapshots persistidos no backend; efeitos
históricos já chegam limitados ao delta realmente aplicado.

## Migração restante

`useTrainingController` ainda coordena dashboard, biblioteca e o fluxo legado
de `Workout`.

As telas `WorkoutsScreen` e `ExerciseScreen` ainda dependem de `Workout` e
`Exercise`. Esse domínio é legado e não deve receber novas funcionalidades.
Sessões novas usam `TrainingPlan`, `TrainingPlanDay` e `WorkoutSession`.
O APK depende da API Java e não oferece persistência ou sincronização offline.
