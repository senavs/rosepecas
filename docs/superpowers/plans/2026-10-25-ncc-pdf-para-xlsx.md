# Consolidador de NCC (PDF → XLSX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site estático (GitHub Pages) que lê vários PDFs de Relatório NCC no navegador, consolida as linhas numa tabela com totais e exporta um `.xlsx` client-side.

**Architecture:** Núcleo puro em `src/ncc/` (parse de número, parser de linhas de texto, dedupe/totais, geração de XLSX), testado sem DOM. Uma camada fina com pdf.js transforma os bytes do PDF em linhas de texto (`TextLine[]`). A UI React (layout B: lateral de arquivos + tabela com totais) usa um reducer de estado de arquivos.

**Tech Stack:** Vite 5 + React 18 + TypeScript + Tailwind CSS 3, Vitest 2 (happy-dom para componentes, node para pdf.js), `pdfjs-dist`, `exceljs` (import dinâmico), `pdf-lib` (só dev, para gerar os PDFs mock), `gh-pages`.

**Spec:** `docs/superpowers/specs/2026-10-25-ncc-pdf-para-xlsx-design.md`

## Global Constraints

- Tudo client-side. Nenhuma chamada de rede em runtime além dos assets do próprio site. Worker do pdf.js empacotado pelo Vite (sem CDN).
- `base: '/rosepecas/'`, URL final `https://senavs.github.io/rosepecas/`.
- **Nunca** versionar PDFs reais nem citar dados reais (nomes, chassis, NFs, valores, nomes de arquivo) em código, testes, docs ou mensagens de commit. Só os mocks `tests/fixtures/ncc-teste-*.pdf` entram no repo.
- Commits **sem** `Co-Authored-By` ou qualquer atribuição ao Claude.
- Colunas, nesta ordem, na tela e no Excel: Cód, Notificação de Crédito, Data, Núm. NF, Cliente, Chassi, Valor NF, Comissão Bruta, Imposto de Renda, Comissão Líquida.
- Excel: aba `NCC`, arquivo `NCC-consolidado-AAAA-MM-DD.xlsx`, cabeçalho em negrito, valores em `#,##0.00`, Data como data `dd/mm/yyyy`, NF/Chassi/Notificação/Cód como texto, linha final `TOTAL` com `SUM` nas colunas G a J.
- Duplicado = as 10 colunas idênticas. Mantém a primeira ocorrência. O filtro vale para a tela, os totais e o Excel.
- Mensagens de erro exatas: `Não parece um relatório NCC`, `Nenhuma linha encontrada`, `Não foi possível ler o PDF`.
- UI em pt-BR. Usar a skill `frontend-design:frontend-design` na Task 7.

## Review Focus

1. **Data do Excel deslocada um dia por fuso horário** (o usuário está em UTC−3): 23/10/2026 tem que abrir como 23/10/2026 → teste na Task 5.
2. **Soma de ponto flutuante nos totais** (por exemplo, `0,10 + 0,20` mostrando `0,30000000000000004` ou arredondando errado) → totais somados em centavos inteiros, teste na Task 4.
3. **Arquivo corrompido ou que não é PDF arrastado junto com PDFs válidos**: vira ❌ `Não foi possível ler o PDF` e os outros seguem → teste na Task 3.
4. **Heurística de nome quebrado engolindo rodapé/cabeçalho** (por exemplo, uma linha `TOTAL GERAL` na margem esquerda depois da tabela): só concatena linhas recuadas → teste na Task 2.
5. **Mesmo PDF adicionado duas vezes (no mesmo lote ou em lotes diferentes)**: as duas entradas aparecem na lateral com ids distintos e remover uma não remove a outra → teste na Task 6.

---

## File Structure

