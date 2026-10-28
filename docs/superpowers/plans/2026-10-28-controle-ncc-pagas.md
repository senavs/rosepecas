# Controle de NCC pagas e não pagas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova seção do site que acumula faturamento, NCC pagas e PDFs de NCC num arquivo JSON local e mostra, por carro faturado, se a comissão está paga, parcialmente paga ou não paga, com ajuste manual registrado à parte.

**Architecture:** Tudo no navegador. A base é um objeto `Base` (tabelas indexadas por chave normalizada) serializado em JSON e gravado num arquivo do usuário via File System Access API (Chrome/Edge) ou baixado manualmente (Firefox/Safari). As fontes ficam armazenadas cruas e separadas; status, linhas "sem PDF" e órfãos são **derivados** a cada render por uma função pura (`calcularVisao`). O consolidador atual continua intacto e passa a ser uma aba.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind (tokens já existentes em `tailwind.config.js`), ExcelJS (leitura e escrita de `.xlsx`), pdf.js via `src/ncc/process.ts`, Vitest + Testing Library (happy-dom).

**Spec:** `docs/superpowers/specs/2026-10-28-controle-ncc-pagas-design.md`

## Global Constraints

- Sem back-end; nenhum dado sai do navegador. Nada de `localStorage`/IndexedDB para dados da base.
- Reaproveitar `processPdf(file: Blob): Promise<FileResult>` e `NccRow` de `src/ncc/` sem alterá-los.
- Nunca versionar planilhas ou PDFs reais. Testes usam só dados fictícios (prefixo `TESTE`), planilhas montadas em memória com ExcelJS.
- Toda a interface em português do Brasil, com acentuação correta.
- Normalização: NF e nº NCC = só dígitos, sem zeros à esquerda (`000.168.707` → `168707`); chassi = maiúsculas, sem espaços.
- Chaves: faturamento por NF; linha de NCC e NCC paga por `ncc|nf`; ajuste por item (`carro:<nf>` ou `linha:<ncc>|<nf>`).
- Mescla de re-upload: campo novo não vazio substitui; campo novo vazio (`''`/`null`) mantém o existente.
- Datas internas em ISO `aaaa-mm-dd`.
- Nome sugerido do arquivo: `controle-ncc.json`; download de fallback: `controle-ncc-AAAA-MM-DD.json`.
- Comandos: `npm test -- --run <arquivo>` para testes, `npm run build` para checar tipos.

## Review Focus

1. **Re-upload sobreposto com células vazias** (ex.: linha duplicada do faturamento sem Região/Conc Entrega): não pode apagar o que já estava preenchido, independentemente da ordem das linhas. Testes na Task 3.
2. **NF vinda como número, texto formatado ou texto com zeros** (`168707`, `'000.168.707'`, `'0168707'`) precisa cair na mesma chave em todas as fontes. Testes nas Tasks 1 e 2.
3. **Abrir um JSON que não é base, ou de versão futura**: mensagem clara e nenhuma gravação por cima do arquivo. Testes nas Tasks 5 e 6.
4. **Falha ao gravar** (permissão revogada, disco): o estado fica "erro ao salvar", os dados continuam em memória e o botão de baixar aparece; mudanças feitas durante uma gravação não se perdem. Testes na Task 6.
5. **Planilha com cabeçalho fora da linha 1, colunas em outra ordem ou com nome variando acento/maiúsculas**: tem que ser lida igual; se faltar coluna obrigatória, erro nomeando a coluna. Testes na Task 2.

---

## Estrutura de arquivos

```
src/
  main.tsx                       (modificar: renderiza Root)
  Root.tsx                       (novo: abas Controle / Consolidador por hash)
  Root.test.tsx
  App.tsx                        (inalterado: consolidador)
  components/DropZone.tsx        (novo: área de soltar/selecionar arquivos genérica)
  controle/
    types.ts                     tipos da base e da visão
    normalize.ts (+ .test.ts)    normalização, chaves e datas
    sheets.ts (+ .test.ts)       leitura das planilhas de faturamento e pagas
    merge.ts (+ .test.ts)        importações e ajustes sobre a Base
    view.ts (+ .test.ts)         cálculo de status, linhas sem PDF e órfãos
    filter.ts (+ .test.ts)       filtros e contadores
    storage.ts (+ .test.ts)      base vazia, serialização e validação do JSON
    fileAccess.ts                File System Access + download de fallback
    fs-access.d.ts               declarações que faltam no lib.dom do TS
    state.ts (+ .test.ts)        reducer do controle
    useControle.ts               hook: reducer + gravação automática
    labels.ts                    rótulos de status para a interface
    exportar.ts (+ .test.ts)     Excel da visão filtrada
    ui/
      ControlePage.tsx (+ .test.tsx)
      AberturaBase.tsx
      PrimeirosPassos.tsx
      EnriquecerSidebar.tsx
      ResumoImportacao.tsx
      BarraSalvamento.tsx
      Contadores.tsx
      FiltrosBar.tsx
      CarrosTable.tsx
      OrfaosTable.tsx
      AjusteMenu.tsx
```

---

### Task 1: Tipos e normalização

**Files:**
- Create: `src/controle/types.ts`, `src/controle/normalize.ts`
- Test: `src/controle/normalize.test.ts`
- Modify: `.gitignore` (acrescentar as linhas `*.xlsx` e `controle-ncc*.json`, para nunca versionar planilhas reais nem a base do usuário)

