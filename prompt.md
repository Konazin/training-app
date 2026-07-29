Continue o desenvolvimento do repositório `training-app` a partir do commit:

72274a1ffe1d350c70f039b96fc5315121e3a454

Nesta etapa, corrija somente os bloqueadores encontrados na verificação da
fundação do beta do aplicativo padrão.

Não implemente IA, novas features de treino, redesign, Health Connect, calorias
ou alterações funcionais no app Umamusume.

Não gere o APK ainda. O APK será gerado somente depois desta validação.

==================================================
1. PERFIL DE TESTE
==================================================

Garantir que toda execução padrão de:

mvn test

use automaticamente o perfil `test`.

Não depender de variável externa ou configuração manual.

Pode usar:

- backend/src/test/resources/application.properties;
- configuração do Maven Surefire;
- ou anotação de teste compartilhada.

Adicionar um teste que confirme:

- perfil `test` ativo;
- datasource H2 em memória;
- console H2 desabilitado;
- Flyway desabilitado nesse perfil;
- nenhum arquivo `data/trainingdb` criado pelos testes.

Os testes não podem tocar o banco persistente de desenvolvimento.

==================================================
2. ISOLAR SEED DE DEMONSTRAÇÃO
==================================================

O seed de treinos, exercícios e fichas demonstrativas deve rodar somente em
desenvolvimento.

Separar:

- inicialização técnica obrigatória;
- dados demonstrativos.

Regras:

- `WorkoutSessionLock` deve existir em todos os ambientes por migration ou
  inicialização técnica idempotente;
- dados de demonstração devem usar `@Profile("dev")` ou propriedade
  `app.seed-demo.enabled`;
- produção deve iniciar sem treino ou ficha demonstrativa;
- testes devem criar seus próprios fixtures, sem depender do seed dev.

Adicionar teste com perfil prod/test verificando ausência do conteúdo demo.

==================================================
3. VALIDAR POSTGRESQL E FLYWAY
==================================================

Adicionar teste de integração real com PostgreSQL, preferencialmente usando
Testcontainers.

O teste deve:

1. iniciar PostgreSQL limpo;
2. ativar configurações equivalentes ao perfil prod;
3. executar Flyway V1;
4. inicializar Hibernate com `ddl-auto=validate`;
5. confirmar as tabelas principais;
6. confirmar a linha `workout_session_lock`;
7. reiniciar o contexto no mesmo banco;
8. confirmar que a segunda inicialização não altera nem recria o schema.

Cobrir pelo menos:

- exercise_definitions;
- exercise_media;
- training_plans;
- training_plan_days;
- workout_sessions;
- workout_session_lock;
- wger_sync_runs;
- uma_careers;
- uma_career_turns.

O CI deve executar esse teste em PostgreSQL real.

==================================================
4. CONTRATO DE IDIOMA WGER
==================================================

Corrigir a resolução de idioma.

Ordem:

1. código exato normalizado, por exemplo `pt-br`;
2. código base, por exemplo `pt`;
3. fallback exato configurado;
4. código base do fallback;
5. primeira tradução válida somente como último recurso.

Atualizar fixtures para representar códigos regionais reais.

Adicionar testes:

- pt-br exato;
- pt-br caindo para pt;
- português ausente e fallback inglês;
- nenhum idioma conhecido.

Não chamar Wger real no CI.

==================================================
5. ENDPOINT DE SINCRONIZAÇÃO
==================================================

Criar DTO:

WgerSyncRequest

Campos:

- dryRun;
- maxPages;
- onlyWithVideo.

Aceitar JSON em:

POST /api/integrations/wger/sync

Regras:

- `maxPages` da requisição sobrescreve a configuração somente naquela execução;
- zero significa todas;
- `onlyWithVideo` ignora exercícios sem vídeo;
- dry run não persiste;
- manter proteção contra execução simultânea.

Preservar compatibilidade temporária com o query param `dryRun`, caso seja
simples, mas documentar o corpo JSON como contrato principal.

==================================================
6. DIAGNÓSTICO DA SINCRONIZAÇÃO
==================================================

Não ignorar exceções silenciosamente.

O resumo deve conter no máximo 10 erros sanitizados:

- externalId;
- etapa;
- mensagem curta.

Nunca incluir stack trace ou resposta completa do upstream.

Comportamento HTTP:

- nenhuma página processada por indisponibilidade do Wger: 503;
- algumas páginas processadas e falha posterior: resposta com status PARTIAL;
- itens individuais inválidos: continuar lote e retornar PARTIAL;
- execução completa sem erros: COMPLETED.

Persistir o resultado da execução.

Ao iniciar o backend, runs antigas presas em RUNNING devem ser marcadas como
INTERRUPTED.

==================================================
7. UPSERT DE MÍDIA
==================================================

Não apagar e recriar todas as mídias a cada sincronização.

Fazer upsert por:

(source, externalId)

Regras:

- preservar ID local da mídia existente;
- atualizar URL, thumbnail, dimensões, duração, licença e autoria;
- criar mídia nova;
- remover ou arquivar somente mídia WGER ausente numa sincronização completa;
- nunca alterar mídia CUSTOM ou LEGACY;
- dry run não alterar dados.

