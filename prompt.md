Continue o desenvolvimento do repositório `training-app` a partir do commit:

b22358dfa4d3d9336325e5f51b1b787456088f58

Esta etapa deve transformar o aplicativo padrão em um aplicativo local-only,
autônomo e offline-first.

O aplicativo deve funcionar integralmente no celular sem depender de:

- backend Spring Boot;
- VPS;
- computador na rede local;
- endereço IP;
- PostgreSQL;
- H2 externo;
- API disponível durante a inicialização;
- conexão com a internet.

APIs externas, Wger, vídeos remotos, IA e integrações futuras poderão existir,
mas somente como recursos opcionais iniciados explicitamente pelo usuário.

O runtime principal do aplicativo padrão deve ser 100% TypeScript.

Não reescrever o backend Spring em Node.js.

O backend atual deve permanecer no repositório apenas como referência,
ferramenta opcional de desenvolvimento e possível suporte futuro a sincronização.

Não gerar APK nesta etapa.

==================================================
1. OBJETIVO FINAL
==================================================

Ao final desta etapa, o usuário deve conseguir, sem internet:

1. abrir o aplicativo;
2. criar e editar exercícios;
3. criar, editar, duplicar, ativar e arquivar fichas;
4. configurar segunda a domingo;
5. configurar dias de descanso;
6. iniciar uma sessão;
7. editar e concluir séries;
8. usar o cronômetro de descanso;
9. pausar e retomar uma sessão;
10. fechar e reabrir o aplicativo durante o treino;
11. concluir ou abandonar uma sessão;
12. consultar o histórico;
13. consultar estatísticas;
14. fechar e reabrir o aplicativo sem perder dados;
15. exportar um backup;
16. restaurar um backup.

Nenhuma dessas operações pode chamar uma API HTTP.

==================================================
2. ARQUITETURA-ALVO
==================================================

Organizar o código assim:

packages/
├── training-domain/
│   ├── model/
│   ├── repositories/
│   ├── services/
│   ├── rules/
│   ├── errors/
│   └── tests/
│
├── training-local-db/
│   ├── database/
│   ├── migrations/
│   ├── repositories/
│   ├── mappers/
│   ├── backup/
│   └── tests/
│
├── mobile-api/
│   └── infraestrutura opcional para APIs externas
│
└── training-contracts/
    └── manter apenas durante a transição, com reexports quando necessário

mobile/
├── src/
│   ├── features/
│   ├── controllers/
│   ├── navigation/
│   ├── integrations/
│   ├── bootstrap/
│   └── theme/
└── assets/
    └── seeds/

O package `training-domain` não pode depender de:

- React;
- React Native;
- Expo;
- SQLite;
- fetch;
- Axios;
- componentes visuais.

O package `training-local-db` pode depender de:

- expo-sqlite;
- training-domain.

O app mobile compõe:

- controllers React;
- repositories SQLite;
- serviços do domínio;
- telas.

==================================================
3. DESTINO DO BACKEND
==================================================

Não excluir:

backend/
web/
compose.beta.yml

Porém:

- o app padrão não deve importar nem depender deles;
- o APK não deve precisar deles;
- o CI do app padrão não deve exigir backend rodando;
- o README deve marcar o backend como opcional e legado para o runtime mobile;
- remover qualquer afirmação de que o backend é necessário para usar o app.

Não migrar o backend Java para TypeScript.

Portar para TypeScript apenas as regras necessárias ao funcionamento local do
aplicativo.

==================================================
4. DEPENDÊNCIAS MOBILE
==================================================

Instalar com Expo:

npx expo install expo-sqlite
npx expo install expo-file-system
npx expo install expo-sharing
npx expo install expo-document-picker
npx expo install expo-secure-store

Usar `expo-sqlite` diretamente.

Não adicionar ORM pesado nesta etapa.

Não adicionar servidor local embutido no APK.

Não usar Realm, Firebase, Supabase ou serviço remoto.

==================================================
5. BANCO SQLITE
==================================================

Criar banco:

training.db

Na inicialização:

- ativar foreign keys;
- usar journal mode WAL;
- executar migrations antes de montar as telas;
- falhar de maneira visível caso uma migration não possa ser aplicada.

