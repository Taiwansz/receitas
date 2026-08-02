# Especificação do motor de cálculos

Esta é a fonte de verdade para os cálculos financeiros da aplicação. A implementação está em
`src/lib/calculations` e não depende de componentes, banco de dados ou formatação de moeda.

## Convenções de precisão

- Entradas públicas usam `DecimalInput` (`string`, `number` ou valores aceitos por `decimal.js`).
  Para dados vindos de formulário ou banco, prefira strings decimais.
- Todos os resultados monetários e quantitativos são instâncias de `Decimal`.
- A política compartilhada usa 40 algarismos significativos e `ROUND_HALF_UP`; ela é configurada
  uma vez pelo módulo `decimal.ts`, sem depender do padrão implícito da dependência.
- Taxas são frações: `0.10` representa 10%.
- Nenhuma fórmula arredonda resultados intermediários. `roundDecimal` deve ser chamada somente
  na borda de exibição/armazenamento. Para BRL, a política padrão é duas casas com `ROUND_HALF_UP`.
- Quantidades podem manter toda a precisão decimal necessária. Não use `Number` nem operadores
  aritméticos nativos para continuar um cálculo retornado pela biblioteca.
- Valores monetários e quantidades que representam consumo/custo não podem ser negativos. Taxas de
  sensibilidade de cenário podem ser negativas até `-1` (redução máxima de 100%).

## Ingredientes e compras

Para preço unitário de compra `P`, quantidade bruta `Q`, desconto `D`, frete `F`, impostos `T` e
taxas adicionais `A`:

```text
subtotal = P × Q
custo_de_aquisicao = subtotal − D + F + T + A
```

Ajustes fixos entram com seu valor nominal. Ajustes percentuais sempre usam o subtotal de compra
como base explícita. Descontos acima do subtotal são rejeitados.

O rendimento pode ser informado diretamente ou derivado do desperdício, nunca ambos:

```text
rendimento = yield_rate
rendimento = 1 − waste_rate
quantidade_util = Q × rendimento
custo_por_unidade_bruta = custo_de_aquisicao / Q
custo_da_porção_comestível = custo_de_aquisicao / quantidade_util
custo_por_unidade_de_receita = custo_da_porção_comestível / unidades_de_receita_por_unidade_de_compra
```

Rendimento zero, quantidade bruta zero e taxas fora de `[0, 1]` são erros de domínio.

Os métodos históricos são:

- último custo: custo unitário da última compra na ordem fornecida;
- média ponderada: `Σ custo de aquisição / Σ quantidade`;
- referência manual: valor validado informado pelo usuário, sem misturá-lo à média histórica.

## Conversões

Cada unidade declara uma dimensão (`mass`, `volume`, `count`) e um fator para a unidade-base
(grama, mililitro ou unidade). Para unidades da mesma dimensão:

```text
quantidade_destino = quantidade_origem × fator_origem / fator_destino
```

Conversões entre massa e volume exigem densidade em `g/ml`. Conversões envolvendo contagem e outra
dimensão são rejeitadas; quando houver uma equivalência comercial específica, use
`convertByFactor`, cujo fator significa “unidades de destino por unidade de origem”.

## Receitas e sub-receitas

Cada item tem uma categoria, quantidade e custo unitário:

```text
custo_do_item = quantidade × custo_unitario
custo_total = Σ ingredientes + Σ sub_receitas + Σ embalagens
            + Σ mao_de_obra_direta + Σ variaveis_diretos + Σ indiretos_alocados
custo_unitario = custo_total / rendimento_real
custo_da_porção = custo_total / porções
```

Quando a unidade de saída for massa ou volume, o motor também converte o rendimento real para kg ou
litro e calcula o respectivo custo. Perdas e rendimentos são:

```text
perda_estimada = saida_bruta − saida_teorica
perda_real = saida_bruta − saida_real
rendimento_teorico = saida_teorica / saida_bruta
rendimento_real = saida_real / saida_bruta
```

Sem saída bruta informada, perdas e taxas de rendimento retornam `null`, pois não é correto assumir
perda zero na ausência dessa medição.

