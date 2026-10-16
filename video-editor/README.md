# Editor de vídeos por cliente

Remotion + React + TypeScript. Sobrepõe ícones SVG 2D ao vídeo original, sem cortes, recorte de imagem, legendas, textos, música, fade, glow ou efeitos 3D. As entradas e saídas dos ícones são cortes diretos; as opções de movimento são deslocamento de 8 px e escala de 94% a 100% em 180 ms.

## Requisitos e instalação

Node.js >=22, npm, FFmpeg e FFprobe no PATH; Chrome/Chromium ou o navegador gerenciado pelo Remotion. Em uma máquina nova:

```sh
npm ci
npm run demo
npm run check
npm test
npm run studio
```

Abra http://localhost:3000/VideoEdit. A demonstração é um **clipe técnico de 3 segundos com padrão de vídeo e tom de teste**, não uma filmagem de cliente nem uma locução. Nenhuma imagem gerada substitui um vídeo de cliente. `npm run demo` só cria esse arquivo isolado se ele não existir.

## Importar um original

Execute os comandos nesta pasta (`video-editor`):

```sh
npm run import -- /caminho/absoluto/original.mp4 cliente-a video-01
```

O importador mantém o arquivo de entrada intacto e copia-o para `public/originals/cliente-a/video-01.mp4`. FFprobe detecta resolução, FPS e duração (incluindo áudio mais longo), e grava `projects/cliente-a/video-01.json`. Não sobrescreve arquivos existentes. A fonte é copiada integralmente e não é recodificada.

Cada JSON é um trabalho independente. Edite o array `icons` para sincronizar manualmente com a locução ou marcadores aprovados. Tempos em segundos desde o início do original; fim exclusivo, arredondamento para o quadro mais próximo. Exemplo:

```json
{"id":"beneficio-01","icon":"shield","start":2.4,"end":4.1,"x":0.8,"y":0.25,"size":64,"color":"#ffffff","motion":"slide"}
```

`x` e `y`: centro do ícone em coordenadas de 0 a 1; `size`: pixels originais. Ajuste posições para não cobrir rostos ou elementos importantes e mantenha margem equivalente a metade do tamanho do ícone. Ícones: `check`, `heart`, `shield`, `lightbulb`; movimentos: `none`, `slide`, `scale`. Para ampliar a biblioteca, registre outro ícone Lucide em `src/Root.tsx` e no enum de `src/model.ts`. Não há transcrição, detecção de palavras ou legendagem automática.

Abra outro trabalho no Studio:

```sh
npm run studio -- --props=projects/cliente-a/video-01.json
```

Reinicie o Studio ao trocar o arquivo de props. O `calculateMetadata` adapta a composição aos metadados importados. O vídeo ocupa o quadro inteiro com `contain`, sem cortes. A resolução não é forçada para 1080p ou outro preset.

## Exportar MP4 com áudio integral

```sh
npm run render -- projects/cliente-a/video-01.json out/cliente-a-video-01.mp4
```

Demonstração:

```sh
npm run render -- projects/demo.json out/demo.mp4
```

Em ambientes com Chromium já instalado:

```sh
REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium npm run render -- projects/demo.json out/demo.mp4
```

O comando valida os metadados contra o original, renderiza apenas a imagem em H.264 (CRF 18), e usa FFmpeg `-c copy` para reunir **todas** as faixas de áudio do original no MP4. Sem normalização, alteração de volume, mixagem, cortes ou `-shortest`. Compara o SHA-256 dos pacotes de cada faixa e a resolução antes de publicar a saída. Não sobrescreve saída existente. Arquivos intermediários são removidos mesmo em caso de erro.

**Use esse comando para entrega final.** O botão Render do Studio e `npx remotion render` usam o fluxo de áudio do Remotion e podem recodificá-lo; não fazem a verificação de cópia integral implementada aqui. O Studio permite ouvir o áudio original na prévia em volume 1.

## Formatos e limites explícitos

- Imagem recodificada para incluir os ícones; áudio copiado sem perda de conteúdo codificado. O contêiner MP4 é novo e seus bytes não serão idênticos ao original.
- Se uma faixa de áudio não for compatível com MP4, a exportação falha em vez de convertê-la silenciosamente. Nesse caso é necessário decidir um formato de entrega compatível ou autorizar uma conversão; não remova faixas para contornar isso.
- Pixels não quadrados e orientação por metadados são rejeitados na importação: exigem preparação explícita de uma cópia de trabalho para preservar a geometria corretamente. O arquivo original permanece intacto.
- Vídeos com FPS variável são amostrados no FPS médio em uma composição de FPS constante; não há promessa de preservação dos timestamps de cada quadro. A sincronização deve ser revisada no material real.
- Duração visual arredondada para cima até um quadro; não corta áudio para caber na imagem. Resoluções ímpares usam H.264 yuv444p para não reduzir nem ampliar o quadro (compatibilidade de players mais limitada).
- Não há conversão HDR ou garantia de preservação de perfil de cor HDR. Para trabalhos desse tipo, defina primeiro o fluxo de cor.
- O caso de demonstração não valida a sincronização com uma locução real. Isso depende do vídeo do cliente e dos marcadores manuais.

## Estrutura

