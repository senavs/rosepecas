# Consolidador de NCC (PDF → XLSX) — Design

Data: 2026-10-25

## Intenção

A concessionária recebe da General Motors do Brasil vários PDFs de "Relatório NCC" (Notificação de Crédito de Comissão), gerados pelo SAP. Cada um traz uma tabela com uma ou mais NFs e as comissões de cada uma. Hoje alguém precisa juntar essas linhas na mão. O sistema recebe vários PDFs de uma vez, extrai as linhas da tabela de todos, mostra tudo consolidado numa página e exporta para um único `.xlsx`.

Ele roda 100% no navegador e é hospedado no GitHub Pages. Nenhum PDF ou dado sai da máquina do usuário.

## Objetivos

- Upload de vários PDFs de uma vez (arrastar e soltar ou seletor de arquivos), com a opção de adicionar mais em lotes seguidos.
- Extrair todas as linhas da tabela de cada PDF, seja qual for a quantidade.
- Mostrar as linhas consolidadas numa tabela, com uma linha de totais.
- Checkbox "Excluir duplicados", que remove linhas 100% idênticas, e botão "Exportar Excel".
- Gerar o `.xlsx` no cliente.
- Interface simples, direta e bonita (usar a skill `frontend-design:frontend-design` na implementação da UI).

## Não-objetivos

- Backend, login, banco de dados, persistência entre recarregamentos (ao recarregar, começa do zero).
- OCR ou suporte a PDFs escaneados ou em outros formatos.
- Edição manual das linhas na tela.
- Várias abas no Excel ou relatórios agregados (por cliente, por Cód etc.).
- PWA/offline (pode ficar para depois, não faz parte deste escopo).

## Anti-objetivos (é falha mesmo que "funcione")

- Enviar o conteúdo dos PDFs para qualquer serviço externo, incluindo analytics com dados das linhas.
- Valores monetários errados por causa de parse de número (por exemplo, `123.456,78` lido como `123.45678`). Um valor errado é pior do que um PDF rejeitado.
- Perder linhas sem avisar: se um PDF foi lido mas a tabela veio vazia ou parcial, o usuário precisa ver isso.

## Formato de entrada (observado em 2 PDFs reais de exemplo; abaixo, estrutura com dados fictícios)

PDF com texto real, gerado pelo SAP (sem OCR). Texto extraído com layout:

```
Relatório NCC: ate
                    General Motors do Brasil Ltda                 23.10.2026
Notificação de Crédito: 900001        Cód : T01
Fábr : 08
Núm. NF        Cliente                              Chassi              Valor NF     Commiss. Bruta Imp. Renda  Commis. Liq.
000.000.001    CLIENTE TESTE UM DA SILVA JUNIOR     TESTE000000000001   123.456,78   1.234,56       18,52       1.216,04
000.000.002    CLIENTE TESTE DOIS                   TESTE000000000002   200.000,00   10.000,00      150,00      9.850,00
```

Campos por PDF (cabeçalho): **Data** (`dd.mm.aaaa`), **Notificação de Crédito** (número), **Cód** (por exemplo, `T01`).
Campos por linha: **Núm. NF** (`000.000.000`), **Cliente** (texto com espaços), **Chassi** (VIN de 17 caracteres), **Valor NF**, **Comissão Bruta**, **Imposto de Renda**, **Comissão Líquida** (números no formato pt-BR).

O formato é sempre esse, segundo o usuário. Os exemplos têm 1 página. O parser deve percorrer **todas as páginas** e juntar as linhas, caso a tabela continue numa segunda página (decisão minha, por precaução).

## Saída: colunas (tela e Excel, nesta ordem)

| # | Coluna | Tipo no Excel | Observação |
|---|--------|---------------|------------|
| 1 | Cód | texto | do cabeçalho do PDF |
| 2 | Notificação de Crédito | texto | do cabeçalho do PDF |
| 3 | Data | data (`dd/mm/aaaa`) | do cabeçalho do PDF |
| 4 | Núm. NF | texto | preserva `000.000.001` |
| 5 | Cliente | texto | |
| 6 | Chassi | texto | |
| 7 | Valor NF | número, formato `#,##0.00` | |
| 8 | Comissão Bruta | número, `#,##0.00` | |
| 9 | Imposto de Renda | número, `#,##0.00` | |
| 10 | Comissão Líquida | número, `#,##0.00` | |