Escala de produção usa `quantidade_alvo / quantidade_base` em todos os itens. Dependências de
sub-receita podem ser validadas por `assertAcyclicRecipes`, que rejeita ciclos diretos e indiretos e
informa o caminho completo do ciclo.

## Formação de preço

Custos monetários incluem o custo do produto/receita e valores por venda (embalagem, entrega fixa,
mão de obra e rateios, conforme a política da organização). Impostos, comissões, taxas de cartão e
royalties calculados sobre o preço de venda entram como encargos percentuais.

```text
divisor = 1 − Σ encargos_percentuais − margem_alvo
preço_sugerido = (Σ custos_monetarios + Σ taxas_fixas_da_venda) / divisor
preço_mínimo_sem_prejuízo = (Σ custos_monetarios + Σ taxas_fixas_da_venda)
                            / (1 − Σ encargos_percentuais)
```

Se encargos mais margem forem maiores ou iguais a 100%, o preço é matematicamente impossível e o
motor lança `IMPOSSIBLE_PERCENTAGES`. Percentuais não são simplesmente somados ao custo.

Markup e margem são conceitos diferentes:

```text
markup_multiplicador = preço / custo
markup_taxa = (preço − custo) / custo
margem = lucro / preço
```

Quando o custo é zero, markup não é definido (`null`), mas as margens continuam calculáveis.

O detalhamento de rentabilidade usa:

```text
lucro_bruto = preço − custo_do_produto
contribuição = lucro_bruto − custos_variáveis_monetários − encargos_percentuais
lucro_líquido_estimado = contribuição − custos_fixos_alocados
```

`calculateDiscountLimit` resolve o preço necessário à margem mínima e limita o desconto à diferença
entre o preço atual e esse piso. Preços já abaixo do piso têm desconto máximo zero. Canais usam o
mesmo motor com custos e taxas próprios. Faixas de atacado exigem quantidades mínimas crescentes.

## Ponto de equilíbrio

```text
contribuição_unitária = preço × (1 − encargos_percentuais) − custo_variável_unitário
índice_de_contribuição = contribuição_unitária / preço
ponto_de_equilíbrio_unidades = custos_fixos / contribuição_unitária
ponto_de_equilíbrio_receita = custos_fixos / índice_de_contribuição
```

Contribuição zero ou negativa torna o ponto de equilíbrio inexistente e gera
`NON_POSITIVE_CONTRIBUTION`. A meta mensal é a receita de equilíbrio; metas semanais e diárias usam
as semanas e os dias operacionais informados (padrões: 4 e 30).

## Cenários e sensibilidades

`simulateScenario` aplica, de forma independente:

- inflação de ingrediente ao custo de ingrediente;
- variação de custo fixo ao custo fixo;
- variação de preço e desconto ao preço;
- variação de volume às unidades vendidas;
- encargos percentuais à receita do cenário.

Depois recalcula receita, custos variáveis, contribuição, lucro líquido, margens e ponto de
equilíbrio. Cenários com contribuição não positiva continuam visíveis, retornam ponto de equilíbrio
`null` e um aviso de domínio; assim a interface pode sinalizar uma margem negativa sem ocultar o
resultado. `compareNamedScenarios` padroniza a comparação conservador/esperado/otimista, sem impor
premissas arbitrárias: cada cenário recebe suas próprias sensibilidades.

## Erros de domínio

Falhas previsíveis usam `CalculationError` com um `code` estável, incluindo quantidade, taxa ou
rendimento inválido, unidades incompatíveis, densidade ausente, configuração percentual impossível,
contribuição não positiva e ciclo de sub-receita. A camada de aplicação pode traduzir códigos sem
depender do texto da mensagem.

## Exemplo

```ts
import { calculatePricing, roundDecimal } from "@/lib/calculations";

const result = calculatePricing({
  monetaryCosts: ["60.00"],
  fixedSaleCharges: ["5.00"],
  percentageCharges: [{ id: "tax", rate: "0.10" }],
  targetMargin: "0.25",
});

const brl = roundDecimal(result.suggestedSellingPrice, 2); // Decimal('100.00')
```

Os testes Vitest junto de cada módulo cobrem precisão decimal, desperdício, densidade, escalonamento,
sub-receitas circulares, margem versus markup, canais, descontos, cenários e limites matemáticos.
