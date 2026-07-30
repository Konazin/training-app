# Contrato da API Wger

Verificado em **29/07/2026** contra o OpenAPI público atual:

- base: `https://wger.de/api/v2`;
- schema: `GET /api/v2/schema`;
- catálogo recomendado: `GET /api/v2/exerciseinfo/`;
- detalhe: `GET /api/v2/exerciseinfo/{id}/`;
- idiomas: `GET /api/v2/language/`;
- licenças: `GET /api/v2/license/`.

O schema não é consultado em runtime.

## Consulta e paginação

O endpoint retorna `count`, `next`, `previous` e `results`. O cliente envia
`limit` (máximo 50), `offset` e, quando preenchidos, os filtros oficiais
`name__search`, `category__in`, `muscles__in` e `equipment__in`.

URLs de paginação são aceitas somente com HTTPS, host exato `wger.de` e prefixo
`/api/v2/`. Filtros “somente com imagem/vídeo” são aplicados localmente sobre a
página já carregada porque o OpenAPI de `exerciseinfo` não os oferece.

## Campos utilizados

De `ExerciseInfo`:

- `id`, `uuid`, `category`;
- `muscles`, `muscles_secondary`, `equipment`;
- `license`, `license_author`, `author_history`;
- `translations`;
- `images`, `videos`.

De tradução: `name`, `description`, `description_source`, `language`,
`license_author` e campos de origem/licença. De mídia: `id`, `uuid`, URL,
thumbnail, dimensões, duração, item principal, licença, autoria e URL do objeto.
Campos desconhecidos são ignorados; itens sem ID ou tradução nomeada são
rejeitados explicitamente.

Exemplo sanitizado:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": 983,
    "uuid": "…",
    "category": { "id": 8, "name": "Arms" },
    "muscles": [{ "id": 1, "name_en": "Biceps" }],
    "equipment": [{ "id": 7, "name": "none (bodyweight exercise)" }],
    "license": { "id": 2, "short_name": "CC-BY-SA 4", "url": "https://…" },
    "translations": [{ "name": "Joelhos para cima", "language": 7 }],
    "images": [],
    "videos": []
  }]
}
```

## Idioma e texto

Os IDs são associados aos códigos retornados por `/language/`. A seleção é:
`pt-br` exato, `pt`, `en`, primeira tradução válida. Código, hífen, underscore,
caixa e espaços são normalizados. Fallback é mostrado ao usuário.

HTML remoto nunca é renderizado. O mapper converte parágrafos, quebras, listas
e entidades comuns para texto plano e remove tags, scripts, estilos, controles
e ocorrências de `javascript:`.

## Mapeamento

O ID numérico Wger é o `externalId` estável do exercício. Músculos primários e
secundários permanecem separados; equipamentos são unidos em texto. Categoria
é mapeada apenas quando o valor remoto explicita cardio, mobilidade,
alongamento, recuperação ou técnica; o fallback é `STRENGTH`. Dificuldade,
`unilateral` e `timed` não são inferidos pelo nome.

Mídia sem ID, HTTPS ou tipo reconhecido, ou com dimensão/duração negativa, é
ignorada. Licença e autor específicos da mídia prevalecem sobre os do
exercício. Arquivos não são baixados.

O mapper e o cliente Wger não participam da sincronização do catálogo
`BUNDLED`. Importação e atualização continuam disponíveis somente após ação
explícita na tela da integração.

## Segurança e falhas

- timeout: 15 s com `AbortController`;
- somente `GET`, `Accept: application/json`, sem token ou chave;
- resposta máxima: 2 MB e conteúdo obrigatoriamente JSON;
- 429 lê `Retry-After` e nunca repete automaticamente;
- 400, 404, 5xx, offline, DNS, timeout, abort, JSON e schema inválidos têm erros
  distintos;
- nova busca, troca de página e saída da tela cancelam a anterior;
- IDs de requisição impedem resposta antiga de substituir a nova.

## Fixtures e limitações

Fixture sanitizada: `packages/training-wger/fixtures/exerciseinfo.sample.json`.
O CI usa apenas fixtures e `fetch` injetado. O OpenAPI descreve `thumbnails`
como string, mas a resposta observada em 29/07/2026 forneceu objeto com
`small`/`medium`; o parser aceita o objeto defensivamente. Filtros locais de
mídia podem produzir página vazia embora `count` represente o total remoto.
