# Arquitetura de dados local

## Camadas

```text
Telas React Native
        ↓
Controllers e portas de training-domain
        ↓
Repositories training-local-db
        ↓
training.db (SQLite)
```

`training-domain` contém regras e tipos sem dependência de React Native, Expo,
SQLite ou HTTP. `training-local-db` aplica migrations verificadas por checksum
e mapeia os registros do SQLite para os modelos de domínio.

## Inicialização e biblioteca

O composition root abre `training.db`, ativa foreign keys e WAL, executa as
migrations 1 a 10 e injeta os repositories nos controllers. Uma falha de
abertura ou migration impede a navegação, fecha a conexão e permite retry; o
banco não é apagado automaticamente.

Instalações novas começam sem exercícios ou fichas. Conteúdo de exercício só é
criado pelo usuário ou importado por uma ação explícita. A migration 8 arquiva
exercícios gerados legados sem remover IDs ou referências históricas. Wger e
ExerciseDB são integrações manuais; nenhuma consulta de catálogo ocorre no
bootstrap.

## Persistência

- Fichas, exercícios, sessões, refeições, metas e resumos nutricionais ficam no
  SQLite.
- AsyncStorage contém somente o timer de descanso e preferências visuais
  versionadas.
- Credenciais de provedores ficam no SecureStore e não entram em backups.
- Backups exportados usam schema 3 e mantêm compatibilidade com schemas 1 e 2.
- Imagens escolhidas para uma análise nutricional por IA são transitórias e não
  são salvas no banco nem no backup.

Datas de refeições usam `YYYY-MM-DD` no calendário local e timestamps ISO 8601.
O app fecha dias anteriores em transação e mantém os detalhes das refeições por
sete dias; os resumos diários permanecem disponíveis. A manutenção roda na
inicialização, ao voltar ao primeiro plano e ao abrir Nutrição.

## Integridade e recuperação

As migrations publicadas não são reescritas. As operações compostas usam
transações exclusivas; snapshots preservam o histórico quando uma ficha ou
exercício muda. Backups são validados antes da restauração, e operações
destrutivas criam uma cópia automática quando aplicável.

Nenhuma integração executa em background. Uma chamada de IA só pode ocorrer
após ação e confirmação explícitas; a imagem e o texto enviados ficam sujeitos
às condições de retenção e processamento do provedor escolhido.
