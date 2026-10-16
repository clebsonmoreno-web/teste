# Versão de teste pelo navegador

## Situação atual

A interface, o renderizador e os arquivos existentes foram preservados. A preparação de hospedagem está local; nenhum serviço foi contratado, nenhuma imagem foi enviada para um registro e nenhum novo código foi publicado no GitHub. Ainda não existe um endereço HTTPS externo para este editor.

O caminho preparado é um **Web Service Docker no Render**, com login simples no navegador e disco persistente. Ele usa o mesmo aplicativo Node, a mesma composição Remotion e o mesmo comando de exportação. A concorrência do render pode ser configurada por `REMOTION_CONCURRENCY`: na hospedagem de 1 CPU usa 1; no modo local o padrão continua 2. Isso altera o paralelismo, não a imagem nem o áudio. Você não terá de instalar Node, FFmpeg, Chromium ou Docker no seu computador para usar o serviço hospedado.

## Custo antes de publicar

Referência consultada em 15/10/2026 (data do cliente), em dólares americanos:

| Recurso proposto | Configuração | Referência mensal |
| --- | --- | --- |
| Serviço web | `1c-2g`: 1 CPU, 2 GB RAM | US$ 25,00 |
| Disco persistente | 10 GB, US$ 0,25/GB/mês | US$ 2,50 |
| Base estimada por mês completo | Uma instância, sem extras | **US$ 27,50** |

Não é um preço fechado nem um limite de cobrança. Podem ser cobrados tráfego de vídeo, minutos de build acima da franquia, impostos, conversão de moeda e outros recursos que você adicionar. O workspace Hobby não exige a contratação do workspace Pro para esta configuração; confirme os valores efetivos no resumo da sua conta. A memória proposta é uma base para teste: vídeos maiores ou 4K podem exigir mais recursos, mediante nova aprovação de custo. Licenças comerciais do Remotion, quando aplicáveis, são separadas da hospedagem.

