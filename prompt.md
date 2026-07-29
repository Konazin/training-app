Continue o desenvolvimento do repositório `training-app` a partir do commit:

0cc1a0578a19cb7e102176ad6599bdbd93ddafb3

Nesta etapa, trabalhe prioritariamente no aplicativo padrão localizado em:

mobile/

Implemente em uma única passada:

1. integração da biblioteca com exercícios e vídeos do Wger;
2. endurecimento do backend e do app padrão para beta privado;
3. preparação para gerar um APK instalável posteriormente;
4. verificação automatizada e smoke test documentado.

Não implemente IA.

Não evolua a interface, as mecânicas ou as features do aplicativo:

umamusume-mobile/

Alterações em packages compartilhados devem continuar compatíveis com o
umamusume-mobile, mas nenhuma tela ou funcionalidade nova deve ser adicionada
a ele nesta etapa.

Não gerar nem publicar o APK nesta etapa. Preparar a configuração e validar
tudo primeiro. O APK será criado numa etapa separada após aprovação.

==================================================
1. OBJETIVO
==================================================

Ao final:

- a biblioteca local deve importar exercícios do Wger;
- exercícios com vídeos devem exibir demonstração no app padrão;
- exercícios sem vídeo devem continuar funcionando;
- vídeos não devem ser baixados para o backend nesta etapa;
- autoria, fonte e licença devem ser preservadas;
- o backend deve possuir perfil seguro para beta com PostgreSQL;
- somente uma sessão ativa deve ser garantida transacionalmente;
- o cliente mobile deve tratar timeout, indisponibilidade e configuração inválida;
- o app padrão deve possuir uma inicialização confiável;
- Docker e configuração EAS devem estar preparados;
- todos os testes e validações devem passar antes da entrega.

==================================================
2. DESCOBERTA DO CONTRATO WGER
==================================================

Antes de implementar o client, consultar o OpenAPI oficial configurado por:

WGER_API_BASE_URL=https://wger.de/api/v2

Não presumir nomes de campos apenas com base em documentação antiga.

Identificar pelo OpenAPI atual os endpoints necessários para:

- exercícios agrupados por exercício-base;
- traduções;
- músculos;
- equipamentos;
- imagens;
- vídeos;
- licenças.

Usar preferencialmente os recursos atuais equivalentes a:

- exercisebaseinfo;
- exercise;
- exerciseimage;
- video;
- license;
- muscle;
- equipment;
- language.

Registrar no código somente os DTOs externos estritamente necessários.

Não gerar um client gigantesco a partir do OpenAPI inteiro.

Criar fixtures JSON locais, sanitizadas, baseadas nas respostas reais usadas
pela integração.

Os testes automatizados não podem depender da disponibilidade de wger.de.

==================================================
3. CONFIGURAÇÃO WGER
==================================================

Adicionar configurações:

WGER_INTEGRATION_ENABLED=false
WGER_API_BASE_URL=https://wger.de/api/v2
WGER_LANGUAGE=pt-br
WGER_FALLBACK_LANGUAGE=en
WGER_REQUEST_TIMEOUT_SECONDS=15
WGER_PAGE_SIZE=100
WGER_SYNC_MAX_PAGES=0

Regras:

- zero em WGER_SYNC_MAX_PAGES significa processar todas as páginas;
- integração desabilitada não deve impedir o backend de iniciar;
- falha no Wger não deve impedir o uso de exercícios já sincronizados;
- nunca registrar respostas completas que possam conter dados desnecessários;
- nunca aceitar uma URL arbitrária enviada pelo mobile como base do Wger.

==================================================
4. MODELO DE ORIGEM DO EXERCÍCIO
==================================================

Adicionar enum:

ExerciseSource:
- SYSTEM
- CUSTOM
- WGER

Em ExerciseDefinition, adicionar:

- source;
- externalId;
- externalBaseId;
- sourceUrl;
- licenseName;
- licenseUrl;
- author;
- lastSyncedAt;
- upstreamUpdatedAt opcional.