O usuário pediu explicitamente as colunas 4 a 10 e aprovou incluir as colunas 1 a 3 (origem).

Na tela, a tabela pode abreviar cabeçalhos ou omitir Notificação e Data se faltar espaço (o mockup aprovado mostra Cód, NF, Cliente, Chassi e os 4 valores). Fica a critério do builder, mas o **Excel sempre tem as 10 colunas**.

## Comportamento

### Upload e lista de arquivos (lateral esquerda)
- Área "Adicionar PDFs" que aceita arrastar e soltar e clique (input `multiple`, `accept=".pdf,application/pdf"`).
- Novos uploads **somam** aos já carregados.
- Cada arquivo aparece na lateral com seu status:
  - ✅ `T01 — NCC 900001` · "2 linhas"
  - ❌ nome do arquivo · mensagem curta ("Não parece um relatório NCC", "Nenhuma linha encontrada", "Não foi possível ler o PDF"). Os outros arquivos continuam funcionando.
  - Estado "lendo…" enquanto processa.
- Cada arquivo pode ser removido (✕), o que tira as linhas dele.
- Botão "Limpar tudo" (minha decisão).

### Tabela consolidada (direita)
- Linhas na ordem dos arquivos carregados e, dentro de cada arquivo, na ordem do PDF.
- Números exibidos em pt-BR (`123.456,78`).
- **Linha de totais** no rodapé: soma de Valor NF, Comissão Bruta, Imposto de Renda e Comissão Líquida, mais a contagem de linhas ("Total (3 linhas)").
- Estado vazio amigável, explicando o que fazer.

### Excluir duplicados
- Checkbox **ao lado do botão "Exportar Excel"** (pedido do usuário), desmarcado por padrão.
- Duplicado = linha com **todas as 10 colunas idênticas** a uma linha anterior. Fica a primeira ocorrência.
  - Consequência: o mesmo PDF enviado duas vezes é removido, mas a mesma NF em PDFs diferentes (Cód ou Notificação diferentes) permanece.
- O filtro vale **para a tela e para o Excel** (confirmado pelo usuário). Os totais são recalculados.
- Mostrar quantas linhas foram ocultadas (por exemplo, "2 duplicadas ocultas") (minha decisão).

### Exportar Excel
- Gera o `.xlsx` no navegador e dispara o download.
- Arquivo: `NCC-consolidado-AAAA-MM-DD.xlsx` (data de hoje). Uma aba, chamada `NCC`.
- Cabeçalho em negrito na linha 1, com as 10 colunas da tabela acima e os tipos indicados.
- Linha final de **TOTAL** com as somas das colunas 7 a 10 (pode ser fórmula `SUM` ou valor fixo, decisão do builder; minha sugestão é fórmula).
- Botão desabilitado quando não há linhas.

## Restrições técnicas

- **Hospedagem:** GitHub Pages, site estático. Repositório `senavs/rosepecas` (público, criado pelo usuário/fluxo de setup), `base: '/rosepecas/'` no Vite, URL final `https://senavs.github.io/rosepecas/`. **"Pronto" inclui o deploy publicado** (`npm run deploy` publicando a branch `gh-pages`) e o critério de aceite validado na URL publicada.
- Commits sem `Co-Authored-By` ou qualquer atribuição ao Claude (pedido do usuário).
- **Stack** (minha decisão, seguindo o projeto de referência `../bills-shopping-list`): Vite + React 18 + TypeScript + Tailwind CSS 3, deploy via `gh-pages -d dist` (`npm run deploy`), testes com Vitest.
- **Leitura de PDF:** `pdfjs-dist` (`getTextContent`, usando as posições x/y dos itens para reconstruir as linhas). O worker é empacotado pelo Vite, sem CDN em runtime, para não depender de terceiros nem vazar dados.
- **Geração de XLSX:** ExcelJS (minha decisão: suporta formato numérico, negrito e fórmulas na versão gratuita; a versão community do SheetJS não suporta estilo). Carregar sob demanda (`import()`) no clique de exportar, para não pesar o carregamento inicial.
- Sem chamadas de rede em runtime além dos próprios assets do site.

## Parser — orientação

