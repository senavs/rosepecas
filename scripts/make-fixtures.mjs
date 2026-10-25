// Gera PDFs mock com o mesmo layout do Relatório NCC, só com dados fictícios de TESTE.
// Uso: npm run fixtures
import { writeFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'

const OUT = new URL('../tests/fixtures/', import.meta.url)

// Posições x das colunas, imitando o layout do relatório real.
const X = { nf: 30, cliente: 110, chassi: 330 }
const RIGHT = { valorNf: 470, comissaoBruta: 560, impostoRenda: 630, comissaoLiquida: 710 }

const FIXTURES = [
  {
    file: 'ncc-teste-1.pdf',
    cod: 'T01',
    notificacao: '900001',
    data: '23.10.2026',
    rows: [['000.000.001', 'CLIENTE TESTE UM', 'TESTE000000000001', '123.456,78', '1.234,56', '18,52', '1.216,04']],
  },
  {
    file: 'ncc-teste-2.pdf',
    cod: 'T02',
    notificacao: '900002',
    data: '24.10.2026',
    rows: [
      ['000.000.002', 'CLIENTE TESTE DOIS', 'TESTE000000000002', '200.000,00', '10.000,00', '150,00', '9.850,00'],
      ['000.000.003', 'CLIENTE TESTE TRES', 'TESTE000000000003', '80.000,00', '4.000,00', '60,00', '3.940,00'],
    ],
  },
  {
    file: 'ncc-teste-3.pdf',
    cod: 'T03',
    notificacao: '900003',
    data: '25.10.2026',
    rows: [
      ['000.000.004', 'CLIENTE TESTE QUATRO', 'TESTE000000000004', '50.000,00', '500,00-', '7,50-', '492,50-'],
      ['000.000.005', 'CLIENTE TESTE CINCO', 'TESTE000000000005', '10.000,00', '100,00', '1,50', '98,50', 'SOBRENOME LONGO'],
    ],
  },
]

export async function buildNccPdf({ cod, notificacao, data, rows }) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([842, 595]) // A4 paisagem
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const size = 9
  const text = (s, x, y) => page.drawText(s, { x, y, size, font })
  const right = (s, xEnd, y) => text(s, xEnd - font.widthOfTextAtSize(s, size), y)

  let y = 560
  text('Relatório NCC: ate', 30, y)
  y -= 30
  text('General Motors do Brasil Ltda', 330, y)
  text(data, 720, y)
  y -= 25
  text(`Notificação de Crédito: ${notificacao}`, 30, y)
  text(`Cód : ${cod}`, 200, y)
  y -= 12
  text('Fábr : 08', 30, y)
  y -= 12
  text('Núm. NF', X.nf, y)
  text('Cliente', X.cliente, y)
  text('Chassi', X.chassi, y)
  right('Valor NF', RIGHT.valorNf, y)
  right('Commiss. Bruta', RIGHT.comissaoBruta, y)
  right('Imp. Renda', RIGHT.impostoRenda, y)
  right('Commis. Liq.', RIGHT.comissaoLiquida, y)

  for (const [nf, cliente, chassi, valorNf, bruta, ir, liq, continuation] of rows) {
    y -= 12
    text(nf, X.nf, y)
    text(cliente, X.cliente, y)
    text(chassi, X.chassi, y)
    right(valorNf, RIGHT.valorNf, y)
    right(bruta, RIGHT.comissaoBruta, y)
    right(ir, RIGHT.impostoRenda, y)
    right(liq, RIGHT.comissaoLiquida, y)
    if (continuation) {
      y -= 12
      text(continuation, X.cliente, y)
    }
  }
  return doc.save()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of FIXTURES) {
    await writeFile(new URL(f.file, OUT), await buildNccPdf(f))
    console.log(`gerado tests/fixtures/${f.file}`)
  }
}
