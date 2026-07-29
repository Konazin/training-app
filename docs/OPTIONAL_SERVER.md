# Servidor opcional

O backend Java, a web Vue e `compose.beta.yml` permanecem para desenvolvimento,
debug do contrato legado, app Umamusume e uma possível sincronização futura.
Eles não são necessários para abrir ou usar o Training App padrão.

## Backend local legado

Requisitos: Java 21 e Maven 3.9+.

```bash
cd backend
mvn spring-boot:run
```

A API fica em `http://localhost:8080/api`. O perfil `dev` usa H2 persistente em
`backend/data`; `test` usa H2 em memória; `prod` usa PostgreSQL e Flyway.

## Web de debug

```bash
cd web
npm ci
npm run dev
```

O Vite encaminha `/api` ao backend local. A web continua sendo um cliente do
servidor e não representa a arquitetura offline do app padrão.

## Docker beta legado

```bash
docker compose --env-file .env.beta -f compose.beta.yml up -d --build
```

Defina senhas e token somente em `.env.beta`, nunca no Git. Wger é desativado
por padrão e não participa do bootstrap ou CI do app local-only.
