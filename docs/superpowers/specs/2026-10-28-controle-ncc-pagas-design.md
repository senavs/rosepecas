# Controle de NCC pagas e não pagas — design

Data: 2026-10-28

## Intenção

O usuário recebe toda semana, por e-mail, PDFs de **NCC** (Notificação de Crédito de Comissão) da General Motors. Cada NCC avisa que a comissão de alguns carros faturados vai ser paga. A NCC pode chegar meses depois do faturamento. O usuário também extrai dois relatórios em Excel:

- **Faturamento**: os carros faturados (ex.: `FATURAMENTO-2026.xlsx`);
- **NCC pagas**: as NCCs cuja comissão de fato caiu na conta (ex.: `NCC-pagas-2026.xlsx`).

O objetivo é responder, para todos os carros faturados acumulados ao longo dos anos: **quais já foram pagos, quais estão parcialmente pagos e quais ainda não foram pagos**, e o que falta para cada um.

O sistema é um site estático no GitHub Pages, **sem back-end**. Os dados ficam num **arquivo local** na máquina do usuário. Esse arquivo é o "banco de dados" e vai sendo enriquecido a cada novo upload.

## Objetivos

- Carregar faturamento, NCC pagas e PDFs de NCC, acumulando os dados num arquivo local ao longo do tempo.
- Cruzar as três fontes e mostrar o status de cada carro e de cada NCC.
- Permitir enriquecer a base a qualquer momento com novas janelas de faturamento, novas pagas e novas NCCs, **sem duplicar** dados, mesmo quando os uploads se sobrepõem (ex.: subir 2026 inteiro e depois só out–dez/2026).
- Tabela filtrável por NCC, data, chassi, NF, cliente, concessionária e status.
- Permitir que o usuário marque manualmente um item como pago ou não pago, como ajuste sobre os dados, sem alterar os dados importados.

## Não-objetivos

- Back-end, login, sincronização entre máquinas ou compartilhamento.
- Ler o e-mail automaticamente: o usuário continua baixando os PDFs e arrastando para o site.
- Conferir valores, ou seja, se a comissão paga bate com a esperada. Pode ser uma evolução futura.
- Editar os dados importados pela interface.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Guardar a base no `localStorage`/IndexedDB do navegador: o usuário não quer depender do limite nem do navegador. A base é o arquivo.
- Duplicar carros, NCCs ou pagamentos ao re-subir dados sobrepostos.
- Um ajuste manual sobrescrever ou apagar o dado vindo da planilha ou do PDF.
- Enviar qualquer dado para fora do navegador. Os arquivos têm dados de clientes; vale a mesma regra do consolidador atual.

## Restrições

- Hospedagem no GitHub Pages, no mesmo repositório e site do consolidador atual (`https://senavs.github.io/rosepecas/`). Stack atual: React 18, Vite, Tailwind, ExcelJS, pdf.js e Vitest.
- **Reaproveitar** a leitura de PDF de NCC existente em `src/ncc/` (`processPdf`, `NccRow`) sem reescrever.
- Nunca versionar planilhas ou PDFs reais. Testes usam fixtures fictícias, como já é feito hoje.

## Os dados de entrada (verificados nos arquivos reais de 2026)

**Faturamento** (`FATURAMENTO-2026.xlsx`, 1 aba, 937 linhas). Colunas: Data de faturamento, Região, Conc Venda, Conc Entrega, Cliente (CPF/CNPJ), Nome do Cliente, Número do Processo, Código Pedido, Forma de pagamento, Status pedido, Número NF, Chassi, Valor, % Comissão Item Fornec, Valor Comissão.

**NCC em PDF**: o parser atual produz `NccRow` com Cód (concessionária), Notificação de Crédito (nº da NCC), Data, Núm. NF (formatado `000.181.575`), Cliente, Chassi, Valor NF, Comissão Bruta, Imposto de Renda e Comissão Líquida.

**NCC pagas** (`NCC-pagas-2026.xlsx`, 1 aba, 1.062 linhas). Colunas: CONC, NCC, Data do recebimento na conta, NF. Não tem chassi.

O que os dados reais mostraram e que fundamenta as decisões abaixo:

