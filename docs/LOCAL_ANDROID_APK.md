# APK Android local-first

O app Android não exige backend, VPS, login ou rede para os fluxos principais.
O perfil EAS `preview` gera o APK interno de `com.konazin.trainingapp`.

## Build anterior e candidato atual

- App `0.11.0`, Android `versionCode` 17.
- Build EAS `b9e60055-a25e-4210-ba6e-9802b35017b9` concluído em 2026-10-17
  pelo perfil `preview`, com distribuição interna.
- APK local anterior às alterações atuais de Nutrição:
  `mobile/artifacts/training-app-0.11.0-internal.apk`
  (96.568.047 bytes). `file` identificou um pacote Android e `unzip -t`
  terminou sem erros.
- SHA-256:
  `d4ec941854f93be3ab8b3595e335b7f4d955fae140652a5732c1d42476098999`.
- Estado: **o APK de 17/10 está íntegro, mas precisa ser substituído por um
  novo build do código atual antes do smoke físico**. O checkout não
  encontrou `adb`, emulador ou Android SDK; a validação física precisa ocorrer
  em um ambiente com dispositivo Android acessível.
- Validar instalação limpa e atualização sobre 0.9.3, permissões de
  câmera/galeria, backup/restauração e os fluxos do roteiro Android.
- APKs 0.9.0 e 0.9.3 são históricos e não são candidatos atuais.

Para gerar o build:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview --json
```

O artefato de 17/10 está em `mobile/artifacts/training-app-0.11.0-internal.apk`;
`artifacts/` é ignorado pelo Git. Em novos builds, registre `file`,
`sha256sum` e `unzip -t`. APKs, credenciais e mídia baixada permanecem fora do
Git.

Para repetir o build, autentique o EAS no ambiente de desenvolvimento com
`npx eas-cli@latest login` ou configure `EXPO_TOKEN` de forma segura fora do
repositório; não coloque o token em arquivos versionados. Depois, repita o
comando acima.
