Continue o desenvolvimento do repositório `training-app` a partir do commit:

f7768cdcc2c1472aeb2fa5213c8d3fccce8bffc9

Nesta etapa, isole o Modo Umamusume em um novo aplicativo Expo, mantendo um único backend Spring Boot compartilhado.

Não implemente ainda wger, Groq, Health Connect, API Ninjas ou redesign visual amplo.

==================================================
1. OBJETIVO
==================================================

Ao final devem existir dois APKs independentes:

1. aplicativo principal de treino;
2. aplicativo do Modo Umamusume.

Ambos devem consumir o mesmo backend e o mesmo banco.

O app principal não deve mais conter telas, controllers ou rotas do Modo Umamusume.

O app Umamusume deve manter o loop atual completo:

- criar e consultar carreiras;
- iniciar, retomar, concluir e abandonar treino;
- aceitar, concluir e cancelar atividade;
- descanso completo;
- consultar histórico;
- consultar carreiras anteriores.

==================================================
2. ESTRUTURA
==================================================

Preservar:

backend/
web/

Manter o app principal em:

mobile/

Criar:

umamusume-mobile/

Criar workspace compartilhado:

packages/
├── mobile-api/
├── workout-session-core/
└── training-contracts/

Criar `package.json` na raiz com npm workspaces para:

