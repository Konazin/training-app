# Candidato Android 0.9.2

**GO-TESTS**
**PHYSICAL ANDROID SMOKE: PENDING**
**PRODUCTION RELEASE: NOT APPROVED**

Versão `0.9.2`, Android `versionCode 14`, pacote `com.konazin.trainingapp`.

Base: `6dbc5bc21864a0a547f8622b2ba5e3b34348f1ec`.
Implementação: `d7afb49261617be55d2ede4741ee8f909db0967c`.
Correção do CI/build: `62887bb4d6489a1f5bdc642c2a2275d79b2bc0cd`.

Manifesto: `wger-starter-pack.v1`; **40 aprovados**; **0 rejeitados incluídos**;
38 mídias `REQUIRED`; 2 mídias `OPTIONAL`; 0 entradas sem mídia. IDs aprovados:
`73, 237, 538, 1551, 238, 475, 83, 81, 1117, 828, 959, 1137, 567, 1338,
256, 566, 822, 91, 272, 1185, 76, 92, 246, 1652, 984, 203, 257, 365, 622,
1620, 1274, 458, 1572, 167, 377, 1573, 960, 1285, 1091, 1194`.
Nenhum item rejeitado foi incluído; as trocas do pool e suas razões estão
registradas na [curadoria versionada](WGER_STARTER_PACK_CURATION.md).

Importação: ação explícita, confirmação, busca por IDs exatos, validação de
identidade/mídia, cache temporário e commit batch transacional no SQLite. Falhas
antes do commit preservam a biblioteca; importações repetidas são idempotentes e
preservam notas, favoritos, uso recente e arquivamento. Nenhum plano é criado.

Validações locais:

- domínio: typecheck passou; Vitest **41 testes** passou;
- Wger: typecheck passou; Vitest **13 testes** passou;
- SQLite local: typecheck passou; Vitest **22 testes** passou;
- mobile: typecheck passou; Vitest **109 testes** passou; Jest/RNTL **16 testes** passou;
- manifesto: `40 aprovados; gate 35–50; 38 REQUIRED; 2 OPTIONAL; 0 sem mídia; 0 duplicidades`;
- migrações: nenhuma adicionada;
- Expo dependency check: passou; o ambiente local sem rede reportou que a
  verificação de dependências era limitada;
- Expo Doctor: passou, exit 0;
- export Android: passou; validou o bundle, não substitui APK;
- CI `mobile-validation`: passou no run
  [30598918822](https://github.com/Konazin/training-app/actions/runs/30598918822),
  commit `62887bb`.

APK EAS: build `23b1d16d-3563-4aa5-a0fa-2952c42f1b1b`, artefato
[S5C3f3_eU5SuRI8lTYxN2SGvOJH0OTL-qw-z5y5YEVo.apk](https://expo.dev/artifacts/eas/S5C3f3_eU5SuRI8lTYxN2SGvOJH0OTL-qw-z5y5YEVo.apk),
0.9.2/build 14. Arquivo local:
`artifacts/training-app-0.9.2-go-tests.apk`, **89.880.059 bytes**;
SHA-256 `2bc55032b39109fa34fd04496bb2bb95428d71267a7eef3caf183dd03bb877a4`.
`file` identificou Android APK e `unzip -t` terminou sem erros.

GO-TESTS autoriza apenas o teste em dispositivo Android físico. Não representa
aprovação para publicação ou uso em produção.

O smoke físico permanece integralmente **PENDING**. Warnings conhecidos: Node
local `20.19.2` está abaixo do requisito declarado `>=20.19.4`; o check Expo
local foi executado sem rede; a disponibilidade do conteúdo e da mídia pode
mudar no Wger; a importação parcial exige confirmação explícita e não troca
itens indisponíveis silenciosamente.
