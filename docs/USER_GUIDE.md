# Guia do usuário

## 1. Antes de começar

Tenha em mãos: unidades e embalagens de compra, preços recentes, rendimento usável, fichas de receita, porções/rendimento, custos mensais, canais e suas taxas. Cadastre dados reais; o sistema não cria uma empresa de demonstração sem sua escolha explícita.

Valores em reais aceitam centavos. Percentuais representam partes do valor de venda ou da quantidade indicada pelo campo; leia a ajuda da base da taxa. Não use margem e markup como sinônimos.

## 2. Primeiro acesso

1. Crie a conta ou aceite o convite e confirme o e-mail.
2. Informe organização, moeda e timezone.
3. Crie a filial/local principal e escolha a política de estoque negativo.
4. Convide a equipe em **Administração → Pessoas**, atribuindo o menor papel necessário.
5. Siga o checklist: ingrediente, receita, canal/preço e primeira produção.

Se você participa de várias empresas, confirme a organização ativa no cabeçalho antes de cadastrar ou consultar. Trocar de organização recarrega o contexto.

## 3. Unidades, conversões e ingredientes

### Unidades e conversões

- Conversões da mesma dimensão, como kg↔g ou L↔mL, podem ser globais.
- Massa↔volume depende do ingrediente. Cadastre um fator específico (por exemplo, quantos gramas há em uma xícara daquele ingrediente).
- Não force uma conversão incompatível: ela altera todos os custos dependentes.

### Ingrediente

1. Abra **Cadastros → Ingredientes** e pesquise antes de criar.
2. Informe nome, categoria, unidade de compra e unidade usada na receita.
3. Informe rendimento usável ou quantidades bruta e usável.
4. Escolha método de custo: última compra, média ponderada ou referência manual.
5. Confira a decomposição do custo e salve.

Exemplo: 10 kg comprados por R$ 110,00, R$ 10,00 de frete, desconto de R$ 11,00 e rendimento de 80% produzem 8 kg usáveis e custo de R$ 13,625/kg. Perda e rendimento são duas visões da mesma transformação; não desconte ambos novamente.

## 4. Fornecedores e compras

1. Cadastre o fornecedor e, opcionalmente, seu vínculo/código para ingredientes.
2. Em **Compras**, crie um rascunho, selecione filial, local, fornecedor e data.
3. Adicione itens, quantidade, preço e desconto.
4. Informe frete, tributos e taxas e confira como foram rateados.
5. Compare subtotal, adicionais, descontos e total do documento.
6. Anexe comprovante, se permitido, e confirme o recebimento uma única vez.

Ao confirmar, a compra atualiza histórico de custo e gera entradas de estoque. Se a resposta demorar, não crie outra compra: reabra/pesquise o documento; a operação foi desenhada para retry idempotente. Para corrigir uma compra recebida, use cancelar/estornar com motivo — não tente apagar o histórico.

## 5. Criar uma ficha técnica

1. Abra **Produtos → Receitas** e crie um rascunho.
2. Informe rendimento líquido, porções, tamanho da porção, validade e instruções.
3. Adicione cada ingrediente na unidade de uso. Confira conversão, custo de origem e subtotal.
4. Adicione sub-receitas. O sistema impede dependências circulares.
5. Adicione embalagem, tempo/mão de obra e rateio aplicável.
6. Confira custo total, porção/unidade e alertas.
7. Publique a versão quando os dados estiverem completos.

Uma versão publicada é preservada. Para mudar quantidade, rendimento ou componente que afeta cálculo, crie nova versão. Produções antigas continuam ligadas à versão usada à época.

### Escalar receita

Use **Escalar/Produzir** e informe porções, unidades ou lotes desejados. A escala altera a necessidade planejada, não a ficha-base. Confira arredondamentos de itens indivisíveis, embalagens e capacidade do equipamento.

## 6. Configurar custos e canais

Em **Administração → Custos**, cadastre mão de obra, despesas fixas/variáveis, centro de custo, período e regra de alocação. Escolha uma base defensável — horas, unidades, peso, receita ou rateio manual — e registre a vigência.

Em **Cadastros → Canais**, informe:

- tributos e comissões percentuais sobre venda;
- taxa fixa por pedido/transação ou unidade;
- entrega/cashback/royalty, identificando a base;
- embalagem específica do canal;
- margem alvo e mínima.

Não some percentuais ao custo. Se custo + taxa fixa é R$ 60, encargos sobre venda são 20% e margem-alvo é 20%, o divisor é `1 − 0,20 − 0,20 = 0,60`; o preço-alvo é R$ 100.

## 7. Precificar e aprovar preço

1. Abra uma versão publicada e escolha **Precificar**.
2. Selecione o canal e confira o snapshot de custo.
3. Revise custos monetários, taxas fixas, encargos percentuais e margem.
4. Compare preço mínimo, sugerido e atual; veja lucro, margem e markup.
5. Simule alterações sem salvar. Ao aprovar, informe vigência e salve.

