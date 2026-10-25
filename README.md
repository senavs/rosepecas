# Consolidador de NCC

Junta as linhas de vários PDFs de **Relatório NCC** (Notificação de Crédito de Comissão) numa tabela única, com totais, e exporta para `.xlsx`.

Tudo roda no navegador: os PDFs são lidos com pdf.js e a planilha é gerada com ExcelJS, sem enviar nada para servidor nenhum.

**Site:** https://senavs.github.io/rosepecas/

## Como usar

1. Arraste os PDFs para "Adicionar PDFs", ou clique para selecioná-los. Pode adicionar vários de uma vez e em lotes seguidos.
2. Confira as linhas e os totais na tabela.
3. Se quiser, marque **Excluir duplicados** para remover linhas 100% idênticas.
4. Clique em **Exportar Excel**.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local
npm test           # testes (Vitest)
npm run fixtures   # regenera os PDFs mock em tests/fixtures/
npm run deploy     # build + publica no GitHub Pages (branch gh-pages)
```

Os testes usam apenas PDFs mock com dados fictícios (`tests/fixtures/ncc-teste-*.pdf`). **Nunca** versione PDFs reais: o `.gitignore` bloqueia `*.pdf`, com exceção dos mocks.