**Interfaces:**
- Produces (`types.ts`):

```ts
export type Faturamento = {
  nf: string; chassi: string; data: string | null
  regiao: string; concVenda: string; concEntrega: string
  clienteDoc: string; cliente: string; processo: string; pedido: string
  formaPagamento: string; statusPedido: string
  valor: number | null; percComissao: number | null; valorComissao: number | null
}
export type NccLinha = {
  ncc: string; nf: string; cod: string; data: string | null; cliente: string; chassi: string
  valorNf: number | null; comissaoBruta: number | null; impostoRenda: number | null; comissaoLiquida: number | null
}
export type Paga = { ncc: string; nf: string; conc: string; dataRecebimento: string | null }
export type AlvoAjuste = { tipo: 'carro'; nf: string } | { tipo: 'linha'; ncc: string; nf: string }
export type Ajuste = { alvo: AlvoAjuste; status: 'pago' | 'nao_pago'; em: string /* ISO datetime */; obs: string }
export type TipoImportacao = 'faturamento' | 'pagas' | 'ncc'
export type Resumo = { novos: number; atualizados: number; inalterados: number; ignorados: string[] }
export type Importacao = { tipo: TipoImportacao; arquivo: string; em: string } & Omit<Resumo, 'ignorados'> & { ignorados: number }
export type Base = {
  versao: 1
  faturamento: Record<string, Faturamento> // chave: nf
  ncc: Record<string, NccLinha>            // chave: linhaKey(ncc, nf)
  pagas: Record<string, Paga>              // chave: linhaKey(ncc, nf)
  ajustes: Record<string, Ajuste>          // chave: ajusteKey(alvo)
  importacoes: Importacao[]
}
/** Resultado da leitura de uma planilha: linhas válidas + motivos das ignoradas. */
export type Leitura<T> = { linhas: T[]; ignorados: string[] }
```

- Produces (`normalize.ts`):
  - `normDigits(v: unknown): string`: só dígitos, sem zeros à esquerda; `''` se não houver dígitos. Serve para NF e nº NCC.
  - `normChassi(v: unknown): string`
  - `normText(v: unknown): string`: `String(v ?? '').trim()`.
  - `toIsoDate(v: unknown): string | null`: aceita `Date` (usa componentes UTC), `'dd/mm/aaaa'`, `'dd.mm.aaaa'` e `'aaaa-mm-dd…'`; senão `null`.
  - `linhaKey(ncc: string, nf: string): string` → `` `${ncc}|${nf}` ``
  - `ajusteKey(alvo: AlvoAjuste): string` → `carro:<nf>` ou `linha:<ncc>|<nf>`
  - `semAcento(s: string): string`: minúsculas e sem diacríticos (para busca e cabeçalhos).

- [ ] **Step 1: Write the failing tests** (`normalize.test.ts`)

```ts
test('normDigits iguala formatos de NF', () => {
  expect(normDigits('000.168.707')).toBe('168707')
  expect(normDigits(168707)).toBe('168707')
  expect(normDigits('0168707')).toBe('168707')
  expect(normDigits(null)).toBe('')
  expect(normDigits('sem número')).toBe('')
})
test('normChassi', () => expect(normChassi(' 9bg148mk0 tc440293 ')).toBe('9BG148MK0TC440293'))
test('toIsoDate', () => {
  expect(toIsoDate(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-01-15')
  expect(toIsoDate('23/10/2026')).toBe('2026-10-23')
  expect(toIsoDate('23.10.2026')).toBe('2026-10-23')
  expect(toIsoDate('2026-10-23T00:00:00.000Z')).toBe('2026-10-23')
  expect(toIsoDate('')).toBeNull()
  expect(toIsoDate(42)).toBeNull()
})
test('chaves', () => {
  expect(linhaKey('808285', '168707')).toBe('808285|168707')
  expect(ajusteKey({ tipo: 'carro', nf: '168707' })).toBe('carro:168707')
  expect(ajusteKey({ tipo: 'linha', ncc: '808285', nf: '168707' })).toBe('linha:808285|168707')
})
test('semAcento', () => expect(semAcento('Número NF')).toBe('numero nf'))
```

- [ ] **Step 2: Run** `npm test -- --run src/controle/normalize.test.ts`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `types.ts` e `normalize.ts` com as assinaturas acima; `semAcento` via `normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()`.
- [ ] **Step 4: Run** o mesmo comando. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add .gitignore src/controle/types.ts src/controle/normalize.ts src/controle/normalize.test.ts
git commit -m "feat(controle): tipos da base e normalização de chaves"
```

---

### Task 2: Leitura das planilhas

**Files:**
- Create: `src/controle/sheets.ts`
- Test: `src/controle/sheets.test.ts` (`// @vitest-environment node`; monta workbooks em memória com ExcelJS e passa `await wb.xlsx.writeBuffer()`)

**Interfaces:**
- Consumes: tipos e `normDigits`, `normChassi`, `normText`, `toIsoDate`, `semAcento` (Task 1).
- Produces:
  - `class PlanilhaInvalidaError extends Error`
  - `lerFaturamento(buf: ArrayBuffer): Promise<Leitura<Faturamento>>`
  - `lerPagas(buf: ArrayBuffer): Promise<Leitura<Paga>>`