Constraints:

- source e externalId devem ser únicos quando externalId não for nulo;
- exercícios CUSTOM continuam usando a criação atual;
- exercícios SYSTEM existentes devem ser migrados para source SYSTEM;
- exercícios personalizados existentes devem ser migrados para source CUSTOM;
- Wger não pode sobrescrever exercícios CUSTOM;
- normalizedName não deve ser o identificador principal da sincronização Wger.

Manter temporariamente `mediaUrl` para compatibilidade com dados antigos, mas
marcá-lo como legado na documentação.

==================================================
5. MODELO DE MÍDIA
==================================================

Criar entidade ExerciseMedia.

Campos mínimos:

- id;
- exerciseDefinition;
- type;
- source;
- externalId;
- url;
- thumbnailUrl;
- mimeType;
- width opcional;
- height opcional;
- durationSeconds opcional;
- main;
- sortOrder;
- licenseName;
- licenseUrl;
- author;
- sourceUrl;
- createdAt;
- updatedAt.

Enums:

ExerciseMediaType:
- IMAGE
- VIDEO

ExerciseMediaSource:
- CUSTOM
- WGER
- LEGACY

Constraints:

- source e externalId únicos quando externalId existir;
- não duplicar mídia em sincronizações repetidas;
- URL limitada a HTTPS para mídia Wger;
- URLs relativas devem ser resolvidas usando a origem configurada;
- não armazenar bytes do vídeo;
- não fazer proxy de streaming pelo backend nesta etapa.

Adicionar relacionamento ordenado em ExerciseDefinition.

Preservar uma mídia principal:

- vídeo principal preferido para demonstração;
- imagem principal usada como poster;
- fallback para primeira mídia disponível.

==================================================
6. SINCRONIZAÇÃO WGER
==================================================

Criar feature isolada:

backend/src/main/java/com/trainingapp/integration/wger/
├── client/
├── config/
├── dto/
├── mapper/
├── service/
└── controller/

Usar Spring RestClient ou cliente HTTP compatível com Spring MVC.

Implementar:

WgerExerciseClient
WgerExerciseMapper
WgerExerciseSyncService

Fluxo:

1. buscar páginas de exercícios;
2. resolver tradução pt-BR;
3. usar inglês como fallback;
4. resolver músculos e equipamentos;
5. buscar ou associar imagens;
6. buscar ou associar vídeos;
7. mapear categoria interna;
8. sanitizar descrição e instruções;
9. persistir exercício;
10. persistir mídia;
11. armazenar licença e autoria;
12. registrar resultado resumido da sincronização.

Não salvar HTML arbitrário.

Converter descrições para texto seguro, preservando parágrafos e passos.

Mapeamento de categorias deve ficar centralizado e testado.

Exemplo inicial:

- força e musculação → STRENGTH;
- cardio → CARDIO;
- alongamento → STRETCHING;
- mobilidade → MOBILITY;
- recuperação → RECOVERY;
- categoria desconhecida → TECHNIQUE ou categoria neutra documentada.

Não espalhar esse mapeamento por services diferentes.

==================================================
7. COMPORTAMENTO DA SINCRONIZAÇÃO
==================================================

A sincronização deve ser idempotente.

Deve:

- criar exercícios ainda inexistentes;
- atualizar registros WGER existentes;
- atualizar mídias existentes;
- adicionar novas mídias;
- preservar exercícios CUSTOM;
- preservar exercícios SYSTEM;
- não excluir automaticamente exercícios usados em fichas ou sessões;
- não arquivar tudo se uma página do Wger falhar;
- não considerar uma sincronização parcial como completa.

Quando um registro remoto desaparecer:

- marcar como não encontrado somente após uma sincronização completa;
- não apagar fisicamente;
- arquivar apenas se não estiver sendo usado;
- registrar essa decisão no relatório.

Processar registros individualmente:

