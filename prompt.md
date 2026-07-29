Continue o desenvolvimento do repositório `training-app` a partir do commit:

d9ecdd96956fec7be6ff8dd675f23ee4d0b8adb3

Esta é a sprint final de preparação e geração do primeiro APK preview do
aplicativo padrão.

Trabalhe prioritariamente em:

mobile/
backend/
packages/

Não evolua o aplicativo `umamusume-mobile` além de manter seu typecheck
compatível com os packages compartilhados.

Ao final desta sprint:

1. os erros residuais da integração Wger devem estar corrigidos;
2. migrations publicadas devem permanecer imutáveis;
3. o backend beta deve ser validado;
4. o app padrão deve ter versão incrementada;
5. um APK preview instalável deve ser gerado pelo EAS;
6. o artefato ou URL do build deve ser registrado na entrega;
7. nenhuma credencial deve entrar no Git.

Não implementar IA, Health Connect, calorias ou novas features de treino.

==================================================
1. ATRIBUIÇÃO CORRETA POR MÍDIA
==================================================

Separar corretamente os conceitos:

- `url`: URL direta do arquivo de imagem ou vídeo;
- `sourceUrl`: página ou objeto original relacionado à mídia;
- `licenseUrl`: URL jurídica da licença;
- `licenseName`: nome da licença;
- `author`: autor específico da mídia.

Não usar a URL direta do MP4 como `sourceUrl`.

Para mídias Wger:

1. `url` deve receber `image` ou `video`;
2. `sourceUrl` deve preferir:
   - `license_object_url` da mídia, quando HTTPS;
   - URL pública humana do exercício;
   - sourceUrl geral do exercício;
3. `licenseName` deve preferir `license_title` da mídia;
4. `licenseUrl` deve usar a URL real da licença recebida no objeto geral da
   licença do exercício;
5. `author` deve preferir `license_author` da mídia e usar o autor geral apenas
   como fallback.

Não tratar `license_object_url` como URL da licença.

Adicionar ao mapper um contexto explícito para passar os metadados gerais da
licença às mídias, sem acessar estado global.

==================================================
2. MÍDIA PRINCIPAL E ATRIBUIÇÃO EXIBIDA
==================================================

Criar uma função centralizada para selecionar a mídia principal:

- mídia `main` primeiro;
- depois menor `sortOrder`;
- depois menor ID local;
- somente do tipo solicitado.

O backend deve retornar:

- `primaryVideo`;
- `primaryImage`;

como DTOs completos de mídia, não apenas URLs.

Manter temporariamente:

- `primaryVideoUrl`;
- `primaryImageUrl`;

para compatibilidade, derivados dos DTOs principais.

No mobile:

- ExerciseDetail deve usar autor, licença e sourceUrl da mídia exibida;
- caso não existam, usar os metadados gerais do exercício;
- ao trocar ou exibir outra mídia, a atribuição deve acompanhar aquela mídia;
- mostrar “Informação não fornecida pela fonte” quando necessário;
- não inventar autor ou licença.

Na sessão:

- o snapshot deve usar os metadados da mídia principal selecionada;
- a atribuição exibida no modal deve pertencer ao vídeo exibido;
- preservar compatibilidade com sessões antigas.

Adicionar ao snapshot, se necessário:

- primaryVideoSourceUrl;
- primaryVideoLicenseName;
- primaryVideoLicenseUrl;
- primaryVideoAuthor.

Criar migration separada para novos campos.

==================================================
3. CONGELAR A MIGRATION V1
==================================================

A migration V1 já existia antes deste commit e não deve mais ser alterada.

Restaurar exatamente a versão original de:

backend/src/main/resources/db/migration/V1__initial_schema.sql

usando o conteúdo existente no commit:

72274a1ffe1d350c70f039b96fc5315121e3a454

Criar:

V2__wger_sync_error_details.sql

para adicionar:

error_details VARCHAR(4000)

em `wger_sync_runs`.

Caso os novos snapshots de atribuição da sessão exijam colunas, criar:

V3__session_media_attribution.sql

Não juntar V2 e V3 apenas para economizar um arquivo.

Regras:

- nunca editar V1 novamente;
- migrations devem ser idempotentes no histórico do Flyway, não via
  `IF NOT EXISTS` usado para esconder inconsistências;
- banco vazio deve executar V1, V2 e V3 em sequência;
- banco criado pela V1 original deve atualizar normalmente;
- segunda inicialização não deve alterar schema ou checksums.

Atualizar o teste PostgreSQL/Flyway para esperar todas as migrations atuais.

