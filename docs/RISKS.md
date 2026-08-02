# Registro de riscos

Escalas: probabilidade (**P**) e impacto (**I**) de 1 a 5; exposição = P×I. Riscos ≥15 bloqueiam release sem mitigação/evidência e aceite explícito do dono. Status iniciais refletem documentação, não execução.

| ID   | Risco e efeito                                                |   P |   I | Exp. | Mitigação preventiva                                                         | Evidência/contingência                                                                     | Dono                   | Status |
| ---- | ------------------------------------------------------------- | --: | --: | ---: | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ------ |
| R-01 | RLS incompleta permite vazamento entre empresas               |   3 |   5 |   15 | `organization_id`, policies, FKs cross-tenant, menor privilégio              | testes diretos com 2 tenants/papéis; revogar acesso, investigar e notificar conforme plano | Segurança/Data         | Aberto |
| R-02 | Chave privilegiada ou segredo chega ao bundle/repo/log        |   3 |   5 |   15 | server-only, env validation, gitignore, redaction                            | secret scan do commit e bundle; revogar/rotacionar imediatamente                           | Segurança/DevOps       | Aberto |
| R-03 | Erro decimal/arredondamento precifica produto incorretamente  |   3 |   5 |   15 | `numeric` + decimal TS, fórmula única, testes de borda                       | cálculo independente e reconciliação; suspender preço afetado e recomputar projeções       | Cálculos/Financeiro    | Aberto |
| R-04 | Margem confundida com markup ou percentuais somados ao custo  |   3 |   5 |   15 | divisor normativo, rótulos/ajuda, testes AC-005                              | revisão financeira independente e casos dourados                                           | Produto/Cálculos       | Aberto |
| R-05 | Retry/duplo clique duplica compra, estoque ou lote            |   3 |   5 |   15 | idempotency key, unique constraint, transação                                | testes concorrentes/retry; estorno compensatório rastreável                                | Backend/Data           | Aberto |
| R-06 | Alteração de receita/custo reescreve resultado histórico      |   3 |   5 |   15 | versões imutáveis e snapshots                                                | teste temporal; restaurar referência/snapshot e registrar correção                         | Data/Produto           | Aberto |
| R-07 | Confirmação parcial deixa estoque e produção divergentes      |   3 |   5 |   15 | RPC transacional, constraints e failure injection                            | reconciliação livro×saldo; reversão completa                                               | Backend/Data           | Aberto |
| R-08 | Backup existe, mas restauração falha ou excede tolerância     |   3 |   5 |   15 | política, PITR/backup compatível, restore trimestral                         | relatório cronometrado e checks; ativar modo leitura/reconstrução                          | DevOps/Dono negócio    | Aberto |
| R-09 | Preview aponta para produção e contamina dados                |   2 |   5 |   10 | projetos/envs separados, allowlist e validação de IDs                        | check automatizado em deploy; revogar preview e auditar mutações                           | DevOps                 | Aberto |
| R-10 | Conversão de unidade inválida (massa↔volume) distorce custo   |   3 |   4 |   12 | dimensão e fator específico por ingrediente                                  | casos de incompatibilidade; bloquear publicação afetada                                    | Domínio/Cálculos       | Aberto |
| R-11 | Ciclo indireto em sub-receita causa loop/custo infinito       |   2 |   4 |    8 | validação de grafo no serviço e banco quando possível                        | teste A→B→C→A; remover aresta em rascunho                                                  | Backend/Cálculos       | Aberto |
| R-12 | Taxa tem base errada (venda, item, pedido)                    |   3 |   4 |   12 | modelar tipo/base/ordem e explicar decomposição                              | casos por canal e contrato; corrigir regra por vigência                                    | Financeiro/Produto     | Aberto |
| R-13 | Estoque negativo oculto mascara ruptura/fraude                |   3 |   4 |   12 | política explícita, capacidade, alerta e relatório                           | reconciliação e inventário; ajuste compensatório                                           | Operações              | Aberto |
| R-14 | Relatório/dashboard não reconcilia fatos                      |   3 |   4 |   12 | fonte/definição única, filtros/timezone explícitos                           | datasets de reconciliação e drill-down; marcar dado indisponível                           | Dados/QA               | Aberto |
| R-15 | Cache mantém dados do tenant anterior após troca              |   2 |   5 |   10 | tenant na chave, invalidação na troca, sem cache público                     | E2E A→B e inspeção de rede; limpar sessão/cache                                            | Frontend/Segurança     | Aberto |
| R-16 | Dependência vulnerável compromete auth/dados                  |   3 |   4 |   12 | lockfile, atualizações, audit/SCA e CSP                                      | bloquear crítica explorável; patch/rollback                                                | DevOps/Segurança       | Aberto |
| R-17 | Callback/rota direta falha somente na Vercel Production       |   3 |   4 |   12 | URLs por env e smoke de refresh/callback                                     | logs Vercel/Auth; rollback do deploy/config                                                | DevOps                 | Aberto |
| R-18 | UX móvel/inacessível impede operação na cozinha               |   3 |   3 |    9 | 320 px, touch 44 px, teclado, foco e AA                                      | matriz de dispositivos + auditoria; fluxo alternativo temporário                           | UX/QA                  | Aberto |
| R-19 | Exportação expõe dados além do filtro/papel                   |   2 |   5 |   10 | query server-side sob RLS, limite e assinatura privada                       | teste papel/tenant; invalidar link e auditar download                                      | Backend/Segurança      | Aberto |
| R-20 | Anexo malicioso, público ou sem retenção                      |   2 |   5 |   10 | bucket privado, MIME/tamanho, nome gerado, URL curta, scanning se disponível | remover/quarentenar e revogar URL                                                          | Segurança/DevOps       | Aberto |
| R-21 | Concorrência perde edição ou usa custo obsoleto               |   3 |   4 |   12 | optimistic locking, versão/snapshot e aviso                                  | testes paralelos; exigir revisão/republicação                                              | Backend/UX             | Aberto |
| R-22 | Migration destrutiva causa indisponibilidade/perda            |   2 |   5 |   10 | expand/migrate/contract, backup, ensaio Preview                              | rollback compatível/restore conforme runbook                                               | Data/DevOps            | Aberto |
| R-23 | Plano/região Supabase não atende PITR, retenção ou residência |   3 |   4 |   12 | confirmar contrato antes de produção                                         | upgrade/migração de região e revisão de RPO                                                | DevOps/Compliance      | Aberto |
| R-24 | Logs/analytics coletam PII ou dados financeiros em excesso    |   3 |   4 |   12 | minimização, redaction, allowlist de campos                                  | apagar/restringir dataset; revisar fornecedor e incidente                                  | Compliance/Segurança   | Aberto |
| R-25 | Solicitação LGPD não é atendida no prazo/escopo correto       |   3 |   4 |   12 | canal, identidade, inventário, retenção e procedimento                       | registro de solicitação; bloquear/anomizar/exportar conforme base legal                    | Encarregado/Produto    | Aberto |
| R-26 | Conta comprometida realiza alteração financeira               |   2 |   5 |   10 | sessão segura, confirmação em ação crítica, audit trail, MFA se disponível   | revogar sessões/membership, investigar e reverter fatos                                    | Segurança/Admin tenant | Aberto |
| R-27 | Ausência de monitoramento prolonga erro silencioso            |   3 |   4 |   12 | logs correlacionados, SLOs e alertas com dono                                | checagem manual e post-mortem; rollback                                                    | DevOps                 | Aberto |
| R-28 | Custo de consultas cresce com histórico                       |   3 |   3 |    9 | paginação, índices, agregados medidos, explain                               | degradar para export/job; otimizar consulta/índice                                         | Data/Frontend          | Aberto |
| R-29 | Dados demo/fictícios confundem produção                       |   2 |   3 |    6 | workspace demo opt-in e rotulado, sem seed em tenant real                    | limpar demo com confirmação e auditoria                                                    | Produto                | Aberto |
| R-30 | Escopo amplo gera módulos aparentes, mas desconectados        |   4 |   4 |   16 | priorizar fluxos P0, gates e rastreabilidade por evidência                   | recusar release/ocultar módulo incompleto, publicar limitação                              | Programa/Release       | Aberto |