Criar tabela:

schema_migrations

Campos:

- version;
- name;
- checksum;
- applied_at.

Migrations devem ser:

- ordenadas;
- transacionais;
- idempotentes apenas pelo controle de versão;
- nunca reaplicadas silenciosamente;
- testáveis em banco novo;
- testáveis em upgrade.

==================================================
6. SCHEMA LOCAL
==================================================

Criar tabelas locais para:

exercise_definitions
exercise_media
training_plans
training_plan_days
training_day_exercises
rest_activities
workout_sessions
workout_session_exercises
workout_set_logs
app_settings
schema_migrations

Usar IDs SQLite INTEGER PRIMARY KEY.

Datas devem ser armazenadas como ISO-8601 UTC em TEXT.

Booleans devem ser armazenados como INTEGER 0 ou 1.

Enums devem possuir CHECK constraints quando viável.

Campos JSON, como configurações e estatísticas livres, devem ser serializados
de forma centralizada e validados ao carregar.

==================================================
7. EXERCÍCIOS
==================================================

ExerciseDefinition local deve possuir:

- id;
- name;
- normalizedName;
- description;
- primaryMuscleGroup;
- secondaryMuscleGroups;
- equipment;
- category;
- difficulty;
- instructions;
- notes;
- unilateral;
- timed;
- source;
- externalId opcional;
- sourceUrl opcional;
- licenseName opcional;
- licenseUrl opcional;
- author opcional;
- archived;
- createdAt;
- updatedAt.

ExerciseSource:

- SYSTEM;
- CUSTOM;
- WGER.

ExerciseMedia local deve possuir:

- id;
- exerciseDefinitionId;
- type;
- source;
- externalId opcional;
- remoteUrl opcional;
- localUri opcional;
- thumbnailRemoteUrl opcional;
- thumbnailLocalUri opcional;
- mimeType;
- width;
- height;
- durationSeconds;
- main;
- sortOrder;
- licenseName;
- licenseUrl;
- author;
- sourceUrl;
- downloadedAt;
- createdAt;
- updatedAt.

O app deve funcionar quando todas as URLs remotas estiverem indisponíveis.

==================================================
8. SEED LOCAL
==================================================

Criar:

mobile/assets/seeds/exercises.v1.json

Incluir apenas exercícios de sistema com textos próprios do projeto.

Não embutir automaticamente:

- catálogo completo Wger;
- vídeos Wger;
- imagens Wger;
- conteúdo de terceiros sem atribuição.

O seed deve:

- rodar apenas no primeiro banco vazio;
- ser idempotente;
- possuir versão;
- nunca sobrescrever dados do usuário;
- criar quantidade suficiente para montar uma ficha inicial.

Criar uma ficha demonstrativa local apenas na primeira instalação.

A ficha deve poder ser apagada ou arquivada normalmente.

==================================================
9. PORTAR REGRAS PARA TYPESCRIPT
==================================================

Portar do backend Java para `training-domain` as regras necessárias:

- normalização de nome;
- validação de exercício;
- sete dias obrigatórios na ficha;
- somente um weekday por ficha;
- criação de ficha;
- duplicação;
- ativação;
- arquivamento;
- ordenação de exercícios;
- configuração de séries;
- início de sessão;
- pausa;
- retomada;
- conclusão;
- abandono;
- cálculo de duração;
- cálculo de volume;
- cálculo de estatísticas do histórico;
- seleção de mídia principal;
- snapshots de exercícios da sessão.

Não portar controllers HTTP ou DTOs específicos de REST.

As regras devem ser funções ou serviços TypeScript puros e testáveis.

==================================================
10. REMOVER DOMÍNIO LEGADO WORKOUT
==================================================

Não recriar o domínio legado `Workout` no SQLite.

Remover do aplicativo padrão:

- criação de Workout legado;
- listagem de Workout legado;
- dependências do dashboard em Workout legado;
- modelos mobile usados somente por esse fluxo.

O dashboard deve ser calculado exclusivamente a partir de:

- fichas;
- sessões;
- exercícios realizados;
- séries concluídas;
- volume;
- duração.

Preservar backend legado somente dentro de `backend/`.

