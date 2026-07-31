# Estabilização 0.9.1

Estado: **NO-GO PARA TESTES**.

## Correções concluídas

- onboarding usa `ScrollView` seguro para modal, altura mínima e ações fixas;
- instalações novas começam vazias e sem chamada de provider;
- migration 8 arquiva conteúdo gerado legado sem excluir referências;
- restauração v2 não ressuscita catálogo;
- identidade efetiva da substituição alimenta histórico e apresentação;
- progressão de séries incompletas usa uma transação;
- RPE ausente ou incompleto nunca aumenta carga, repetição ou duração;
- retry pós-commit de preferências sobrevive a ações de backup não relacionadas;
- descriptor do provider resolve suporte e rota sem fallback silencioso.

## Bloqueio

A curadoria consultou a API real do Wger para as 50 intenções. Depois de
validar nome, músculo, equipamento, categoria, descrição/instrução, imagem
HTTPS, fonte, licença, ambiguidade e IDs duplicados, menos de 50 foram
aprovadas. Nenhum manifesto de produção foi criado e o pacote recomendado
permanece desabilitado.

Evidências:

- `docs/WGER_STARTER_PACK_CURATION.md`;
- `docs/wger-starter-pack-candidate-audit.v1.json`.

O APK 0.9.0 está substituído. Nenhum APK 0.9.1 foi gerado e o produto não está
pronto para produção. O smoke físico permanece pendente.

## Validação automatizada

- domínio: 39 testes;
- SQLite: 22 testes;
- Wger: 13 testes;
- mobile: 109 testes Vitest e 16 testes comportamentais Jest;
- todos os typechecks obrigatórios aprovados;
- Expo Doctor: 21/21;
- export Android: 1.075 módulos e 36 assets;
- `git diff --check`: aprovado.

Avisos do ambiente: Node 20.19.2 está abaixo do mínimo declarado 20.19.4;
`npm audit` registra 12 vulnerabilidades moderadas e 24 altas em dependências;
o shell também informou uma referência ausente a `/tmp/fenrir-cargo/env`.
