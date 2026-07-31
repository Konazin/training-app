# Biblioteca de exercícios

Instalações novas começam com zero exercícios. O aplicativo não gera nem
sincroniza conteúdo canônico. A biblioteca distingue:

- exercícios personalizados escritos pelo usuário (`CUSTOM`);
- cópias importadas explicitamente do Wger (`WGER`);
- definições `SYSTEM/BUNDLED` legadas, sempre arquivadas.

## Conteúdo legado

O catálogo gerado antigo não é recriado no bootstrap, foreground, refresh,
reset ou restauração. A migration 8 arquiva linhas `SYSTEM` existentes sem
apagar IDs, referências de fichas, snapshots, notas, favoritos ou uso recente.
As migrations 1 a 7 permanecem inalteradas.

## Estado vazio

Quando não há exercícios visíveis, a interface explica que nenhum conteúdo é
baixado automaticamente e oferece:

- **Importar pacote recomendado**, desabilitado enquanto a curadoria estiver
  incompleta;
- **Pesquisar no Wger**, com rede somente após confirmação;
- **Criar exercício personalizado**;
- **Continuar sem exercícios**.

Importar exercícios nunca cria uma ficha. O onboarding apresenta as mesmas
escolhas sem iniciar requisições.

## Busca local

A busca ignora caixa, acentos, pontuação e espaços repetidos. Filtros,
favoritos, recentes, notas e agrupamento por músculo operam apenas sobre linhas
visíveis no SQLite.

O pacote recomendado só poderá ser habilitado após as 50 intenções possuírem
IDs Wger únicos, imagem HTTPS, texto real e atribuição revisada.
