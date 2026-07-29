# APK Android local-only

Este documento substitui o fluxo antigo baseado em IP e backend local.

O Training App não exige `EXPO_PUBLIC_API_URL`, token, computador na rede,
PostgreSQL ou `usesCleartextTraffic`. O perfil `preview` continua configurado
para gerar APK em uma etapa futura, mas nenhum APK é gerado nesta entrega.

Valide o bundle Android local:

```bash
npm ci
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist
```

O banco é criado no armazenamento interno do app. Desinstalar o APK apaga esse
banco, por isso o teste físico deve incluir exportação e restauração de backup.
