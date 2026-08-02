# Matriz de rastreabilidade de requisitos

**Baseline:** candidato local de 2026-08-02, após as migrations 001–009.  
**Legenda:** **C** — coberto por implementação e evidência local; **P** — implementação presente, mas falta validação em ambiente hospedado ou uma parte complementar; **N** — não incluído nesta entrega.

O status não confunde presença de código com aprovação de produção. Auth hospedado, isolamento RLS/Storage real, E2E no navegador, restore e smoke de produção permanecem **P** até existirem projetos Supabase e Vercel autenticados.

## Implementação por camada

| Camada | Implementação | Evidência |
| --- | --- | --- |
| Autenticação | `src/app/login`, `src/app/auth/callback`, `src/app/update-password`, `src/proxy.ts` | TypeScript, lint e build; callback com destino interno validado |
| Workspace/RBAC | `workspace-gate.tsx`; migrations 001, 005 e 007 | RPC de bootstrap, RLS, papéis e permissões; smoke PostgreSQL local |
| Catálogo e compras | `ingredients-page.tsx`, `operations-pages.tsx`; migrations 002, 007 e 008 | contratos UI↔RPC alinhados; compra transacional no smoke local |
| Receitas | `recipes-page.tsx`; migrations 003 e 007; `calculations/recipe.ts` | versionamento, ciclo e escala; testes unitários e smoke local |
| Estoque e produção | `operations-pages.tsx`; migrations 004 e 008 | ledger imutável, ajuste e produção FEFO transacionais; smoke local |
| Precificação | `pricing-page.tsx`; migrations 003, 007 e 009; `calculations/pricing.ts` | snapshot reproduzível; testes de divisor, canal, desconto e margem |
| Dashboard/relatórios | `dashboard-page.tsx`, `reports-page.tsx`; migrations 007 e 008 | consultas alinhadas; exportação CSV segura, XLSX e PDF; build |
| Segurança/auditoria | migrations 005 e 008 | RLS, Storage privado, RBAC, trilha de auditoria e RPCs `security definer` |
| Qualidade e operação | `src/lib/calculations/*.test.ts`, `docs/*` | 25 testes, TS estrito, lint, build, audit sem vulnerabilidades e runbooks |

## Requisitos funcionais

| Req. | Recurso | Status | Evidência ou limite restante |
| --- | --- | --- | --- |
| FR-001 | Cadastro, login, logout, recuperação e callback | P | Fluxos implementados; falta Auth/callback no domínio hospedado |
| FR-002 | Organização, filial e onboarding | C | `create_workspace`, `get_current_workspace` e smoke de bootstrap |
| FR-003 | Papéis e permissões | P | RBAC/RLS e listagem de membros; convite e edição de papel exigem backend administrativo |
| FR-004 | Unidades e conversões | C | catálogo, fatores e testes de compatibilidade/conversão |
| FR-005 | Ingredientes, rendimento e método de custo | C | feature dedicada, RPCs, custo bruto/líquido e testes |
| FR-006 | Fornecedores | C | CRUD por RPC, soft delete e contrato normalizado |
| FR-007 | Compras e recebimento | P | compra com itens, rateio e estoque transacionais; upload de anexo não está ligado à UI |
| FR-008 | Histórico e custo atual | C | recebimento gera histórico; último/médio/manual modelados |
| FR-009 | Receitas e versões | C | ficha técnica, itens, snapshot e publicação versionada |
| FR-010 | Sub-receitas e escala | P | grafo/escala protegidos; produção ainda expande apenas ingredientes diretos |
| FR-011 | Embalagens e consumíveis | P | cadastro e custo disponíveis; consumo automático em produção não incluído |
| FR-012 | Despesas e mão de obra | P | despesas diretas/indiretas cadastráveis; rateios avançados não têm UI dedicada |
| FR-013 | Canais, tributos e taxas | C | canal e taxa fixa/percentual integrados à precificação |
| FR-014 | Motor de precificação | C | Decimal.js, divisor, margem/markup, piso e snapshot exato |
| FR-015 | Atacado, promoção e desconto mínimo | P | regras no motor; editor completo de faixas não incluído |
| FR-016 | Estoque | C | ledger imutável, saldo derivado, locais e ajuste autorizado |
| FR-017 | Lotes de produção | C | RPC atômica com FEFO, consumos, perdas e saldo final |
| FR-018 | Planejado versus real | P | campos e fatos persistidos; relatório comparativo dedicado não incluído |
| FR-019 | Dashboard e alertas | C | métricas reais, custos e evolução de compras |
| FR-020 | Relatórios e ranking | P | visão consolidada e três formatos de exportação; filtros/rankings avançados pendentes |
| FR-021 | Ponto de equilíbrio | C | motor e testes automatizados |
| FR-022 | Cenários | C | inflação, custos, taxas, desconto e volume no motor testado |
| FR-023 | Importação/exportação | P | CSV/XLSX/PDF implementados; importação assistida não incluída |
| FR-024 | Auditoria | C | tabela, políticas e triggers/RPCs críticos |
| FR-025 | Configurações | P | preferências modeladas e visíveis; edição completa não incluída |
| FR-026 | Arquivamento | C | soft delete nos cadastros; ledgers históricos são imutáveis |
| FR-027 | Busca, filtros e paginação | P | busca nos módulos dedicados; paginação server-side para alto volume pendente |
| FR-028 | Backup e recuperação | P | runbook definido; exercício em projeto real pendente |

