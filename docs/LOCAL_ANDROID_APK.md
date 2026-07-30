# APK Android local-only

Este documento substitui o fluxo antigo baseado em IP e backend local.

O Training App não exige `EXPO_PUBLIC_API_URL`, token, computador na rede,
PostgreSQL ou `usesCleartextTraffic`. O perfil `preview` gera APK interno com
package `com.konazin.trainingapp`, versão `0.8.1` e `versionCode` 11.

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

## Inspeção e build

Depois que todas as validações locais passarem:

```bash
cd mobile
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest build:inspect --platform android --stage pre-build \
  --profile preview --output .eas-inspect --force
npx eas-cli@latest build --platform android --profile preview \
  --non-interactive --json
```

O APK baixado fica fora do Git em
`artifacts/training-app-local-0.8.1.apk`. Registre o SHA-256 antes de instalar.

## Estado do candidato de 30/07/2026

**APK gerado; smoke físico pendente.** O build EAS
`6779eb3a-435a-4e75-aaf8-949ea57ac320` terminou com o perfil `preview`:

- download: <https://expo.dev/artifacts/eas/FMAK5GV93kQT1iSn0I3DLR21dZoUGwHSmUgqjL7Bk6w.apk>;
- arquivo local ignorado pelo Git: `artifacts/training-app-local-0.8.1.apk`;
- tamanho: 89.914.181 bytes;
- SHA-256: `3d3f0a68a7146d0f6a8b71275b9f7ea248293b7039894573980047608f74ad67`.

O arquivo foi reconhecido como APK e passou na verificação de integridade ZIP.
Os Marcos 4 e 5 permanecem em validação até a conclusão do roteiro em aparelho
Android.
