# Training App

Gerenciador de treinos com dois aplicativos Expo independentes, cliente web
para teste e debug e uma única API Java compartilhada.

## Estrutura

```text
training-app/
├── backend/             # Java 21, Spring Boot 4.1, JPA, H2 e PostgreSQL/Flyway
├── mobile/              # Aplicativo principal de treino
├── umamusume-mobile/    # Aplicativo independente do modo de carreira
├── packages/
│   ├── mobile-api/             # Cliente HTTP configurável e erros comuns
│   ├── training-contracts/     # Contratos TypeScript compartilhados
│   └── workout-session-core/   # Regras, repository, storage e controller de sessão
└── web/                 # Vue 3, Vite, Tailwind CSS e TypeScript
```

O aplicativo principal contém:

1. **Início:** resumo de treinos, exercícios, minutos e sessões recentes.
2. **Gestão de treinos:** cadastro, listagem e exclusão de treinos.
3. **Fichas semanais:** sete dias configuráveis como treino ou descanso, com atividades opcionais.
4. **Biblioteca:** busca e cadastro de exercícios reutilizáveis.
5. **Sessão:** séries, carga, repetições, RPE, cronômetro e conclusão.
6. **Histórico:** sessões persistidas, volume, frequência e aderência.
7. **Adicionar exercício:** fluxo legado preservado para sessões avulsas.

O aplicativo Modo Umamusume contém apenas carreira, consulta de fichas,
execução de sessão e histórico. As fichas continuam sendo criadas e editadas
no aplicativo principal. Ambos os APKs usam o mesmo backend e banco.

A interface web permanece como apoio para teste e debug.

O visual usa uma paleta neutra em preto, branco e cinza, oferece modos claro e escuro e mantém navegação lateral no desktop e inferior no mobile.

## Arquitetura

O backend segue MVC com uma camada de serviço:

- `model`: entidades JPA e conversão das estatísticas JSON;
- `repository`: persistência;
- `service`: regras de negócio e mapeamento dos DTOs;
- `controller`: contrato HTTP;
- `dto`: entradas e respostas da API.

As features mobile seguem MVC. A apresentação e a navegação pertencem a cada
app; o código não visual de sessão fica em `workout-session-core`. O package
`mobile-api` não possui URL global: cada aplicativo cria seu cliente com a
própria `EXPO_PUBLIC_API_URL`.

## Requisitos

- Java 21
- Maven 3.9+
- Node.js 20.19.4 ou superior
- npm 9+

## Instalar

Na raiz, instale todos os workspaces mobile com um único lockfile:

```bash
npm install
```

O diretório `web/` continua com lockfile próprio.

## Executar

Abra quatro terminais.

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

A API fica em `http://localhost:8080`. O perfil padrão é `dev`: ele usa H2
persistente em `backend/data/`, executa a correção idempotente de fichas legadas
e cria dados demonstrativos. O perfil `test` usa somente H2 em memória, sem
Flyway, console H2 ou seed. O perfil `prod` exige PostgreSQL, executa a migration
Flyway `V1` e valida o schema com `ddl-auto=validate`; não cria treinos ou fichas
demonstrativas. A linha técnica `workout_session_lock` existe em todos os perfis.

### 2. Web

```bash
cd web
npm install
npm run dev
```

Abra `http://localhost:5173`. Durante o desenvolvimento, o Vite encaminha `/api` para o backend. Para outro endereço, copie `.env.example` para `.env` e ajuste `VITE_API_URL`.

### 3. Aplicativo principal

```bash
cd mobile
npm install
npm start
```

No emulador Android, a API padrão é `http://10.0.2.2:8080/api`; no simulador iOS, `http://localhost:8080/api`. Em um aparelho físico, copie `.env.example` para `.env` e informe o IP local do computador:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api
```

O celular e o computador precisam estar na mesma rede. Se necessário, inclua a origem web adicional em `CORS_ALLOWED_ORIGINS` ao iniciar o backend.

### 4. Modo Umamusume

```bash
cd umamusume-mobile
npm start
```

Configure `umamusume-mobile/.env` da mesma forma:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api
```

Cada app cria seu próprio cliente HTTP; nenhum token, secret ou endereço fica
armazenado nos packages compartilhados.

## Identidade dos aplicativos

| Aplicativo | Slug | Scheme | Android package |
| --- | --- | --- | --- |
| Training App | `training-app` | `trainingapp` | `com.konazin.trainingapp` |
| Modo Umamusume | `modo-umamusume` | `modouma` | `com.konazin.modouma` |

Ícone e splash usam placeholders geométricos locais e não incluem personagens,
nomes, logotipos ou assets oficiais.