==================================================
11. REPOSITORIES DO DOMÍNIO
==================================================

Criar interfaces em `training-domain`:

ExerciseLibraryRepository
TrainingPlanRepository
WorkoutSessionRepository
DashboardRepository
SettingsRepository
BackupRepository

Operações mínimas:

ExerciseLibraryRepository:
- list;
- findById;
- search;
- create;
- update;
- archive;
- restore.

TrainingPlanRepository:
- list;
- findById;
- create;
- update;
- duplicate;
- activate;
- archive;
- updateDay;
- addExercise;
- updateExercise;
- removeExercise;
- reorderExercise;
- addRestActivity;
- updateRestActivity;
- removeRestActivity.

WorkoutSessionRepository:
- getActive;
- getHistory;
- findById;
- start;
- updateSet;
- addSet;
- removeSet;
- updateExerciseStatus;
- pause;
- resume;
- complete;
- abandon.

Implementar todas em `training-local-db`.

Nenhum repository SQLite deve retornar linhas cruas para a UI.

Usar mappers explícitos entre:

- database rows;
- domain models.

==================================================
12. TRANSAÇÕES E INTEGRIDADE
==================================================

Usar transações SQLite nas operações compostas.

Exemplos:

- criar ficha e sete dias;
- duplicar ficha;
- iniciar sessão e copiar snapshots;
- concluir sessão;
- restaurar backup;
- arquivar objetos relacionados.

Garantir no banco somente uma sessão ativa.

Usar campo:

active_slot INTEGER UNIQUE

Regras:

- sessão IN_PROGRESS ou PAUSED usa active_slot = 1;
- sessão COMPLETED ou ABANDONED usa active_slot = NULL.

Duas chamadas rápidas para iniciar sessão devem resultar em:

- uma sessão criada;
- uma falha de domínio estável;
- nenhum registro parcial.

==================================================
13. SNAPSHOT DAS SESSÕES
==================================================

Uma sessão não pode depender da ficha depois de iniciada.

Persistir snapshot de:

- nome da ficha;
- nome do dia;
- nome do exercício;
- grupo muscular;
- categoria;
- configuração planejada;
- quantidade de séries;
- repetições;
- carga;
- duração;
- distância;
- descanso;
- vídeo principal;
- imagem principal;
- autoria;
- licença;
- fonte.

Editar ou excluir um exercício da biblioteca não pode alterar o histórico.

==================================================
14. BOOTSTRAP LOCAL
==================================================

Remover do bootstrap:

- `/api/health`;
- validação de API URL;
- token de backend;
- tentativas de rede;
- estado “backend indisponível”;
- refresh HTTP ao voltar do background.

Novo fluxo:

1. abrir SQLite;
2. ativar pragmas;
3. executar migrations;
4. executar seed se necessário;
5. recuperar sessão ativa;
6. recuperar ficha ativa;
7. carregar dashboard local;
8. liberar navegação.

Estados:

- inicializando banco;
- migrando dados;
- restaurando backup;
- pronto;
- erro local.

A mensagem de erro deve informar:

- migration que falhou;
- ação segura disponível;
- opção de exportar diagnóstico;
- opção de tentar novamente.

Não apagar o banco automaticamente em caso de erro.

==================================================
15. CONTROLLERS MOBILE
==================================================

Manter controllers React nas features.

Eles devem depender apenas das interfaces do domínio.

Remover imports de:

- trainingApi;
- apiClient;
- HTTP repositories para dados principais.

Composition root do app deve criar:

- database;
- SQLite repositories;
- domain services;
- controllers.

Não usar service locator global escondido.

Não expor setters React diretamente.

==================================================
16. CRONÔMETRO
==================================================

O cronômetro deve continuar funcionando sem servidor.

Pode permanecer no AsyncStorage durante esta etapa, desde que:

- seja associado ao ID local da sessão;
- sobreviva ao fechamento do app;
- seja descartado quando a sessão terminar;
- não seja a fonte de verdade dos dados do treino.

Documentar que AsyncStorage contém apenas estado transitório e preferências,
não dados principais.

==================================================
17. BACKUP E RESTAURAÇÃO
==================================================

Criar formato:

