# Candidato Android 0.9.3

**NO-GO PARA TESTES**
**PHYSICAL ANDROID SMOKE: PENDING**
**PRODUCTION RELEASE: NOT APPROVED**

Versão `0.9.3`, Android `versionCode 15`, pacote `com.konazin.trainingapp`.
Base de trabalho: `ab983e5952c5e81b44ce1d21874ac4a15e93b8ed`.

O manifesto `wger-starter-pack.v1` não foi alterado: 40 aprovados, 0 rejeitados,
38 mídias obrigatórias e 2 opcionais. Nenhuma curadoria ou conteúdo de exercício
foi recriado.

Correções implementadas no controller existente:

- refresh pós-commit separado do commit SQLite; falha exibe
  `Exercícios importados, mas a tela não foi atualizada.` e permite repetir
  somente o refresh;
- arquivos temporários e permanentes novos são registrados imediatamente e
  removidos em cancelamento, falha SQLite, falha parcial e desmontagem;
- arquivos locais válidos não são baixados novamente;
- segunda importação permanece idempotente e preserva dados locais;
- cancelamento visível durante busca/download e bloqueio de operações concorrentes;
- MIME, assinatura, limite de 8 MB por imagem, limite total de 150 MB, HTTPS e
  atribuição/licença são validados antes do commit;
- itens opcionais sem imagem exibem `Sem demonstração visual`.

Validações concluídas:

- `npm ci`: passou, com avisos de engine porque o Node local é `20.19.2` e o
  projeto exige `>=20.19.4`;
- domínio: typecheck e **41 testes** passaram;
- SQLite local: typecheck e **22 testes** passaram;
- Wger: typecheck e **13 testes** passaram;
- mobile: typecheck, **124 testes Vitest**, **16 testes Jest/RNTL** e **16 testes
  comportamentais** passaram;
- novos testes focados: **15 passaram**;
- Umamusume: typecheck passou;
- manifesto: 40 aprovados, gate 35–50, 0 duplicidades;
- Expo Doctor: **21/21 verificações passaram**;
- export Android: passou.

APK: **não gerado**. A tentativa EAS foi recusada antes de criar build por
quota mensal gratuita excedida, com reset informado para aproximadamente 20
horas. Não há build ID, arquivo, tamanho, SHA-256 ou integridade ZIP a registrar.
Não foi criado diretório Android nativo alternativo.

O teste físico permanece **PENDING**. O produto não está aprovado para testes,
publicação ou produção até a geração e verificação do APK 0.9.3.