## API

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Resumo e treinos recentes |
| `GET` | `/api/workouts` | Lista os treinos |
| `GET` | `/api/workouts/{id}` | Detalha um treino |
| `POST` | `/api/workouts` | Cria um treino |
| `PUT` | `/api/workouts/{id}` | Atualiza um treino |
| `DELETE` | `/api/workouts/{id}` | Exclui um treino |
| `POST` | `/api/workouts/{id}/exercises` | Adiciona um exercício |
| `DELETE` | `/api/workouts/{id}/exercises/{exerciseId}` | Exclui um exercício |
| `GET` | `/api/training-plans` | Lista as fichas |
| `GET` | `/api/training-plans/{id}` | Detalha uma ficha |
| `POST` | `/api/training-plans` | Cria uma ficha |
| `PUT` | `/api/training-plans/{id}` | Atualiza uma ficha |
| `DELETE` | `/api/training-plans/{id}` | Exclui uma ficha |
| `POST` | `/api/training-plans/{id}/exercises` | Adiciona exercício à ficha |
| `DELETE` | `/api/training-plans/{id}/exercises/{exerciseId}` | Remove exercício da ficha |
| `PUT` | `/api/training-plans/{planId}/days/{dayId}` | Configura treino ou descanso |
| `POST` | `/api/training-plans/{planId}/days/{dayId}/exercises` | Adiciona exercício reutilizável ao dia |
| `PUT` | `/api/training-plans/{planId}/days/{dayId}/exercises/{exerciseId}` | Edita a configuração do exercício |
| `PUT` | `/api/training-plans/{planId}/days/{dayId}/exercises/order` | Reordena exercícios |
| `POST` | `/api/training-plans/{planId}/days/{dayId}/rest-activities` | Adiciona atividade opcional |
| `PUT` | `/api/training-plans/{planId}/days/{dayId}/rest-activities/{activityId}` | Edita atividade opcional |
| `PUT` | `/api/training-plans/{planId}/days/{dayId}/rest-activities/order` | Reordena atividades opcionais |
| `POST` | `/api/training-plans/{id}/activate` | Define a ficha ativa |
| `POST` | `/api/training-plans/{id}/duplicate` | Duplica a ficha |
| `PATCH` | `/api/training-plans/{id}/archive` | Arquiva a ficha |
| `GET/POST` | `/api/exercise-library` | Pesquisa ou cria exercício |
| `PUT` | `/api/exercise-library/{id}` | Edita exercício personalizado |
| `PATCH` | `/api/exercise-library/{id}/archive` | Arquiva exercício |
| `POST` | `/api/integrations/wger/sync` | Sincroniza catálogo e vídeos Wger |
| `GET` | `/api/integrations/wger/status` | Consulta a última sincronização Wger |
| `GET/POST` | `/api/sessions` | Lista histórico ou inicia sessão |
| `GET` | `/api/sessions/active` | Recupera a sessão ativa |
| `PUT` | `/api/sessions/{id}/exercises/{exerciseId}/sets/{setId}` | Salva uma série imediatamente |
| `POST` | `/api/sessions/{id}/pause` | Pausa a sessão |
| `POST` | `/api/sessions/{id}/resume` | Continua a sessão |
| `POST` | `/api/sessions/{id}/complete` | Conclui e calcula o resumo |
| `POST` | `/api/sessions/{id}/abandon` | Abandona preservando registros |
| `GET/POST` | `/api/umamusume/careers` | Lista ou cria carreiras |
| `GET` | `/api/umamusume/careers/active` | Recupera a carreira ativa |
| `GET` | `/api/umamusume/careers/{id}/turns` | Lista o histórico diário |
| `POST` | `/api/umamusume/careers/{id}/start-training` | Inicia a sessão real do dia |
| `POST` | `/api/umamusume/careers/{id}/rest-activities/{activityId}/accept` | Aceita uma atividade |
| `POST` | `/api/umamusume/careers/{id}/rest-activities/{activityId}/complete` | Conclui uma atividade |
| `POST` | `/api/umamusume/careers/{id}/rest-activity/cancel` | Cancela uma atividade pendente |
| `POST` | `/api/umamusume/careers/{id}/full-rest` | Realiza descanso completo |
| `POST` | `/api/umamusume/careers/{id}/abandon` | Encerra a carreira |

Exemplo de treino com estatísticas padrão e livres:

```json
{
  "name": "Treino de força",
  "description": "Sessão A",
  "scheduledDate": "2026-07-24",
  "status": "PLANNED",
  "durationMinutes": 50,
  "calories": 320,
  "customStats": {
    "intensidade": "moderada",
    "qualidadeSono": 8,
    "tags": ["força", "superior"]
  }
}
```

`customStats` aceita qualquer objeto JSON, inclusive valores aninhados. O backend valida os campos padrão e conserva o conteúdo personalizado sem impor um esquema.

O contrato principal da sincronização Wger é JSON:

```json
{
  "dryRun": false,
  "maxPages": 1,
  "onlyWithVideo": true
}
```

