# Smoke Android — Marcos 4 e 5

Status: **PENDENTE**. As verificações automatizadas e o bundle Expo não
substituem este roteiro em aparelho ou emulador Android.

Candidato: versão `0.8.1`, Android `versionCode` 11, package
`com.konazin.trainingapp`.

## Aparência e acessibilidade

- conferir os quatro temas em claro, escuro e seguindo o sistema;
- reiniciar o app e confirmar persistência;
- visualizar uma alteração, sair sem salvar e confirmar restauração;
- testar movimento completo, reduzido, desativado e redução do sistema;
- testar feedback tátil ligado e desligado;
- conferir treino em alto contraste;
- ampliar a fonte e navegar com TalkBack;
- confirmar rótulos, estados, progresso, modais e barras do sistema.

## Biblioteca

- abrir a primeira instalação em modo avião e conferir 40 exercícios;
- reiniciar e confirmar que não surgiram duplicatas;
- buscar por nome, alias sem acento, músculo e equipamento;
- testar favoritos, ordem de recentes, filtros e os quatro packs;
- alternar entre Lista e Por músculo mantendo busca e filtros;
- adicionar um exercício pela seleção sem duplicar o toque;
- confirmar que Com mídia exclui placeholders e conferir os cinco rótulos de
  mídia, atribuição e vídeo sob ação explícita;
- editar notas sem alterar instruções canônicas;
- importar e restaurar backup v2 antigo e atual;
- atualizar um banco da versão anterior preservando fichas e histórico;
- confirmar que o Wger só acessa rede pela integração manual.

Por fim, navegar por Home, ficha, sessão e histórico sob cada preset e observar
que nenhuma requisição de rede ocorre durante o bootstrap.