Regras:
- Usa a primeira aba. O cabeçalho é a primeira linha, entre as 10 primeiras, que contém todas as colunas obrigatórias, comparadas por `semAcento`.
- Colunas do faturamento:
  - obrigatórias: `Número NF`, `Chassi`;
  - opcionais: `Data de faturamento`, `Região`, `Conc Venda`, `Conc Entrega`, `Cliente`, `Nome do Cliente`, `Número do Processo`, `Código Pedido`, `Forma de pagamento`, `Status pedido`, `Valor`, `% Comissão Item Fornec`, `Valor Comissão`.
- Colunas das pagas:
  - obrigatórias: `NCC`, `NF`;
  - opcionais: `CONC`, `Data do recebimento na conta`.
- Se faltar coluna obrigatória → `PlanilhaInvalidaError('Coluna "Número NF" não encontrada')`, usando o nome da coluna como está acima.
- Valor de célula do ExcelJS: desembrulhar `{ result }` (fórmula), `{ richText }` (concatenar `text`) e `{ text }` (hyperlink) antes de normalizar.
- Números: aceitar `number` ou texto pt-BR. Para texto, reutilizar `parseBrNumber` de `src/ncc/number.ts` e, se falhar, usar `null`.
- Linhas totalmente vazias são puladas em silêncio.
- Linha sem NF (faturamento) ou sem NCC/NF (pagas) → entra em `ignorados` como `Linha N: sem NF` / `Linha N: sem NCC ou NF`, onde N é o número da linha no Excel.

- [ ] **Step 1: Write the failing tests**
  - `lê faturamento com NF numérica e cabeçalho na linha 3`: duas linhas de título antes do cabeçalho; colunas em ordem trocada; `Número NF` = `168707` (número) e `Valor Comissão` = `0`. Expect `linhas[0]` com `{ nf: '168707', chassi: 'TESTE0000000000001', data: '2026-01-15', concVenda: 'T68', valorComissao: 0 }`.
  - `cabeçalho com acento/maiúsculas diferentes`: `NUMERO NF`, `chassi` → lido.
  - `linha sem NF vai para ignorados`: `ignorados` igual a `['Linha 3: sem NF']`.
  - `faturamento sem coluna Chassi`: `rejects.toThrow('Coluna "Chassi" não encontrada')`.
  - `lê pagas`: `{ CONC: 'T48', NCC: 808284, 'Data do recebimento na conta': Date, NF: 168707 }` → `{ ncc: '808284', nf: '168707', conc: 'T48', dataRecebimento: '2026-05-18' }`.
  - `célula de fórmula usa o resultado`: NF `{ formula: 'A1', result: 168707 }` → `'168707'`.
- [ ] **Step 2: Run** `npm test -- --run src/controle/sheets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `sheets.ts`. Importar ExcelJS dinamicamente, como em `src/ncc/xlsx.ts` (`(mod as …).default ?? mod`), e carregar com `wb.xlsx.load(buf)`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): leitura das planilhas de faturamento e NCC pagas`

---

### Task 3: Importações e ajustes sobre a base