`maxPages: 0` percorre todas as páginas. O parâmetro legado
`?dryRun=true` continua aceito quando não há corpo. O sync escolhe idioma por
código regional exato, código base e fallback configurado, faz upsert de mídia
por `(source, externalId)`, preserva IDs locais e nunca altera mídia `CUSTOM` ou
`LEGACY`. Falhas individuais retornam `PARTIAL` com até dez erros sanitizados;
indisponibilidade antes da primeira página retorna HTTP 503. O CI usa mocks e não
chama o Wger real.

## Validação

```bash
# Backend
cd backend
mvn test
mvn -Dtest=PostgresFlywayIntegrationTest test
mvn package -DskipTests

# Web
cd web
npm ci
npm run build

# Mobile
cd mobile
npm ci
npm run typecheck
npm run test
npx expo install --check
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

# Modo Umamusume
cd umamusume-mobile
npm ci
npm run typecheck
npm run test
npx expo install --check
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

# Workspaces
cd ..
npm install
```

Os testes Maven e Vitest descobrem automaticamente os casos disponíveis, sem
depender de uma quantidade fixa documentada.

## Perfis, persistência e migração

- `dev` é o perfil padrão local e é o único que executa o seed demonstrativo.
- `test` é ativado automaticamente por `mvn test` e usa
  `jdbc:h2:mem:training-test`.
- `prod` usa `DATABASE_URL`, `DATABASE_USERNAME` e `DATABASE_PASSWORD`, Flyway e
  validação do Hibernate.
- `schema.sql` e `TrainingPlanWeekMigration` atendem somente a compatibilidade
  do banco H2 legado de desenvolvimento.
- `TrainingPlanWeekMigration` consolida somente dias duplicados vazios,
  completa weekdays ausentes de forma idempotente e cria a restrição única
  `(training_plan_id, weekday)` antes da inicialização do Hibernate.
- Duplicatas em que mais de um dia contém exercícios ou atividades interrompem
  a inicialização com uma mensagem clara.
- Em produção, todas as tabelas são gerenciadas pelo Flyway e validadas pelo
  Hibernate; o JPA não cria nem altera o schema.
- Sessões guardam snapshots do nome e configuração dos exercícios; mudanças futuras na ficha não alteram o histórico.
- Volume de musculação é calculado somente para séries concluídas: `carga × repetições`.
- Não são inventadas calorias para sessões do novo domínio.
- A carreira do Modo Umamusume persiste no backend, aplica progressão pelos
  eventos de conclusão/abandono da sessão e não depende de armazenamento local.
- Atividades aceitas usam snapshots de nome, categoria e duração, portanto
  continuam concluíveis ou canceláveis mesmo após mudanças na ficha.
- O histórico registra somente os deltas efetivamente aplicados após os limites,
  e carreiras concluídas ou abandonadas continuam disponíveis para consulta.
- O app Modo Umamusume oferece retomada somente quando o ID da sessão ativa
  coincide com o turno pendente da carreira.
- Nesta primeira versão, a carreira consulta a ficha atual diretamente. Alterar
  a ficha durante uma carreira muda os próximos dias; o snapshot completo fica
  para uma etapa futura.

O Flyway roda automaticamente ao iniciar o perfil `prod`. O APK depende da API
Java e não possui banco local nem funcionamento offline. O fluxo legado
`Workout` continua disponível para sessões avulsas. Wger e vídeos estão
implementados; Groq, Health Connect, API Ninjas, modo offline, geração por IA e
redesign amplo permanecem fora do escopo.

## Beta privado com Docker

Copie `.env.beta.example` para `.env.beta`, defina senha e token próprios e
execute:

```bash
docker compose --env-file .env.beta -f compose.beta.yml up -d --build
```

O compose sobe PostgreSQL e backend no perfil `prod`. A rota `/api/health` é
pública; as demais rotas usam `Authorization: Bearer <APP_API_TOKEN>`. Consulte
[docs/BETA_SMOKE_TEST.md](docs/BETA_SMOKE_TEST.md) para backup, restauração e
smoke test.

## Preview no EAS

Cadastre no ambiente `preview` a URL pública HTTPS da API e o token beta:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://api.example.com/api --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_API_TOKEN --value troque-por-um-token-beta --visibility sensitive
eas env:list --environment preview
```

Depois valide com `eas build:inspect -p android -s pre-build -e preview` antes
do futuro `eas build -p android --profile preview`. Não gere o APK nesta etapa.

Variáveis `EXPO_PUBLIC_*` são incorporadas ao bundle do aplicativo. Portanto,
o token beta limita acesso casual, mas não é um segredo forte: pode ser extraído
do APK e deve ser rotacionável, restrito ao ambiente beta e substituído por
autenticação por usuário antes de uma distribuição ampla.
