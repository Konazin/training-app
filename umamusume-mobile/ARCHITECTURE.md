# Arquitetura do Modo Umamusume

`umamusume-mobile/` gera um APK independente e usa o mesmo backend e banco do
aplicativo principal.

## Composição

- `features/umamusume`: model, repository, serviço HTTP, controller e telas da carreira;
- `features/training-plan`: repository somente leitura com
  `listTrainingPlans()` e `getTrainingPlan(id)`;
- `features/workout-session/views`: apresentação própria da sessão;
- `@training/workout-session-core`: controller, repository, HTTP, timer e storage compartilhados;
- `@training/training-contracts`: DTOs compartilhados;
- `@training/mobile-api`: cliente criado com a URL deste aplicativo.

A stack contém `UmaCareer`, `UmaCareerCreate`, `UmaCareerList`,
`UmaCareerHistory` e `Session`. Ao reabrir, a carreira e a sessão ativas são
recuperadas em paralelo; “Continuar treino” aparece somente quando o ID da
sessão coincide com o turno pendente.

O app não inclui editor de ficha, biblioteca, dashboard normal ou treinos
legados. Não há assets oficiais, integrações externas, autenticação ou suporte
offline.