- um exercício inválido não deve abortar toda a sincronização;
- registrar quantidade importada, atualizada, ignorada e com erro;
- limitar exemplos de erros retornados para não gerar respostas enormes.

==================================================
8. ENDPOINTS DE ADMINISTRAÇÃO WGER
==================================================

Adicionar:

POST /api/integrations/wger/sync
GET /api/integrations/wger/status

O endpoint de sync deve aceitar opcionalmente:

{
  "maxPages": 1,
  "onlyWithVideo": false,
  "dryRun": false
}

Regras:

- não permitir duas sincronizações simultâneas;
- retornar 409 se uma sincronização já estiver rodando;
- dryRun não altera o banco;
- status deve informar:
  - integração habilitada;
  - execução atual;
  - última execução;
  - duração;
  - páginas processadas;
  - importados;
  - atualizados;
  - ignorados;
  - erros;
  - mensagem resumida.

Esses endpoints devem ser protegidos pelo token privado do beta.

Não criar botão de sincronização no app mobile nesta etapa.

==================================================
9. API DA BIBLIOTECA LOCAL
==================================================

Expandir ExerciseDefinitionResponse com:

- source;
- externalId;
- sourceUrl;
- licenseName;
- licenseUrl;
- author;
- media;
- hasVideo;
- primaryImage;
- primaryVideo.

Não enviar entidades JPA diretamente.

Adicionar ou preservar:

GET /api/exercise-library
GET /api/exercise-library/{id}

A listagem deve suportar paginação real no repository/banco:

- page;
- size;
- query;
- muscle;
- equipment;
- category;
- source;
- hasVideo;
- includeArchived.

Não carregar todos os exercícios para depois filtrar em memória.

Usar Pageable e queries adequadas.

Resposta paginada deve conter:

- content;
- page;
- size;
- totalElements;
- totalPages;
- first;
- last.

Manter temporariamente compatibilidade com o cliente antigo apenas se isso não
obrigar a manter duas implementações completas.

==================================================
10. DETALHE DO EXERCÍCIO NO MOBILE
==================================================

No app padrão, criar feature ou views apropriadas:

mobile/src/features/exercise-library/

Criar rota:

ExerciseDetail

A tela deve mostrar:

- nome;
- grupo muscular principal;
- grupos secundários;
- equipamento;
- categoria;
- dificuldade;
- descrição;
- instruções;
- vídeo, quando disponível;
- imagem poster, quando disponível;
- origem;
- autoria;
- licença;
- link textual para a fonte.

Não usar WebView para tocar vídeo.

Instalar com Expo:

npx expo install expo-video

Usar:

- useVideoPlayer;
- VideoView;
- controles nativos;
- contentFit contain;
- reprodução manual;
- loop opcional após o usuário iniciar;
- player pausado ao sair da tela.

Não usar expo-av.

==================================================
11. REGRAS DE REPRODUÇÃO
==================================================

Não reproduzir automaticamente vídeos na lista.

Não montar um VideoView para cada item da FlatList.

Somente a tela de detalhe ou modal ativo deve possuir player.

Regras:

- autoplay desabilitado;
- áudio inicialmente respeita configuração normal do aparelho;
- botão de play acessível;
- mostrar loading;
- mostrar erro de reprodução;
- oferecer “Tentar novamente”;
- usar poster quando houver;
- placeholder quando não houver poster;
- não travar a tela se o vídeo falhar;
- desmontar ou liberar o player ao sair;
- não permitir dois vídeos tocando simultaneamente.

Se houver vários vídeos:

- mostrar apenas o principal inicialmente;
- permitir trocar por uma lista compacta;
- não criar carrossel com vários players ativos.

==================================================
12. BIBLIOTECA MOBILE
==================================================

Refatorar LibraryScreen.

Substituir ScrollView com map por FlatList.

Adicionar:

- paginação;
- busca com debounce;
- filtros por músculo, equipamento e categoria;
- filtro “Com vídeo”;
- pull-to-refresh;
- loading inicial;
- loading de próxima página;
- erro com retry;
- estado vazio.