**Files:**
- Create: `src/controle/merge.ts`
- Test: `src/controle/merge.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `NccRow` de `src/ncc/types.ts`. Os testes montam a base vazia literal `{ versao: 1, faturamento: {}, ncc: {}, pagas: {}, ajustes: {}, importacoes: [] }`.
- Produces:
  - `importarFaturamento(base: Base, leitura: Leitura<Faturamento>, arquivo: string, agora: Date): { base: Base; resumo: Resumo }`
  - `importarPagas(base: Base, leitura: Leitura<Paga>, arquivo: string, agora: Date): { base: Base; resumo: Resumo }`
  - `importarNcc(base: Base, rows: NccRow[], arquivo: string, agora: Date): { base: Base; resumo: Resumo }`: converte `NccRow` → `NccLinha` (`ncc = normDigits(notificacao)`, `nf = normDigits(nf)`, `chassi = normChassi`, `data = toIsoDate(data)`).
  - `definirAjuste(base: Base, ajuste: Ajuste): Base`
  - `removerAjuste(base: Base, alvo: AlvoAjuste): Base`

Regras:
- Funções puras: não mutam a `base` recebida.
- Cada importação acrescenta um item a `importacoes` (`em = agora.toISOString()`).
- Mescla campo a campo: um valor novo vazio (`''` ou `null`) não substitui um preenchido.
- Contagem por chave única dentro da importação:
  - `novos`: chave não existia;
  - `atualizados`: chave existia e algum campo mudou;
  - `inalterados`: chave existia e nada mudou.
- Duplicatas dentro do mesmo arquivo são mescladas entre si antes da comparação com a base.

- [ ] **Step 1: Write the failing tests**
  - `duplicata no mesmo arquivo vira um registro com campos preenchidos, em qualquer ordem`: linha A com `regiao: ''`, `concEntrega: ''` e linha B igual com `regiao: '16'`, `concEntrega: 'T68'`. Testar A,B e B,A. Expect `Object.keys(base.faturamento)` = `['163134']`, `regiao` = `'16'`, `resumo` = `{ novos: 1, atualizados: 0, inalterados: 0, ignorados: [] }`.
  - `re-upload sobreposto não duplica e não apaga`: importa 2 carros; depois importa 1 deles com `regiao: ''` e `valor` diferente, mais 1 carro novo. Expect 3 carros, `regiao` preservada, `valor` atualizado, resumo `{ novos: 1, atualizados: 1, inalterados: 0 }`.
  - `re-upload idêntico conta como inalterado`.
  - `ignorados da leitura passam para o resumo e a importação registra a contagem`: `importacoes[0]` = `{ tipo: 'faturamento', arquivo: 'f.xlsx', em: '2026-10-28T12:00:00.000Z', novos: 1, atualizados: 0, inalterados: 0, ignorados: 1 }`.
  - `importarNcc normaliza chave`: `NccRow` com `notificacao: '808285'`, `nf: '000.168.707'`, `data: '08/05/2026'` → chave `'808285|168707'`, `data: '2026-05-08'`.
  - `pagas idênticas viram uma só`.
  - `definirAjuste substitui ajuste anterior do mesmo alvo; removerAjuste apaga`: chave `'linha:808285|168707'`.
  - `não muta a base de entrada`: `Object.freeze` profundo na base de entrada não lança.
- [ ] **Step 2: Run** `npm test -- --run src/controle/merge.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** com um helper interno `mesclar<T extends object>(atual: T | undefined, novo: T): T` e um `upsertTodos` genérico usado pelas três importações.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): importações sem duplicar e ajustes manuais`

---

### Task 4: Cálculo de status, linhas sem PDF e órfãos

**Files:**
- Create: `src/controle/view.ts`; acrescentar os tipos da visão em `src/controle/types.ts`
- Test: `src/controle/view.test.ts`

**Interfaces:**
- Consumes: `Base`, `linhaKey`, `ajusteKey`.
- Produces (tipos em `types.ts`):

```ts
export type StatusLinha = 'paga' | 'nao_paga'
export type StatusCarro = 'sem_comissao' | 'sem_ncc' | 'ncc_nao_paga' | 'parcial' | 'pago'
/** planilha = só dados importados; manual = ajuste decidiu; confirmado = ajuste "pago" e planilha concorda; conflito = ajuste "não pago" mas planilha confirma pagamento */
export type Marca = 'planilha' | 'manual' | 'confirmado' | 'conflito'
export type LinhaView = {
  chave: string; ncc: string; nf: string; cod: string; data: string | null; chassi: string; cliente: string
  comissaoLiquida: number | null; temPdf: boolean; dataPagamento: string | null
  calculado: StatusLinha; exibido: StatusLinha; marca: Marca; ajuste: Ajuste | null
}
export type CarroView = {
  fat: Faturamento; linhas: LinhaView[]; faltando: LinhaView[]
  calculado: StatusCarro; exibido: StatusCarro; marca: Marca; ajuste: Ajuste | null
}
export type MotivoOrfao = 'sem_faturamento' | 'chassi_divergente'
export type OrfaoView = LinhaView & { motivo: MotivoOrfao }
export type Visao = { carros: CarroView[]; orfaos: OrfaoView[] }
```

- Produces: `calcularVisao(base: Base): Visao`

Algoritmo:

1. **Linhas.**
   - Para cada `base.ncc[k]`: `temPdf: true`. `calculado` é `'paga'` se `base.pagas[k]` existe; nesse caso `dataPagamento = pagas[k].dataRecebimento`.
   - Para cada `base.pagas[k]` sem `base.ncc[k]`: linha "sem PDF" com `temPdf: false`, `cod = conc`, `chassi`, `cliente` e `data` vazios/`null`, `comissaoLiquida: null` e `calculado: 'paga'`.
2. **Ajuste de linha** (`ajustes['linha:'+k]`):

   | ajuste | calculado | exibido | marca |
   |---|---|---|---|
   | nenhum | x | x | planilha |
   | pago | paga | paga | confirmado |
   | pago | nao_paga | paga | manual |
   | nao_pago | paga | paga | conflito |
   | nao_pago | nao_paga | nao_paga | manual |

3. **Ligação ao carro.**
   - Linha cuja `nf` existe em `base.faturamento` e cujo chassi bate (ou é vazio, caso da linha sem PDF) vai para `carro.linhas`.
   - NF existe, mas o chassi difere: órfão `chassi_divergente`.
   - NF inexistente: órfão `sem_faturamento`.
4. **`carro.calculado`**, a partir do `exibido` das linhas:
   - sem linhas e `valorComissao === 0` → `sem_comissao`;
   - sem linhas → `sem_ncc`;
   - todas pagas → `pago`;
   - nenhuma paga → `ncc_nao_paga`;
   - senão → `parcial`.
5. **Ajuste de carro** (`ajustes['carro:'+nf]`):
   - **pago**:
     - `exibido = 'pago'`;
     - `marca = calculado === 'pago' ? 'confirmado' : 'manual'`.
   - **nao_pago**, se alguma linha tem `calculado === 'paga'` (confirmação da planilha):
     - `exibido = calculado`;
     - `marca = 'conflito'`.
   - **nao_pago**, nos demais casos:
     - `exibido = linhas.length ? 'ncc_nao_paga' : 'sem_ncc'`;
     - `marca = 'manual'`.
   - **Sem ajuste de carro**:
     - `exibido = calculado`;
     - `marca` = `conflito` se alguma linha está em conflito, senão `manual` se alguma linha é manual, senão `planilha`.
6. **Saída.**
   - `faltando` = linhas com `exibido === 'nao_paga'`. Continuam listadas mesmo com ajuste de carro.
   - Carros ordenados por `fat.data` decrescente (`null` por último) e depois por `nf`.
   - Linhas ordenadas por `data` e depois por `ncc`.

- [ ] **Step 1: Write the failing tests** (um `describe` por regra; helpers `fat(nf, chassi, extra?)`, `linha(ncc, nf, chassi, cod)`, `paga(ncc, nf, conc)`):
  - `carro com duas NCCs e só uma paga é parcial e lista a que falta`: NF `168707`, linhas `808285/T68` (paga) e `808284/T48` (não). Expect `exibido: 'parcial'`, `faltando.map(l => l.ncc)` = `['808284']`.
  - `todas pagas → pago`; `nenhuma paga → ncc_nao_paga`; `sem linhas → sem_ncc`; `valorComissao 0 sem linhas → sem_comissao`.
  - `paga sem PDF vira linha temPdf false e liga pela NF`: só `pagas['805048|165842']` + faturamento NF `165842`. Expect `carro.linhas[0]` com `{ temPdf: false, cod: 'T28', calculado: 'paga' }` e carro `pago`.
  - `PDF que chega depois funde com a linha sem PDF`: mesma base mais `ncc['805048|165842']`. Expect uma única linha com `temPdf: true`.
  - `NCC de NF desconhecida é órfã sem_faturamento`; `NF conhecida com chassi diferente é órfã chassi_divergente`; `paga sem NCC e sem faturamento é órfã`.
  - Tabela de ajuste de linha: os 4 casos com ajuste, verificando `exibido` e `marca`.
  - `ajuste de linha entra no cálculo do carro`: carro parcial + ajuste `pago` na linha faltante → carro `pago`, `marca: 'manual'`.
  - `ajuste de carro pago não altera as linhas`: carro `sem_ncc` + ajuste carro `pago` → `exibido: 'pago'`, `marca: 'manual'`, `linhas` vazias.
  - `ajuste de carro não pago com linha confirmada pela planilha é conflito`: expect `exibido: 'parcial'`, `marca: 'conflito'`.
  - `ordenação por data decrescente`.
- [ ] **Step 2: Run** `npm test -- --run src/controle/view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `calcularVisao`. Indexar as linhas por `nf` com um `Map` antes de percorrer o faturamento, para ser O(n).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): status por carro e por NCC, linhas sem PDF e órfãos`

---

### Task 5: Filtros, contadores e base em JSON

**Files:**
- Create: `src/controle/filter.ts`, `src/controle/storage.ts`, `src/controle/labels.ts`
- Test: `src/controle/filter.test.ts`, `src/controle/storage.test.ts`

**Interfaces:**
- Produces (`filter.ts`):
  - `type Filtros = { status: StatusCarro[]; ncc: string; dataDe: string; dataAte: string; texto: string; conc: string }`
  - `const FILTROS_VAZIOS: Filtros`
  - `filtrarCarros(carros: CarroView[], f: Filtros): CarroView[]`
  - `contarPorStatus(carros: CarroView[]): Record<StatusCarro, number>`
- Produces (`storage.ts`):
  - `class BaseInvalidaError extends Error`
  - `baseVazia(): Base`
  - `serializarBase(base: Base): string` (JSON sem indentação)
  - `lerBase(texto: string): Base`
- Produces (`labels.ts`):
  - `STATUS_CARRO_LABEL: Record<StatusCarro, string>`: `sem_comissao: 'Sem comissão'`, `sem_ncc: 'Sem NCC'`, `ncc_nao_paga: 'NCC recebida, não paga'`, `parcial: 'Parcialmente pago'`, `pago: 'Pago'`
  - `STATUS_LINHA_LABEL`: `paga: 'Paga'`, `nao_paga: 'Não paga'`
  - `MARCA_LABEL: Record<Marca, string>`: `planilha: ''`, `manual: 'manual'`, `confirmado: 'confirmado'`, `conflito: 'conflito'`

Regras de filtro (todas combinadas com E; filtro vazio não restringe):
- `status`: `exibido` está na lista.
- `ncc`: alguma linha tem `ncc` contendo `normDigits(f.ncc)`.
- `dataDe`/`dataAte`: `fat.data` no intervalo, inclusive; carro com `data` `null` sai quando há filtro de data.
- `texto`: é aplicado a três campos, e basta um bater:
  - `normChassi(texto)` contido em `fat.chassi`;
  - `normDigits(texto)` (se não vazio) contido em `fat.nf`;
  - `semAcento(texto)` contido em `semAcento(fat.cliente)`.
- `conc`: comparação em maiúsculas, igual a `concVenda`, `concEntrega` ou ao `cod` de alguma linha.

Validação em `lerBase`:
- JSON inválido, ou objeto sem `versao`/`faturamento`/`ncc`/`pagas`/`ajustes`/`importacoes` → `'Este arquivo não é uma base do Controle de NCC'`.
- `versao !== 1` → `'Versão da base não suportada: 2'`, com o número lido no lugar de 2.

- [ ] **Step 1: Write the failing tests**
  - Filtro: um caso por regra, com 3 carros fictícios. Incluir: `texto 'joao'` encontra `'JOÃO TESTE'`; `ncc '808.284'` encontra a linha `808284`; `conc 't48'` encontra pela linha.
  - Contadores: as 5 chaves presentes (zeros incluídos).
  - Storage: `lerBase(serializarBase(b))` igual a `b`; `lerBase('{}')` e `lerBase('não é json')` lançam a mensagem de base inválida; `lerBase('{"versao":2,…}')` lança `'Versão da base não suportada: 2'`.
- [ ] **Step 2: Run** `npm test -- --run src/controle/filter.test.ts src/controle/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): filtros, contadores e serialização da base`

---

### Task 6: Arquivo local e estado do controle

**Files:**
- Create: `src/controle/fs-access.d.ts`, `src/controle/fileAccess.ts`, `src/controle/state.ts`, `src/controle/useControle.ts`
- Test: `src/controle/state.test.ts`

**Interfaces:**
- `fs-access.d.ts`: declara o que falta no `lib.dom` do TS:
  - em `Window`: `showSaveFilePicker(opts?)` e `showOpenFilePicker(opts?)`, ambos opcionais (`?`), para que a checagem de suporte compile;
  - em `FileSystemHandle`: `queryPermission({ mode: 'readwrite' })` e `requestPermission(...)`, retornando `Promise<PermissionState>`.
- Produces (`fileAccess.ts`):
  - `suportaArquivoLocal(): boolean`: `'showSaveFilePicker' in window`.
  - `criarArquivo(base: Base): Promise<FileSystemFileHandle>`: picker com `suggestedName: 'controle-ncc.json'` e tipo `application/json`; grava logo em seguida.
  - `abrirArquivo(): Promise<{ handle: FileSystemFileHandle; base: Base }>`: lê, chama `lerBase` (propaga `BaseInvalidaError`) e só então pede permissão `readwrite`.
  - `gravarArquivo(handle: FileSystemFileHandle, base: Base): Promise<void>`: se `queryPermission` não for `'granted'`, chama `requestPermission`; se ainda não for, lança `Error('Sem permissão para gravar no arquivo')`. Depois `createWritable` → `write(serializarBase(base))` → `close`.
  - `baixarBase(base: Base, agora: Date): void`: download `controle-ncc-AAAA-MM-DD.json`, no mesmo padrão de `downloadXlsx`.
  - Se o usuário cancelar o picker, o `AbortError` é repassado; a interface ignora `e.name === 'AbortError'`.
- Produces (`state.ts`):

```ts
export type Salvamento = 'salvo' | 'pendente' | 'salvando' | 'erro'
export type UltimaImportacao = { tipo: TipoImportacao; arquivo: string; resumo: Resumo } | { tipo: TipoImportacao; arquivo: string; erro: string }
export type ControleState = {
  base: Base | null; handle: FileSystemFileHandle | null; revisao: number
  salvamento: Salvamento; erroSalvar: string | null; importacoes: UltimaImportacao[] // da sessão, mais recente primeiro
}
export type ControleAction =
  | { type: 'aberta'; base: Base; handle: FileSystemFileHandle | null; salva: boolean }
  | { type: 'alterada'; base: Base; importacao?: UltimaImportacao }
  | { type: 'falhaImportacao'; importacao: UltimaImportacao }
  | { type: 'salvando' }
  | { type: 'salvou'; revisao: number }
  | { type: 'falhouSalvar'; mensagem: string }
  | { type: 'baixou' }
  | { type: 'fechada' }