```
index.html, vite.config.ts, vitest.config.ts, tsconfig.json, tsconfig.node.json,
tailwind.config.js, postcss.config.cjs, package.json, .gitignore
src/main.tsx, src/index.css, src/App.tsx
src/ncc/types.ts        tipos compartilhados
src/ncc/number.ts       parseBrNumber, formatBr, sumCents
src/ncc/parse.ts        parseNccLines (puro), NccParseError
src/ncc/pdfjs.ts        pdf.js do navegador + worker (único arquivo que importa pdfjs-dist no app)
src/ncc/extract.ts      groupTextItems (puro), extractTextLines (usa ./pdfjs)
src/ncc/process.ts      processPdf: File → FileResult (extract + parse + mensagens)
src/ncc/rows.ts         dedupeRows, computeTotals
src/ncc/xlsx.ts         buildWorkbookBuffer, exportFilename, downloadXlsx
src/state/files.ts      reducer da lista de arquivos
src/components/FileSidebar.tsx, RowsTable.tsx, Toolbar.tsx
scripts/make-fixtures.mjs
tests/fixtures/ncc-teste-1.pdf, ncc-teste-2.pdf, ncc-teste-3.pdf
Testes ao lado do código: src/**/*.test.ts(x)
```

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.cjs`, `src/main.tsx`, `src/index.css`, `src/App.tsx`, `src/App.test.tsx`
- Modify: `.gitignore` (adicionar `!tests/fixtures/ncc-teste-*.pdf` depois de `*.pdf`), `README.md`

**Interfaces:**
- Produces: scripts `dev`, `build` (`tsc && vite build`), `test` (`vitest`), `predeploy` (`npm run build`), `deploy` (`gh-pages -d dist`). `<App />` default export.

- [ ] **Step 1:** Instalar deps: `react@^18.3 react-dom@^18.3 pdfjs-dist exceljs` e dev `vite@^5 @vitejs/plugin-react typescript @types/react@^18 @types/react-dom@^18 tailwindcss@^3.4 postcss autoprefixer vitest@^2 happy-dom @testing-library/react @testing-library/jest-dom @testing-library/user-event pdf-lib gh-pages`. Config TS/Tailwind/PostCSS no mesmo estilo de `../bills-shopping-list` (tsconfig strict, `moduleResolution: bundler`). `vite.config.ts` com `base: '/rosepecas/'`. `vitest.config.ts` com `environment: 'happy-dom'` e setup de `@testing-library/jest-dom`.
- [ ] **Step 2: Teste** `src/App.test.tsx`: `render(<App />)` e `expect(screen.getByRole('heading', { name: /consolidador de ncc/i })).toBeInTheDocument()`.
- [ ] **Step 3:** `npx vitest run` → FAIL. Criar `App.tsx` mínimo com `<h1>Consolidador de NCC</h1>` → PASS.
- [ ] **Step 4:** `npm run build` → sucesso. `dist/index.html` referencia assets em `/rosepecas/`.
- [ ] **Step 5: Commit** `chore: scaffold Vite + React + Tailwind + Vitest`

---

### Task 2: Tipos, números pt-BR e parser de linhas

**Files:**
- Create: `src/ncc/types.ts`, `src/ncc/number.ts`, `src/ncc/number.test.ts`, `src/ncc/parse.ts`, `src/ncc/parse.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type TextItem = { str: string; x: number }
  export type TextLine = { text: string; items: TextItem[] }   // text = itens unidos por espaço, espaços colapsados, trim
  export type NccHeader = { cod: string; notificacao: string; data: string } // data 'dd/mm/aaaa'
  export type NccRow = NccHeader & {
    nf: string; cliente: string; chassi: string
    valorNf: number; comissaoBruta: number; impostoRenda: number; comissaoLiquida: number
  }
  export type ParseResult = { header: NccHeader; rows: NccRow[]; warnings: string[] } // warnings = texto bruto das linhas não reconhecidas
  // number.ts
  export function parseBrNumber(s: string): number   // '123.456,78'→123456.78, '1.234,56-'→-1234.56, '-7,50'→-7.5; inválido → throw
  export function formatBr(n: number): string         // 1234.5 → '1.234,50' (Intl pt-BR, 2 casas)
  export function sumCents(values: number[]): number  // soma via Math.round(v*100), devolve em reais
  // parse.ts
  export class NccParseError extends Error { code: 'not-ncc' | 'no-rows' }
  export function parseNccLines(lines: TextLine[]): ParseResult
  ```

- [ ] **Step 1: Testes** `number.test.ts`: `parseBrNumber('123.456,78') === 123456.78`; `('18,52') === 18.52`; `('500,00-') === -500`; `('-7,50') === -7.5`; `expect(() => parseBrNumber('abc')).toThrow()`; `formatBr(1234.5) === '1.234,50'`; `sumCents([0.1, 0.2]) === 0.3`.
- [ ] **Step 2: Testes** `parse.test.ts`, com um helper `L(text, x = 30)` que cria `TextLine` com um item. Cabeçalho fictício: `'General Motors do Brasil Ltda 23.10.2026'`, `'Notificação de Crédito: 900001 Cód : T01'`, `'Fábr : 08'`, `'Núm. NF Cliente Chassi Valor NF Commiss. Bruta Imp. Renda Commis. Liq.'`.
  - `parses header and single row`: linha `'000.000.001 CLIENTE TESTE UM TESTE000000000001 123.456,78 1.234,56 18,52 1.216,04'` → `header` `{cod:'T01', notificacao:'900001', data:'23/10/2026'}` e a row com `cliente:'CLIENTE TESTE UM'`, `valorNf:123456.78`, `comissaoLiquida:1216.04`, `warnings: []`.
  - `parses multiple rows in order` (2 linhas, NFs `000.000.002` e `000.000.003`).
  - `parses negative SAP values`: `'000.000.004 CLIENTE TESTE QUATRO TESTE000000000004 50.000,00 500,00- 7,50- 492,50-'` → `comissaoBruta:-500`, `impostoRenda:-7.5`.
  - `joins wrapped client name`: linha de dados com `CLIENTE TESTE CINCO` (x=30) seguida de `L('SOBRENOME LONGO', 120)` → `cliente:'CLIENTE TESTE CINCO SOBRENOME LONGO'`.
  - `does not join left-margin footer` (Review Focus 4): depois da última row, `L('TOTAL GERAL', 30)` → cliente inalterado, `warnings: []`.
  - `collects rows across pages`: header repetido no meio da lista (segunda página) + mais uma row → todas as rows, header da primeira página.
  - `warns on NF-like line that does not match`: `'000.000.006 CLIENTE TESTE SEIS TESTE000000000006 10.000,00 100,00 99,00'` (falta um valor) → `rows` só com as válidas, `warnings` com esse texto.
  - `throws not-ncc without header`: `[L('qualquer coisa')]` → `NccParseError` com `code 'not-ncc'`.
  - `throws no-rows when header but no rows` → `code 'no-rows'`. Também vale quando só existem linhas inválidas: zero rows válidas sempre dá `no-rows`.
- [ ] **Step 3:** `npx vitest run src/ncc` → FAIL.
- [ ] **Step 4: Implementar.** Header: `/Notificação de Crédito:\s*(\d+)/`, `/Cód\s*:\s*(\S+)/`, `/(\d{2})\.(\d{2})\.(\d{4})/` (primeira ocorrência de cada). O header é obrigatório: faltar Notificação ou Cód dá `not-ncc`. Linha de dados:
  ```
  /^(\d{3}\.\d{3}\.\d{3})\s+(.+?)\s+([A-Z0-9]{17})\s+(-?[\d.]+,\d{2}-?)\s+(-?[\d.]+,\d{2}-?)\s+(-?[\d.]+,\d{2}-?)\s+(-?[\d.]+,\d{2}-?)$/
  ```
  Linha que começa com `/^\d{3}\.\d{3}\.\d{3}\b/` sem casar com a regex vira warning. Continuação de nome: a linha seguinte a uma row válida, antes da próxima linha de NF, cujo `items[0].x > rowLine.items[0].x + 20` e `/^[A-ZÀ-Ü][A-ZÀ-Ü .'-]*$/`, é anexada ao `cliente` com espaço.
- [ ] **Step 5:** `npx vitest run src/ncc` → PASS.
- [ ] **Step 6: Commit** `feat: parser de linhas do relatório NCC`

---

### Task 3: PDFs mock, extração com pdf.js e processPdf

**Files:**
- Create: `scripts/make-fixtures.mjs`, `tests/fixtures/ncc-teste-{1,2,3}.pdf`, `src/ncc/pdfjs.ts`, `src/ncc/extract.ts`, `src/ncc/extract.test.ts`, `src/ncc/process.ts`, `src/ncc/process.test.ts`
- Modify: `package.json` (script `fixtures: node scripts/make-fixtures.mjs`)

**Interfaces:**
- Consumes: `TextLine`, `parseNccLines`, `NccParseError` (Task 2).
- Produces:
  ```ts
  // pdfjs.ts — browser: import * as pdfjs from 'pdfjs-dist'; workerSrc via import 'pdfjs-dist/build/pdf.worker.min.mjs?url'
  export const getDocument: typeof import('pdfjs-dist').getDocument
  // extract.ts
  export function groupTextItems(items: { str: string; transform: number[] }[]): TextLine[] // agrupa por y (transform[5], tolerância 2), linhas de cima p/ baixo, itens por x (transform[4]); ignora str vazia
  export async function extractTextLines(data: ArrayBuffer): Promise<TextLine[]>          // todas as páginas, em ordem
  // process.ts
  export type FileResult =
    | { status: 'ok'; header: NccHeader; rows: NccRow[]; warnings: string[] }
    | { status: 'error'; message: string }
  export async function processPdf(file: Blob): Promise<FileResult>
  ```

- [ ] **Step 1: Gerar os mocks** com `pdf-lib` (Helvetica, A4 paisagem), desenhando cada campo num `x` fixo por coluna, como no layout real: NF x=30, Cliente x=110, Chassi x=330, valores alinhados à direita em ~470/560/630/710. Cabeçalho: `General Motors do Brasil Ltda` + data, `Notificação de Crédito: N    Cód : C`, `Fábr : 08`, linha de títulos. Conteúdo, **todo fictício**:
  - `ncc-teste-1.pdf`: T01, 900001, 23.10.2026 · `000.000.001 CLIENTE TESTE UM TESTE000000000001 123.456,78 1.234,56 18,52 1.216,04`
  - `ncc-teste-2.pdf`: T02, 900002, 24.10.2026 · `000.000.002 CLIENTE TESTE DOIS TESTE000000000002 200.000,00 10.000,00 150,00 9.850,00` e `000.000.003 CLIENTE TESTE TRES TESTE000000000003 80.000,00 4.000,00 60,00 3.940,00`
  - `ncc-teste-3.pdf`: T03, 900003, 25.10.2026 · row negativa `000.000.004 CLIENTE TESTE QUATRO TESTE000000000004 50.000,00 500,00- 7,50- 492,50-` e row com nome quebrado `000.000.005 CLIENTE TESTE CINCO …` com `SOBRENOME LONGO` na linha de baixo, em x=110.
  Rodar `npm run fixtures` e conferir que `git status` mostra os 3 PDFs como não rastreados (a exceção no `.gitignore` funciona).
- [ ] **Step 2: Testes** `extract.test.ts` (`// @vitest-environment node`, com `vi.mock('./pdfjs', () => import('pdfjs-dist/legacy/build/pdf.mjs'))`; se precisar, configurar `GlobalWorkerOptions.workerSrc` para o worker legacy):
  - `groupTextItems merges same-y items and orders by x`: itens sintéticos `[{str:'B',transform:[1,0,0,1,50,100]},{str:'A',transform:[1,0,0,1,10,101]},{str:'C',transform:[1,0,0,1,10,80]}]` → textos `['A B','C']`.
  - `extracts lines from mock pdf`: `ncc-teste-2.pdf` → `parseNccLines(lines).rows.length === 2`.
- [ ] **Step 3: Testes** `process.test.ts` (node, mesmo mock):
  - `ok for mock 1`: `status 'ok'`, 1 row, `header.cod === 'T01'`.
  - `handles wrapped name and negatives in mock 3`: `cliente === 'CLIENTE TESTE CINCO SOBRENOME LONGO'`, `comissaoBruta === -500` na row 4.
  - `error for non-pdf bytes` (Review Focus 3): `new Blob(['isso não é pdf'])` → `{status:'error', message:'Não foi possível ler o PDF'}`.
  - `error for pdf without NCC header`: PDF gerado on the fly com pdf-lib, texto `Outro documento` → `'Não parece um relatório NCC'`.
- [ ] **Step 4:** `npx vitest run src/ncc` → FAIL. Implementar. `processPdf` mapeia `NccParseError` `not-ncc` → `Não parece um relatório NCC`, `no-rows` → `Nenhuma linha encontrada` e qualquer outra exceção → `Não foi possível ler o PDF`. → PASS.
- [ ] **Step 5: Commit** `feat: extração de texto via pdf.js e PDFs mock de teste`

---

### Task 4: Dedupe e totais

**Files:**
- Create: `src/ncc/rows.ts`, `src/ncc/rows.test.ts`

**Interfaces:**
- Consumes: `NccRow`, `sumCents`.
- Produces:
  ```ts
  export function dedupeRows(rows: NccRow[]): { rows: NccRow[]; removed: number } // chave = 10 campos na ordem das colunas; mantém a 1ª
  export type Totals = { count: number; valorNf: number; comissaoBruta: number; impostoRenda: number; comissaoLiquida: number }
  export function computeTotals(rows: NccRow[]): Totals
  ```

- [ ] **Step 1: Testes:** `dedupeRows` com [r1, r2, r1] → `rows [r1, r2]` e `removed 1`. Row igual à r1 só com `cod` diferente **não** é removida. `computeTotals` das 3 rows dos mocks 1 e 2 → `{count:3, valorNf:403456.78, comissaoBruta:15234.56, impostoRenda:228.52, comissaoLiquida:15006.04}`. Rows com valores `0.1` e `0.2` → `0.3` exato (Review Focus 2).
- [ ] **Step 2:** FAIL → implementar → `npx vitest run src/ncc/rows.test.ts` PASS.
- [ ] **Step 3: Commit** `feat: dedupe de linhas idênticas e totais`

---

### Task 5: Geração do XLSX

**Files:**
- Create: `src/ncc/xlsx.ts`, `src/ncc/xlsx.test.ts`

**Interfaces:**
- Consumes: `NccRow`.
- Produces:
  ```ts
  export const COLUMNS: { key: keyof NccRow; header: string }[] // as 10 colunas, na ordem e com os rótulos do Global Constraints
  export async function buildWorkbookBuffer(rows: NccRow[]): Promise<ArrayBuffer> // usa `await import('exceljs')`
  export function exportFilename(today: Date): string                               // 'NCC-consolidado-2026-10-25.xlsx' (data local)
  export async function downloadXlsx(rows: NccRow[]): Promise<void>                 // build + Blob + <a download>
  ```

- [ ] **Step 1: Testes** (node), relendo o buffer com ExcelJS: aba `NCC`. Linha 1 = rótulos das 10 colunas, `font.bold === true`. Para as 3 rows dos mocks 1+2: A2 `'T01'`, D2 `'000.000.001'` (string), F2 string, G2 `123456.78` (number) com `numFmt '#,##0.00'`. C2 é `Date` e `getUTCFullYear/Month/Date` dá 2026/9/23, com `numFmt 'dd/mm/yyyy'` (Review Focus 1). A linha 5 tem A5 `'TOTAL'` e G5 com `formula 'SUM(G2:G4)'` e `result 403456.78`, assim como H/I/J. `exportFilename(new Date(2026, 9, 25)) === 'NCC-consolidado-2026-10-25.xlsx'`.
- [ ] **Step 2:** FAIL → implementar. Data: `new Date(Date.UTC(aaaa, mm-1, dd))` a partir de `'dd/mm/aaaa'`. Linha TOTAL e cabeçalho em negrito. Larguras de coluna razoáveis. → PASS.
- [ ] **Step 3: Commit** `feat: geração do xlsx consolidado no cliente`

---

### Task 6: Estado da lista de arquivos

**Files:**
- Create: `src/state/files.ts`, `src/state/files.test.ts`

**Interfaces:**
- Consumes: `FileResult`, `NccRow`.
- Produces:
  ```ts
  export type FileEntry = { id: string; name: string } & ({ status: 'reading' } | FileResult)
  export type FilesAction =
    | { type: 'added'; entries: { id: string; name: string }[] }
    | { type: 'processed'; id: string; result: FileResult }
    | { type: 'removed'; id: string }
    | { type: 'cleared' }
  export function filesReducer(state: FileEntry[], action: FilesAction): FileEntry[]
  export function allRows(state: FileEntry[]): NccRow[] // rows dos 'ok', na ordem dos arquivos
  export function fileStatusLabel(e: FileEntry): string
  ```
  `fileStatusLabel`: reading → `'Lendo…'`; ok sem warnings → `'1 linha'` / `'N linhas'`; ok com warnings → `'2 linhas lidas, 1 não reconhecida'` (plural: `'1 linha lida'`, `'N não reconhecidas'`); error → `message`.

- [ ] **Step 1: Testes:** `added` acrescenta no fim com `status 'reading'`. `processed` substitui só a entrada do id. `processed` para um id já removido é ignorado (arquivo removido enquanto lia). `removed`/`cleared`. Review Focus 5: adicionar duas entradas com o mesmo `name` e ids diferentes, processar as duas, remover uma → a outra fica e `allRows` traz só as rows dela. Testes de `fileStatusLabel` com os textos acima.
- [ ] **Step 2:** FAIL → implementar (ids gerados pelo chamador com `crypto.randomUUID()`) → PASS.
- [ ] **Step 3: Commit** `feat: estado da lista de arquivos`

---

### Task 7: Interface (layout B)

Usar a skill `frontend-design:frontend-design` para a direção visual. O layout é fixo, conforme o mockup aprovado:
- lateral esquerda com a área "Adicionar PDFs" (arrastar e soltar + clique) e a lista de arquivos com ✅/⚠/❌, rótulo `NCC {notificacao}`, status e ✕;
- direita com a barra de ações (checkbox "Excluir duplicados" **ao lado** de "Exportar Excel", contador "N duplicadas ocultas", "Limpar tudo") e a tabela com linha de totais;
- em telas estreitas, a lateral vira um bloco em cima.

**Files:**
- Create: `src/components/FileSidebar.tsx`, `src/components/Toolbar.tsx`, `src/components/RowsTable.tsx`, `src/App.test.tsx` (substitui o smoke test)
- Modify: `src/App.tsx`, `src/index.css`, `tailwind.config.js`

**Interfaces:**
- Consumes: `filesReducer`, `allRows`, `fileStatusLabel` (Task 6), `processPdf` (Task 3), `dedupeRows`, `computeTotals` (Task 4), `downloadXlsx`, `COLUMNS` (Task 5), `formatBr` (Task 2).
- Produces: `App` monta `rows = dedupe ? dedupeRows(allRows(files)).rows : allRows(files)`. Tabela, totais e export usam esse mesmo `rows`.

- [ ] **Step 1: Testes** `App.test.tsx` (happy-dom, com `vi.mock('./ncc/process')` devolvendo `FileResult`s fixos e `vi.mock('./ncc/xlsx', …)` mantendo `COLUMNS` real e espiando `downloadXlsx`):
  - estado vazio: mostra a instrução de uso e "Exportar Excel" fica desabilitado;
  - upload de 2 arquivos via `userEvent.upload` no input (`accept=".pdf,application/pdf"`, `multiple`) → 3 linhas na tabela e linha de total com `403.456,78`, `15.234,56`, `228,52`, `15.006,04`;
  - arquivo com erro mostra a mensagem na lateral e não afeta as linhas;
  - arquivo ⚠ com warnings mostra `'1 linha lida, 1 não reconhecida'`, e ao expandir aparece o texto bruto da linha não reconhecida;
  - subir de novo o mesmo conteúdo do arquivo 2 → 5 linhas. Marcar "Excluir duplicados" → 3 linhas, texto "2 duplicadas ocultas", totais voltam aos valores acima;
  - "Exportar Excel" chama `downloadXlsx` com as linhas filtradas (3);
  - ✕ remove as linhas do arquivo e "Limpar tudo" esvazia.
- [ ] **Step 2:** FAIL → implementar os componentes → `npx vitest run` PASS (suite inteira).
- [ ] **Step 3:** `npm run dev` e conferir no navegador com os 3 mocks. Depois, localmente, com os 2 PDFs reais do usuário (fora do repo): tela com 3 linhas e totais iguais à soma manual dos PDFs. Exportar e abrir o `.xlsx` (por exemplo, no LibreOffice): 10 colunas, data correta, valores somáveis, linha TOTAL. **Não** registrar nenhum valor real em commit.
- [ ] **Step 4: Commit** `feat: interface de upload, tabela consolidada e exportação`

---

### Task 8: Deploy no GitHub Pages

**Files:**
- Modify: `README.md` (o que é, `npm run dev`, `npm test`, `npm run fixtures`, `npm run deploy`, URL)

- [ ] **Step 1:** `npm run build` sem erros e `npx vitest run` todo verde.
- [ ] **Step 2:** Conferir que nada sensível vai subir: `git ls-files | grep -iE '\.pdf$'` lista só `tests/fixtures/ncc-teste-*.pdf`, e `git log -p | grep -c` com termos dos PDFs reais (lista mantida só na sessão, nunca escrita em arquivo) dá 0.
- [ ] **Step 3:** Commit do README e `git push origin main`.
- [ ] **Step 4:** `npm run deploy` (publica a branch `gh-pages`). Se o Pages ainda não estiver ativo: `gh api -X POST repos/senavs/rosepecas/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'`.
- [ ] **Step 5:** Abrir `https://senavs.github.io/rosepecas/`, subir os mocks e conferir 3 linhas e os totais `403.456,78 | 15.234,56 | 228,52 | 15.006,04`. Exportar e conferir o arquivo. Repetir com os PDFs reais, localmente no navegador (nada é enviado).
