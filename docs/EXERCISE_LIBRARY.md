# Biblioteca de exercícios

O aplicativo inclui exatamente 40 exercícios originais em português do Brasil.
O catálogo cobre força, mobilidade, condicionamento, peso corporal, halteres,
barra, máquinas, elásticos e exercícios sem equipamento. Ele fica no pacote de
domínio como dados TypeScript imutáveis; não depende de internet ou do Wger.

Cada item possui slug estável, nome normalizado, aliases, descrição, músculos,
equipamento, categoria, dificuldade, instruções, flags de exercício unilateral
e cronometrado, metadados de mídia e origem `BUNDLED`.

## Sincronização local

Na abertura do banco, depois das migrations, o catálogo é sincronizado em uma
transação SQLite. A chave lógica é `BUNDLED + slug`. A sincronização:

- cria itens ausentes e atualiza metadados canônicos quando a versão muda;
- mantém ID SQLite, notas, arquivamento, favoritos e uso recente;
- incorpora itens equivalentes do seed antigo sem duplicá-los;
- não altera exercícios `CUSTOM` ou `WGER`;
- não faz requisições de rede.

A migration 6 adiciona apenas metadados de catálogo, aliases, favoritos e uso
recente. Por compatibilidade com a restrição publicada na migration 1, a linha
base de um item empacotado continua fisicamente marcada como `SYSTEM`; o mapper
expõe `BUNDLED` quando existe o respectivo registro de catálogo.

## Busca e navegação

A busca local ignora caixa, acentos, pontuação e espaços repetidos. A ordem de
relevância prioriza nome exato, prefixo do nome, alias, trecho do nome e, por
fim, músculo ou equipamento.

Os filtros incluem Todos, Favoritos, Recentes, Com mídia, Peso corporal,
equipamento, grupo muscular, categoria e fonte. **Com mídia** considera somente
imagem ou vídeo real; uma URI `placeholder://` é uma ilustração genérica e não
entra no filtro. Cartões e seletor diferenciam Imagem, Vídeo, Imagem e vídeo,
Ilustração genérica e Sem mídia.

O seletor **Lista / Por músculo** alterna entre a lista normal e seções reais
por músculo principal, sempre reutilizando a mesma busca e os mesmos filtros.
Há também quatro packs definidos por slug:

- **Começar na academia**;
- **Treino em casa**;
- **Mobilidade e recuperação**;
- **Condicionamento**.

Packs servem apenas para explorar a biblioteca; não criam fichas
automaticamente.

## Favoritos, recentes e notas

Favoritos são alterados somente por uma ação dedicada. Recentes são registrados
ao abrir explicitamente um detalhe ou adicionar o exercício a um dia da ficha,
sem duplicação e com até 20 itens visíveis. Notas são editáveis separadamente e
não substituem as instruções canônicas do catálogo.