Fontes oficiais: [preços Render](https://render.com/pricing), [plano 1c-2g e preços de referência](https://render-www.onrender.com/articles/production-rails-hosting-guide), [discos persistentes](https://render.com/docs/disks), [limites gratuitos](https://render.com/docs/free) e [configuração Blueprint](https://render.com/docs/blueprint-spec).

O plano gratuito tem recursos limitados e não aceita o disco persistente necessário para manter os uploads e projetos entre reinícios. Não foi escolhido para esta preparação.

## O que depende de você

São duas autorizações separadas:

1. **Publicação do código:** autorizar o envio da interface e da preparação de hospedagem para a branch `feat/video-editor` de `clebsonmoreno-web/teste`. A branch publicada atualmente contém apenas a versão anterior do projeto. O envio de código ao GitHub não cria nem contrata a hospedagem.
2. **Conta e cobrança no Render:** entrar/criar sua conta pelo navegador, conectar o repositório GitHub e confirmar o plano e a cobrança antes de criar o serviço. Esse ambiente não possui uma conexão autenticada com o Render. A aprovação financeira e o preenchimento do meio de pagamento ficam com você. Não envie senha da conta, cartão ou chave de API no chat.

Depois do envio autorizado ao GitHub:

1. No [painel do Render](https://dashboard.render.com), escolha **New → Blueprint**.
2. Conecte `clebsonmoreno-web/teste`, selecione a branch **feat/video-editor** e use **render.yaml**, que fica na raiz do repositório.
3. Confira a criação de **um** serviço `frame-video-editor-test`, runtime Docker, plano `1c-2g`, região Virginia, disco de **10 GB** em `/data` e deploy automático desativado. Nenhum banco de dados ou serviço adicional é necessário.
4. Preencha os campos secretos solicitados: `BASIC_AUTH_USER` com seu usuário de teste e `BASIC_AUTH_PASSWORD` com uma senha exclusiva de **16 caracteres ou mais**. Esses valores ficam apenas no painel do provedor. Não use a senha do GitHub nem a do Render.
5. Confira o preço efetivo no painel. **Somente confirme a criação/deploy se você autorizar a cobrança.** Mesmo com deploys automáticos desativados, criar o Blueprint pode iniciar o primeiro deploy e a cobrança do serviço e do disco.
6. Aguarde a construção e o healthcheck. O Render informará a URL HTTPS `https://<nome-real>.onrender.com`. O nome definitivo será fornecido pelo provedor; não há URL reservada agora.
7. Abra essa URL, informe o usuário e a senha no diálogo do navegador e use **Importar vídeo → adicionar/posicionar ícones → Exportar MP4 → Baixar MP4**. Comece com um clipe curto para verificar os recursos antes de subir um vídeo grande.

Não é preciso domínio próprio. Em endereço padrão do Render, a variável `RENDER_EXTERNAL_URL` configura a origem HTTPS automaticamente. Se adicionar domínio próprio depois, configure `APP_ORIGIN` com a URL HTTPS exata, sem caminho.

Se preferir, a criação manual de Web Service usa: repositório e branch acima; Dockerfile `video-editor/Dockerfile`; contexto Docker `video-editor`; porta fornecida pelo Render; healthcheck `/api/health`; as variáveis e o disco descritos neste guia. O Blueprint já reúne essas configurações.

## O que foi preparado

- `Dockerfile`: Node 22, FFmpeg, Chromium, build React e testes. O processo da aplicação roda como usuário `node`, sem privilégios de root.
- `.dockerignore`: exclui dependências locais, originais privados, renders, intermediários, `.env` e Git do contexto da imagem. Só o clipe técnico de demonstração é criado dentro da imagem.
- `deploy/start.sh`: inicializa as permissões do volume e inicia o servidor como usuário `node`.
- `render.yaml`, na raiz do repositório: serviço Docker, disco, healthcheck, solicitação de credenciais e deploys automáticos desativados.
- `server/hosting.ts`: autenticação HTTP Basic, configuração de origem HTTPS e armazenamento opcional. A execução local sem essas variáveis continua com os caminhos anteriores.
- `compose.yaml` e `.env.example`: execução protegida e persistente para quem mantém infraestrutura Docker. Não são necessários para o usuário final.
- `deploy/smoke.mjs`: teste local da imagem com credenciais temporárias, exportação, validação de áudio, reinício e leitura do volume. Não publica imagens nem cria recursos externos.

## Persistência e privacidade

O volume `/data` contém `/data/originals`, `/data/editor` e `/data/work`. O diretório temporário do render é configurado por `REMOTION_WORK_DIR=/data/work` na imagem, para que o arquivo validado seja movido para a entrega no mesmo sistema de arquivos. No modo local o padrão continua `work/`. Um link em `public/originals/browser` permite que o renderizador existente encontre os originais sem alterar sua lógica. Se já houver um diretório de uploads nesse caminho, a configuração recusa substituí-lo: migração de dados deve ser explícita.

Os arquivos do ambiente Codex não são enviados para a imagem. Você importará seu vídeo pelo navegador depois da publicação. Os vídeos passarão a ser armazenados no provedor escolhido; somente quem tem as credenciais do editor deve acessá-los. Este teste tem um login compartilhado, não contas e projetos isolados por pessoa.

Uploads e configurações sobrevivem a reinícios e redeploys enquanto o disco for mantido. A fila de exportação é mantida em memória: um reinício pode interromper o render e invalidar links de download anteriores. Reabra o projeto e exporte novamente se necessário. Faça backup dos originais e projetos. O disco não é uma política completa de backup.

Somente `/api/health` fica disponível sem senha e retorna apenas o estado de saúde. Interface, API de projetos, uploads e downloads exigem autenticação quando a hospedagem está configurada. O acesso externo deve usar HTTPS.

Áudio é copiado sem recodificação e verificado pelo fluxo existente; o original não é editado. A imagem do resultado precisa ser recodificada quando houver ícones, mantendo resolução e proporção. Sem ícones, o resultado é uma cópia byte a byte. Os limites já documentados de codecs, FPS variável, rotação, HDR e tamanho de upload continuam valendo.

## Testes técnicos locais (já preparados; usuário final não precisa executá-los)

```sh
# Na pasta video-editor, com Docker disponível:
docker build -t frame-editor:local-test .
node deploy/smoke.mjs
```

O teste usa contêiner e volume próprios, com nomes temporários, e os remove ao terminar. Não toca no disco real do editor. Em ambiente Codex com proxy TLS, o build precisa do segredo efêmero de CA indicado pelo runtime, sem gravá-lo na imagem.

Para Docker Compose local: preencha `.env` a partir de `.env.example` e execute `docker compose up --build`. O bind de porta do Compose é somente `127.0.0.1`; ele não publica o serviço na internet.

## Encerrar o teste e evitar cobranças recorrentes

Ao terminar, baixe seus MP4 e faça backup dos originais/projetos desejados. Para encerrar os custos, confira no painel a remoção do serviço e do disco; apenas fechar o navegador não encerra a hospedagem. Remover o disco apaga seus dados, portanto essa decisão deve ser tomada por você depois do backup. Confirme no painel a interrupção da cobrança e eventuais valores de uso pendentes.

## Validação realizada neste ambiente

A imagem foi construída localmente com Node 22, FFmpeg e Chromium. Os 12 testes automatizados (3 do projeto e 9 da interface/hospedagem) passaram no build. O teste do contêiner foi executado com limite de 1 CPU/2 GB: página e arquivos protegidos, upload com hash idêntico, exportação sem ícones byte a byte, exportação com ícone e áudio verificado por SHA-256, download e leitura HTTP Range. Depois do reinício, projeto e original continuaram íntegros no volume. A interface protegida também abriu e reproduziu o vídeo no Chromium. O comando de exportação local, com seus padrões anteriores, passou novamente.

Esses testes usaram o clipe técnico de demonstração. Não substituem a verificação do seu vídeo real, do HTTPS e da capacidade do provedor após a implantação autorizada. A estrutura YAML e o Compose foram verificados localmente; a validação definitiva do Blueprint e os preços efetivos serão apresentados pelo Render antes da criação do serviço.