==================================================
4. TESTE DE UPGRADE DO BANCO
==================================================

Adicionar teste Testcontainers que simule upgrade:

1. iniciar PostgreSQL vazio;
2. aplicar somente V1 original;
3. inserir dados mínimos em:
   - wger_sync_runs;
   - workout_sessions;
   - workout_session_exercises;
4. executar o Flyway completo;
5. confirmar aplicação de V2 e V3;
6. confirmar preservação dos dados existentes;
7. iniciar Hibernate com `ddl-auto=validate`;
8. confirmar que uma segunda execução não altera checksums.

Não testar apenas criação de banco vazio.

==================================================
5. LOCK DA SINCRONIZAÇÃO WGER
==================================================

Garantir que `running` seja liberado em absolutamente todos os caminhos.

Problemas a cobrir:

- falha no primeiro `runs.save`;
- falha ao buscar idiomas;
- falha durante uma página;
- falha ao persistir o resumo final;
- falha inesperada antes da criação do run.

Estruturar com `try/finally` externo:

if (!running.compareAndSet(false, true)) {
    throw conflict;
}

try {
    // toda a execução
} finally {
    running.set(false);
}

Nenhuma operação de banco pode ocorrer depois do ponto que impediria a execução
do `running.set(false)`.

Se o save final falhar:

- preservar a exceção original quando houver;
- registrar log sanitizado;
- liberar o lock;
- permitir uma nova tentativa posterior.

Adicionar testes para falha inicial e falha final de persistência.

==================================================
6. LOCK DISTRIBUÍDO DA SINCRONIZAÇÃO
==================================================

O `AtomicBoolean` protege apenas uma instância do backend.

Para o beta atual, criar uma garantia no banco para impedir dois containers de
sincronizarem simultaneamente.

Escolher uma estratégia simples e portável:

- tabela sentinela `wger_sync_lock`;
- linha única;
- lock pessimista durante a aquisição;
- estado com timestamp e owner identificável;
- liberação ao final.

Não manter uma transação aberta durante chamadas HTTP ao Wger.

Estratégia sugerida:

1. transação curta adquire a linha;
2. verifica se existe execução RUNNING não expirada;
3. registra owner e startedAt;
4. commit;
5. executa sync;
6. transação curta libera;
7. recuperação na inicialização limpa lock expirado.

Definir timeout configurável:

WGER_SYNC_LOCK_TIMEOUT_MINUTES=60

O `AtomicBoolean` pode permanecer como proteção local rápida, mas não deve ser a
única garantia.

Adicionar teste simulando duas instâncias de service usando o mesmo banco.

==================================================
7. REJEITAR MÍDIA WGER INVÁLIDA
==================================================

Não criar external IDs como:

video:null
image:null

Quando a mídia não possuir ID externo:

- ignorar a mídia;
- registrar erro sanitizado no item;
- continuar sincronizando o restante do exercício;
- não impedir a persistência do exercício;
- não criar colisões na constraint.

Também rejeitar:

- URL vazia;
- URL não HTTPS;
- duração negativa;
- largura ou altura negativa.

Valores opcionais ausentes podem permanecer nulos.

Adicionar testes para:

- vídeo sem ID;
- imagem sem ID;
- URL HTTP;
- duas mídias inválidas no mesmo exercício;
- exercício válido persistido apesar da mídia inválida.

==================================================
8. REMOÇÃO DE MÍDIA OBSOLETA
==================================================

Não apagar mídia Wger que esteja sendo usada como snapshot de uma sessão.

Como sessões já armazenam URLs e metadados em snapshot, a mídia da biblioteca
pode ser removida sem quebrar o histórico, mas a remoção deve ocorrer apenas
quando:

- sync completo;
- sem filtro `onlyWithVideo`;
- todas as páginas foram processadas;
- zero falhas de página;
- externalId não apareceu no catálogo atual.

Não limpar mídia após:

- sync limitado por `maxPages`;
- dry run;
- PARTIAL;
- FAILED;
- sync filtrado.

Adicionar testes explícitos para todos esses casos.

==================================================
9. FILTROS DA BIBLIOTECA
==================================================

Aplicar debounce separado de 350 ms para:

- busca;
- músculo;
- equipamento.

Não disparar requisição a cada caractere.

Adicionar categorias ausentes:

- STRETCHING;
- RECOVERY;
- TECHNIQUE.

Exibir nomes em português:

- Força;
- Hipertrofia;
- Resistência;
- Cardio;
- Mobilidade;
- Alongamento;
- Recuperação;
- Técnica.

Adicionar ação “Limpar filtros”.

