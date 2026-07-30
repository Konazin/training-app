# Training App

Aplicativo de gestão de treino mobile-first. O aplicativo padrão em `mobile/`
é local-only e offline-first: React Native/Expo compõe regras TypeScript puras
com repositories `expo-sqlite`, sem exigir servidor, VPS, IP, conta ou internet.

## O que funciona offline

- criar, editar e arquivar exercícios;
- criar fichas do zero ou com seis templates semanais;
- editar categoria e dificuldade com presets ou valores personalizados;
- duplicar fichas por completo, somente a estrutura ou sem cargas planejadas;
- ativar, arquivar e restaurar fichas;
- configurar segunda a domingo, incluindo descanso;
- iniciar, pausar, retomar, concluir ou abandonar sessões;
- editar séries e usar cronômetro de descanso;
- recuperar uma sessão após fechar o aplicativo;
- consultar histórico, duração, volume e aderência;
- mover fichas para uma lixeira local com retenção de sete dias;
- exportar, validar e restaurar backups com `schemaVersion: 2`.

O SQLite `training.db` é a fonte de verdade. AsyncStorage guarda somente o
cronômetro transitório. Desinstalar o aplicativo apaga o banco local; exporte
backups regularmente.

## Estrutura

```text
mobile/                         # app padrão local-only
packages/
├── training-domain/            # modelos, regras, portas e serviços TypeScript puros
├── training-local-db/          # expo-sqlite, migrations, mappers, seed e backup
├── training-wger/              # cliente público, parser e mapper Wger sem React
├── training-contracts/         # reexports temporários do domínio
├── mobile-api/                 # infraestrutura HTTP opcional/legada
└── workout-session-core/       # suporte HTTP do app Umamusume legado
backend/                        # servidor Java opcional
web/                            # cliente de debug opcional do servidor
umamusume-mobile/               # aplicativo separado, ainda baseado no servidor
compose.beta.yml                # infraestrutura opcional
```

`training-domain` não importa React, React Native, Expo, SQLite ou cliente
HTTP. `training-local-db` usa diretamente `expo-sqlite`, sem ORM. O composition
root de `mobile/App.tsx` abre o banco, aplica migrations, executa o seed inicial
e injeta repositories nos controllers React.

Detalhes: [arquitetura de dados](docs/LOCAL_DATA_ARCHITECTURE.md).

## Requisitos e instalação

- Node.js 20.19.4 ou superior;
- npm 9 ou superior;
- Android Studio/SDK apenas para execução Android local.

```bash
npm ci
npm start --workspace=training-mobile
```

Não crie `.env` para o app padrão. `EXPO_PUBLIC_API_URL` e
`EXPO_PUBLIC_API_TOKEN` não são usados nem necessários.

## Primeiro uso

No primeiro banco vazio, o app instala um catálogo pequeno de exercícios com
textos próprios e uma ficha “Calistenia inicial”. O seed não inclui Wger nem
mídia de terceiros, não roda novamente sobre dados existentes e a ficha
demonstrativa pode ser editada ou arquivada.

## Backup

Em **Mais**:

- **Exportar backup** cria e compartilha `training-backup-<timestamp>.json`;
- **Importar backup** valida versão e referências antes de trocar dados;
- operações destrutivas criam primeiro um backup automático no diretório de
  documentos do app;
- **Apagar todos os dados** exige confirmação;
- **Recriar dados iniciais** restaura seed e ficha demonstrativa.

Os cinco backups automáticos mais recentes ficam visíveis em **Mais**, com
restauração, compartilhamento e exclusão. **Apagar todos os dados** preserva os
metadados técnicos e impede que o seed reapareça ao reabrir.

Arquivos de backup não contêm tokens, chaves, mídia, cache ou estado do player.
Veja [backup e restauração](docs/BACKUP_AND_RESTORE.md).

## Editor, templates e duplicação

O editor organiza dados gerais, estrutura semanal, gestão e zona de perigo. As
categorias e dificuldades oferecem presets, mas valores antigos e personalizados
continuam sendo texto local no SQLite.

Os templates PPL 3x, Full Body 3x, Upper/Lower 4x, Corrida iniciante,
Mobilidade 3x e Ficha vazia criam somente a divisão dos sete dias. Eles não
baixam nem criam exercícios. A prévia semanal mostra treino, descanso,
exercícios, atividades e avisos não médicos antes do salvamento.

Templates são aplicados somente durante a criação. Em fichas existentes, a
prévia usa a estrutura persistida e os dias continuam sendo editados nas telas
próprias. Criação com template e duplicação são transacionais e ficam
bloqueadas até o refresh posterior terminar; falha de refresh não reverte nem
repete a operação confirmada. Consulte
[editor de ficha](docs/TRAINING_PLAN_EDITOR.md) e
[templates e duplicação](docs/TRAINING_PLAN_TEMPLATES.md).

## Ciclo de vida das fichas

O fluxo principal é:

**Ficha → Editar → Mover para lixeira → Restaurar em até sete dias → Remoção na próxima abertura ou atualização**

Arquivar apenas tira uma ficha do uso normal; a lixeira inicia a retenção para
exclusão. As fichas ficam na lixeira por sete dias. Depois do prazo, são
removidas na próxima abertura do app ou atualização da tela, sem serviço em background.
Sessões ativas ou pausadas impedem a
remoção, e o histórico concluído permanece salvo em snapshots. Veja
[ciclo de vida das fichas](docs/TRAINING_PLAN_LIFECYCLE.md).

## Integração opcional Wger

O app continua local-only e não precisa de VPS, login ou chave Wger. A consulta
só acontece por ação explícita:

**Mais → Integrações → Catálogo Wger → Buscar → Selecionar → Importar**

Somente filtros do catálogo são enviados em requisições GET. Fichas, sessões,
séries, histórico, notas, backups, IDs SQLite e identificadores do aparelho
nunca são enviados. A cópia importada fica no SQLite e pode ser usada em fichas
e sessões sem conexão. Imagens e vídeos são apenas URLs nesta versão e podem
exigir internet. Veja [uso da integração](docs/WGER_INTEGRATION.md) e
[contrato técnico](docs/WGER_API_CONTRACT.md).

## Internet e componentes opcionais

O app padrão não realiza rede no bootstrap nem para operações principais. O
Wger é consultado somente na tela da integração; mídia remota só carrega quando
necessária e vídeos exigem ação explícita. IA, Health Connect e backup remoto
continuam fora do runtime padrão.

O backend Java, PostgreSQL, Docker e a interface web são opcionais e não fazem
parte do runtime do app padrão. Consulte [servidor opcional](docs/OPTIONAL_SERVER.md).
O app Umamusume permanece separado e ainda usa esse backend.

## Validação

```bash
npm ci
npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain
npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db
npm run typecheck --workspace=@training/training-wger
npm run test --workspace=@training/training-wger
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run typecheck --workspace=umamusume-mobile
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist
git diff --check
```

O export Expo valida o bundle; esta etapa não gera APK. Para o teste físico em
modo avião, use [o roteiro local-only](docs/LOCAL_ONLY_SMOKE_TEST.md).
