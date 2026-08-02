# Architecture Decision Log

Este arquivo registra decisões e suposições tomadas para avançar sem perguntas desnecessárias. Estados: **Aceita**, **Proposta** (exige validação antes de produção), **Substituída**.

## ADR-001 — Next.js App Router como aplicação full-stack

**Status:** Aceita — 2026-08-02  
**Contexto:** É necessário frontend responsivo, fronteiras server-side, rotas de autenticação e implantação Vercel.  
**Decisão:** Next.js App Router + React + TypeScript estrito; Server Components por padrão e Client Components nas bordas interativas.  
**Consequências:** Excelente ajuste à Vercel e possibilidade de manter segredos no servidor. Exige disciplina para não duplicar consultas/regras entre Server Actions, handlers e cliente.

## ADR-002 — Supabase como backend gerenciado

**Status:** Aceita — 2026-08-02  
**Decisão:** PostgreSQL, Auth, Storage privado, RLS e migrations do Supabase. Realtime somente com caso operacional comprovado.  
**Consequências:** Reduz infraestrutura própria e coloca autorização perto dos dados. Torna migrations/policies e testes de RLS parte obrigatória da entrega; limites/plano/região precisam ser confirmados.

## ADR-003 — Isolamento compartilhado por `organization_id` + RLS

**Status:** Aceita — 2026-08-02  
**Decisão:** Todas as linhas de negócio carregam organização; policies derivam acesso de `auth.uid()` + membership/capacidade. FKs/constraints impedem referências cross-tenant.  
**Alternativas rejeitadas:** filtro somente no frontend/ORM; banco separado por cliente na primeira versão.  
**Consequências:** Operação mais simples que banco por tenant e defesa em profundidade. Toda query/tabela nova exige policy, índice e teste negativo cross-tenant.

## ADR-004 — RBAC com quatro papéis iniciais e capacidades

**Status:** Aceita — 2026-08-02  
**Decisão:** Admin, Gestor, Operação e Visualizador são presets; a autorização interna usa capacidades, permitindo evolução.  
**Consequências:** UX simples sem fixar regras a nomes de papel. Primeiro release não oferece editor arbitrário de papel sem políticas adicionais.

## ADR-005 — Precisão decimal ponta a ponta

**Status:** Aceita — 2026-08-02  
**Decisão:** PostgreSQL `numeric`; TypeScript usa uma única abstração decimal/strings nas fronteiras. Proibir `number` como fonte de verdade para dinheiro, quantidade derivada e percentuais.  
**Consequências:** Resultados financeiros reproduzíveis e testes exatos; serialização e schemas precisam preservar strings decimais. Biblioteca selecionada deve ser client/server compatível.

## ADR-006 — Arredondar na fronteira, inicialmente half-up

**Status:** Proposta — 2026-08-02  
**Decisão:** Manter precisão intermediária (dinheiro 6, quantidade/conversão 9, percentuais ≥6 casas) e arredondar dinheiro exibido/liquidado para 2 casas com half-up.  
**Consequências:** Evita acumulação por arredondamento precoce. Política fiscal/comercial brasileira pode exigir exceção por caso; especialista deve aprovar antes do GA.

## ADR-007 — Versões imutáveis e snapshots de fatos

**Status:** Aceita — 2026-08-02  
**Decisão:** Receita publicada é imutável; compra, preço e lote guardam referências e snapshots suficientes. Correções geram versão/reversão.  
**Consequências:** Histórico reproduzível, com mais armazenamento e necessidade de distinguir projeção atual de resultado histórico.

## ADR-008 — Livro de estoque imutável, saldo derivado/materializado

**Status:** Aceita — 2026-08-02  
**Decisão:** `stock_movements` é o livro; `inventory_balances` pode ser projeção transacionalmente atualizada e reconciliável. Ajustes são movimentos compensatórios.  
**Consequências:** Auditoria confiável. Toda atualização da projeção deve ocorrer na mesma transação e possuir rotina de reconciliação.

## ADR-009 — RPC/função transacional para confirmações compostas

**Status:** Aceita — 2026-08-02  
**Decisão:** Receber/cancelar compra e confirmar/estornar produção ocorrem em função PostgreSQL transacional, autorizada e idempotente.  
**Consequências:** Atomicidade real e menos race conditions. Contratos precisam de testes de integração; funções não devem burlar RLS sem validação explícita.

## ADR-010 — Fórmulas puras compartilhadas, sem cálculo em componentes

**Status:** Aceita — 2026-08-02  
**Decisão:** Cálculos residem em `src/lib/calculations`, puros, explicáveis e testados. A UI apenas coleta/exibe; o backend confirma usando a mesma especificação e constraints.  
**Consequências:** Reduz divergência. Quando uma fórmula também existir em SQL por atomicidade/performance, testes contratuais de paridade tornam-se obrigatórios.

## ADR-011 — Custo por método selecionável, sem reescrever história

