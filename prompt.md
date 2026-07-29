Continue o desenvolvimento do repositório `training-app` a partir do commit:

8e20b5e106122b5133cf7dcdd3ff041178e552c6

Esta é a sprint final antes do primeiro APK local-only para teste de sete dias.

Trabalhe apenas no aplicativo padrão:

mobile/
packages/training-domain/
packages/training-local-db/

Não altere funcionalmente:

- backend/
- web/
- umamusume-mobile/

Ao final, se todas as validações passarem, gere um APK preview instalável pelo
EAS.

Não implementar Wger online, IA, Health Connect, download de vídeo, contas,
sincronização em nuvem ou novas funcionalidades de treino.

==================================================
1. OBJETIVO
==================================================

Ao final:

- apagar dados deve permanecer apagado após reiniciar;
- seed deve rodar somente na primeira instalação ou por ação explícita;
- falhas do bootstrap não podem deixar conexões SQLite abertas;
- backups automáticos devem ser visíveis e restauráveis;
- operações compostas devem possuir testes com transação SQLite real;
- data da sessão deve respeitar o calendário local;
- validações de domínio devem ser consistentes;
- a versão do app deve possuir fonte única;
- testes e export Android devem passar;
- APK preview deve ser gerado;
- smoke test em modo avião deve ser iniciado ou documentado como pendente.

==================================================
2. METADADOS DE INSTALAÇÃO E SEED
==================================================

Criar tabela local separada:

app_metadata

Campos:

- key TEXT PRIMARY KEY;
- value_json TEXT NOT NULL;
- updated_at TEXT NOT NULL.

Criar migration nova, sem alterar migrations já publicadas.

Usar chaves:

- installation.initialized;
- seed.version;
- seed.suppressed;
- last.automatic.backup;
- last.successful.startup.

Regras:

1. Em uma instalação nova:
   - `installation.initialized` ainda não existe;
   - executar seed;
   - gravar installation.initialized = true;
   - gravar seed.version;
   - seed.suppressed = false.

2. Em banco existente vazio, mas já inicializado:
   - não recriar seed automaticamente.

3. Ao executar “Apagar todos os dados”:
   - apagar dados do usuário;
   - preservar app_metadata;
   - gravar seed.suppressed = true;
   - não recriar seed ao reabrir.

4. Ao executar “Recriar dados iniciais”:
   - apagar dados do usuário;
   - executar seed explicitamente;
   - gravar seed.suppressed = false;
   - atualizar seed.version.

5. Restore de backup:
   - não deve apagar metadados técnicos da instalação;
   - deve atualizar last.successful.startup apenas após bootstrap completo.

Não usar apenas a contagem de exercícios ou fichas para decidir se o seed roda.

==================================================
3. RESET SEPARADO
==================================================

Separar operações:

clearUserData()
resetToSeed()
initializeFirstInstallation()

`BackupRepository.reset()` deve apagar somente dados do usuário.

Não deve apagar:

- schema_migrations;
- app_metadata.

Adicionar operação explícita ao repository local para recriar seed.

Não depender de `seedEmptyDatabase()` após um reset comum.

==================================================
4. BOOTSTRAP E CONEXÃO SQLITE
==================================================

Corrigir `useLocalRuntime`.

Regras:

- antes de abrir uma nova conexão, fechar conexão residual;
- se migration falhar, fechar banco;
- se seed falhar, fechar banco;
- se criação de repositories falhar, fechar banco;
- `databaseRef.current` deve ser null após qualquer falha;
- retry deve iniciar com estado limpo;
- duas tentativas simultâneas devem compartilhar a mesma Promise;
- unmount deve fechar a conexão somente uma vez.

Estrutura recomendada:

let openedDatabase: SqlDatabase | null = null

try {
  openedDatabase = await openTrainingDatabase(...)
  await initializeInstallation(...)
  const repositories = createLocalRepositories(openedDatabase)
  databaseRef.current = openedDatabase
  setRepositories(repositories)
  setState('ready')
} catch (cause) {
  if (openedDatabase) await openedDatabase.close()
  databaseRef.current = null
  setRepositories(null)
  ...
}

Não guardar a conexão em databaseRef antes de toda a inicialização terminar.

Adicionar testes para:

- falha em migration;
- falha em seed;
- retry após falha;
- duas chamadas simultâneas;
- unmount durante inicialização;
- conexão fechada exatamente uma vez.

==================================================
5. BACKUPS AUTOMÁTICOS
==================================================

Criar modelo:

AutomaticBackupInfo