training-backup-v1.json

Conteúdo mínimo:

- schemaVersion;
- appVersion;
- exportedAt;
- exercises;
- media metadata;
- trainingPlans;
- trainingPlanDays;
- trainingDayExercises;
- restActivities;
- sessions;
- sessionExercises;
- setLogs;
- settings.

Não incluir:

- chaves de API;
- tokens;
- arquivos de vídeo;
- caches;
- dados temporários do player.

Exportar usando:

- expo-file-system;
- expo-sharing.

Importar usando:

- expo-document-picker.

Restauração deve:

1. ler arquivo;
2. validar JSON;
3. validar versão;
4. validar todas as referências;
5. abrir transação;
6. restaurar dados;
7. fazer rollback completo em erro;
8. preservar o banco atual caso a validação falhe.

Antes de restaurar, criar backup automático do estado atual.

Adicionar opções:

- Exportar backup;
- Importar backup;
- Apagar todos os dados;
- Recriar dados iniciais.

“Apagar todos os dados” deve exigir confirmação explícita.

==================================================
18. APIS FUTURAS
==================================================

Criar portas em TypeScript:

ExternalExerciseCatalogProvider
AiTrainingPlanProvider
HealthDataProvider
RemoteBackupProvider

Não implementar provedores reais nesta etapa.

Regras obrigatórias:

- nenhuma integração executa no bootstrap;
- nenhuma integração executa em background sem consentimento;
- usuário inicia cada ação;
- tela deve explicar quais dados serão enviados;
- usuário pode revisar resultado antes de salvar;
- falha externa não afeta dados locais;
- resposta externa só entra no SQLite após validação;
- integração pode ser desativada;
- aplicativo principal continua funcional sem configuração externa.

==================================================
19. SEGREDOS DE APIS
==================================================

Criar abstração:

SecretsRepository

Implementação futura baseada em `expo-secure-store`.

Não armazenar segredos em:

- SQLite;
- AsyncStorage;
- app.json;
- eas.json;
- EXPO_PUBLIC_*;
- backup JSON.

Nesta etapa, apenas preparar a abstração e testes.

Não adicionar chave real.

==================================================
20. WGER
==================================================

O Wger deixa de ser dependência estrutural.

Nesta etapa:

- remover sync automático;
- remover dependência do backend para catálogo;
- manter os campos WGER no modelo;
- manter suporte para mídia remota;
- não realizar chamadas Wger.

Preparar futura ação explícita:

“Importar exercícios do Wger”

O fluxo futuro será:

1. usuário abre integrações;
2. escolhe filtros;
3. aplicativo consulta Wger;
4. mostra pré-visualização;
5. usuário seleciona exercícios;
6. dados são salvos localmente;
7. aplicativo continua funcionando offline.

Não implementar esse fluxo agora.

==================================================
21. VÍDEOS
==================================================

Exercícios sem vídeo devem funcionar completamente offline.

Vídeo remoto:

- não carregar na lista;
- não carregar no bootstrap;
- só tentar reproduzir depois de ação do usuário;
- mostrar mensagem clara quando offline;
- não impedir execução do treino.

Preparar modelo para futuro download local com `localUri`.

Não implementar download completo nesta etapa.

Não remover `expo-video`.

==================================================
22. CONFIGURAÇÃO ANDROID
==================================================

Remover a dependência obrigatória de:

EXPO_PUBLIC_API_URL
EXPO_PUBLIC_API_TOKEN

Remover configuração criada apenas para HTTP local:

usesCleartextTraffic: true

Manter:

- package `com.konazin.trainingapp`;
- slug `training-app`;
- scheme `trainingapp`;
- Expo project ID atual;
- configuração de APK preview.

O app não deve declarar permissões de rede além das exigidas por APIs opcionais
e reprodução remota.

==================================================
23. DOCUMENTAÇÃO
==================================================

Atualizar README.

Deixar explícito:

- app padrão é local-only;
- SQLite é a fonte de verdade;
- nenhuma VPS é necessária;
- nenhum servidor é necessário;
- internet é opcional;
- vídeos remotos e futuras APIs podem exigir internet;
- backend Java é opcional;
- dados são apagados ao desinstalar o app, salvo backup externo;
- usuário deve exportar backups regularmente.

