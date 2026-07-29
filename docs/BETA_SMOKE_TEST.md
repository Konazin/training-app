# Smoke test do beta privado

## Resultado da validação de 29/07/2026

O smoke automatizável foi executado em um projeto Docker isolado
(`training-smoke`), com PostgreSQL vazio, credenciais temporárias não
persistidas e uma página real da Wger. Nenhum APK foi gerado.

- `docker compose -f compose.beta.yml build`: aprovado.
- Primeira inicialização: Flyway V1 aplicada, Hibernate validou o schema e não
  havia exercícios ou planos de demonstração.
- Segunda inicialização no mesmo volume: V1 permaneceu com checksum
  `-299317105`, sem alteração nas contagens.
- Saúde e autenticação: `/api/health` retornou `UP`; token incorreto retornou
  401 e token correto retornou 200.
- Primeiro sync Wger: `COMPLETED`, uma página, 100 criados e zero falhas.
- O código regional `pt-br` não existe no catálogo atual da Wger. O resolver
  tentou o idioma-base `pt` (id 7); como o exercício 802 não tinha tradução
  portuguesa, usou corretamente o fallback `en` (id 2),
  `Barbell Lunges Walking`.
- Segundo sync: `COMPLETED`, 100 atualizados e zero falhas. O id local da mídia
  do exercício 802 permaneceu `32`.
- Filtros reais aprovados: músculo, equipamento, categoria, origem e presença
  de vídeo.
- Sessão real aprovada: plano temporário criado, exercício Wger adicionado,
  série editada, sessão concluída e encontrada no histórico.
- Interrupção e recuperação da API aprovadas: o backend ficou indisponível
  quando parado e voltou com saúde `UP`.
- Teste automatizado específico confirma que o sync não consulta nem altera
  mídias `CUSTOM` ou `LEGACY`.

Ainda falta a inspeção manual em um dispositivo Android dos itens visuais
abaixo. Portanto, o checklist beta não está totalmente aprovado e o APK não
deve ser gerado.

## Preparação

1. Copie `.env.beta.example` para `.env.beta` e defina senha e token de teste.
2. Defina `WGER_INTEGRATION_ENABLED=true` e `WGER_SYNC_MAX_PAGES=1`.
3. Execute
   `docker compose --env-file .env.beta -f compose.beta.yml up -d --build`.
4. Acompanhe
   `docker compose --env-file .env.beta -f compose.beta.yml logs -f backend`.

## Roteiro obrigatório

- [x] Subir PostgreSQL vazio e confirmar Flyway V1 e primeira inicialização.
- [x] Reiniciar o backend no mesmo banco e confirmar que o schema não mudou.
- [x] Sincronizar uma página real com
  `POST /api/integrations/wger/sync` e corpo
  `{"dryRun":false,"maxPages":1,"onlyWithVideo":false}`.
- [x] Confirmar tradução regional/base/fallback escolhida.
- [ ] Abrir um exercício com vídeo no Android e conferir poster, controles e
  atribuição.
- [x] Repetir o sync e confirmar que os ids locais de mídia foram preservados.
- [x] Iniciar uma sessão e editar uma série pela API real.
- [ ] Abrir e fechar o vídeo no Android sem alterar séries ou cronômetro.
- [x] Concluir a sessão e conferir o histórico pela API real.
- [x] Confirmar 401 com token ausente/incorreto e 200 com token correto.
- [ ] Interromper o backend e confirmar a tela de erro no bootstrap Android.
- [ ] Retomar o backend e confirmar retry e refresh de background no Android.
- [x] Confirmar os filtros de músculo, equipamento, categoria, origem e vídeo.
- [x] Confirmar por teste automatizado que mídia `CUSTOM` e `LEGACY` não muda
  após o sync.

## Backup e restauração

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_dump -U training -d training -Fc > training.dump
```

```bash
docker compose --env-file .env.beta -f compose.beta.yml exec -T postgres \
  pg_restore -U training -d training --clean --if-exists < training.dump
```

O volume persistente é `training_postgres`. Não registre o conteúdo de
`.env.beta`, tokens ou senhas neste documento.

O APK será gerado somente depois da aprovação completa deste checklist.
