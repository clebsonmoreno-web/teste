# Abra o editor e teste seu vídeo

A configuração instala as dependências e inicia o editor automaticamente, sem comandos manuais. Ela reaproveita o Dockerfile e o projeto existentes.

1. Aguarde o Codespace terminar de preparar o ambiente. A primeira abertura pode levar alguns minutos.
2. O editor deve abrir em outra aba. Se o navegador bloquear a abertura, vá à aba **PORTS**, procure **5173 — Abrir editor de vídeos** e clique no ícone de globo (**Open in Browser**). Mantenha a visibilidade **Private**.
3. No editor, clique em **Importar vídeo**, escolha seu MP4, ouça a locução, adicione e posicione os ícones, e clique em **Exportar MP4**. Aguarde **Baixar MP4** e salve o arquivo no seu computador.

Se você ainda não criou o Codespace: abra a branch `feat/video-editor` no GitHub, use **Code → Codespaces → Create codespace** e escolha a máquina de **2 cores**. Se aparecer uma seleção de configuração, escolha **Frame — editor de vídeos**. Não use um Codespace antigo sem reconstruí-lo: a configuração nova só é aplicada na criação ou em **Rebuild Container**.

## Usar somente a franquia gratuita

Antes de criar o Codespace, confira **GitHub → Settings → Billing and licensing → Budgets and alerts / Usage**. Você deve ter franquia disponível e impedir uso pago excedente. Se a conta tiver cartão cadastrado, configure orçamento de Codespaces de US$ 0 com bloqueio de uso ao atingir o orçamento, conforme as opções disponíveis no painel. Se o GitHub solicitar contratação ou habilitação de pagamento, não prossiga.

O repositório não consegue consultar sua franquia, alterar seu orçamento nem garantir gratuidade por configuração. Nada neste projeto ativa faturamento, cria Codespaces ou compra serviços. Você confirma a criação no GitHub.

Contas pessoais GitHub Free incluem 120 horas de núcleo e 15 GB-mês de armazenamento. Em uma máquina de 2 cores, isso corresponde a até cerca de 60 horas de execução por ciclo, descontando outros usos. A imagem, dependências, uploads e MP4 exportados consomem armazenamento. Esta é uma franquia limitada, não hospedagem gratuita ilimitada.

[Regras oficiais de faturamento e franquia](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces).

## Ao terminar

Baixe seu MP4 e pare o Codespace em [github.com/codespaces](https://github.com/codespaces). Fechar a aba não garante parada imediata. Mesmo parado, o ambiente continua consumindo a franquia de armazenamento. Depois de baixar seus arquivos e fazer os backups desejados, exclua o Codespace para encerrar esse consumo. A exclusão apaga os uploads e projetos existentes só naquele ambiente.

O serviço é para seu teste privado, não para manter um site público. A autenticação fica a cargo do GitHub na porta privada. Não altere a porta para Public: essa configuração não usa a senha adicional preparada para o Render.

## O que permanece preservado

O código de edição e exportação não é substituído. Os originais ficam intactos em `video-editor/public/originals/browser/`, e os projetos em `video-editor/work/editor/projects/`, dentro do workspace do Codespace. Eles permanecem entre paradas/reinícios enquanto o ambiente existir, são ignorados pelo Git e não são enviados ao repositório. Exporte novamente se um reinício interromper o render ou invalidar seu link de download.

O endereço externo é gerado pelo GitHub somente depois que você cria o ambiente; o link do repositório não é o link do editor. A configuração não permite que este chat abra um Codespace na sua conta, verifique sua franquia ou confirme uso cobrado por você.
