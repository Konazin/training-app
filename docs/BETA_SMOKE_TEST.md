# Smoke test do beta privado

## Operação

1. Copie `.env.beta.example` para `.env.beta`, troque senha e token e execute:
   `docker compose --env-file .env.beta -f compose.beta.yml up -d --build`.
2. Confira migrations e inicialização com
   `docker compose --env-file .env.beta -f compose.beta.yml logs -f backend`.
3. Verifique `GET /api/health` sem token; confirme `401` em `/api/dashboard` sem token
   ou com token incorreto e `200` com `Authorization: Bearer <token>`.
4. Habilite Wger com limite de uma página, execute `POST /api/integrations/wger/sync`,
   repita a chamada e confirme que totais e mídias não duplicam. Reinicie os serviços
   e confirme que a biblioteca continua preenchida.

O volume persistente é `training_postgres`. Backup:

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_dump -U training -d training -Fc > training.dump
```

Restauração em banco vazio:

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_restore -U training -d training --clean --if-exists < training.dump
```

Para atualizar: `git pull` e depois repita `docker compose --env-file .env.beta -f compose.beta.yml up -d --build`.

## Biblioteca

- [ ] Buscar por nome, trocar fonte e filtrar somente exercícios com vídeo.
- [ ] Abrir exercício com vídeo, conferir controles, poster, retry, fonte, autor e licença.
- [ ] Abrir exercício sem vídeo e confirmar fallback sem quebra.
- [ ] Simular falha de rede no vídeo e recarregar.
- [ ] Criar exercício personalizado e confirmar que o sync Wger não o altera.
- [ ] Conferir telas com larguras entre 360 e 430 px nos temas claro e escuro.

## Sessão

- [ ] Iniciar treino e abrir “Ver execução” sem perder séries editadas.
- [ ] Editar/concluir séries, usar cronômetro, pausar, fechar e reabrir.
- [ ] Concluir uma sessão e abandonar outra.
- [ ] Disparar duas tentativas simultâneas de início; somente uma deve retornar sucesso.

## Aplicativo

- [ ] Abrir com backend indisponível, token inválido e resposta lenta; conferir erro e retry.
- [ ] Voltar do background; confirmar refresh único e sessão restaurada.
- [ ] Confirmar inicialização conectada antes de mostrar dashboard.

O APK futuro será iniciado somente após aprovação com:
`cd mobile && eas build -p android --profile preview`.