export const ESTADO_INICIAL: ControleState
export function controleReducer(s: ControleState, a: ControleAction): ControleState
```

Regras do reducer:
- `alterada` incrementa `revisao` e põe `salvamento: 'pendente'`.
- `salvou` só vai para `'salvo'` se `a.revisao === s.revisao`; senão continua `'pendente'`, porque houve mudança durante a gravação.
- `falhouSalvar` → `'erro'` com a mensagem.
- `baixou` → `'salvo'`.
- `aberta` zera `revisao`; `salvamento` vira `'salvo'` se `salva`, senão `'pendente'`. Exemplo de `'pendente'`: base nova no Firefox, ainda não baixada.

`useControle()` (hook) devolve `{ state, abrirNovo, abrirExistente, abrirDeArquivo(file: File), importarFaturamentoArquivo(file: File), importarPagasArquivo(file: File), importarPdfs(files: File[]), ajustar(ajuste: Ajuste), desfazerAjuste(alvo: AlvoAjuste), baixar(), tentarSalvarDeNovo() }`:
- `importarPdfs` usa `processPdf` de cada arquivo e chama `importarNcc` uma vez por arquivo com `status === 'ok'`. Arquivos com erro geram `falhaImportacao` com a mensagem de `FileResult`.
- Importações de planilha capturam `PlanilhaInvalidaError` e geram `falhaImportacao`.
- `ajustar` grava `em: new Date().toISOString()`.
- Efeito de gravação: quando `handle` existe e `salvamento === 'pendente'`, despacha `salvando`, grava, e despacha `salvou{revisao}` ou `falhouSalvar`.
- Efeito `beforeunload`: pede confirmação enquanto `salvamento` for `'pendente'` ou `'erro'`.

- [ ] **Step 1: Write the failing tests** (`state.test.ts`, só o reducer):
  - `alterada marca pendente e incrementa revisão`.
  - `salvou com revisão antiga mantém pendente` (alterada → alterada → salvou{revisao: 1} → `'pendente'`).
  - `salvou com revisão atual → salvo`.
  - `falhouSalvar mantém a base e guarda a mensagem`.
  - `aberta sem salva → pendente; com salva → salvo`.
  - `falhaImportacao não altera base nem revisão e entra no topo de importacoes`.
- [ ] **Step 2: Run** `npm test -- --run src/controle/state.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `state.ts`, `fileAccess.ts`, `fs-access.d.ts` e `useControle.ts`.
- [ ] **Step 4: Run** o teste. Expected: PASS. Depois `npm run build`. Expected: sem erros de tipo.
- [ ] **Step 5: Commit** `feat(controle): arquivo local e gravação automática`