Campos:

- uri;
- fileName;
- createdAt;
- sizeBytes;
- reason.

Reasons:

- BEFORE_IMPORT;
- BEFORE_ERASE;
- BEFORE_RESET_SEED.

Ao criar backup automático:

- salvar o arquivo em Paths.document;
- obter tamanho do arquivo;
- armazenar metadados em app_metadata;
- manter no máximo os 5 backups automáticos mais recentes;
- excluir o mais antigo ao exceder o limite.

Criar serviço mobile:

automaticBackupService

Operações:

- list();
- create(reason);
- restore(uri);
- share(uri);
- delete(uri);
- deleteAll();

Não guardar conteúdo do backup dentro do SQLite.

==================================================
6. INTERFACE DE BACKUPS
==================================================

Na tela “Mais”, adicionar seção:

BACKUPS AUTOMÁTICOS

Mostrar para cada item:

- data e hora;
- motivo;
- tamanho formatado;
- Restaurar;
- Compartilhar;
- Excluir.

Antes de restaurar backup automático:

- pedir confirmação;
- criar um novo backup automático do estado atual;
- validar arquivo;
- restaurar transacionalmente;
- atualizar controllers;
- mostrar sucesso ou erro.

Depois de apagar ou recriar seed, mostrar:

“Backup de segurança criado em <data>.”

Não exibir URI interna longa para o usuário.

==================================================
7. BACKUP E RESTAURAÇÃO
==================================================

Endurecer validação do backup.

Validar:

- IDs positivos e únicos por coleção;
- referências;
- enums;
- datas ISO válidas;
- valores numéricos finitos;
- valores não negativos onde necessário;
- no máximo uma ficha ativa;
- no máximo uma sessão ativa;
- status compatível com active_slot;
- sete dias únicos para cada ficha;
- sort_order sem duplicação por proprietário;
- set_number sem duplicação por exercício;
- nenhum secret.* em settings;
- app_metadata não deve ser importado.

Não aceitar:

- NaN;
- Infinity;
- números convertidos implicitamente de strings;
- objetos com prototype inesperado;
- collections excessivamente grandes sem limite.

Limites iniciais:

- 10.000 exercícios;
- 20.000 mídias;
- 1.000 fichas;
- 20.000 sessões;
- 500.000 séries;
- arquivo máximo de 25 MB.

Documentar esses limites.

==================================================
8. TRANSAÇÃO REAL NOS TESTES
==================================================

Substituir o adapter de teste que executa:

transaction: operation(database)

por uma implementação realmente transacional.

Pode usar:

- sqlite3 com processo persistente;
- better-sqlite3 somente como dependência de desenvolvimento;
- ou outro adapter Node compatível.

A transação deve executar:

BEGIN IMMEDIATE;
COMMIT;
ROLLBACK;

Não simular transação apenas com callbacks.

Adicionar testes:

1. restore falha depois de inserir exercícios:
   - banco anterior permanece intacto.

2. criação de ficha falha no quarto dia:
   - nenhuma ficha parcial permanece.

3. início de sessão falha ao inserir uma série:
   - nenhuma sessão ou snapshot parcial permanece.

4. duplicação falha ao copiar atividade:
   - nenhuma cópia parcial permanece.

5. reset falha:
   - dados anteriores permanecem.

==================================================
9. DATA LOCAL
==================================================

Criar função pura em training-domain:

localDateKey(date: Date): string

Formato:

YYYY-MM-DD

Usar:

- getFullYear();
- getMonth();
- getDate();

Não usar:

- toISOString().slice(0, 10).

Substituir na criação da sessão.

Adicionar testes:

- 29/07/2026 22:30 em UTC-3;
- 31/12 perto da meia-noite;
- 01/01 perto da meia-noite;
- meses com zero à esquerda;
- dias com zero à esquerda.

Não alterar timestamps completos, que continuam ISO UTC.

==================================================
10. VALIDAÇÕES DE DOMÍNIO
==================================================

Criar e usar funções centralizadas:

validateTrainingPlanInput
validateTrainingPlanDayInput
validateDayExerciseInput
validateRestActivityInput
validateSetLogInput
validateRpe
validateOptionalNonNegativeNumber

Regras mínimas:

Ficha:

- nome obrigatório;
- categoria obrigatória;
- dificuldade obrigatória;
- endDate não pode ser anterior a startDate.

Dia:

- título obrigatório;
- duração estimada >= 0.

Exercício da ficha:

- sets >= 1;
- minReps >= 0;
- maxReps >= minReps;
- plannedLoad >= 0 quando preenchido;
- plannedDurationSeconds >= 0 quando preenchido;
- plannedDistance >= 0 quando preenchido;
- restSeconds >= 0;
- RPE entre 0 e 10 quando preenchido.

Atividade de descanso:

- nome obrigatório;
- duração estimada >= 0;
- categoria obrigatória.

Série:

- reps >= 0;
- load >= 0;
- durationSeconds >= 0;
- distance >= 0;
- RPE entre 0 e 10 quando preenchido.

Conclusão da sessão:

- overallRpe entre 0 e 10 quando preenchido.

Create e update devem usar as mesmas funções.

Adicionar CHECK constraints numa migration apenas quando compatível com dados
existentes.

==================================================
11. CORREÇÃO DE UPDATE DA FICHA
==================================================

`TrainingPlanRepository.update()` deve validar exatamente como create.

Não permitir nome vazio ou datas inválidas.

`updateDay`, `updateExercise`, `addRestActivity` e `updateRestActivity` também
devem usar validações de domínio antes de executar SQL.

Não duplicar regras dentro dos repositories.

==================================================
12. SESSÕES
==================================================

Endurecer operações de sessão.

`resume` deve atualizar apenas:

WHERE id = ? AND status = 'PAUSED' AND active_slot = 1

`finishSession` deve verificar `changes`.

Caso duas conclusões sejam disparadas:

- uma conclui;
- a segunda retorna transição inválida;
- não duplica histórico.

`updateSet`, `addSet`, `removeSet` e status de exercício devem rejeitar sessão
PAUSED, salvo se a regra atual explicitamente permitir edição pausada.

Escolher e documentar uma regra consistente.

Recomendação:

- sessão PAUSED não aceita alterações em séries;
- usuário deve retomar antes de editar.

Adicionar testes concorrentes ou sequenciais equivalentes.

==================================================
13. CÁLCULO DE DURAÇÃO
==================================================

Verificar sessão concluída enquanto estava pausada.

A duração deve excluir:

- pausas já acumuladas;
- intervalo entre pausedAt e completedAt, caso concluída pausada.

Adicionar testes:

- concluir IN_PROGRESS;
- concluir PAUSED;
- várias pausas;
- relógio anterior ao startedAt;
- pausedAt inválido.

Dados inválidos devem gerar erro de domínio, não duração negativa silenciosa.

==================================================
14. VERSÃO ÚNICA
==================================================

Remover versão hardcoded:

'0.1.1'

do App.tsx.

Usar:

expo-constants

Instalar com:

npx expo install expo-constants

Ler:

Constants.expoConfig?.version

Criar helper:

getAppVersion()

Fallback somente para desenvolvimento:

'0.0.0-dev'

Alinhar:

- mobile/package.json version;
- mobile/app.json expo.version;
- backup appVersion.

Usar versão:

0.2.0

Incrementar:

android.versionCode: 3

Motivo:

- mudança arquitetural de cliente-servidor para local-only;
- não é simples patch 0.1.2.

==================================================
15. APP.JSON
==================================================

Confirmar:

- package: com.konazin.trainingapp;
- slug: training-app;
- scheme: trainingapp;
- projectId preservado;
- usesCleartextTraffic removido;
- expo-sqlite configurado;
- expo-secure-store configurado;
- expo-video preservado;
- nenhuma variável de API necessária.

Não adicionar INTERNET manualmente.

A permissão padrão de rede pode permanecer devido a vídeos e APIs futuras.

==================================================
16. TESTES DE CONTROLLER
==================================================

Adicionar testes para:

- refresh local;
- criação de exercício;
- atualização inválida;
- iniciar sessão duas vezes;
- editar série;
- pausar;
- tentar editar pausada;
- retomar;
- concluir;
- conclusão dupla;
- abandonar;
- recuperar cronômetro;
- limpar cronômetro ao concluir;
- backup automático antes de apagar;
- restore atualizando todos os controllers.

Não testar apenas funções puras.

==================================================
17. TESTE DE PROCESSO MORTO
==================================================

Endurecer o teste existente.

Fluxo:

1. abrir banco;
2. inicializar instalação;
3. criar ficha e exercício;
4. iniciar sessão;
5. completar uma série;
6. iniciar cronômetro;
7. pausar sessão;
8. fechar repositories;
9. fechar conexão;
10. criar nova conexão real;
11. recriar repositories;
12. recuperar sessão;
13. recuperar série;
14. recuperar cronômetro;
15. retomar;
16. concluir;
17. fechar novamente;
18. reabrir;
19. consultar histórico.

