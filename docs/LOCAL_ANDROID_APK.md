# APK Android local-first

O app não exige backend, VPS, login, token ou IP local. O perfil EAS `preview`
continua gerando APK interno para `com.konazin.trainingapp`.

## Estado

- `0.9.0` (`versionCode` 12): substituído; não submeter a testes formais;
- `0.9.1` (`versionCode` 13): **NO-GO**, sem APK gerado.

A curadoria real aprovou menos de 50 intenções Wger. Pelo gate da entrega, o
comando EAS não pode ser executado e não existem ID, URL, arquivo, tamanho ou
SHA-256 de um APK 0.9.1.

Depois que a curadoria alcançar 50/50 e toda validação passar:

```bash
cd mobile
npx eas-cli@latest build --platform android --profile preview --json
```

O artefato deverá ser baixado como
`artifacts/training-app-local-0.9.1.apk` e validado com `file`, `sha256sum` e
`unzip -t`. APK, credenciais e mídia baixada permanecem fora do Git.