---

### Task 7: Abertura da base e primeiros passos

**Files:**
- Create: `src/components/DropZone.tsx`, `src/controle/ui/ControlePage.tsx`, `src/controle/ui/AberturaBase.tsx`, `src/controle/ui/PrimeirosPassos.tsx`, `src/controle/ui/ResumoImportacao.tsx`
- Test: `src/controle/ui/ControlePage.test.tsx` (mocka `../useControle` com estado controlado e espiões nas ações)

**Interfaces:**
- `DropZone({ label: string; hint: string; accept: string; multiple: boolean; onFiles: (files: File[]) => void })`: mesmo visual da área de soltar do `FileSidebar` (classes Tailwind de lá). O `FileSidebar` não é alterado.
- `ControlePage()`: usa `useControle()`.
  - `state.base === null` → `AberturaBase`.
  - Base com faturamento vazio, ou base nova cujos passos 2 e 3 ainda não foram concluídos nem pulados → `PrimeirosPassos`. "Pulado" é estado local do React.
  - Nos demais casos → tela principal (Task 8).
- `AberturaBase`:
  - texto curto explicando que os dados ficam num arquivo do computador;
  - botões **Criar nova base** e **Abrir base existente**;
  - sem `suportaArquivoLocal()`: aviso "Neste navegador as alterações não são salvas sozinhas: use Baixar base atualizada sempre que terminar.", e **Abrir base existente** vira um `<input type="file" accept=".json">` → `abrirDeArquivo`;
  - mostra erro de `BaseInvalidaError` em `role="alert"`.