- **Um carro pode ter mais de uma NCC.** Quando a concessionária de venda é diferente da de entrega, o mesmo chassi/NF aparece em duas NCCs de concessionárias diferentes. Exemplo: NF 168.707 aparece em P68 com R$ 17.528,22 e em P48 com R$ 180,95.
- **A concessionária não serve como chave.** O `Cód` da NCC bate com a Conc Venda em 501 casos e com a Conc Entrega em 401.
- **NF e chassi ligam NCC ↔ faturamento com 100% de acerto** (537 de 537 casos em que ambos existem). A NF nunca se repete entre chassis diferentes.
- **Um chassi pode ser refaturado com outra NF.** Há 1 caso em 2026: mesmo chassi, NFs 174.211 (jun) e 177.877 (ago). Por isso o faturamento é identificado pela NF, e não pelo chassi.
- **Há carros faturados com Valor Comissão = 0** (22 em 2026). Para esses não se espera NCC.
- A coluna "Status pedido" veio sempre vazia; não há indicação de cancelamento na planilha.
- **Número da NCC + NF liga pagas ↔ NCC** (980 de 1.062 pagas). As 82 restantes são pagas de NCCs cujo PDF não foi carregado, em geral mais antigas.
- **As planilhas têm duplicatas.** No faturamento, o mesmo chassi aparece duas vezes, uma delas com Região e Conc Entrega vazios. Nas pagas há linhas idênticas.

## Como funciona (decidido com o usuário)

### Arquivo local como banco

- Na primeira visita, sem arquivo, o sistema conduz um passo a passo: (1) adicionar faturamento → (2) adicionar NCC pagas → (3) adicionar PDFs de NCC. O sistema cria o arquivo local.
- Nas visitas seguintes, o usuário abre o arquivo existente e a tela já mostra os dados.
- Cada alteração (upload ou ajuste manual) é gravada nesse arquivo.

### Enriquecimento

Uma lateral oferece três ações a qualquer momento: **adicionar faturamento**, **adicionar NCC pagas** e **adicionar PDFs de NCC**. Cada upload é mesclado à base sem duplicar (ver "Chaves e deduplicação").

### Status

Por **linha de NCC** (uma NCC de uma concessionária para um carro):

- **Paga**: existe registro em NCC pagas com o mesmo nº de NCC + NF.
- **Não paga**: a NCC chegou (PDF), mas não consta nas pagas.

Pagamento sem PDF: quando uma paga não tem PDF da NCC correspondente, ela vira uma linha de NCC "sem PDF" (nº da NCC, concessionária e NF vindos da planilha de pagas, sem valores), já com status **paga**. Ela se liga ao carro pela NF. Quando o PDF dessa NCC chegar depois, ele se funde com essa linha pela mesma chave (nº NCC + NF) e preenche os valores, sem duplicar.

Por **carro faturado** (cada NF do faturamento), calculado a partir das suas linhas de NCC:

- **Sem comissão**: Valor Comissão do faturamento é zero; não se espera NCC. Fica fora dos contadores de não pagos.
- **Sem NCC**: nenhuma NCC recebida para a NF.
- **NCC recebida, não paga**: tem NCC(s), nenhuma paga.
- **Parcialmente pago**: parte das NCCs paga, parte não. A tela mostra **quais NCCs faltam** (nº, concessionária e valor).
- **Pago**: todas as NCCs conhecidas do carro estão pagas.

**Órfãos**, listados à parte para não sumirem:

- NCC (PDF) cujo chassi não está em nenhum faturamento carregado, por exemplo um faturamento de um período ainda não subido;
- pagamento cuja NCC + NF não está em nenhuma NCC carregada nem em faturamento.

### Ajuste manual (override)

- O usuário pode marcar manualmente um item como **pago** ou **não pago**. Detalhes de como isso se combina com o status calculado estão na decisão 4.
- O ajuste fica registrado à parte na base, com o valor marcado, a data e, opcionalmente, uma observação. Ele **não altera** os dados importados das planilhas e PDFs, que continuam sendo a fonte da verdade. É uma camada por cima, usada só para calcular o status exibido.
- Na tela, o status ajustado aparece com uma marca visível de "manual", distinta do status calculado. O usuário pode desfazer o ajuste e voltar ao status calculado.

### Tela principal

- Tabela de carros com Data de faturamento, Conc Venda/Entrega, Cliente, NF, Chassi, Valor, Valor Comissão (do faturamento), status e as NCCs do carro (nº, Cód, data, comissão líquida, paga/não paga/manual).
- Filtros: status, nº da NCC, intervalo de datas, chassi, NF, cliente e concessionária.
- Contadores por status no topo.
- Uma visão de órfãos.

## Chaves e deduplicação (minha decisão)

Normalização: NF sem pontuação e sem zeros à esquerda (`000.168.707` → `168707`); chassi em maiúsculas e sem espaços; nº da NCC como texto só com dígitos.