Mover a documentação do backend local para uma seção:

docs/OPTIONAL_SERVER.md

Marcar:

docs/LOCAL_ANDROID_APK.md

como obsoleto ou substituí-lo por documentação do APK local-only.

Criar:

docs/LOCAL_DATA_ARCHITECTURE.md
docs/BACKUP_AND_RESTORE.md
docs/LOCAL_ONLY_SMOKE_TEST.md

==================================================
24. TESTES DO DOMÍNIO
==================================================

Adicionar testes puros para:

- normalização;
- criação de ficha;
- sete dias;
- duplicação;
- ativação;
- arquivamento;
- ordenação;
- configuração de exercícios;
- uma sessão ativa;
- snapshots;
- atualização de série;
- pausa;
- retomada;
- conclusão;
- abandono;
- volume;
- duração;
- dashboard;
- seleção de mídia principal.

==================================================
25. TESTES SQLITE
==================================================

Adicionar testes para:

- banco vazio;
- migrations;
- segunda inicialização;
- seed idempotente;
- foreign keys;
- rollback;
- criação de ficha;
- duplicação;
- sessão completa;
- recuperação de sessão ativa;
- histórico preservado;
- constraint de sessão ativa;
- atualização após reiniciar database provider;
- export;
- import;
- import inválido;
- rollback da restauração;
- reset local.

Os testes não podem depender de backend.

==================================================
26. TESTE DE PROCESSO MORTO
==================================================

Criar teste ou roteiro automatizado equivalente:

1. inicializar banco;
2. criar ficha;
3. iniciar sessão;
4. editar séries;
5. persistir cronômetro;
6. destruir controllers;
7. fechar database provider;
8. reabrir database provider;
9. reconstruir controllers;
10. confirmar sessão, séries e cronômetro.

Não considerar apenas hot reload.

==================================================
27. CI
==================================================

O job principal do app padrão deve executar:

npm ci
npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain
npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm exec --workspace=training-mobile -- expo install --check
npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist
git diff --check

O backend pode continuar em job separado, mas sua falha não deve ser necessária
para validar a arquitetura local-only do APK.

Não chamar Wger, IA ou outras APIs no CI.

==================================================
28. SMOKE TEST LOCAL-ONLY
==================================================

Criar checklist:

1. ativar modo avião;
2. abrir app pela primeira vez;
3. confirmar seed;
4. criar exercício;
5. criar ficha;
6. editar todos os dias;
7. iniciar sessão;
8. editar séries;
9. usar cronômetro;
10. fechar app;
11. reabrir;
12. retomar sessão;
13. concluir;
14. consultar histórico;
15. reiniciar celular;
16. abrir novamente;
17. exportar backup;
18. apagar dados;
19. importar backup;
20. confirmar restauração.

Todo esse roteiro deve funcionar em modo avião.

==================================================
29. FORA DO ESCOPO
==================================================

Não implementar nesta etapa:

- IA;
- Groq;
- Wger online;
- download de vídeo;
- Health Connect;
- sincronização em nuvem;
- contas;
- login;
- servidor Node;
- backend TypeScript;
- VPS;
- Firebase;
- Supabase;
- telemetria;
- analytics;
- push notifications;
- alterações no app Umamusume;
- APK final.

==================================================
30. VALIDAÇÃO
==================================================

Raiz:

npm ci

Domínio:

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

Banco local:

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

App padrão:

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile

Compatibilidade:

npm run typecheck --workspace=umamusume-mobile

Expo:

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

Geral:

git diff --check

Não declarar conclusão se qualquer validação falhar.

==================================================
31. ENTREGA
==================================================

Ao finalizar, informar:

1. estrutura criada;
2. regras portadas do Java para TypeScript;
3. tabelas e migrations SQLite;
4. repositories locais;
5. dependências HTTP removidas;
6. fluxo de bootstrap local;
7. seed local;
8. backup e restauração;
9. domínio legado removido;
10. testes adicionados;
11. resultado de todas as validações;
12. pontos ainda dependentes de internet;
13. limitações restantes.

Não gerar o APK nesta etapa.