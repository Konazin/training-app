# Arquitetura do aplicativo principal

`mobile/` gera o APK de treino e não contém rotas, telas, controllers ou
imports do Modo Umamusume.

## Responsabilidades

- dashboard, biblioteca e fluxo legado de `Workout`;
- criação e edição de fichas semanais;
- execução e histórico de sessões de origem normal;
- navegação e apresentação próprias.

As fichas seguem MVC em `src/features/training-plan`. A tela de sessão permanece
local porque é apresentação; model, timer, repository HTTP, storage e
`useWorkoutSessionController` vêm de `@training/workout-session-core`.

O app cria `@training/mobile-api` com `EXPO_PUBLIC_API_URL`. Contratos de ficha,
categoria, sessão, exercício e séries vêm de `@training/training-contracts`.

O domínio legado continua nas pastas globais e não deve receber novas
funcionalidades. Não há persistência offline.