- mobile;
- umamusume-mobile;
- packages/*.

Não mover backend ou web para outras pastas nesta etapa.

==================================================
3. PACKAGE mobile-api
==================================================

Extrair para `packages/mobile-api` somente infraestrutura compartilhada:

- criação do cliente HTTP;
- normalização de erros;
- tipos comuns de erro;
- suporte a base URL configurável.

Não guardar uma URL global dentro do package.

A API deve ser criada por aplicativo:

createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL
})

Não colocar tokens ou secrets no package.

==================================================
4. PACKAGE training-contracts
==================================================

Extrair contratos TypeScript compartilhados necessários pelos dois aplicativos:

- TrainingPlan resumido;
- TrainingPlanDay;
- RestActivity;
- ExerciseCategory;
- WorkoutSession;
- SessionExercise;
- SetLog;
- DTOs de início e conclusão de sessão.

Não extrair componentes visuais.

Evitar tipos duplicados entre os aplicativos.

==================================================
5. PACKAGE workout-session-core
==================================================

Extrair a parte não visual da feature de sessão:

- model;
- regras puras do timer;
- repository;
- implementação HTTP configurável;
- storage do cronômetro;
- controller `useWorkoutSessionController`;
- testes Vitest correspondentes.

O package pode depender de React e AsyncStorage, mas não deve depender:

- do tema do app principal;
- de React Navigation;
- das telas do app principal;
- do Modo Umamusume.

Cada aplicativo será responsável pela própria navegação e apresentação.

==================================================
6. APLICATIVO PRINCIPAL
==================================================

Em `mobile/`:

Remover:

- `src/features/umamusume`;
- controller da carreira;
- rotas UmaCareer;
- item “Modo Umamusume” da tela Mais;
- integração de origem Umamusume na Home;
- qualquer import Umamusume em App.tsx.

Manter:

- ficha semanal;
- biblioteca;
- dashboard;
- histórico;
- execução de sessões;
- fluxo legado enquanto ainda existir.

Adaptar a sessão para usar `workout-session-core`.

No app principal, toda sessão deve utilizar origem NORMAL.

Não excluir endpoints ou tabelas Umamusume do backend.

==================================================
7. NOVO APLICATIVO UMAMUSUME
==================================================

Criar `umamusume-mobile` com:

- Expo;
- TypeScript;
- React Navigation;
- safe areas;
- Vitest;
- configuração de API independente.

Mover ou adaptar para ele:

- model da carreira;
- repository da carreira;
- serviço HTTP;
- controller da carreira;
- tela principal;
- criação;
- lista de carreiras;
- histórico.

O app Umamusume deve consumir:

- `mobile-api`;
- `training-contracts`;
- `workout-session-core`.

Criar uma tela própria de execução de sessão em:

umamusume-mobile/src/features/workout-session/views/

Ela deve usar o controller compartilhado, mas pode reaproveitar inicialmente a estrutura visual da tela atual.

Não copiar o controller ou repository de sessão.

==================================================
8. PLANOS DE TREINO NO APP UMAMUSUME
==================================================

O app Umamusume precisa apenas de acesso de leitura às fichas para criar uma carreira.

Criar repository somente leitura:

- listTrainingPlans();
- getTrainingPlan(id).

Não incluir no app Umamusume:

- editor de ficha;
- biblioteca de exercícios;
- criação de exercício;
- dashboard normal;
- treinos legados.

A ficha continua sendo criada e editada pelo app principal.

==================================================
9. IDENTIDADE DOS APLICATIVOS
==================================================

Configurar identificadores diferentes.

App principal:

- name: Training App;
- slug: training-app;
- scheme: trainingapp;
- android.package: com.konazin.trainingapp.

App Umamusume:

- name: Modo Umamusume;
- slug: modo-umamusume;
- scheme: modouma;
- android.package: com.konazin.modouma.

Usar placeholders locais para ícone e splash caso ainda não existam assets definitivos.

Não usar imagens, nomes de personagens, logotipos ou assets oficiais.

==================================================
10. NAVEGAÇÃO DO APP UMAMUSUME
==================================================

Criar stack própria:

- UmaCareer;
- UmaCareerCreate;
- UmaCareerList;
- UmaCareerHistory;
- Session.

Ao iniciar treino:

- endpoint Umamusume devolve a sessão;
- controller compartilhado adota a sessão;
- navegar para Session.

Ao concluir ou abandonar:

- atualizar a carreira;
- voltar para UmaCareer.

Ao reabrir:

- recuperar carreira ativa;
- recuperar sessão ativa;
- comparar o workoutSessionId com o turno pendente;
- oferecer “Continuar treino” somente quando os IDs coincidirem.

==================================================
11. BACKEND
==================================================

Não dividir o backend.

Não duplicar controllers ou serviços.

Manter:

- `/api/training-plans`;
- `/api/sessions`;
- `/api/umamusume/careers`.

Alterar backend apenas se algum DTO de leitura mínimo for necessário para o novo app.

Não adicionar autenticação nesta etapa.

==================================================
12. APP.TSX
==================================================

Reduzir o `mobile/App.tsx` removendo toda composição Umamusume.

O `umamusume-mobile/App.tsx` deve compor apenas:

- controller da carreira;
- controller da sessão;
- repository de fichas somente leitura;
- navegação própria.

Não criar um novo controller global.

==================================================
13. CI
==================================================

Atualizar `.github/workflows/ci.yml`.

Manter jobs:

- backend;
- mobile;
- web.

Adicionar job:

umamusume-mobile:
- npm ci;
- npm run typecheck;
- npm run test;
- npx expo install --check;
- EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist.

Configurar cache npm corretamente para os workspaces.

==================================================
14. DOCUMENTAÇÃO
==================================================

Atualizar README e documentos de arquitetura.

Documentar:

- dois aplicativos;
- um backend;
- packages compartilhados;
- comandos para iniciar cada app;
- variáveis `EXPO_PUBLIC_API_URL`;
- identificadores Android;
- responsabilidades de cada aplicativo.

Deixar explícito que APIs externas e redesign ainda não foram implementados.

==================================================
15. FORA DO ESCOPO
==================================================

Não implementar:

- wger;
- Groq;
- Health Connect;
- API Ninjas;
- cálculo de calorias;
- geração de ficha por IA;
- eventos narrativos;
- corridas;
- skills;
- autenticação;
- offline;
- SQLite;
- redesign amplo;
- alterações nas regras da carreira.

==================================================
16. VALIDAÇÃO
==================================================

Backend:
cd backend
mvn test

App principal:
cd mobile
npm ci
npm run typecheck
npm run test
npx expo install --check
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

App Umamusume:
cd umamusume-mobile
npm ci
npm run typecheck
npm run test
npx expo install --check
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

Web:
cd web
npm ci
npm run build

Raiz:
npm install
git diff --check

Não declarar conclusão se algum comando falhar.

==================================================
17. ENTREGA
==================================================

Informar:

1. nova estrutura do monorepo;
2. código movido para cada package;
3. código removido do app principal;
4. estrutura do app Umamusume;
5. identificadores dos aplicativos;
6. alterações no CI;
7. resultado de cada validação;
8. limitações restantes.

Não avançar para integrações externas ou redesign nesta etapa.