Adicionar teste comprovando que duas sincronizações mantêm os mesmos IDs locais.

==================================================
8. FONTE E ATRIBUIÇÃO
==================================================

Para `ExerciseDefinition.sourceUrl`, preferir:

1. `translation.licenseObjectUrl`, quando HTTPS;
2. URL pública humana válida fornecida pelo Wger;
3. endpoint API apenas como último fallback.

Cada mídia continua usando a própria licença, autoria e sourceUrl.

Adicionar testes para:

- URL do objeto da tradução;
- fallback;
- URL HTTP rejeitada;
- metadados ausentes.

==================================================
9. BOOTSTRAP VERDADEIRO
==================================================

Os refreshers usados pelo bootstrap não podem engolir falhas.

Escolher uma estratégia explícita:

- `refresh()` retorna boolean;
- ou `refreshOrThrow()` separado.

O bootstrap deve ficar em `error` quando:

- health falhar;
- sessão ativa falhar;
- ficha falhar;
- dashboard falhar;
- biblioteca inicial falhar.

As telas normais não devem ser liberadas parcialmente.

Refresh de background pode preservar os dados anteriores, mas deve informar
falha sem limpar o estado válido.

Adicionar testes para:

- health 200 e dashboard 500;
- health 200 e token inválido nos dados;
- todas as cargas aprovadas;
- duas chamadas simultâneas de bootstrap;
- retorno do background.

==================================================
10. PLAYER DE VÍDEO
==================================================

Corrigir o retry sem modificar a URL remota.

Não adicionar `?retry=`.

Usar remount controlado, `replace`/`replaceAsync` ou mecanismo equivalente do
expo-video mantendo a URL original.

Mostrar:

- poster ou placeholder durante loading;
- retry somente em erro;
- controles somente quando player disponível;
- mensagem de erro legível.

Ao fechar detalhe ou modal:

- pausar;
- liberar o player;
- não alterar séries ou cronômetro.

Adicionar testes das regras puras de apresentação.

==================================================
11. BIBLIOTECA E CONSULTAS
==================================================

Completar os filtros mobile já suportados pelo backend:

- músculo;
- equipamento;
- categoria;
- origem;
- com vídeo.

Evitar N+1 de mídias na listagem.

Usar uma destas estratégias:

- batch fetching;
- entity graph adequado para paginação;
- projeção específica;
- consulta separada em lote pelos IDs da página.

Não tornar `media` EAGER globalmente.

Adicionar teste de repository ou métrica de consulta que evite uma consulta de
mídia por exercício.

==================================================
12. DOCUMENTAÇÃO
==================================================

Atualizar README e documentos do beta.

Remover afirmações de que Wger e Flyway não foram implementados.

Documentar:

- Wger e vídeos;
- perfis;
- seed somente dev;
- PostgreSQL e Flyway;
- sincronização;
- token beta;
- Docker;
- EAS preview;
- limitações do token embutido no APK;
- passos para configurar ambiente preview no EAS.

Marcar o checklist manual como executado somente para itens realmente testados.

==================================================
13. CI
==================================================

Backend:

- mvn test;
- teste PostgreSQL/Flyway;
- mvn package -DskipTests.

Frontend:

- npm ci na raiz;
- testes dos packages;
- typecheck e testes do app padrão;
- typecheck do Umamusume;
- export Android do app padrão.

Infra:

- docker compose -f compose.beta.yml config;
- docker compose -f compose.beta.yml build.

Não chamar o Wger real no CI.

==================================================
14. SMOKE TEST REAL
==================================================

Após os testes automatizados:

1. subir compose com PostgreSQL vazio;
2. confirmar primeira e segunda inicialização;
3. habilitar Wger;
4. sincronizar uma página real;
5. confirmar tradução escolhida;
6. abrir exercício com vídeo;
7. repetir sync e confirmar IDs de mídia preservados;
8. iniciar sessão;
9. abrir e fechar vídeo;
10. concluir sessão;
11. confirmar token correto e incorreto;
12. interromper backend e conferir tela de erro.

Registrar o resultado em `docs/BETA_SMOKE_TEST.md`.

Não inserir token ou senha reais no documento.

==================================================
15. VALIDAÇÃO FINAL
==================================================

Backend:

cd backend
mvn test
mvn package -DskipTests

Raiz:

npm ci
npm run test --workspace=@training/mobile-api
npm run test --workspace=@training/workout-session-core
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run typecheck --workspace=umamusume-mobile

Expo:

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist

Web:

cd web
npm ci
npm run build

Docker:

docker compose -f compose.beta.yml config
docker compose -f compose.beta.yml build

Geral:

git diff --check

Não declarar conclusão se qualquer comando falhar.

==================================================
16. ENTREGA
==================================================

Informar:

1. perfil de teste ativado;
2. seed isolado;
3. resultado do teste PostgreSQL/Flyway;
4. correções no contrato Wger;
5. estratégia de upsert de mídia;
6. correção do bootstrap;
7. correção do player;
8. resultado do smoke real;
9. resultado de todos os comandos;
10. bloqueadores restantes.

Não gerar o APK ainda.