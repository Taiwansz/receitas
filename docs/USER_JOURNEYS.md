# Jornadas de usuário e especificação de UX

Este documento detalha as jornadas críticas do `PRD.md`. Cada etapa explicita resposta da interface, validações, acessibilidade e evidência mínima de aceitação.

## Princípios transversais

- A organização e filial ativas permanecem visíveis; trocar contexto invalida cache e recarrega dados.
- Dinheiro aparece em BRL, percentuais exibem sua base e margem nunca é rotulada como markup.
- A interface pode antecipar permissões, mas o banco é a autoridade; erro de RLS vira mensagem segura, não detalhe interno.
- Formulários têm rótulo persistente, instrução quando necessária, erro associado, foco no primeiro erro e proteção contra duplo envio.
- Carregamento usa estrutura estável; vazio explica o valor da ação seguinte; falha oferece tentar novamente sem apagar o preenchimento.
- No celular, ação primária e resumo permanecem alcançáveis; tabelas viram cartões/detalhe progressivo quando necessário.

## Mapa de navegação por tarefa

| Tarefa               | Entrada principal    | Saída/continuação                                 |
| -------------------- | -------------------- | ------------------------------------------------- |
| Configurar operação  | Onboarding           | Dashboard ou convite de equipe                    |
| Atualizar custos     | Compras              | Histórico de custo, estoque e receitas impactadas |
| Criar produto        | Receitas             | Versão publicada e precificação                   |
| Definir preço        | Precificação         | Preço por canal e simulação                       |
| Produzir             | Produção             | Lote, movimentos, planejado×real                  |
| Investigar resultado | Dashboard/Relatórios | Detalhe do fato ou cenário                        |
| Administrar acesso   | Pessoas e permissões | Auditoria                                         |

## J-01 — Primeiro acesso e configuração da organização

**Persona:** proprietário  
**Resultado:** chegar a uma organização real pronta para cadastrar custos.  
**Requisitos:** FR-001, FR-002, FR-003, FR-025; AC-001, AC-009.

### Fluxo principal

1. Usuário cria a conta e recebe uma sessão imediatamente; o sistema segue direto para o onboarding.
2. Cria organização com nome, moeda BRL e timezone; informa primeira filial/local operacional.
3. Escolhe política inicial de estoque negativo e preferências de unidades; escolhas possuem exemplos.
4. Pode convidar equipe agora ou pular; nenhum dado fictício é criado por padrão.
5. Checklist leva a **Ingrediente → Receita → Canal/preço → Produção** e mostra progresso persistido.

### Exceções e estados

- Link expirado: explicar e permitir novo envio sem revelar existência de outra conta.
- Nome duplicado é permitido entre tenants; identificador técnico é gerado pelo sistema.
- Se já houver associação, mostrar seletor de organização em vez de duplicar onboarding.
- Convite inválido/expirado não cria membership parcial.

### Aceite

- Recarregar em cada etapa retoma estado salvo.
- Usuário sem membership não entra em rota protegida.
- Leitor de tela recebe título da etapa, progresso textual e resultado do envio.

## J-02 — Cadastrar unidade, ingrediente e rendimento

**Persona:** gestor ou operação autorizada  
**Resultado:** obter custo por unidade usável confiável.  
**Requisitos:** FR-004, FR-005, FR-008; BR-002–BR-004; AC-002.

### Fluxo principal

1. Em **Ingredientes**, usuário busca antes de criar e informa nome/categoria.
2. Seleciona unidade de compra e de uso; conversão padrão aparece quando dimensões são compatíveis.
3. Informa quantidade bruta e quantidade/rendimento usável. Alterar uma recalcula a outra, sem dupla aplicação de perda.
4. Escolhe método de custo (última compra, média ponderada ou referência manual).
5. Prévia explica fórmula, valor por unidade usável e data/origem do custo; usuário salva.

### Validações

- Quantidades e preço estritamente positivos quando aplicáveis; rendimento `(0,100%]`.
- Massa↔volume requer conversão específica do ingrediente; sem fator, a ação é bloqueada com orientação.
- Decimal aceita vírgula e ponto conforme parser regional, mas normaliza uma única representação.

### Aceite

- Cenário numérico AC-002 confere até a precisão especificada.
- Lista vazia oferece “Cadastrar ingrediente”; falha mantém valores.
- No mobile, unidade, quantidade e resultado não exigem rolagem horizontal.

## J-03 — Registrar e receber uma compra

**Persona:** operação/gestor  
**Resultado:** atualizar custo e estoque uma vez, com documento rastreável.  
**Requisitos:** FR-006–FR-008, FR-016, FR-024; BR-009, BR-011, BR-014; AC-007.

