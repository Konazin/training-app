# Roadmap do produto

1. **Ciclo de vida das fichas e lixeira — Marco 1 ESTABILIZADO**
2. **Editor de ficha, templates e duplicação — Marco 2 EM VALIDAÇÃO**
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

## Marco 2 em validação

- seletores acessíveis para categoria e dificuldade, incluindo valores personalizados;
- seis templates locais e imutáveis, sem exercícios ou rede;
- criação transacional com exatamente sete weekdays;
- prévia semanal com estados e avisos;
- duplicação transacional completa, somente estrutura ou sem cargas;
- Snackbar, refresh global, backup e modal da lixeira estabilizados;
- backup `schemaVersion: 2` e migrations 1 a 5 preservados;
- versão mobile 0.5.0, `versionCode` 7.

As verificações automatizadas e o export Android passaram. O smoke manual
Android permanece pendente até existir aparelho ou emulador disponível; por
isso o Marco 2 ainda não está marcado como concluído.

## Adiado

- ordenação avançada da lixeira;
- auditoria detalhada da origem da exclusão.

Os itens dos marcos seguintes não fazem parte da versão 0.5.0.
