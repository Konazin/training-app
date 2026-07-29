# Smoke test do preview privado

## Resultado da validação de 29/07/2026

Código aprovado, build EAS bloqueado.

O smoke automatizável foi executado no projeto Docker isolado
`training-release-smoke`, com PostgreSQL vazio, credenciais temporárias não
persistidas e uma página real da Wger. Ao final, somente os containers, a rede
e o volume desse projeto temporário foram removidos.

### Backend e banco

- `mvn test`: aprovado, 59 testes executados e nenhum erro ou falha.
- `mvn package -DskipTests`: aprovado.
- Banco vazio: Flyway aplicou V1, V2, V3 e V4 em sequência.
- Upgrade PostgreSQL V1 para a versão atual: aprovado por Testcontainers, com
  preservação dos dados, validação do Hibernate e checksums estáveis.
- Segunda inicialização Docker no mesmo volume: saúde `UP`, 100 exercícios e
  uma sessão preservados; checksums das quatro migrations permaneceram iguais.
- Autenticação: token ausente e incorreto retornaram 401; token correto
  retornou 200.
- Primeiro sync Wger: `COMPLETED`, uma página, 100 criados e zero falhas.
- Segundo sync Wger: `COMPLETED`, uma página, 100 atualizados e zero falhas.
- IDs locais das mídias de vídeo permaneceram `32` e `43` após o segundo sync.
- O lock distribuído terminou sem owner e sem timestamp, permitindo novo sync.
- Busca e filtros por músculo, equipamento, categoria, origem e vídeo
  retornaram resultados reais.
- Exercício Wger 802: mídia principal com source URL humana
  `https://wger.de/exercise/802/view`, licença `CC-BY-SA 4`, URL jurídica da
  licença e autor específico `Goulart`. A source URL não é a URL direta do
  vídeo.
- Sessão real: plano temporário criado, exercício Wger adicionado, série
  editada e sessão concluída. O snapshot preservou URL, source URL, licença e
  autor da mídia principal; volume final 200.

### Mobile e web

- `npm ci`: aprovado.
- `@training/mobile-api`: 4 testes aprovados.
- `@training/workout-session-core`: 5 testes aprovados.
- `training-mobile`: typecheck e 9 testes aprovados.
- `umamusume-mobile`: typecheck aprovado, sem alteração funcional.
- `expo install --check`: dependências atualizadas.
- `expo export --platform android`: aprovado.
- Web: `npm ci` e build de produção aprovados.
- Identidade validada: versão `0.1.1`, versionCode `2`, package
  `com.konazin.trainingapp`, slug `training-app`, scheme `trainingapp` e
  orientação portrait.
- Ícone, splash e adaptive icon estão presentes e válidos.

### EAS e APK

`eas whoami` retornou `Not logged in`. Por isso, conforme a política desta
sprint:

- a consulta das variáveis `EXPO_PUBLIC_API_URL` e
  `EXPO_PUBLIC_API_TOKEN` não pôde ser concluída;
- `eas build:inspect` não foi executado;
- o EAS Build não foi iniciado;
- nenhum APK foi gerado ou baixado;
- não há build ID, URL, tamanho ou SHA-256;
- o smoke físico permanece pendente;
- `adb` também não está disponível neste ambiente.

Após autenticar a conta Expo, confirme que as duas variáveis existem no
ambiente `preview`, sem exibir o token, e que a URL da API é HTTPS, pública e
adequada para teste externo antes de continuar.

## Preparação

1. Copie `.env.beta.example` para `.env.beta` e defina senha e token de teste.
2. Defina `WGER_INTEGRATION_ENABLED=true` e `WGER_SYNC_MAX_PAGES=1`.
3. Use um nome de projeto Docker isolado para não tocar no volume beta real:
   `docker compose -p training-release-smoke --env-file .env.beta -f compose.beta.yml up -d --build`.
4. Acompanhe:
   `docker compose -p training-release-smoke --env-file .env.beta -f compose.beta.yml logs -f backend`.

## Checklist

- [x] Subir PostgreSQL vazio e confirmar Flyway V1–V4.
- [x] Validar upgrade da V1 original para todas as migrations atuais.
- [x] Reiniciar o backend no mesmo banco e confirmar checksums e dados.
- [x] Sincronizar uma página real da Wger.
- [x] Repetir o sync e confirmar IDs locais de mídia preservados.
- [x] Confirmar atribuição específica da mídia principal.
- [x] Criar e concluir sessão com atribuição correta no snapshot.
- [x] Confirmar 401 com token ausente/incorreto e 200 com token correto.
- [x] Confirmar filtros de busca, músculo, equipamento, categoria, origem e
  vídeo.
- [x] Confirmar por testes que mídias inválidas não impedem o exercício válido.
- [x] Confirmar por testes que limpeza obsoleta não roda em sync limitado,
  filtrado, dry run, parcial ou com falhas.
- [ ] Autenticar a conta Expo usada pelo projeto.
- [ ] Confirmar as variáveis do ambiente EAS `preview`.
- [ ] Executar e aprovar `eas build:inspect`.
- [ ] Gerar, baixar e calcular o SHA-256 do APK preview.
- [ ] Instalar o APK e executar o smoke físico Android.

## Backup e restauração

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_dump -U training -d training -Fc > training.dump
```

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_restore -U training -d training --clean --if-exists < training.dump
```

O volume persistente beta é `training_postgres`. Não registre o conteúdo de
`.env.beta`, tokens, senhas, keystores ou APKs no Git.
