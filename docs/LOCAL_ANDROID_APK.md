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

O candidato foi gerado pelo EAS a partir do commit
`7c242e3517ffdcd8a13fa39e266f6db65bd6f13e`:

- build: `9d0d0bcf-e18c-4348-adca-5ff413f8896e`;
- página:
  <https://expo.dev/accounts/konaz/projects/training-app/builds/9d0d0bcf-e18c-4348-adca-5ff413f8896e>;
- download:
  <https://expo.dev/artifacts/eas/jkyEQmnrnF25M89OydSWOSwORbwUa1da92CM5MnZyjg.apk>;
- arquivo: `artifacts/training-app-local-0.9.0.apk`;
- tamanho: `89.850.639 bytes`;
- SHA-256:
  `fcacc9b7cc6454aa157f45c1d34f0a79fa747e9eb8254ea39b3d88c1dd51f925`;
- `file`: APK Android com `gradle app-metadata.properties`;
- `unzip -t`: nenhum erro nos dados compactados.

Estado: **PRONTO PARA TESTES**. A instalação e o smoke test físico continuam
pendentes e devem seguir `docs/MARCO_6_ANDROID_SMOKE.md`.
