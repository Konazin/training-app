# Arquitetura de providers de exercícios

Integrações externas são descritas no domínio por identificador, capacidades,
necessidade de rede, política manual, estado de suporte e rota/adaptador. O
registro atual contém somente `WGER`.

## Regras

- consulta, importação e atualização são sempre iniciadas pelo usuário;
- a tela de Integrações mostra o estado manual e a necessidade de internet;
- referências externas são tipadas por provider e ID externo;
- a persistência deduplica por origem/provider e ID externo;
- falha do provider preserva a cópia local e os dados do usuário;
- o bootstrap não consulta providers;
- mídia remota não é baixada automaticamente.

Biblioteca, fichas e sessões dependem somente da cópia SQLite. Outro provider
pode receber seu adaptador sem mudar esses contratos; um provider sem suporte
jamais abre silenciosamente a rota Wger.
