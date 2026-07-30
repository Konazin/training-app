# Arquitetura de providers de exercícios

Integrações externas são descritas no domínio por identificador, capacidades,
necessidade de rede e política de bootstrap. O registro atual contém somente
`WGER`, com busca, importação, atualização, mídia e atribuição.

## Regras

- consulta, importação e atualização são sempre iniciadas pelo usuário;
- a tela de Integrações mostra o estado manual e a necessidade de internet;
- referências externas são tipadas por provider e ID externo;
- a persistência deduplica por origem/provider e ID externo;
- falha do provider preserva a cópia local e os dados do usuário;
- o bootstrap não consulta providers;
- mídia remota não é baixada automaticamente.

Biblioteca, fichas e sessões dependem somente da cópia SQLite. Outro provider
pode ser incluído no registro e receber sua tela/adaptador sem mudar os
contratos locais da biblioteca.
