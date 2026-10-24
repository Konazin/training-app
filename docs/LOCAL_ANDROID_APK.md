# APK Android local-first

O app Android não exige backend, VPS, login ou rede para os fluxos principais.
O perfil EAS `preview` gera o APK interno de `com.konazin.trainingapp`.

## Build de lançamento (1.0)

- App `0.12.2`, Android `versionCode` 20, distribuído como a versão 1.0.
- APK: `mobile/artifacts/training-app-0.12.2-internal.apk`
  (96.121.951 bytes, gerado em 2026-10-23, perfil EAS `preview`).
- `file`: pacote Android; `unzip -t`: sem erros.
- SHA-256:
  `66018bd66072dd362f12d1f555df3a76c149e3fa1ec805c0ebfd7b0d36fc0971`.
- Estado: **smoke físico concluído em 2026-10-24**, sem bugs observados. Veja
  [`RELEASE_1_0.md`](RELEASE_1_0.md).
- O `main` atualiza os pacotes Expo para os patches mais recentes (`expo` 56.0.24,
  `expo-sqlite` 56.0.6 e outros) depois deste build. O APK 0.12.2 foi gerado com
  as versões anteriores; o próximo build deve usar as novas e repetir o smoke.
- APKs 0.9.x, 0.11.0, 0.12.0 e 0.12.1 são históricos.

Para gerar o build:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview --json
```

Os artefatos ficam em `mobile/artifacts/`;
`artifacts/` é ignorado pelo Git. Em novos builds, registre `file`,
`sha256sum` e `unzip -t`. APKs, credenciais e mídia baixada permanecem fora do
Git.

Para repetir o build, autentique o EAS no ambiente de desenvolvimento com
`npx eas-cli@latest login` ou configure `EXPO_TOKEN` de forma segura fora do
repositório; não coloque o token em arquivos versionados. Depois, repita o
comando acima.