- Juntar os itens de texto por coordenada Y (com tolerância) para formar as linhas e ordenar cada uma por X.
- Cabeçalho: regex para `Notificação de Crédito:\s*(\d+)`, `Cód\s*:\s*(\S+)` e data `\d{2}\.\d{2}\.\d{4}`.
- Linha de dados: começa com `\d{3}\.\d{3}\.\d{3}`, tem um chassi de 17 caracteres alfanuméricos e termina com 4 números pt-BR (`[\d.]+,\d{2}`). Cliente = tudo entre a NF e o chassi.
- Número pt-BR → `number`: remover `.` e trocar `,` por `.`. Validar com testes que `123.456,78 → 123456.78`.
- Se o cabeçalho não for encontrado ou houver zero linhas, o arquivo entra como erro (❌), sem quebrar os demais.
- **Variações de linha toleradas** (minha decisão; as amostras só têm 3 linhas, então o parser se protege):
  - Valores negativos com `-` no começo ou no fim (`-1.234,56` ou `1.234,56-`, padrão SAP para estorno) viram número negativo.
  - Nome de cliente que quebra numa segunda linha: uma linha de texto sem NF, situada entre duas linhas de dados e na faixa X da coluna Cliente, é concatenada ao cliente da linha anterior.
- **Leitura parcial** (minha decisão): o parser devolve `{ header, rows, warnings }`. Uma linha que começa com o padrão de NF mas não casa com a regex completa vira um aviso, com o texto bruto da linha. Arquivo com linhas válidas e avisos ganha um terceiro status, ⚠ "2 linhas lidas, 1 não reconhecida", e mostra as linhas não reconhecidas ao expandir. As linhas válidas entram na tabela, nos totais e no Excel. Assim nada é perdido em silêncio e o trabalho não fica bloqueado.
- Parser como função pura, testável sem DOM: recebe as linhas de texto e devolve os dados estruturados. A extração de texto via pdf.js fica separada.

## Testes

- Testes unitários do parser a partir de texto (linhas) fixo, cobrindo 1 linha, várias linhas, cliente com muitos espaços, número com milhar, PDF inválido e várias páginas.
- Testes da deduplicação e dos totais.
- Teste da geração de XLSX (gerar o buffer e reler com ExcelJS para conferir tipos, formatos e linha de total).
- **Fixtures:** os PDFs reais contêm nomes de clientes e chassis. **Nunca versionar ou subir os PDFs reais** (pedido explícito do usuário). O `.gitignore` já ignora `*.pdf` e `*.PDF`. Os PDFs reais ficam só na máquina do usuário (fora do repo) e servem só para validação manual local. Nunca citar nomes, valores, chassis ou nomes de arquivo reais no repositório (código, testes, docs ou mensagens de commit).
  - O usuário autorizou criar **PDFs mock** com o mesmo layout e dados fictícios marcados como TESTE (por exemplo, cliente `CLIENTE TESTE UM`, NF `000.000.001`, chassi `TESTE000000000001`, Cód `T01`). Esses mocks entram no repo (`tests/fixtures/`, com exceção explícita no `.gitignore`) e servem para um teste de integração da extração via pdf.js. Pode haver um script que gera os mocks. Além disso, fixtures de texto para os testes unitários do parser.

## Critério de aceite

Ao subir os 2 PDFs reais de exemplo juntos (um com 1 linha, outro com 2), a tela mostra 3 linhas, e os totais batem com a soma manual dos PDFs (conferida localmente, sem registrar os valores no repo). O Excel exportado tem as mesmas 3 linhas, as 10 colunas e a linha de total. Subir de novo o PDF de 2 linhas e marcar "Excluir duplicados" volta a mostrar 3 linhas na tela e no Excel. O mesmo cenário é automatizado com os PDFs mock de TESTE.

## Deixado para o builder

- Estrutura de pastas e componentes, estado (useState/useReducer).
- Direção visual detalhada (via `frontend-design`), respeitando o layout B aprovado: lateral de arquivos à esquerda, tabela com totais à direita, checkbox de duplicados ao lado do botão de exportar.
- Comportamento responsivo em telas estreitas (por exemplo, a lateral vira um bloco em cima).
- Fórmula vs. valor fixo na linha de total do Excel.
- Adicionar `.superpowers/` ao `.gitignore`.
