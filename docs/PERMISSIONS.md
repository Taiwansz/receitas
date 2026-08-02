# Permissões e isolamento

## Princípios

1. Supabase Auth identifica o usuário; nenhuma credencial é copiada para tabelas públicas.
2. Toda tabela de negócio tem RLS habilitado.
3. `organization_id` é a fronteira de tenant e é validado também por FKs compostas.
4. `branch_id` aplica escopo adicional. Membership sem linhas em `membership_branches` vê todas as filiais; com linhas, vê somente as atribuídas.
5. Escrita em ledger/saldo e recebimento de compra ocorre somente por RPC transacional com nova checagem de permissão.
6. Funções `SECURITY DEFINER` usam `search_path=''`, nomes totalmente qualificados e não confiam em identificadores de tenant fornecidos sem validação.

## Papéis criados no onboarding

| Papel         | Escopo inicial                                                                   |
| ------------- | -------------------------------------------------------------------------------- |
| Owner         | Todas as permissões                                                              |
| Administrador | Todas, exceto leitura de auditoria                                               |
| Gestor        | Operação de todos os módulos, sem `settings.write`, `users.write` e `audit.read` |
| Leitor        | Permissões `*.read`, exceto auditoria                                            |

Os papéis são por organização e podem ser compostos N:N. `users.write` é uma permissão privilegiada: permite alterar memberships, papéis, permissões e escopos de filial. Só deve ser concedida a administradores confiáveis.

## Matriz de permissões

| Permissão                                | Leitura/escrita protegida                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `settings.read` / `settings.write`       | Organização e filiais                                                              |
| `users.read` / `users.write`             | Memberships, papéis, grants e escopos de filial                                    |
| `ingredients.read` / `ingredients.write` | Unidades customizadas, categorias, ingredientes, fornecedores, custos e embalagens |
| `purchases.read` / `purchases.write`     | Compras e itens; recebimento exige também `inventory.write`                        |
| `recipes.read` / `recipes.write`         | Receitas, versões, insumos, sub-receitas e embalagens                              |
| `costs.read` / `costs.write`             | Centros de custo, despesas e rateios                                               |
| `pricing.read` / `pricing.write`         | Canais, fees, impostos, regras e snapshots de preço                                |
| `inventory.read` / `inventory.write`     | Locais, saldos e movimentos                                                        |
| `production.read` / `production.write`   | Lotes, consumo e perdas                                                            |
| `reports.read` / `reports.write`         | Cenários e alertas                                                                 |
| `attachments.read` / `attachments.write` | Metadados e objetos do bucket privado                                              |
| `audit.read`                             | Auditoria append-only                                                              |

`*.write` não implica automaticamente `*.read` no cadastro RBAC; papéis customizados devem receber ambos quando a tela precisar ler antes de editar.

## Regras especiais

### Organização e membership

- Não existe `INSERT` direto em `organizations` para o cliente. Use `create_workspace` para que organização, filial, papéis e Owner sejam criados atomicamente.
- Um usuário só consulta organizações em que tem membership `active`.
- Perfis são editáveis apenas pelo próprio usuário; membros da mesma organização podem visualizar dados básicos de perfil.
- Organizações suspensas/encerradas ou com `deleted_at` deixam de autorizar acesso.

### Filiais e filhos relacionais

Tabelas com `branch_id` usam `app.has_branch_permission`. Tabelas-filhas consultam o pai por helpers com privilégios controlados, por exemplo:

- item → compra → filial;
- versão/item → receita → filial;
- saldo/movimento → local de estoque → filial;
- consumo/perda → lote de produção → filial;
- fee/preço → canal e receita → filial.

Isso evita que conhecer um UUID de outra filial contorne o escopo.

### Histórico financeiro

`ingredient_price_history`, `product_prices`, `stock_movements` e `audit_logs` não aceitam update/delete. Correções devem ser novos fatos compensatórios. Versões de receita publicadas e seus itens também são imutáveis.

### Storage

O bucket é privado. A primeira pasta do objeto deve ser o UUID da organização. As políticas extraem esse UUID sem lançar erro em caminhos malformados e exigem:

- `attachments.read` para download/listagem;
- `attachments.write` para upload, alteração e exclusão.

O `service_role` nunca deve ser enviado ao navegador. URLs assinadas devem ter duração curta e ser emitidas somente depois de validar a entidade/anexo.

## Testes mínimos de RLS

Executar em ambiente isolado com usuários A/B e tenants/filiais diferentes:

1. A lê/escreve seu tenant e recebe zero linhas do tenant B.
2. Usuário restrito à filial A1 recebe zero linhas de A2 em tabelas pai e filhas.
3. Leitor não insere, atualiza ou exclui.
4. Gestor não altera memberships/papéis nem configuração privilegiada.
5. Mudança direta de compra para `received` falha; `app.receive_purchase` funciona com as duas permissões.
6. Escrita direta em `inventory_balances` e `stock_movements` falha; RPC válida funciona.
7. Update/delete de históricos, versão publicada e auditoria falham.
8. Sub-receita circular falha.
9. Upload com pasta de outro tenant ou MIME/tamanho inválido falha.
10. Views `*_app` retornam somente linhas permitidas pelas tabelas-fonte.

Também testar tentativas com UUID válido de outro tenant, organização suspensa, membership suspenso, ausência de role, branch scope vazio (todas) e branch scope preenchido (somente atribuídas).

## Operação segura

- Revisar grants e policies a cada nova tabela; habilitar RLS antes de conceder acesso ao cliente.
- Não criar função `SECURITY DEFINER` sem `search_path` vazio, validação de `auth.uid()`/tenant e `REVOKE ... FROM public`.
- Não expor `service_role`, tokens administrativos ou strings de conexão privilegiadas em variáveis públicas.
- Auditar alterações de papel e membership; alertar para concessão de `users.write` e `audit.read`.
- Usar service role apenas em backend confiável, jobs e migrations; ela ignora RLS por desenho.
