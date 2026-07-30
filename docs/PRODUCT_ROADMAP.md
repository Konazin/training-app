# Roadmap do produto

1. **Ciclo de vida das fichas e lixeira — Marco 1 ESTABILIZADO**
2. Editor de ficha e templates
3. Home semanal limpa
4. Skins, animações e acessibilidade
5. Biblioteca inicial e mídia
6. Providers, inteligência local e release candidate

## Marco 1 estabilizado

- lixeira local com retenção de sete dias;
- badge com quantidade;
- aviso de expiração;
- backup antes de esvaziar;
- fichas da lixeira incluídas no backup;
- confirmação reforçada para exclusão permanente.
- mutation e refresh tratados separadamente;
- Desfazer tokenizado, serializado e coberto contra concorrência;
- UX, SQLite e CI validados na versão 0.4.0.

O backup usa `schemaVersion: 2`. Arquivos manuais são nomeados
`training-backup-<timestamp>.json`; os automáticos,
`training-auto-backup-<timestamp>.json`.

## Adiado

- ordenação avançada da lixeira;
- auditoria detalhada da origem da exclusão.

Os itens dos marcos seguintes não fazem parte da versão 0.4.0.