### Fluxo principal

1. Usuário cria rascunho, seleciona fornecedor, filial/local e competência.
2. Adiciona itens, quantidades, preço, desconto; informa frete, tributos e taxas com método de rateio explícito.
3. Totais por item e geral são recalculados e discrepância de documento é avisada.
4. Anexa comprovante opcional; acesso ao arquivo segue tenant e permissões.
5. Confirma recebimento. Serviço transacional cria/atualiza histórico de custo e movimentos de entrada.
6. Resultado mostra compra, estoque afetado, custo anterior/novo e receitas potencialmente impactadas.

### Exceções

- Reenvio/retry usa chave idempotente e retorna a confirmação existente.
- Cancelar compra recebida exige permissão e motivo; cria estornos, não apaga fatos.
- Anexo inválido falha antes da confirmação ou fica claramente pendente, sem compra parcialmente recebida.

### Aceite

- Soma de itens + adicionais − descontos reconcilia com total.
- Uma confirmação gera uma entrada por item; teste repete requisição.
- Usuário de outra organização não acessa compra nem URL assinada do anexo.

## J-04 — Criar, testar e publicar receita versionada

**Persona:** gestor/cozinha técnica  
**Resultado:** ficha com custo e rendimento reproduzíveis.  
**Requisitos:** FR-009–FR-012, FR-024; BR-005, BR-006, BR-012, BR-013; AC-003, AC-004.

### Fluxo principal

1. Cria receita em rascunho com rendimento líquido, porções, preparação, validade e armazenamento.
2. Inclui ingredientes e quantidades; cada linha mostra conversão, custo de origem e subtotal.
3. Inclui sub-receita; busca exclui a própria receita e valida o grafo completo.
4. Acrescenta embalagem, tempo/mão de obra e regra de rateio, quando aplicável.
5. Resumo mostra custo total, porção, kg/litro quando dimensionalmente possível, e alertas de dado ausente.
6. Publica versão após validação. Nova alteração relevante parte de cópia e gera número de versão novo.

### Exceções

- Ingrediente sem custo impede publicação ou exige override explicitamente autorizado e auditado.
- Dependência circular mostra caminho compreensível (“Molho → Base → Molho”).
- Mudança concorrente usa versão/ETag e oferece recarregar, não sobrescreve silenciosamente.

### Aceite

- Custo total reconcilia subtotais com precisão intermediária.
- Produção antiga mantém referência à versão publicada original.
- Escala multiplica quantidades, mas não altera a ficha-base.

## J-05 — Precificar por canal e compreender margem

**Persona:** proprietário/gestor  
**Resultado:** aprovar preço que cobre encargos e margem-alvo.  
**Requisitos:** FR-013–FR-015, FR-021; BR-007–BR-010, BR-020; AC-005, AC-006.

### Fluxo principal

1. A partir da receita publicada, seleciona canal e vê snapshot do custo aplicado.
2. Interface separa custos monetários, taxas fixas, percentuais sobre venda e margem-alvo.
3. Motor apresenta preço mínimo, alvo, preço atual, lucro e margens; tooltip explica margem×markup.
4. Usuário altera premissas em simulação sem salvar; gráfico/tabela de sensibilidade atualiza.
5. Ao aprovar, salva preço com vigência, canal, versão da receita e premissas; histórico permanece.

### Exceções

- Soma de encargos e margem ≥100% bloqueia cálculo e identifica parcelas responsáveis.
- Promoção abaixo da margem mínima exige permissão/justificativa conforme política.
- Receita desatualizada exibe aviso de custo novo; não reescreve preço histórico.

### Aceite

- Cenário AC-005 retorna R$ 100,00 e identifica divisor 0,60.
- Balcão/marketplace usam encargos e embalagem correspondentes.
- Teclado percorre premissas antes do resultado; mudanças são anunciadas sem roubar foco.

## J-06 — Planejar e confirmar produção

**Persona:** operação/gestor  
**Resultado:** produzir lote e refletir consumo/perdas no estoque.  
**Requisitos:** FR-016–FR-018, FR-024; BR-014, BR-015; AC-008.

### Fluxo principal

1. Seleciona receita/versionamento, quantidade planejada, filial/local, data e lote.
2. Sistema escala necessidade e mostra disponível, faltante e substituições autorizadas.
3. Usuário inicia/edita apontamento real: consumo, rendimento obtido, perdas, validade e destino.
4. Confirma; operação transacional gera consumos, perdas e entrada do produto quando estocado.
5. Resumo compara previsto×real em quantidade, custo e rendimento, com links aos movimentos.

### Exceções

