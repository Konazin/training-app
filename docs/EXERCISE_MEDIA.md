# Mídia de exercícios

A biblioteca usa um resolvedor central para escolher entre imagem local, URL de
imagem já armazenada, vídeo local, URL de vídeo já armazenada, ilustração
genérica empacotada e ausência de mídia.

## Imagens e ilustrações

Imagens ocupam um contêiner de proporção fixa e voltam para uma ilustração
genérica se houver erro. As cinco ilustrações neutras são desenhadas pelo
próprio aplicativo para força, mobilidade, cardio, peso corporal e equipamento.
Elas não ensinam a técnica exata e aparecem como **Ilustração genérica do
aplicativo**.

Mídia real e ilustração genérica são identificadas separadamente no detalhe.
Nenhum arquivo remoto é baixado ou armazenado automaticamente.

## Vídeos

Vídeos nunca iniciam sozinhos. O player só é criado depois de **Reproduzir
vídeo**, inicia pausado, pausa quando a tela perde foco e volta ao início ao
desmontar. Falhas preservam a tela e retornam ao placeholder.

## Atribuição

Quando disponível, mídia importada mantém fonte, autor, licença, URL da licença
e URL original. A tela de detalhe apresenta esses campos sem aplicar uma
licença global. Placeholders internos usam atribuição própria do aplicativo.

O bootstrap não resolve nem solicita URLs remotas. O Wger e qualquer mídia
externa continuam dependentes de ação explícita do usuário.
