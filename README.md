# Rose Peças — NCC

Duas ferramentas para as NCCs (Notificações de Crédito de Comissão), num só site:

- **Controle de NCC** (página inicial): cruza faturamento, PDFs de NCC e NCC pagas para mostrar quais carros já tiveram a comissão paga e quais não.
- **Consolidador de PDFs** (aba `#/consolidador`): junta vários PDFs de NCC numa planilha.

Tudo roda no navegador: PDFs lidos com pdf.js, planilhas com ExcelJS, sem enviar nada para servidor nenhum.

**Site:** https://senavs.github.io/rosepecas/

## Controle de NCC

### A base fica num arquivo seu

Os dados ficam num arquivo `controle-ncc.json` no seu computador, não no navegador.

- **Primeira vez:** clique em **Criar nova base** e escolha onde salvar.
- **Depois:** clique em **Abrir base existente** e escolha o mesmo arquivo.

Guarde cópias de vez em quando: se uma importação der errado, basta reabrir uma cópia anterior.

- **Chrome e Edge:** cada alteração é salva sozinha no arquivo.
- **Firefox e Safari:** o navegador não permite isso. Use **Baixar base atualizada** ao terminar e, na próxima vez, abra o arquivo baixado.

### Adicionar dados

Pela lateral, a qualquer momento:

1. **Faturamento** (`.xlsx`): os carros faturados.
2. **NCC pagas** (`.xlsx`): as NCCs que caíram na conta.
3. **PDFs de NCC**: os relatórios recebidos por e-mail. Pode enviar vários de uma vez.

Pode reenviar períodos que se sobrepõem (ex.: 2026 inteiro e depois só out–dez): nada é duplicado. Uma célula vazia no arquivo novo não apaga o que já estava preenchido. As colunas são encontradas pelo nome do cabeçalho, em qualquer ordem.

### Como os dados se ligam

- O carro é identificado pela **NF** do faturamento.
- A NCC se liga ao carro pela **NF**, conferindo o chassi.
- O pagamento se liga à NCC pelo **nº da NCC + NF**.
- Um carro pode ter mais de uma NCC, por exemplo uma da concessionária de venda e outra da de entrega.

### Status

| Status | Significado |
|---|---|
| Sem comissão | Valor Comissão zero no faturamento; não se espera NCC |
| Sem NCC | Nenhuma NCC recebida para o carro |
| NCC recebida, não paga | Tem NCC, mas nenhuma consta nas pagas |
| Parcialmente pago | Parte das NCCs paga; a tabela mostra quais faltam |
| Pago | Todas as NCCs conhecidas estão pagas |

Quando um pagamento chega sem o PDF da NCC, ele aparece como linha **sem PDF**, já paga. Se o PDF chegar depois, as duas se juntam.

A aba **Órfãos** lista NCCs e pagamentos que não se ligam a nenhum carro carregado. Normalmente é um faturamento de outro período que ainda não foi enviado.

### Ajuste manual

O menu **⋯** de um carro ou de uma NCC permite marcar como pago ou não pago, com uma observação. O ajuste fica guardado à parte e nunca altera os dados importados.

- **manual**: o status veio do ajuste.
- **confirmado**: o ajuste diz pago e a planilha de pagas concorda.
- **conflito**: o ajuste diz não pago, mas a planilha de pagas confirma o pagamento. A planilha vence; revise o ajuste.

**Exportar Excel** gera uma planilha da visão filtrada, com uma linha por NCC.

## Consolidador de PDFs

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