Cada item deve mostrar:

- thumbnail ou placeholder;
- nome;
- músculo;
- equipamento;
- badge de origem;
- badge “Vídeo” quando existir.

Ao tocar, abrir ExerciseDetail.

A criação de exercício personalizado deve continuar funcionando.

Exercícios personalizados sem mídia devem usar placeholder.

==================================================
13. VÍDEO DURANTE A SESSÃO
==================================================

No WorkoutSessionScreen do app padrão:

- adicionar ação “Ver execução” no cabeçalho de cada exercício quando houver vídeo;
- abrir modal ou tela de detalhe compacta;
- não abandonar nem desmontar a sessão;
- preservar valores digitados nas séries;
- vídeo começa pausado;
- fechar o modal pausa e libera o player;
- cronômetro de descanso continua funcionando;
- nenhum vídeo deve iniciar automaticamente ao avançar exercícios.

Para isso, os snapshots da sessão devem incluir mídia mínima:

- exerciseDefinitionId;
- primaryVideoUrl;
- primaryImageUrl;
- attribution resumida.

A sessão histórica deve continuar independente de futuras alterações na biblioteca.

Não copiar todas as mídias para a entidade da sessão, apenas a mídia principal
necessária para a demonstração.

==================================================
14. LICENÇA E ATRIBUIÇÃO
==================================================

Persistir e exibir:

- origem Wger;
- nome da licença;
- autor, quando disponível;
- sourceUrl;
- licenseUrl.

Não esconder atribuição dentro de uma tela inacessível.

Na tela de detalhe, mostrar uma seção:

Fonte e licença

Não afirmar que toda mídia possui a mesma licença.

Cada item deve usar os metadados fornecidos pelo Wger.

Se licença ou autoria estiverem ausentes:

- mostrar “Informação não fornecida pela fonte”;
- não inventar valores;
- registrar ausência no sync.

==================================================
15. PERFIS DE BACKEND PARA BETA
==================================================

Criar:

- application.properties;
- application-dev.properties;
- application-test.properties;
- application-prod.properties.

Dev:

- H2 persistente;
- console H2 habilitado;
- integração Wger desabilitada por padrão;
- ddl-auto=update permitido temporariamente.

Test:

- H2 em memória;
- console desabilitado;
- Wger substituído por stub;
- banco isolado por execução.

Prod:

- PostgreSQL obrigatório;
- nenhuma URL H2 de fallback;
- ddl-auto=validate;
- console H2 desabilitado;
- logs SQL detalhados desabilitados;
- stack trace interna não retornada;
- integração Wger configurável.

Adicionar driver PostgreSQL.

==================================================
16. FLYWAY
==================================================

Adicionar Flyway para produção.

Criar migrations que permitam iniciar PostgreSQL vazio contendo:

- biblioteca;
- mídias;
- fichas;
- dias;
- exercícios das fichas;
- atividades de descanso;
- sessões;
- exercícios e séries das sessões;
- carreiras e turnos;
- locks e tabelas de controle;
- índices;
- constraints.

Não depender de Hibernate para criar o schema de produção.

Dev pode manter a estratégia atual temporariamente, mas isso deve estar
documentado como limitação.

Documentar baseline para instalações existentes.

Não executar schema.sql destrutivo em produção.

==================================================
17. UMA SESSÃO ATIVA TRANSACIONAL
==================================================

Corrigir a corrida de WorkoutSessionService.start.

Não aceitar:

existsByStatusIn(...)
seguido de insert sem lock.

Criar estratégia portável entre H2 e PostgreSQL, preferencialmente:

- tabela sentinela;
- uma única linha;
- lock pessimista durante start, complete e abandon.

Duas requisições concorrentes devem resultar em:

- uma sessão criada;
- um HTTP 409;
- somente uma sessão IN_PROGRESS ou PAUSED no banco.

Criar exceção de domínio específica.

