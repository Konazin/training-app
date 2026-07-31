# APK Android local-first

O app não exige backend, VPS, login, token ou IP local. O perfil EAS `preview`
continua gerando APK interno para `com.konazin.trainingapp`.

## Estado

- `0.9.0` (`versionCode` 12): substituído; não submeter a testes formais;
- `0.9.3` (`versionCode` 15): **NO-GO PARA TESTES**; gates locais concluídos,
  mas o EAS recusou o build por quota mensal gratuita excedida.

A curadoria real aprovou 40 exercícios Wger no manifesto `wger-starter-pack.v1`.
Não existe APK 0.9.3, ID de build, tamanho ou SHA-256 para registrar.

Para reproduzir o build depois do reset da quota EAS:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview --json
```

O artefato deverá ser baixado como
`artifacts/training-app-0.9.3-go-tests.apk` e validado com `file`, `sha256sum` e
`unzip -t`. APK, credenciais e mídia baixada permanecem fora do Git.
