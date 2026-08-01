Trabalhe no repositório `Konazin/training-app` a partir do commit:

4a11125ed3ce10f4a3934d57ffe862729d60bdf4

Objetivo: corrigir somente os quatro bloqueadores restantes da importação do
pacote recomendado, validar tudo e gerar o APK Android 0.9.3.

Não refatore a arquitetura.
Não altere o manifesto dos 40 exercícios.
Não refaça a curadoria Wger.
Não adicione funcionalidades.
Não modifique o Umamusume.
Não invente conteúdo de exercícios.

Mantenha:

- versão 0.9.3;
- Android versionCode 15;
- package `com.konazin.trainingapp`.

Como nenhum APK 0.9.3 foi gerado, não aumente a versão.

==================================================
1. CANCELAMENTO E DESMONTAGEM
==================================================

A importação deve ser invalidada imediatamente quando:

- o usuário cancelar;
- o componente desmontar;
- uma operação nova substituir a atual.

Implemente um `operationId`, token ou mecanismo equivalente.

Depois de TODO `await`, valide se a operação ainda está ativa, especialmente:

- depois de buscar exercício;
- depois de baixar imagem;
- antes de mover imagem;
- depois de mover imagem;
- antes de mostrar confirmação parcial;
- antes do commit SQLite;
- depois do commit, antes de atualizar estado React.

Se a operação estiver cancelada:

- não mover novos arquivos;
- não confirmar SQLite;
- limpar arquivos temporários;
- limpar somente arquivos permanentes criados pela operação atual;
- não atualizar estado React;
- não executar callback antigo de confirmação parcial.

Adicione teste específico para cancelar durante o download da ÚLTIMA imagem.
Esse teste deve provar que o SQLite não foi alterado.

Adicione também teste de desmontagem durante download e durante confirmação
parcial.

==================================================
2. SEGUNDA IMPORTAÇÃO REALMENTE IDEMPOTENTE
==================================================

Corrija a comparação entre mídia atual e mídia candidata.

`localUri` e `downloadedAt` devem ser tratados de forma simétrica:

- ou comparar nos dois lados;
- ou ignorar nos dois lados.

Uma segunda importação sem mudanças deve resultar em:

- created: 0;
- updated: 0;
- unchanged/alreadyPresent: 40;
- nenhum novo download;
- nenhuma nova mídia;
- nenhum novo alias.

Não use repositório falso para provar isso.

Adicione teste SQLite real:

1. importar o pacote;
2. importar novamente;
3. confirmar zero inserts;
4. confirmar zero updates;
5. confirmar mesmos IDs;
6. confirmar notas, favoritos, recentes e arquivamento preservados.

==================================================
3. ONBOARDING DEVE ABRIR A BIBLIOTECA
==================================================

Ao selecionar “Importar pacote recomendado” no onboarding:

1. concluir o onboarding;
2. navegar para a tela Biblioteca;
3. abrir a confirmação da importação;
4. iniciar o fluxo somente após confirmação.

Não iniciar importação escondida na Home.

O progresso e o botão “Cancelar importação” devem ficar visíveis na Biblioteca.

Use o mesmo controller e a mesma interface da biblioteca.
Não crie um segundo fluxo de importação.

Adicione teste comportamental confirmando:

- onboarding navega para Biblioteca;
- nenhuma request acontece durante render;
- confirmação aparece;
- progresso aparece;
- cancelamento fica acessível.

==================================================
4. CACHE LOCAL CORROMPIDO
==================================================

Quando uma imagem local já existir:

- se for válida, reutilizar sem download;
- se for inválida, corrompida ou tiver MIME incompatível:
  - remover somente esse arquivo inválido;
  - baixar novamente;
  - validar o novo arquivo;
  - continuar normalmente.

Se o novo download falhar:

- marcar apenas aquele item como indisponível;
- não apagar outros arquivos válidos;
- não deixar arquivo parcial.

Adicione testes para:

- cache válido reutilizado;
- cache inválido removido e baixado novamente;
- novo download falha após cache inválido;
- nenhum arquivo válido anterior é apagado.

==================================================
5. PRESERVAR CORREÇÕES EXISTENTES
==================================================

Não quebre:

- refresh pós-commit separado do commit SQLite;
- retry que repete somente o refresh;
- mídia preservada após commit confirmado;
- rollback de arquivos antes do commit;
- MIME permitido: JPEG, PNG e WEBP;
- limite de 8 MB por imagem;
- limite total de 150 MB;
- cancelamento visível;
- bloqueio de operações concorrentes;
- instalação nova sem exercícios;
- nenhuma rede no bootstrap;
- nenhuma ficha automática;
- manifesto com 40 exercícios.

==================================================
6. TESTES E VALIDAÇÃO
==================================================

Execute:

npm ci

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

npm run typecheck --workspace=@training/training-wger
npm run test --workspace=@training/training-wger

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run test:behavior --workspace=training-mobile

npm run typecheck --workspace=umamusume-mobile
npm run validate:wger-manifest

cd mobile
npx expo-doctor
cd ..

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

git diff --check
git status --short

Não gere o APK se algum teste, typecheck, manifesto, Expo Doctor ou export falhar.

==================================================
7. APK 0.9.3
==================================================

Somente após todas as validações passarem:

cd mobile
npx eas-cli@latest build --platform android --profile preview --json

Se a quota EAS continuar bloqueada:

- não inventar build;
- não marcar GO-TESTS;
- registrar NO-GO apenas por ausência do APK.

Quando o build concluir, salvar como:

artifacts/training-app-0.9.3-go-tests.apk

Validar:

file artifacts/training-app-0.9.3-go-tests.apk
sha256sum artifacts/training-app-0.9.3-go-tests.apk
unzip -t artifacts/training-app-0.9.3-go-tests.apk

Confirmar:

- versão 0.9.3;
- versionCode 15;
- package com.konazin.trainingapp;
- APK íntegro.

Não commitar APK, mídia, credenciais, `.expo`, `dist` ou arquivos temporários.

==================================================
8. COMMIT E DOCUMENTAÇÃO
==================================================

Crie um commit:

fix(mobile): finalize stable starter pack import

Atualize:

- README.md;
- docs/RELEASE_CANDIDATE_0_9_3.md;
- docs/MARCO_6_ANDROID_SMOKE.md;
- docs/LOCAL_ANDROID_APK.md.

Não marque smoke físico como concluído.

==================================================
9. RELATÓRIO FINAL
==================================================

Informe:

- commit final;
- correção do cancelamento;
- correção da idempotência;
- comportamento do onboarding;
- recuperação de cache corrompido;
- testes executados e contagens;
- Expo Doctor;
- build ID;
- caminho do APK;
- tamanho;
- SHA-256;
- integridade ZIP;
- smoke físico pendente.

Finalize exatamente com:

GO-TESTS

somente quando testes, CI e APK estiverem comprovadamente válidos.

Sem APK, finalize:

NO-GO PARA TESTES

Não invente resultados.