**Margem** mede lucro em relação ao preço: `(preço − custo) / preço`. **Markup multiplicador** mede preço em relação ao custo: `preço / custo`. Um markup de 2× sobre custo de R$ 50 dá preço R$ 100 e margem de 50%, não 100%.

Uma soma de encargos + margem igual ou superior a 100% torna o cálculo impossível. Reduza meta/taxas ou reveja custos. Promoções abaixo da margem mínima devem ser justificadas e podem exigir papel superior.

## 8. Estoque e produção

### Saldos e ajustes

O saldo resulta de movimentos. Filtre por filial/local e ingrediente. Para corrigir contagem, registre ajuste com motivo; movimentos confirmados não são editados. Se negativo for permitido, trate o alerta e regularize a origem — o sistema não o esconde.

### Lote de produção

1. Em **Produção**, selecione receita/versão, filial, local e quantidade planejada.
2. Confira necessidade, disponibilidade e faltas.
3. Registre consumo real, rendimento obtido, perda, validade e destino.
4. Revise e confirme.
5. Analise planejado×real e abra os movimentos relacionados quando houver diferença.

Falha na confirmação não deve deixar consumo parcial. Se o lote já existir após uma mensagem de conexão, não o envie como novo. Correção posterior usa estorno/ajuste auditado.

## 9. Dashboard, relatórios e cenários

Confirme organização, filial, período e timezone. Indicadores devem permitir abrir o detalhe. “Sem dados” não significa zero; siga a orientação para cadastrar o fato necessário.

- **Custos e evolução:** explica origem e variação de ingrediente/receita.
- **Margem por canal/produto:** identifica subprecificados e abaixo da margem mínima.
- **Estoque:** mostra saldo, valor, mínimo, validade e movimentos.
- **Produção:** compara quantidade, consumo, perda e rendimento previstos/reais.
- **Ponto de equilíbrio:** usa custos fixos e contribuição por unidade; confira premissas de volume/mix.
- **Cenário:** duplica premissas e aplica inflação, desconto, taxa, custo ou volume sem alterar o cadastro-base.

Na exportação, verifique cabeçalho de filtros, geração, moeda e timezone. O arquivo respeita as mesmas permissões da tela.

## 10. Pessoas, papéis e auditoria

- **Admin:** organização, pessoas, configurações e toda operação.
- **Gestor:** cadastros, custos, receitas, preços, produção e relatórios; sem controle superior de acesso.
- **Operação:** compras, estoque e produção; acesso financeiro limitado conforme política.
- **Visualizador:** somente leitura autorizada.

Não compartilhe contas. O último administrador deve transferir responsabilidade antes de sair. Use **Auditoria** para investigar alterações críticas por ator, alvo e período; logs não substituem correções compensatórias.

## 11. Solução de problemas

| Sintoma                        | Verifique                                                  | Ação segura                                                               |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Custo está zerado/ausente      | método de custo, compra confirmada, rendimento e conversão | complete a origem; não publique ignorando alerta sem autorização          |
| Conversão recusada             | dimensão das unidades e fator específico                   | cadastre fator validado para o ingrediente                                |
| Preço impossível               | soma de percentuais + margem                               | ajuste configuração até divisor ser positivo                              |
| Receita não aceita sub-receita | caminho de dependência                                     | remova ciclo ou reorganize a ficha                                        |
| Estoque diverge                | filtros de filial/local, movimentos e estornos             | reconcilie o livro; registre ajuste com motivo, não edite fato            |
| Ação não autorizada            | organização ativa e papel                                  | peça ao admin o menor acesso necessário; não tente outro tenant           |
| Dados não aparecem após salvar | estado da confirmação, filtros, conexão                    | tente novamente somente na mesma operação; pesquise antes de duplicar     |
| Link de acesso expirou         | prazo/e-mail correto                                       | solicite novo link pela tela                                              |
| Relatório parece divergente    | período, timezone, canal, status e moeda                   | abra o detalhe e compare fatos; reporte com ID de correlação, sem segredo |

Ao solicitar suporte, envie organização, horário aproximado, tela, ação e ID de correlação mostrado. Nunca envie senha, token, chave Supabase/Vercel ou arquivo que contenha segredo.

## 12. Boas práticas operacionais

- Revise rendimento e custo após troca de fornecedor/embalagem.
- Publique nova versão antes da produção alterada.
- Reconcilie compras, estoque e produção semanalmente.
- Revise produtos abaixo da margem e premissas de custos fixos mensalmente.
- Revogue acessos imediatamente após mudança de função/saída.
- Exporte dados conforme política e valide periodicamente o teste de restauração com a equipe responsável.