**Status:** Aceita — 2026-08-02  
**Decisão:** Ingrediente escolhe último custo, média ponderada ou referência manual; novo custo afeta projeções e novas versões/fatos, não históricos confirmados.  
**Consequências:** Atende operações diferentes e torna a origem do custo parte da explicação/snapshot.

## ADR-012 — Conversões dimensionais explícitas

**Status:** Aceita — 2026-08-02  
**Decisão:** Conversões globais somente dentro da mesma dimensão; massa↔volume e equivalências específicas exigem fator associado ao ingrediente.  
**Consequências:** Evita conversões fisicamente falsas. Cadastro pode exigir uma etapa adicional e mensagem instrutiva.

## ADR-013 — Uma moeda-base por organização na primeira versão

**Status:** Aceita — 2026-08-02  
**Decisão:** A organização opera com uma moeda-base, inicialmente BRL; persistir código ISO junto a fatos relevantes para evolução. Sem conversão cambial automática.  
**Consequências:** Reduz ambiguidade contábil. Compra em moeda estrangeira exige valor convertido fornecido pelo usuário no primeiro release.

## ADR-014 — Custos fixos e indiretos por regras versionadas de alocação

**Status:** Proposta — 2026-08-02  
**Decisão:** Regras de rateio têm base (unidades, horas, receita, peso ou manual), período e versão. O resultado guarda regra e parcela aplicada.  
**Consequências:** Explicável e reproduzível, mas seleção de bases iniciais precisa validação de domínio e UX cuidadosa.

## ADR-015 — Estoque negativo configurável e sempre visível

**Status:** Proposta — 2026-08-02  
**Decisão:** Organização escolhe bloquear ou permitir com alerta/permissão; nunca corrigir/ocultar automaticamente.  
**Consequências:** Acomoda apontamento atrasado sem perder integridade. Política e relatório de exceções devem ser aprovados antes de produção.

## ADR-016 — Ambientes isolados

**Status:** Aceita — 2026-08-02  
**Decisão:** Development, Preview e Production usam configurações Supabase separadas; Preview nunca aponta para banco real.  
**Consequências:** Reduz vazamento e testes destrutivos, aumenta custo/configuração operacional.

## ADR-017 — Backup com alvo inicial RPO 24 h / RTO 8 h

**Status:** Proposta — 2026-08-02  
**Decisão:** Adotar alvos conservadores até verificar capacidades do plano/região e executar restore cronometrado.  
**Consequências:** Não é promessa contratual até teste. Se o negócio exigir menor perda/indisponibilidade, habilitar PITR/plano compatível e revisar runbook.

## ADR-018 — LGPD por minimização e separação de responsabilidade

**Status:** Aceita — 2026-08-02  
**Decisão:** Minimizar dados pessoais; organização é controladora e operação da plataforma é operadora, salvo avaliação jurídica distinta. Atender direitos sem apagar fatos sujeitos a retenção, usando anonimização/bloqueio quando apropriado.  
**Consequências:** Requer canal, prazos, inventário de subprocessadores e política de retenção aprovados fora do código.

## ADR-019 — Observabilidade sem conteúdo financeiro completo

**Status:** Aceita — 2026-08-02  
**Decisão:** Logs estruturados usam correlação, tipo de evento, IDs internos e contexto mínimo; não registram tokens, anexos, payload integral, senha ou service key.  
**Consequências:** Reduz exposição, porém exige ferramentas de suporte/auditoria autorizadas para investigar valores.

## ADR-020 — Integrações futuras por adapters idempotentes

**Status:** Aceita — 2026-08-02  
**Decisão:** PDV/marketplace/fiscal/pagamento/contabilidade entram por adapters e mapeamento de IDs externos; webhooks são autenticados, versionados e deduplicados.  
**Consequências:** Mantém domínio independente de fornecedor. Nenhuma integração está prometida como pronta nesta versão.

## Registro de suposições abertas

| ID     | Suposição                                                                 | Validador                       | Prazo/gate                   |
| ------ | ------------------------------------------------------------------------- | ------------------------------- | ---------------------------- |
| AS-001 | Plano Supabase suporta backup/retenção necessários                        | DevOps + responsável do negócio | antes do Gate 8              |
| AS-002 | Half-up atende política comercial inicial                                 | Financeiro/contábil             | antes do Gate 6              |
| AS-003 | Quatro papéis cobrem a operação inicial                                   | Produto + clientes-piloto       | antes do Gate 7              |
| AS-004 | Estoque negativo permitido com controle é necessário em parte dos tenants | Operações                       | antes do Gate 5              |
| AS-005 | Uma moeda-base por tenant é suficiente                                    | Produto                         | antes do Gate 1/escopo final |
| AS-006 | RPO 24 h e RTO 8 h são aceitáveis inicialmente                            | Dono de risco                   | antes do Gate 8              |
| AS-007 | Retenção legal de fatos financeiros prevalece sobre exclusão física       | Jurídico/LGPD                   | antes do GA                  |