- `PrimeirosPassos`: três passos numerados.
  - (1) **Faturamento**: `DropZone` com `accept=".xlsx"`.
  - (2) **NCC pagas**: `.xlsx`, com botão "Pular".
  - (3) **PDFs de NCC**: `.pdf`, múltiplos, com botão "Pular".
  - Passo concluído mostra ✓ e o resumo.
  - Os passos 2 e 3 só ficam ativos depois do 1.
  - Botão final **Ver tabela**.
- `ResumoImportacao({ itens: UltimaImportacao[] })`: por item, "arquivo — X novos, Y atualizados, Z inalterados", mais "N linhas ignoradas" expansível com a lista. Item com `erro` aparece em vermelho.

- [ ] **Step 1: Write the failing tests**
  - `sem base mostra Criar nova base e Abrir base existente`.
  - `clicar em Criar nova base chama abrirNovo`.
  - `base vazia mostra passo 1 ativo e passos 2 e 3 desabilitados`.
  - `com faturamento carregado, Pular nos passos 2 e 3 leva à tabela`.
  - `resumo mostra contagens e erro de planilha`: importação com `erro: 'Coluna "Chassi" não encontrada'` → texto visível.
- [ ] **Step 2: Run** `npm test -- --run src/controle/ui/ControlePage.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): abertura da base e primeiros passos`

---

### Task 8: Tela principal: contadores, filtros, tabela, órfãos e ajuste manual

**Files:**
- Create: `src/controle/ui/EnriquecerSidebar.tsx`, `BarraSalvamento.tsx`, `Contadores.tsx`, `FiltrosBar.tsx`, `CarrosTable.tsx`, `OrfaosTable.tsx`, `AjusteMenu.tsx`
- Modify: `src/controle/ui/ControlePage.tsx`
- Test: `src/controle/ui/ControlePage.test.tsx` (acrescentar)

**Interfaces:**
- Consumes:
  - `calcularVisao` (Task 4), memoizado por `state.base`;
  - `filtrarCarros`, `contarPorStatus`, `FILTROS_VAZIOS` e os labels (Task 5);
  - as ações de `useControle` (Task 6).

Layout: lateral à esquerda e área principal à direita, no padrão de `App.tsx`.

- **`EnriquecerSidebar`:**
  - três `DropZone`: **Adicionar faturamento** (.xlsx), **Adicionar NCC pagas** (.xlsx) e **Adicionar PDFs de NCC** (.pdf, múltiplos);
  - abaixo, `ResumoImportacao` com as importações da sessão.
- **`BarraSalvamento`:**
  - mensagens por estado: `salvo` → "Salvo em controle-ncc.json" (nome do handle, ou "Tudo salvo" sem handle); `salvando` → "Salvando…"; `pendente` sem handle → "Alterações não salvas"; `erro` → mensagem do erro em `role="alert"`;
  - botão **Baixar base atualizada**, sempre visível;
  - botão **Tentar de novo**, quando o estado é `erro`.
- **`Contadores`:**
  - um botão por status com a contagem;
  - clicar liga ou desliga aquele status em `filtros.status`.
- **`FiltrosBar`:**
  - campos NCC, Data de/até (`type="date"`), "Chassi, NF ou cliente" e Concessionária;
  - botão **Limpar filtros**;
  - abas **Carros (N)** e **Órfãos (N)**.
- **`CarrosTable`:**
  - colunas: Data fat., Conc venda/entrega, Cliente, NF, Chassi, Valor, Valor comissão, Status e NCCs;
  - Status: badge do `exibido`, mais a marca quando não for `planilha`. `conflito` em `warn`, `manual` em `muted`, `pago` em `action`;
  - NCCs: um chip por linha com nº, cód, comissão líquida (ou "sem PDF") e paga/não paga. As de `faltando` ficam em destaque;
  - em `parcial`, o texto "Faltam: 808284 (T48)";
  - cada carro e cada chip têm um `AjusteMenu`.