- `src/model.ts`: contrato e validação dos trabalhos.
- `src/Root.tsx`: vídeo original e camada reutilizável de ícones.
- `projects/<cliente>/*.json`: configurações independentes por vídeo.
- `public/originals/<cliente>/`: cópias dos originais, ignoradas pelo Git.
- `scripts/import.ts`: importação e leitura de metadados.
- `scripts/render.ts`: renderização, cópia e conferência do áudio.
- `scripts/project.test.ts`: validação de dados e metadados reais.
- `out/`: entregas MP4; `work/`: intermediários; ambos ignorados pelo Git.

Não inclua filmagens confidenciais no Git. Para reproduzir um trabalho em outra máquina, transfira o original com o JSON correspondente. `package-lock.json` fixa as dependências. Verifique os termos de licença comercial do Remotion aplicáveis à sua organização antes de produção.

## Editor visual no navegador

A interface reutiliza `VideoEdit` e o exportador já existentes. Rode a partir de `video-editor`:

```sh
npm ci
npm run demo  # opcional: disponibiliza o clipe técnico para teste
npm run dev
```

Abra **http://localhost:5173** na máquina onde o servidor está executando. Para acessar um ambiente remoto, encaminhe a porta 5173 para sua máquina pela ferramenta de portas da sua plataforma, ou por SSH (`ssh -L 5173:127.0.0.1:5173 usuario@servidor`). O serviço se vincula a `127.0.0.1` por padrão; ele é uma ferramenta local, sem autenticação de múltiplos usuários. Para hospedagem com acesso protegido, siga `deploy/GUIA-HOSPEDAGEM.md`; não exponha o modo local sem senha na internet.

1. Clique em **Importar vídeo** ou arraste um MP4 para a área central (até 1 GB).
2. Reproduza o original com áudio. Use a barra e a forma de onda para localizar a fala.
3. Clique em um ícone da biblioteca. Ele começa no ponto atual da reprodução.
4. Arraste o ícone na prévia para posicioná-lo. Use o painel de propriedades para tamanho, cor, movimento, início e fim.
5. Na linha do tempo, arraste o bloco para mover o intervalo ou suas extremidades para ajustar início/fim. As setas do teclado movem o bloco selecionado em um quadro. Os botões **Marcar início aqui** e **Marcar fim aqui** usam o ponto atual da reprodução.
6. O projeto é salvo automaticamente no servidor local. **Salvar** força a gravação; **Abrir projeto salvo** permite retomar depois.
7. Clique em **Exportar MP4** e aguarde o link **Baixar MP4**. Apenas uma exportação roda por vez.

O upload é transmitido para disco e seu SHA-256 é registrado; nenhum efeito ou ícone é adicionado na importação. Sem ícones, a entrega é uma cópia byte a byte do original. Com ícones, apenas a imagem é renderizada novamente em H.264, mantendo dimensão e proporção; todas as faixas de áudio são copiadas e verificadas pelo exportador existente. O original é conferido novamente depois do render. Não é possível manter os bytes do vídeo exportado idênticos ao original ao incorporar ícones na imagem.

Na prévia, o navegador toca a faixa de áudio padrão que suporta; todas as faixas são mantidas na exportação. Codecs incompatíveis com o navegador podem impedir a prévia, e áudio incompatível com MP4 faz a exportação falhar sem conversão automática. A forma de onda é extraída da primeira faixa; sua ausência não altera a fonte nem impede a exportação. Os limites de FPS variável, HDR, rotação e proporção de pixel descritos acima continuam válidos.

Arquivos da interface:

- `web/`: React, Player Remotion, biblioteca, prévia, linha do tempo e propriedades.
- `server/`: API Node para importação, salvamento, exportação e download.
- `public/originals/browser/`: uploads intactos, ignorados pelo Git.
- `work/editor/projects/`: configurações e metadados dos projetos visuais.
- `work/editor/exports/`: resultados de exportação; o link de download permanece disponível enquanto o processo do servidor estiver ativo.

Uploads, projetos visuais e resultados persistem no disco local, sem envio ao GitHub. Guarde `public/originals/browser/` e `work/editor/projects/` juntos para backup. O arquivo de cada projeto visual contém o campo `project`, com o mesmo formato dos JSONs do fluxo por terminal.

Para servir a versão compilada localmente:

```sh
npm run build:web
npm start
```

A compilação sai em `web-dist/` (ignorada pelo Git). Validação: `npm run check`, `npm test` e `npm run test:web`. Para indicar um Chromium específico, defina `REMOTION_BROWSER_EXECUTABLE`; em Linux o servidor aproveita `/usr/bin/chromium` quando disponível. FFmpeg e FFprobe precisam continuar no PATH.

Teste automatizado de ponta a ponta (com o servidor já rodando e o clipe de `npm run demo` disponível): `npm run test:browser`. Usa Chromium local, importa o clipe técnico, ajusta e arrasta um ícone, reproduz a prévia, exporta e baixa o MP4, e verifica o layout móvel. `EDITOR_URL` permite testar outra porta; `REMOTION_BROWSER_EXECUTABLE` permite escolher o executável. As capturas e o MP4 de teste ficam em `work/`.

## Preparação para hospedagem de teste

Configuração Docker, acesso por senha e armazenamento persistente estão em `Dockerfile`, `compose.yaml`, `server/hosting.ts` e `deploy/`. O Blueprint Render está em `../render.yaml`. O procedimento, os custos estimados e as autorizações necessárias estão em `deploy/GUIA-HOSPEDAGEM.md`. Preparar estes arquivos não publica o código nem contrata hospedagem. O modo local continua usando os diretórios e comandos anteriores.
