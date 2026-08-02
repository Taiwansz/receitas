# Banco de dados

## Visão geral

O banco é PostgreSQL no Supabase. O modelo usa UUID para entidades de negócio, `numeric` para quantidades e valores financeiros, Supabase Auth para identidade, RLS para isolamento e Supabase Storage para anexos privados.

As migrations devem ser aplicadas, na ordem do nome, com `supabase db push` ou pelo pipeline de migrations do ambiente. Elas são cumulativas e não devem ser editadas depois de aplicadas em produção.

| Migration                                         | Responsabilidade                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `202608020001_core_tenancy.sql`                   | Auth profiles, organizações, filiais, memberships, papéis e permissões          |
| `202608020002_catalog_and_procurement.sql`        | Unidades, ingredientes, fornecedores, compras, histórico de custo e embalagens  |
| `202608020003_recipes_costs_and_pricing.sql`      | Receitas versionadas, despesas, alocações, canais, taxas e preços               |
| `202608020004_inventory_production_and_audit.sql` | Ledger de estoque, produção, cenários, alertas, anexos e auditoria              |
| `202608020005_rls_storage_and_audit.sql`          | RLS, políticas do Storage e gatilhos de auditoria                               |
| `202608020006_safe_global_seed.sql`               | Somente permissões e unidades globais seguras                                   |
| `202608020007_app_contracts.sql`                  | RPCs transacionais e views estáveis para o frontend                             |
| `202608020008_operational_contracts.sql`          | RPCs de fornecedores, embalagens, despesas, canais, compras, ajustes e produção |

Não há seed de organização, ingrediente, receita, compra ou qualquer outro dado fictício de negócio.

## Modelo relacional

### Identidade e tenancy

- `user_profiles`: extensão de `auth.users`, sem armazenar credenciais.
- `organizations`: tenant. `display_name`/`currency_code` são os campos canônicos; `name`/`currency` são aliases gerados para leitura.
- `branches`: filiais pertencentes a uma organização.
- `memberships`: associação única usuário–organização.
- `membership_branches`: escopo opcional por filial. Ausência de linhas significa todas as filiais do tenant.
- `roles`, `permissions`, `role_permissions`, `membership_roles`: RBAC N:N, sem papel textual duplicado em `memberships`.

### Catálogo e compras

- `measurement_units`: unidades globais (`organization_id is null`) ou customizadas pelo tenant.
- `unit_conversions`: conversões globais, por organização ou específicas de ingrediente.
- `ingredient_categories`, `ingredients`, `suppliers`, `ingredient_suppliers`.
- `purchases`, `purchase_items`: cabeçalho e itens. Frete, imposto, desconto e taxas do cabeçalho devem ser integralmente alocados aos itens antes do recebimento.
- `ingredient_price_history`: histórico financeiro append-only.
- `packaging_items`: embalagens e consumíveis.

Cada item de compra guarda `unit_to_base_factor`. O custo por unidade-base é:

`(quantidade_bruta × preço − desconto + frete + impostos + taxas) ÷ (quantidade_utilizável × fator_para_unidade_base)`

O gatilho resolve o fator por conversão global/tenant/específica do ingrediente e rejeita compras sem conversão válida.

### Receitas e custos

- `recipes`: identidade estável da ficha técnica.
- `recipe_versions`: snapshot numerado de rendimento, perdas, tempos e componentes de custo.
- `recipe_ingredients`, `recipe_sub_recipes`, `recipe_packaging`: conteúdo de uma versão.
- `cost_centers`, `expenses`, `allocation_rules`: custos fixos/variáveis, diretos/indiretos e critérios de rateio.

Somente versões `draft` aceitam alteração de itens. Ao publicar, custos unitários dos insumos/sub-receitas são congelados. Versões publicadas são imutáveis; uma edição cria uma nova versão. O gatilho recursivo em `recipe_sub_recipes` impede dependência circular.

### Preço

- `sales_channels`, `channel_fees`, `taxes`.
- `pricing_rules`: margem-alvo, faixa de quantidade, promoção e prioridade.
- `product_prices`: snapshot append-only do custo, taxas, margem e preço praticado.

Percentuais são armazenados como fração (`0.15 = 15%`). A função `app.calculate_selling_price` usa:

`preço = (custo monetário + cobranças fixas) ÷ (1 − encargos percentuais − margem alvo)`

A soma de encargos percentuais e margem deve ser menor que 1. Valores monetários são arredondados a 2 casas na saída de preço; snapshots usam 4 casas e custos unitários 6 casas.

### Estoque e produção

- `inventory_locations`, `inventory_balances`, `stock_movements`.
- `production_batches`, `production_consumption`, `production_losses`.

`stock_movements` é o ledger append-only. `inventory_balances` é projeção derivada e não aceita escrita direta do cliente. `app.apply_stock_movement` bloqueia a linha do saldo, valida estoque negativo e recalcula média ponderada atomicamente.

`app.receive_purchase` valida tenant, filial, permissões, alocação dos custos, cria histórico de preço, registra movimentos e muda o status da compra em uma única transação. Alterar uma compra diretamente para `received` é bloqueado.

### Operação e governança

- `scenarios`: premissas/resultados JSON versionáveis para cenários e break-even.
- `alerts`: alertas operacionais com ciclo de vida explícito.
- `attachments`: metadados; os bytes ficam no bucket privado `business-attachments`.
- `custiva_audit_logs`: trilha append-only com ator, instante, tabela, operação e valores anterior/novo. O prefixo evita colisão ao coexistir com aplicações legadas no mesmo projeto Supabase.