Ao limpar:

- resetar página;
- cancelar ou invalidar requisições antigas;
- carregar página zero uma única vez.

==================================================
10. MELHORAR EXPERIÊNCIA DE VÍDEO
==================================================

Manter retry por remount usando `key`, sem alterar a URL remota.

Corrigir:

- poster visível durante loading;
- placeholder quando não houver poster;
- retry somente em erro;
- player pausado ao perder foco;
- player pausado ao desmontar;
- modal fechado deve remover o player;
- ao trocar de exercício, resetar retryKey;
- não manter estado de erro do vídeo anterior.

Na sessão:

- fechar o modal não pode alterar:
  - séries;
  - RPE;
  - observações;
  - cronômetro;
  - status da sessão.

Adicionar testes das regras puras e, quando viável, teste do controller/estado
do modal sem depender de reprodução nativa real.

==================================================
11. ISOLAMENTO DO TESTE DE PERFIL
==================================================

Não exigir que:

data/trainingdb.mv.db

não exista na máquina do desenvolvedor.

O teste deve confirmar:

- URL ativa começa com `jdbc:h2:mem:`;
- nenhuma conexão foi aberta para o caminho persistente;
- perfil test ativo;
- seed demonstrativo ausente;
- lock técnico presente.

Remover assertions que falhem somente porque o desenvolvedor já possui um banco
dev legítimo.

==================================================
12. CI
==================================================

No job backend:

- executar `mvn test` uma única vez;
- não repetir `PostgresFlywayIntegrationTest` isoladamente se ele já estiver
  incluído no conjunto;
- executar `mvn package -DskipTests`.

O teste Testcontainers deve rodar no GitHub Actions.

Manter:

- frontend;
- web;
- infra.

Adicionar verificação:

git diff --check

Não chamar Wger real no CI.

Não executar EAS Build automaticamente no GitHub Actions nesta etapa.

==================================================
13. VERSÃO DO APLICATIVO
==================================================

Incrementar somente o app padrão:

mobile/app.json

De:

- version: 0.1.0
- android.versionCode: 1

Para:

- version: 0.1.1
- android.versionCode: 2

Não alterar a versão do app Umamusume.

Adicionar ao README um changelog resumido do preview 0.1.1:

- biblioteca Wger;
- imagens e vídeos;
- sessão com demonstração;
- PostgreSQL/Flyway;
- bootstrap protegido;
- beta privado.

==================================================
14. IDENTIDADE E ASSETS
==================================================

Validar antes do build:

- ícone existe;
- splash existe;
- adaptive icon é válido;
- package permanece `com.konazin.trainingapp`;
- slug permanece `training-app`;
- scheme permanece `trainingapp`;
- orientação portrait;
- nenhum asset Wger é empacotado no APK;
- nenhum asset oficial Umamusume aparece no app padrão.

Não fazer redesign amplo.

==================================================
15. VALIDAÇÃO DO BACKEND
==================================================

Executar:

cd backend
mvn test
mvn package -DskipTests

Executar também o compose com banco novo:

docker compose --env-file .env.beta -f compose.beta.yml down -v
docker compose --env-file .env.beta -f compose.beta.yml up -d --build

Validar:

- health;
- migrations V1, V2 e V3;
- segunda inicialização;
- token incorreto;
- token correto;
- sync Wger de uma página;
- sync repetido;
- IDs de mídia preservados;
- atribuição da mídia principal;
- sessão criada com atribuição correta.

Não apagar volumes de beta reais.

Usar nome de projeto Docker isolado para smoke:

docker compose -p training-release-smoke ...

==================================================
16. VALIDAÇÃO DO FRONTEND
==================================================

Na raiz:

npm ci
npm run test --workspace=@training/mobile-api
npm run test --workspace=@training/workout-session-core
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run typecheck --workspace=umamusume-mobile

Expo:

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

Web:

cd web
npm ci
npm run build

Geral:

git diff --check

Não avançar ao EAS caso qualquer validação falhe.

==================================================
17. CONFIGURAÇÃO DO AMBIENTE PREVIEW
==================================================

Antes do build, executar a partir de `mobile/`:

eas whoami
eas project:info
eas env:list --environment preview

Confirmar que existem:

EXPO_PUBLIC_API_URL
EXPO_PUBLIC_API_TOKEN

Regras:

- API_URL deve ser HTTPS;
- API_URL deve terminar em `/api` ou ser normalizada corretamente pelo cliente;
- não aceitar localhost;
- não aceitar 10.0.2.2;
- não aceitar IP privado para um APK destinado a teste externo;
- não imprimir o valor do token no relatório;
- não criar valores fictícios;
- não gravar token em app.json, eas.json, README ou Git.

