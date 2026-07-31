# APK Android local-first

O app não exige backend, VPS, login, token ou IP local. O perfil EAS `preview`
continua gerando APK interno para `com.konazin.trainingapp`.

## Estado

- `0.9.0` (`versionCode` 12): substituído; não submeter a testes formais;
- `0.9.2` (`versionCode` 14): **GO-TESTS**; smoke físico ainda pendente.

A curadoria real aprovou 40 exercícios Wger no manifesto `wger-starter-pack.v1`.
O APK verificado está em `artifacts/training-app-0.9.2-go-tests.apk`, com
89.880.059 bytes e SHA-256
`2bc55032b39109fa34fd04496bb2bb95428d71267a7eef3caf183dd03bb877a4`.

Para reproduzir um build:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview --json
```

O artefato deverá ser baixado como
`artifacts/training-app-0.9.2-go-tests.apk` e validado com `file`, `sha256sum` e
`unzip -t`. APK, credenciais e mídia baixada permanecem fora do Git.