## Contratos para a aplicação

### RPCs

| Função                                             | Resultado/efeito                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `create_workspace(p_name, p_branch_name)`          | Cria organização, filial, local de estoque, papéis padrão e membership Owner; retorna `organization_id`, `branch_id` |
| `get_current_workspace()`                          | Retorna o workspace atual, filial e papéis do usuário                                                                |
| `upsert_ingredient(...)`                           | Transaciona ingrediente, novo snapshot de custo e ajuste de estoque                                                  |
| `delete_ingredient(p_id)`                          | Soft delete; nunca apaga histórico                                                                                   |
| `save_recipe(...)`                                 | Cria/edita a receita por nova versão publicada e retorna `recipe_id`                                                 |
| `save_product_price(...)`                          | Valida custo/fees/margem e acrescenta snapshot de preço                                                              |
| `save_supplier(...)` / `soft_delete_supplier(...)` | Mantém fornecedor sem apagar referências históricas                                                                  |
| `save_packaging(...)`                              | Mantém embalagem com unidade e custo validados                                                                       |
| `save_expense(...)`                                | Mantém despesa operacional da filial atual                                                                           |
| `create_sales_channel(...)`                        | Cria canal e sua taxa padrão fixa ou percentual                                                                      |
| `register_purchase(...)`                           | Rateia valores de cabeçalho, cria itens e recebe a compra atomicamente                                               |
| `register_inventory_adjustment(...)`               | Registra ajuste no ledger, sem escrita direta em saldo                                                               |
| `register_production_batch(...)`                   | Planeja ou conclui lote e consome estoque FEFO em transação única                                                    |
| `app.receive_purchase(...)`                        | Recebe a compra e lança custo/estoque atomicamente                                                                   |
| `app.apply_stock_movement(...)`                    | Único caminho cliente para mutar ledger/saldo                                                                        |

As RPCs sem parâmetro de organização resolvem o membership ativo mais recente do usuário. Aplicações com troca de múltiplos workspaces devem refletir a seleção no backend antes de usar esses contratos ou evoluir as assinaturas para receber `organization_id` explicitamente.

### Views de leitura

- `ingredients_app`: `id`, `name`, `sku`, `brand`, `base_unit`, `current_cost`, `yield_percentage` (0–100), `current_stock`, `minimum_stock`, `cost_method`, `active`.
- `recipe_summaries_app`: `id`, `name`, `category`, `portions`, `total_cost`, `unit_cost`, `current_price`, `margin_percentage`, `active`.
- `sales_channels_app`: `id`, `name`, `percentage_fees`, `fixed_fee`, `active`.
- `dashboard_metrics_app`: contagens, valor do estoque e produtos abaixo do mínimo por tenant.

Todas as views usam `security_invoker=true`; portanto preservam RLS das tabelas-fonte.

## Integridade e histórico

- FKs compostas `(organization_id, id)` impedem referências cruzadas entre tenants.
- Checks rejeitam valores negativos, perdas impossíveis, datas invertidas e percentuais fora do domínio.
- Exclusões de cadastros são lógicas (`deleted_at`); fatos financeiros e ledger são append-only.
- `created_at`, `updated_at`, `created_by`, snapshots e `custiva_audit_logs` preservam rastreabilidade.
- O banco rejeita estoque negativo, exceto em local configurado explicitamente com `allow_negative_stock=true`.
- `numeric`, nunca `float`, é usado em dinheiro, quantidade, taxa e fator.

## Anexos

O bucket `business-attachments` é privado, limita arquivos a 25 MiB e aceita PDF, JPEG, PNG, WebP, CSV e XLSX. O caminho obrigatório é:

`<organization_uuid>/<attachment_uuid>/<nome-do-arquivo>`

O registro de `attachments.object_path` deve usar exatamente o mesmo caminho. Upload/download são autorizados por membership e `attachments.read`/`attachments.write`. A aplicação deve criar o UUID do anexo antes do upload, validar o MIME real no backend quando necessário e remover objeto + metadado em fluxo compensável.

## Backup, restauração e retenção

- Habilitar backups automáticos/PITR do plano Supabase compatível com o RPO/RTO do negócio.
- Exportar schema e executar teste de restauração periodicamente em projeto isolado.
- Arquivos do Storage precisam de política de backup separada do PostgreSQL.
- Não truncar `custiva_audit_logs`, `ingredient_price_history`, `product_prices` ou `stock_movements` sem política formal de retenção e exportação.
- Antes de migration destrutiva: backup verificado, migration reversível/expand-contract e smoke test de RLS.

## Limitações conhecidas

- `attachments.entity_id` e `alerts.entity_id` são referências polimórficas e não têm FK física; as RPCs/serviços devem validar o tipo e a entidade.
- O estoque modelado é de ingredientes. Estoque de produto acabado/embalagem pode ser adicionado com um catálogo unificado de itens em evolução futura.
- `register_production_batch` consome os ingredientes diretos da versão por FEFO. A explosão recursiva de sub-receitas, estoque de produto acabado e embalagem ainda requer evolução do serviço de produção.
- `current_workspace` escolhe deterministicamente um membership quando existem vários; seleção explícita de tenant deve ser adicionada para uso multiempresa intenso.