## Riscos de compliance e privacidade

### Papéis e bases

- A organização cliente é presumida controladora dos dados de membros/fornecedores; a operação da plataforma é presumida operadora. Validar juridicamente.
- Minimizar dados pessoais: e-mail/nome para acesso; contato de fornecedor apenas quando necessário. Não armazenar dados sensíveis sem requisito aprovado.
- Bases legais, avisos, subprocessadores, transferência internacional e retenção devem ser documentados pelo responsável jurídico antes do GA.

### Direitos do titular

O procedimento deve verificar identidade e tenant, localizar dados, classificar retenção obrigatória, exportar/corrigir, apagar ou anonimizar o que for permitido, registrar decisão e prazo. Exclusão de usuário não deve destruir fatos financeiros; substituir referência exibida por identificador anonimizado quando juridicamente adequado.

### Resposta a incidente

1. Conter acesso e preservar evidência sem copiar segredos para tickets.
2. Identificar tenants, categorias, período e extensão.
3. Rotacionar credenciais/revogar sessões e corrigir vetor.
4. Avaliar comunicação à ANPD/titulares com jurídico e responsável, nos prazos aplicáveis.
5. Restaurar/reconciliar, monitorar recorrência e publicar post-mortem interno.

## Processo de revisão

- Revisar riscos em cada gate e após incidente/mudança de arquitetura.
- Dono registra evidência, risco residual e data; “código criado” não equivale a mitigação verificada.
- Risco crítico/alto residual exige aceite nominal do dono de negócio e plano com prazo.
- Vulnerabilidade ou vazamento ativo não pode ser aceito como risco residual para release.
