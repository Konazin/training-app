# Smoke test Android local-only

Execute no candidato atual (0.11.0 / `versionCode` 17) em aparelho ou emulador
Android. Registre modelo, versão do Android, versão do app e resultado por
etapa. No ambiente de trabalho inspecionado em 2026-10-16 não foram encontrados
`adb`, emulador ou Android SDK; faça o roteiro em outro ambiente com um
dispositivo Android acessível.

## Instalação limpa e uso sem rede

- [ ] Ativar modo avião e instalar/abrir o APK pela primeira vez.
- [ ] Confirmar onboarding e biblioteca vazia, sem exercícios ou ficha de demonstração.
- [ ] Criar exercício personalizado, ficha semanal e associar o exercício a um dia.
- [ ] Ativar a ficha, iniciar o treino, completar uma série e iniciar o descanso.
- [ ] Pausar o treino, fechar o app pela tela de recentes e reabrir.
- [ ] Confirmar recuperação da sessão, série e timer; retomar e concluir.
- [ ] Consultar Hoje, Progresso e o histórico concluído.
- [ ] Registrar e editar uma refeição manual, configurar metas e navegar para outro dia.
- [ ] Confirmar que os fluxos principais continuam operando em modo avião.
- [ ] Confirmar que catálogo externo e IA apresentam indisponibilidade sem bloquear o restante do app.

## Backup, reset e upgrade

- [ ] Exportar backup e confirmar que ele contém dados do treino e nutrição.
- [ ] Apagar todos os dados após confirmar a criação do backup automático.
- [ ] Fechar e reabrir; confirmar que exercício e ficha não reaparecem automaticamente.
- [ ] Restaurar o backup e confirmar exercícios, fichas, histórico e refeições.
- [ ] Instalar sobre a versão 0.9.3 com dados existentes; validar migration e referências.
- [ ] Confirmar que credenciais de provedores e imagens transitórias não estão no backup.

## Acessibilidade e estabilidade

- [ ] Navegar pelas telas principais com TalkBack.
- [ ] Aumentar fonte e escala do sistema; conferir formulários, modais e navegação.
- [ ] Ativar redução de movimento e conferir transições/feedback.
- [ ] Validar câmera/galeria e consentimento de IA com rede ativa; cancelar e confirmar que nenhuma imagem é enviada ao cancelar.
- [ ] Confirmar que falhas de rede, permissão ou provedor não afetam os dados locais.