Nenhuma instância de repository antiga pode ser reutilizada.

==================================================
18. CI
==================================================

O job `local-mobile` deve ser obrigatório.

Não usar `continue-on-error` nele.

Executar:

npm ci
npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain
npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run typecheck --workspace=umamusume-mobile
npm exec --workspace=training-mobile -- expo install --check
npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist
git diff --check

Backend e infra podem continuar opcionais.

Não chamar APIs externas.

==================================================
19. VALIDAÇÃO LOCAL
==================================================

Executar na raiz:

npm ci

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile

npm run typecheck --workspace=umamusume-mobile

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

git diff --check

Não avançar para o APK se qualquer comando falhar.

==================================================
20. INSPEÇÃO EAS
==================================================

No diretório mobile:

npx eas-cli@latest whoami
npx eas-cli@latest project:info

Executar:

npx eas-cli@latest build:inspect \
  --platform android \
  --stage pre-build \
  --profile preview \
  --output .eas-inspect \
  --force

Validar:

- applicationId com.konazin.trainingapp;
- versionName 0.2.0;
- versionCode 3;
- expo-sqlite incluído;
- expo-file-system incluído;
- expo-document-picker incluído;
- expo-sharing incluído;
- expo-secure-store incluído;
- expo-video incluído;
- nenhuma URL de backend embutida;
- nenhum token;
- nenhum usesCleartextTraffic habilitado manualmente;
- buildType APK.

Adicionar `.eas-inspect/` ao gitignore se ainda não estiver.

==================================================
21. GERAR APK
==================================================

Somente após todas as validações:

cd mobile

npx eas-cli@latest build \
  --platform android \
  --profile preview \
  --non-interactive \
  --json

Capturar:

- build ID;
- status;
- URL;
- commit;
- versionName;
- versionCode.

Aguardar o status FINISHED.

Baixar o artefato:

mkdir -p ../artifacts

npx eas-cli@latest build:download \
  --build-id <BUILD_ID> \
  --non-interactive \
  --output ../artifacts/training-app-local-0.2.0.apk

Caso `--output` não seja suportado pela versão atual:

- baixar pelo URL do artefato;
- salvar manualmente no mesmo caminho.

Calcular:

sha256sum ../artifacts/training-app-local-0.2.0.apk

Não adicionar APK ao Git.

==================================================
22. SMOKE TEST RÁPIDO
==================================================

Caso exista aparelho ou emulador conectado:

adb install -r artifacts/training-app-local-0.2.0.apk

Ativar modo avião.

Executar no mínimo:

1. abrir app;
2. confirmar seed;
3. abrir ficha;
4. iniciar sessão;
5. completar série;
6. iniciar cronômetro;
7. pausar;
8. fechar app;
9. reabrir;
10. recuperar sessão;
11. retomar;
12. concluir;
13. consultar histórico;
14. exportar backup;
15. apagar dados;
16. fechar e reabrir;
17. confirmar que seed não reapareceu;
18. restaurar backup;
19. confirmar histórico restaurado.

Atualizar:

docs/LOCAL_ONLY_SMOKE_TEST.md

Marcar apenas itens realmente executados.

Se não houver Android conectado:

- gerar o APK;
- marcar smoke físico como pendente;
- não declarar que ele passou.

==================================================
23. CRITÉRIOS DE CONCLUSÃO
==================================================

A sprint pode terminar em um destes estados:

APROVADO:

- testes passam;
- export passa;
- EAS inspect passa;
- APK gerado;
- hash registrado.

CÓDIGO APROVADO, BUILD BLOQUEADO:

- testes passam;
- export passa;
- mas falta login Expo, credencial ou acesso ao projeto.

REPROVADO:

- qualquer teste ou export falha;
- migration falha;
- restore não é atômico;
- seed reaparece após apagar.

Não declarar APK criado sem build ID e arquivo real.

==================================================
24. ENTREGA
==================================================

Informar:

1. commit final;
2. migrations adicionadas;
3. política de seed;
4. política de reset;
5. correção do bootstrap;
6. backups automáticos;
7. validações adicionadas;
8. transações reais testadas;
9. versão e versionCode;
10. resultados dos testes;
11. resultado do export;
12. resultado do EAS inspect;
13. build ID;
14. URL do build;
15. caminho do APK;
16. tamanho;
17. SHA-256;
18. smoke executado ou pendente;
19. limitações restantes.

Não implementar novas features.