Adicionar teste concorrente com threads e barreira/latch.

Preservar o app padrão e os endpoints usados pelo Umamusume, sem alterar
interfaces daquele aplicativo.

==================================================
18. HEALTH E GATE DO BETA
==================================================

Criar:

GET /api/health

Resposta:

{
  "status": "UP",
  "database": "UP",
  "version": "...",
  "timestamp": "..."
}

Verificar o banco sem expor configuração sensível.

Adicionar gate opcional:

APP_API_TOKEN

Em produção:

- obrigatório;
- todas as rotas /api/**, exceto /api/health, exigem Bearer token;
- token inválido retorna 401;
- token nunca aparece em logs;
- usar comparação constante ou apropriada.

Em dev/test:

- permitir desabilitar.

Documentar que isso é apenas um gate de beta single-user, não autenticação
multiusuário.

==================================================
19. CLIENTE HTTP COMPARTILHADO
==================================================

Endurecer packages/mobile-api.

createApiClient deve aceitar:

- baseUrl;
- accessToken;
- timeoutMs com padrão 12000;
- fetch injetável;
- retryGet com padrão 1.

Adicionar:

- AbortController;
- composição com signal externo;
- timeout;
- Authorization Bearer;
- classificação:
  - CONFIGURATION;
  - NETWORK;
  - TIMEOUT;
  - CANCELLED;
  - HTTP;
- retry somente de GET;
- retry apenas para:
  - erro de rede;
  - 502;
  - 503;
  - 504;
- nenhum retry automático para mutações;
- preservação de status e fields.

Adicionar testes cobrindo todos esses casos.

Não registrar accessToken.

==================================================
20. INICIALIZAÇÃO DO APP PADRÃO
==================================================

Usar no app padrão:

EXPO_PUBLIC_API_URL
EXPO_PUBLIC_API_TOKEN

Em build preview ou production:

- API_URL ausente é erro de configuração;
- não usar fallback para localhost;
- trim nas variáveis;
- não exibir token.

Ao abrir o app padrão:

1. validar configuração;
2. chamar /api/health;
3. carregar sessão ativa;
4. carregar ficha;
5. carregar biblioteca inicial;
6. liberar navegação.

Estados:

- conectando;
- configuração inválida;
- backend indisponível;
- timeout;
- conectado.

Não mostrar dashboard vazio enquanto ainda não foi possível consultar o backend.

Adicionar:

- tela de erro com retry;
- endereço da API sem token;
- Error Boundary;
- verificação ao voltar do background;
- proteção contra refresh simultâneo.

Não implementar offline completo.

==================================================
21. DOCKER PARA BETA
==================================================

Criar:

- backend/Dockerfile;
- compose.beta.yml;
- .env.beta.example.

Serviços:

- backend;
- PostgreSQL.

Requisitos:

- multi-stage build;
- usuário não-root quando viável;
- volume persistente;
- healthcheck PostgreSQL;
- healthcheck API;
- restart policy;
- PostgreSQL não exposto publicamente;
- nenhuma senha real;
- token e URL Wger por env.

Documentar:

- subir;
- atualizar;
- visualizar logs;
- backup por pg_dump;
- restauração;
- localização do volume.

==================================================
22. PREPARAÇÃO DO APK PADRÃO
==================================================

Criar apenas em:

mobile/eas.json

Perfis:

development:
- developmentClient true;
- distribution internal.

preview:
- distribution internal;
- Android buildType apk;
- environment preview.

production:
- Android AAB;
- environment production.

Adicionar em mobile/app.json:

- android.versionCode inicial;
- versão coerente;
- package existente preservado:
  com.konazin.trainingapp

Não modificar eas.json ou identidade do umamusume-mobile.

Não colocar API token no Git.

Não executar EAS Build ainda.

Documentar o comando futuro:

eas build -p android --profile preview

==================================================
23. TESTES DA INTEGRAÇÃO WGER
==================================================

Adicionar testes para:

- paginação;
- tradução pt-BR;
- fallback inglês;
- URL relativa;
- URL absoluta;
- exercício sem vídeo;
- exercício com um vídeo;
- exercício com múltiplos vídeos;
- imagem poster;
- licença;
- autoria ausente;
- HTML sanitizado;
- categoria desconhecida;
- sync idempotente;
- custom não sobrescrito;
- erro individual não abortar lote;
- falha de página tornar sync parcial;
- dry run não persistir;
- duas sincronizações simultâneas retornarem conflito.

Usar servidor HTTP stub ou fixture.

Não chamar a API real no CI.

==================================================
24. TESTES DO APP PADRÃO
==================================================

Adicionar testes para funções e controllers testáveis:

- paginação da biblioteca;
- deduplicação de páginas;
- filtros;
- seleção de mídia principal;
- fallback sem vídeo;
- erro de player representado no estado;
- bootstrap conectado;
- bootstrap timeout;
- bootstrap API indisponível;
- configuração ausente;
- refresh ao voltar do background sem duplicação.

Não exigir testes visuais complexos de React Native nesta etapa.

==================================================
25. CI
==================================================

Atualizar CI para usar o lockfile raiz corretamente.

Executar npm ci na raiz e comandos por workspace.

Validar:

- mobile-api;
- workout-session-core;
- training-mobile.

Manter typecheck básico do umamusume-mobile porque packages compartilhados
foram alterados, mas não adicionar novas features ou testes específicos nele.

Manter:

- backend;
- web.

Não rodar EAS Build no CI.

Não chamar Wger real no CI.

==================================================
26. SMOKE TEST MANUAL DOCUMENTADO
==================================================

Criar documento:

docs/BETA_SMOKE_TEST.md

Checklist mínimo:

Backend:
- iniciar Postgres limpo;
- migrations;
- health;
- token correto;
- token incorreto;
- sync Wger de uma página;
- sync repetido;
- reiniciar preservando dados.

Biblioteca:
- buscar;
- filtrar;
- abrir exercício com vídeo;
- abrir exercício sem vídeo;
- vídeo com poster;
- falha de rede no vídeo;
- atribuição;
- criar exercício custom.

Sessão:
- iniciar;
- abrir vídeo sem perder dados;
- editar séries;
- cronômetro;
- pausar;
- fechar e reabrir;
- concluir;
- abandonar;
- duas tentativas concorrentes de início.

Aplicativo:
- backend indisponível;
- token inválido;
- timeout;
- voltar do background;
- tema claro e escuro;
- telas entre 360 e 430 px.

==================================================
27. FORA DO ESCOPO
==================================================

Não implementar:

- Groq;
- geração por IA;
- Health Connect;
- calorias;
- download local de vídeos;
- upload de vídeos;
- CDN;
- contas;
- JWT de usuários;
- multi-tenancy;
- offline completo;
- SQLite mobile;
- mudanças visuais no Umamusume;
- eventos ou corridas Umamusume;
- APK do Umamusume;
- publicação;
- Play Store;
- EAS Build real.

==================================================
28. VALIDAÇÃO
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

Expo padrão:

npm exec --workspace=training-mobile -- expo install --check
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

Nenhuma chamada real ao Wger deve ser necessária para completar a validação
automatizada.

Não declarar conclusão se algum comando falhar.

==================================================
29. ENTREGA
==================================================

Informar:

1. contrato Wger utilizado;
2. endpoints externos utilizados;
3. modelo de mídia criado;
4. política de sincronização;
5. quantidade de fixtures e testes;
6. alterações no app padrão;
7. comportamento do player;
8. licenças e atribuições;
9. configuração PostgreSQL e Flyway;
10. lock da sessão ativa;
11. cliente HTTP;
12. bootstrap do aplicativo;
13. Docker;
14. configuração EAS preparada;
15. resultado de cada comando;
16. passos do smoke test executados;
17. limitações restantes.

Não gerar o APK nesta etapa.