Caso as variáveis não existam:

- não inventar valores;
- interromper somente a etapa EAS;
- informar exatamente qual variável falta;
- manter todas as correções e validações concluídas.

==================================================
18. INSPEÇÃO EAS
==================================================

Com ambiente preview configurado, executar:

cd mobile

eas build:inspect \
  --platform android \
  --stage pre-build \
  --profile preview \
  --output .eas-inspect \
  --force

Verificar no projeto gerado:

- package Android;
- versionName;
- versionCode;
- permissões;
- configuração de rede;
- expo-video incluído;
- URL preview presente;
- nenhuma credencial sensível adicional;
- buildType APK.

Apagar `.eas-inspect` após a validação ou mantê-lo ignorado pelo Git.

Adicionar ao `.gitignore`:

- `.eas-inspect/`;
- `*.apk`;
- `artifacts/`.

==================================================
19. GERAR O APK PREVIEW
==================================================

Após todas as validações, executar:

eas build \
  --platform android \
  --profile preview \
  --non-interactive \
  --json

Capturar:

- build ID;
- status;
- URL da página do build;
- commit;
- versão;
- versionCode.

Aguardar a conclusão do build.

Se aprovado, baixar:

mkdir -p ../artifacts

eas build:download \
  --build-id <BUILD_ID> \
  --non-interactive

Salvar ou renomear para:

artifacts/training-app-preview-0.1.1.apk

Não adicionar o APK ao Git.

Calcular:

sha256sum artifacts/training-app-preview-0.1.1.apk

Registrar o SHA-256 na entrega.

Caso o EAS solicite configuração interativa inicial de credencial Android:

- concluir usando a conta Expo autenticada, quando permitido;
- não exportar keystore para o repositório;
- não registrar senhas;
- se a execução estiver sem credenciais ou autenticação, não declarar que o APK
  foi gerado.

==================================================
20. SMOKE TEST DO APK
==================================================

Caso exista emulador Android disponível:

- instalar com adb;
- executar o checklist automatizável.

Comando:

adb install -r artifacts/training-app-preview-0.1.1.apk

Validar:

1. splash;
2. bootstrap;
3. token correto;
4. biblioteca;
5. busca e filtros;
6. exercício com vídeo;
7. exercício sem vídeo;
8. poster;
9. controles;
10. atribuição;
11. iniciar sessão;
12. abrir e fechar vídeo;
13. editar série;
14. cronômetro;
15. pausar;
16. retomar;
17. concluir;
18. backend indisponível;
19. retry;
20. retorno do background.

Se não houver emulador ou aparelho acessível:

- gerar o APK normalmente;
- marcar o smoke físico como pendente;
- não fingir que foi executado.

Atualizar:

docs/BETA_SMOKE_TEST.md

com evidência real e itens ainda pendentes.

==================================================
21. FORA DO ESCOPO
==================================================

Não implementar:

- IA;
- Groq;
- Health Connect;
- calorias;
- contas;
- JWT por usuário;
- multi-tenancy;
- modo offline;
- SQLite;
- redesign amplo;
- novas features de treino;
- alterações funcionais no app Umamusume;
- APK do Umamusume;
- publicação na Play Store;
- AAB;
- EAS Submit.

==================================================
22. CRITÉRIOS DE CONCLUSÃO
==================================================

A sprint somente pode ser considerada concluída quando:

- testes backend passam;
- migrations antigas permanecem imutáveis;
- upgrade V1 → V2/V3 passa;
- Docker smoke passa;
- testes mobile passam;
- export Android passa;
- EAS inspect passa;
- EAS Build termina com sucesso;
- APK é baixado;
- SHA-256 é registrado.

Caso o único bloqueio seja autenticação, credencial ou variável EAS ausente:

- declarar “código aprovado, build EAS bloqueado”;
- indicar exatamente o bloqueador;
- não declarar que existe APK.

==================================================
23. ENTREGA
==================================================

Informar:

1. correções realizadas;
2. migrations criadas;
3. estratégia de atribuição por mídia;
4. estratégia de lock Wger;
5. testes adicionados;
6. resultado do PostgreSQL/Flyway;
7. resultado do Docker smoke;
8. versão e versionCode;
9. resultado do EAS inspect;
10. build ID;
11. URL do build;
12. caminho do APK;
13. tamanho do APK;
14. SHA-256;
15. smoke Android executado ou pendente;
16. limitações restantes.

Não avançar para IA ou redesign nesta sprint.