## Regras de negócio

| Regra | Status | Evidência |
| --- | --- | --- |
| Decimal seguro, aquisição, rendimento e conversão | C | `decimal.ts`, `ingredient.ts`, `conversions.ts` e testes |
| Receita, rendimento, versão imutável e grafo acíclico | C | `recipe.ts`, triggers SQL, testes unitários e smoke |
| Divisor, margem×markup, taxas e desconto mínimo | C | `pricing.ts`, RPCs SQL e testes |
| Média de custo e recebimento transacional | C | `register_purchase`/funções de estoque e smoke local |
| Livro imutável e produção atômica | C | migrations 004/005/008 e smoke transacional com FEFO |
| Isolamento por tenant/filial | P | políticas e FKs presentes; suite contra Supabase hospedado pendente |
| Preservação histórica | C | snapshots, versões, soft delete e ledgers imutáveis |
| Reconciliação de relatório | P | views e exports compartilham fontes; dataset hospedado de reconciliação pendente |

## Requisitos não funcionais e gates

| NFR/gate | Status | Evidência ou ação restante |
| --- | --- | --- |
| TypeScript estrito, validação e build | C | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` |
| Testes críticos de cálculo | C | 25 testes em 6 arquivos |
| Migrations reproduzíveis | C | parser PostgreSQL e aplicação PGlite com mocks Auth/Storage |
| Segredos e dependências | C | scan local sem segredo e `npm audit --omit=dev` sem vulnerabilidades |
| RLS/Storage hospedados | P | código presente; validação no projeto Supabase real pendente |
| Mobile e acessibilidade | P | layout responsivo, alvos de toque e semântica; auditoria E2E 320 px pendente |
| Desempenho | P | agregados em views; teste com volume e paginação server-side pendentes |
| Observabilidade | P | erros de consulta expostos ao usuário; integração de telemetria não incluída |
| Backup/RPO/RTO | P | runbook presente; restore real pendente |
| Deploy/HTTPS/callback | P | build aprovado; URL, logs e smoke de produção pendentes |

## Casos de aceitação

| Caso | Status | Evidência |
| --- | --- | --- |
| AC-002 custo com rendimento | C | testes do motor e smoke de ingrediente |
| AC-003 histórico de versão | C | trigger/contrato e smoke de receita |
| AC-004 ciclo A→B→C→A | C | `recipe.test.ts` e proteção SQL |
| AC-005 divisor | C | `pricing.test.ts` e snapshot SQL |
| AC-006 preço por canal | C | testes de canal e UI integrada |
| AC-007 compra consistente | C | uma transação registra compra, custos e movimentos; reprocessamento de compra recebida é recusado |
| AC-008 produção atômica | C | smoke com consumo FEFO e saldo final |
| AC-001/009/010/011/012/013/014 | P | dependem de E2E, matriz RLS real, reconciliação hospedada, produção ou restore |

## Limites assumidos

Os limites funcionais deliberados estão em `KNOWN_LIMITATIONS.md`. Ao conectar os projetos cloud, a sequência de fechamento é: aplicar migrations do zero, executar matriz RLS/Storage com dois tenants, configurar callbacks, executar jornadas E2E mobile/desktop, reconciliar exports, ensaiar restore e registrar URL/commit no relatório de release.
