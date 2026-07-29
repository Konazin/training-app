# Training App

Aplicativo de gestão de treino mobile-first. O aplicativo padrão em `mobile/`
é local-only e offline-first: React Native/Expo compõe regras TypeScript puras
com repositories `expo-sqlite`, sem exigir servidor, VPS, IP, conta ou internet.

## O que funciona offline

- criar, editar e arquivar exercícios;
- criar, editar, duplicar, ativar e arquivar fichas;
- configurar segunda a domingo, incluindo descanso;
- iniciar, pausar, retomar, concluir ou abandonar sessões;
- editar séries e usar cronômetro de descanso;
- recuperar uma sessão após fechar o aplicativo;
- consultar histórico, duração, volume e aderência;
- exportar, validar e restaurar `training-backup-v1.json`.

O SQLite `training.db` é a fonte de verdade. AsyncStorage guarda somente o
cronômetro transitório. Desinstalar o aplicativo apaga o banco local; exporte
backups regularmente.

## Estrutura

```text
mobile/                         # app padrão local-only
packages/
├── training-domain/            # modelos, regras, portas e serviços TypeScript puros
├── training-local-db/          # expo-sqlite, migrations, mappers, seed e backup
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

- **Exportar backup** cria e compartilha `training-backup-v1.json`;
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

## Internet e componentes opcionais

O app padrão não realiza rede no bootstrap nem para operações principais.
Somente vídeos remotos, quando o usuário toca em reproduzir, podem exigir
internet. Wger, IA, Health Connect e backup remoto possuem apenas portas de
domínio para integrações futuras com consentimento explícito.

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
npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile
npm run typecheck --workspace=umamusume-mobile
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check
EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export --platform android --output-dir dist
git diff --check
```

O export Expo valida o bundle; esta etapa não gera APK. Para o teste físico em
modo avião, use [o roteiro local-only](docs/LOCAL_ONLY_SMOKE_TEST.md).