- **`AjusteMenu({ alvo: AlvoAjuste; ajuste: Ajuste | null })`:**
  - botão "⋯" que abre um popover;
  - opções: **Marcar como pago**, **Marcar como não pago**, campo opcional "Observação" e **Desfazer ajuste** (só quando há ajuste);
  - mostra "Ajustado manualmente em dd/mm/aaaa" e a observação.
- **`OrfaosTable`:**
  - colunas: Motivo ("Sem faturamento carregado" / "Chassi diferente do faturamento"), NCC, Cód, NF, Chassi, Cliente, Comissão líquida e Status;
  - inclui `AjusteMenu` da linha.
- **Desempenho:** até ~5.000 carros sem virtualização. Renderizar no máximo 500 linhas filtradas e mostrar "Mostrando 500 de N; refine os filtros".

- [ ] **Step 1: Write the failing tests** (estado mockado com uma base de 3 carros: um parcial com NCC faltante `808284`, um pago, um sem NCC; e 1 órfão):
  - `contadores mostram 1 Parcialmente pago, 1 Pago, 1 Sem NCC`.
  - `carro parcial mostra Faltam: 808284 (T48)`.
  - `clicar no contador Pago filtra a tabela para 1 linha`.
  - `filtro de texto por chassi`.
  - `aba Órfãos lista o órfão com motivo`.
  - `Marcar como pago no menu do chip chama ajustar com alvo linha`: `expect(ajustar).toHaveBeenCalledWith(expect.objectContaining({ alvo: { tipo: 'linha', ncc: '808284', nf: '168707' }, status: 'pago', obs: '' }))`.
  - `erro ao salvar mostra alerta e Tentar de novo`.
  - `soltar planilha em Adicionar faturamento chama importarFaturamentoArquivo`.
- [ ] **Step 2: Run** `npm test -- --run src/controle/ui/ControlePage.test.tsx`. Expected: os novos testes falham.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(controle): tabela de carros, filtros, órfãos e ajuste manual`

---

### Task 9: Exportação, navegação entre seções e README

**Files:**
- Create: `src/controle/exportar.ts`, `src/controle/exportar.test.ts` (`// @vitest-environment node`), `src/Root.tsx`, `src/Root.test.tsx`
- Modify: `src/main.tsx` (renderiza `Root`), `src/controle/ui/FiltrosBar.tsx` (botão **Exportar Excel**), `README.md`, `package.json` (`description`)

**Interfaces:**
- `buildVisaoBuffer(carros: CarroView[]): Promise<ArrayBuffer>`:
  - aba `Controle NCC`;
  - **uma linha por NCC do carro**, e uma linha só para carro sem NCC;
  - colunas: Data faturamento, Conc Venda, Conc Entrega, Cliente, NF, Chassi, Valor, Valor Comissão, Status do carro, Ajuste do carro, NCC, Cód NCC, Data NCC, Comissão Líquida, Status da NCC, Ajuste da NCC e Data pagamento;
  - datas como `Date` UTC com `numFmt: 'dd/mm/yyyy'`, valores com `'#,##0.00'`, cabeçalho em negrito, seguindo `src/ncc/xlsx.ts`;
  - "Ajuste" mostra o rótulo da marca (`manual`/`confirmado`/`conflito`) ou vazio.
- `downloadVisao(carros: CarroView[]): Promise<void>`: nome do arquivo `Controle-NCC-AAAA-MM-DD.xlsx`.
- `Root()`:
  - abas no topo: **Controle de NCC** (`#/` ou hash vazio) e **Consolidador de PDFs** (`#/consolidador`);
  - escuta `hashchange` e renderiza `ControlePage` ou `App`;
  - o `App` atual não muda (o título dele continua).

- [ ] **Step 1: Write the failing tests**
  - `exportar: carro parcial com 2 NCCs gera 2 linhas; carro sem NCC gera 1`: lê o buffer de volta com ExcelJS e confere `NCC` e `Status do carro = 'Parcialmente pago'`.
  - `Root: hash vazio mostra Controle de NCC; #/consolidador mostra Consolidador de NCC` (mock de `./controle/ui/ControlePage`).
- [ ] **Step 2: Run** `npm test -- --run src/controle/exportar.test.ts src/Root.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** No README, acrescentar a seção "Controle de NCC" com:
  - os três uploads;
  - onde fica o arquivo `controle-ncc.json` e a recomendação de guardar cópia;
  - a diferença Chrome/Edge × Firefox/Safari;
  - o significado de cada status e de "manual"/"conflito".
- [ ] **Step 4: Run** `npm test -- --run` (suíte inteira) e `npm run build`. Expected: tudo PASS, build sem erros.
- [ ] **Step 5: Verificação manual** com `npm run dev` no Chrome:
  - criar a base;
  - subir `FATURAMENTO-2026.xlsx`, `NCC-pagas-2026.xlsx` e os 4 PDFs reais da raiz do repositório (não versionados);
  - conferir que a NF 168707 aparece como **Parcialmente pago** ou **Pago**, conforme as pagas, com as duas NCCs (P68 e P48);
  - re-subir o faturamento e conferir que o resumo mostra 0 novos;
  - recarregar, reabrir o arquivo e conferir que os dados voltaram.
- [ ] **Step 6: Commit** `feat(controle): exportação da visão, abas e README`