| Tabela | Chave | Re-upload da mesma chave |
|---|---|---|
| Faturamento | NF | mescla: campos vazios na base são preenchidos pelo novo; campos preenchidos são substituídos pelo valor mais recente, se não vazio |
| Linha de NCC | nº NCC + NF | mesma regra de mescla |
| NCC paga | nº NCC + NF | mesma regra de mescla; linhas idênticas viram uma só |
| Ajuste manual | o item ajustado (NF do carro, ou nº NCC + NF da linha) | substitui o ajuste anterior do mesmo item |

Ligações: linha de NCC → carro por **NF**, conferindo o chassi (se a NF bater e o chassi não, a linha é sinalizada como divergente e vai para a visão de órfãos); paga → linha de NCC por **nº NCC + NF**.

Depois de cada upload, o sistema mostra um resumo: X novos, Y atualizados, Z ignorados (sem chave). Linhas sem NF (faturamento) ou sem NF (pagas) são ignoradas e listadas no resumo.

## Decisões minhas (o usuário pode revisar)

1. **Formato do arquivo local: JSON.** Ele guarda os dados normalizados, o histórico de arquivos importados (nome, data, contagens) e os ajustes manuais, com um campo de versão do esquema. É simples, robusto e rápido para alguns milhares de linhas por ano. A exportação para Excel continua disponível à parte.
2. **Acesso ao arquivo: File System Access API.** Funciona no Chrome e no Edge e permite abrir o arquivo uma vez e salvar automaticamente nele a cada mudança. No Firefox e no Safari, que não têm essa API, o sistema funciona com "abrir arquivo" e "baixar arquivo atualizado", e avisa que é preciso salvar manualmente. Se a permissão de escrita for perdida (ex.: aba recarregada), o sistema pede para reabrir o arquivo.
3. **Mesmo app, nova tela.** O consolidador PDF→Excel atual continua existindo; o novo sistema entra como outra seção do mesmo site, reutilizando `src/ncc/`.
4. **Ajuste manual: onde vale e como se combina.**
   - O ajuste pode ser feito numa **linha de NCC** (inclusive órfãs) ou num **carro**.
   - O ajuste de uma linha entra no cálculo do carro como se fosse o status dela. Exemplo: marcar como paga a NCC que faltava faz o carro passar de "parcial" para "pago (manual)".
   - O ajuste de um carro define o status exibido do carro, mas **não** altera as linhas. As NCCs que faltam continuam listadas, marcadas como "carro marcado manualmente". Isso cobre, por exemplo, um carro sem NCC que o usuário sabe que já foi pago.
   - Os conflitos são avaliados **por linha**. Se o ajuste diz "não pago" e depois chega na planilha de pagas a confirmação do pagamento, o status passa a "pago" (a planilha é a fonte da verdade), mas o ajuste fica guardado e o item é sinalizado como "conflito" para o usuário revisar. Se o ajuste diz "pago" e a planilha confirma depois, o item mostra "pago (confirmado)" e o ajuste vira redundante. Num ajuste de carro, há conflito quando o carro está marcado "não pago" e alguma linha dele é confirmada paga pela planilha. o ajuste diz "não pago" e depois chega na planilha de pagas a confirmação do pagamento, o status passa a "pago" (a planilha é a fonte da verdade), mas o ajuste fica guardado e o item é sinalizado como "conflito" para o usuário revisar. Se o ajuste diz "pago" e a planilha confirma depois, o item mostra "pago (confirmado)" e o ajuste vira redundante.
5. **Carros sem comissão** (Valor Comissão = 0) ganham o status próprio "Sem comissão" e não contam como não pagos.
6. **Remoção de dados importados** fica fora da primeira versão. Como a base é um JSON, uma importação errada se corrige reabrindo um backup. O sistema sugere guardar uma cópia, mas não faz versionamento.

## Deixado para quem for construir

- Layout, componentes visuais e organização exata dos filtros, seguindo o visual do consolidador atual.
- Leitura das planilhas Excel: localizar as colunas pelo nome do cabeçalho, tolerante a ordem e a pequenas variações, e não pela posição.
- Estrutura interna do JSON e estratégia de cálculo dos status, ex.: recalcular tudo em memória a cada mudança, o que é viável no volume esperado.
- Exportação para Excel da visão filtrada.
- Fixtures fictícias para testes, cobrindo: carro com duas NCCs (parcial), duplicatas no faturamento, re-upload sobreposto, pagas sem PDF, órfãos e ajuste manual em conflito.