- Falta de estoque segue política: bloquear ou permitir com alerta/permissão; nunca ocultar negativo.
- Duplo clique/retry não duplica lote/movimentos.
- Correção pós-confirmação cria ajuste/estorno com motivo e trilha.

### Aceite

- Falha simulada no meio da operação deixa zero fatos parciais.
- Todos os movimentos compartilham referência ao lote e organização corretos.
- A jornada principal é concluível a 320 px.

## J-07 — Analisar dashboard, relatórios e cenários

**Persona:** proprietário/gestor/visualizador  
**Resultado:** explicar resultados e decidir a ação seguinte.  
**Requisitos:** FR-019–FR-023; BR-019; AC-011.

### Fluxo principal

1. Usuário escolhe organização, filial, período e timezone; filtros aparecem no cabeçalho e URL quando seguro.
2. Dashboard mostra custos, produtos abaixo da margem, valor/ruptura de estoque e desvio de produção.
3. Selecionar indicador abre relatório com mesma definição/filtros e possibilidade de chegar aos fatos.
4. Cenário cria cópia de premissas; altera inflação, custos, canal, volume e desconto sem gravar nos cadastros.
5. Exportação inclui filtros, geração, moeda, timezone e definição de colunas.

### Exceções

- Sem dados: explicar quais fatos alimentam o indicador, sem gráfico falso.
- Dados parciais/atrasados: informar atualização e fonte; não apresentar zero como ausência.
- Exportação volumosa apresenta limite/progresso ou job, nunca trava a página sem retorno.

### Aceite

- KPI e detalhe reconciliam; teste soma conjunto conhecido.
- Visualizador exporta somente o que pode ler.
- Gráficos têm equivalente textual/tabela e não dependem apenas de cor.

## J-08 — Gerenciar membros e responder a acesso indevido

**Persona:** administrador  
**Resultado:** aplicar menor privilégio e auditar mudanças.  
**Requisitos:** FR-003, FR-024, FR-026; BR-016–BR-018; AC-009, AC-010.

### Fluxo principal

1. Administrador convida pessoa para organização e papel permitido.
2. Convite aceito cria membership único; alteração de papel registra antes/depois e ator.
3. Revogação encerra capacidade futura; sessões/cache deixam de autorizar após revalidação adequada.
4. Auditoria filtra ação, ator, alvo e período, sem expor segredo ou conteúdo desnecessário.

### Exceções

- Último administrador não pode remover/rebaixar a si mesmo sem transferir responsabilidade.
- Administrador não concede papel acima do próprio nível.
- Identificador de outro tenant resulta em negação genérica e evento de segurança correlacionável.

### Aceite

- Matriz de papéis é testada na UI e diretamente contra Supabase/RLS.
- Convite duplicado não cria memberships duplicados.
- Log crítico não pode ser editado pelo cliente.

## Matriz de permissão de produto

Legenda: **A** administrar, **E** editar/operar, **V** visualizar, **—** negar. RLS e funções transacionais devem implementar a mesma intenção.

| Recurso                            | Admin |    Gestor    |  Operação  |    Visualizador     |
| ---------------------------------- | :---: | :----------: | :--------: | :-----------------: |
| Organização/filial/configuração    |   A   | V/E limitada |     V      |          V          |
| Pessoas e papéis                   |   A   |      —       |     —      |          —          |
| Ingredientes/unidades/fornecedores |   A   |      E       |     E      |          V          |
| Compras/recebimento                |   A   |      E       |     E      |          V          |
| Receitas/versões                   |   A   |      E       | E limitada |          V          |
| Custos/canais/preços               |   A   |      E       | V limitada | V conforme política |
| Estoque/produção                   |   A   |      E       |     E      |          V          |
| Relatórios/cenários/exportação     |   A   |      E       | V limitada |          V          |
| Auditoria                          |   A   |      V       |     —      |          —          |

## Checklist de revisão UX por jornada

- [ ] Título, contexto da organização e ação primária inequívocos.
- [ ] Loading, vazio, erro, sucesso e aviso implementados.
- [ ] Validação explica resolução e mantém dados inseridos.
- [ ] Navegação e formulário completos por teclado; foco visível e ordem lógica.
- [ ] Nome, estado e valor acessíveis; mudanças importantes anunciadas.
- [ ] Contraste AA e informação não dependente de cor.
- [ ] 320, 375, 768, 1024 e 1440 px verificados.
- [ ] Ação destrutiva/compensatória identifica alvo e consequência.
- [ ] Autorização negativa testada por acesso direto, não apenas controle oculto.
- [ ] Eventos/resultados usados em relatório são rastreáveis ao fato de origem.
