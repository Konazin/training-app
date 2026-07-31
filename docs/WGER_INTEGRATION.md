# Integração Wger

Wger é um catálogo público e comunitário de exercícios. No Training App, ele é
uma integração opcional: o aplicativo continua abrindo e funcionando sem
internet, conta, chave de API, backend próprio ou VPS.

Wger é o único provider do registro genérico atual. A tela informa
**Manual · Requer internet · Sem sincronização automática** e suas capacidades
de busca, importação, atualização, mídia e atribuição. Consulte
[`PROVIDER_ARCHITECTURE.md`](PROVIDER_ARCHITECTURE.md).

## Privacidade e conexão

A internet é usada somente quando você abre **Mais → Integrações → Catálogo
Wger** e toca em buscar ou atualizar. O app envia requisições GET contendo
apenas página, quantidade e filtros do catálogo.

O app não envia fichas, sessões, séries, histórico, notas, IDs SQLite, backups,
configurações ou identificadores do aparelho. Nenhum treino é sincronizado.

## Buscar e importar

1. Abra **Mais → Integrações → Catálogo Wger**.
2. Leia o aviso e confirme que deseja continuar.
3. Informe um nome opcional, idioma, quantidade e filtros de mídia.
4. Toque em **Buscar exercícios**.
5. Marque itens individualmente ou use **Selecionar página**.
6. Toque no conteúdo de um item para conferir descrição, instruções, mídia,
   autoria, licença e fonte.
7. Na prévia, se necessário, ajuste apenas categoria local, dificuldade,
   músculo principal ou equipamento.
8. Toque em **Importar selecionados** e confirme.

A marcação não importa automaticamente. Uma nova importação do mesmo item
atualiza a cópia existente sem trocar seu ID local ou duplicá-la.

O texto técnico é preservado como fornecido pelo Wger. A prioridade é PT-BR,
português e inglês, nesta ordem. Fallback em inglês permanece identificado; o
app não reescreve, traduz ou gera instruções.

## Pacote recomendado

A lista de 50 intenções é um pool de candidatos, não conteúdo do provider. O
manifesto real contém 40 exercícios revisados; a ação usa esse manifesto e só
fica habilitada quando o gate 35–50 passa. Consulte
[`WGER_STARTER_PACK_CURATION.md`](WGER_STARTER_PACK_CURATION.md).

## Atualizar importados

O botão **Atualizar exercícios importados** informa quantos itens serão
consultados e pede confirmação. A atualização é manual. Se um exercício não
for encontrado ou o Wger estiver indisponível, a cópia local é mantida e não é
arquivada.

## Uso offline

Depois da importação, nome, descrição, instruções, músculos, equipamento,
categoria, atribuição e metadados de mídia ficam no SQLite. O exercício aparece
na biblioteca, pode ser adicionado a uma ficha e usado em uma sessão em modo
avião.

O pacote recomendado consulta e valida a mídia depois da confirmação. A cópia
persistida mantém a URL remota e os metadados de atribuição; imagens não são
solicitadas no bootstrap. Vídeos nunca iniciam automaticamente e sua
indisponibilidade não bloqueia o treino.

O catálogo gerado antigo foi aposentado e não reaparece em restaurações.

## Licenças e atribuição

Cada exercício e mídia preserva a licença e autoria fornecidas pelo Wger. Abra
o detalhe para acessar a fonte original e a licença. Quando a fonte não fornece
um campo, o app mostra “Informação não fornecida pela fonte”; não aplica uma
licença global.

## Erros comuns

- **Sem conexão/DNS:** confira a internet e tente novamente manualmente.
- **Timeout:** a consulta excedeu 15 segundos; nenhum dado local foi alterado.
- **Limite de requisições (429):** aguarde o tempo indicado e tente novamente.
- **Wger indisponível (5xx):** a biblioteca, fichas e sessões continuam
  funcionando; não há repetição automática.
- **Item removido no Wger:** a cópia local permanece disponível e um aviso é
  mostrado durante a atualização.
- **Remoção local:** arquivar um exercício não apaga snapshots de sessões
  históricas. Importar novamente preserva o estado local de arquivamento.

## Origens da biblioteca

- **SYSTEM/BUNDLED legado:** arquivado e mantido por compatibilidade;
- **CUSTOM:** criado e editado pelo usuário;
- **WGER:** cópia importada do catálogo público, com origem e atribuição.
