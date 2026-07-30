# APK Android local-only

Este documento substitui o fluxo antigo baseado em IP e backend local.

O Training App não exige `EXPO_PUBLIC_API_URL`, token, computador na rede,
PostgreSQL ou `usesCleartextTraffic`. O perfil `preview` gera APK interno com
package `com.konazin.trainingapp`, versão `0.9.0` e `versionCode` 12.

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
`artifacts/training-app-local-0.9.0.apk`. Registre o SHA-256 antes de instalar.

## Estado do candidato 0.9.0

O identificador EAS, URL, tamanho e SHA-256 serão registrados somente depois do
build e das verificações `file`, `sha256sum` e `unzip -t`. O smoke físico
permanece separado no roteiro do Marco 6.
