# PRD — Plataforma de custos, precificação e produção de alimentos

**Status:** baseline de produto  
**Fonte normativa:** `PROMPT_MESTRE_MULTIAGENTES.md`  
**Idioma e mercado inicial:** português do Brasil, BRL, datas `dd/MM/yyyy`  
**Atualização:** 2026-08-02

## 1. Visão do produto

A plataforma transforma compras, rendimentos, fichas técnicas e custos operacionais em decisões de preço e produção auditáveis. É destinada a pequenos e médios negócios de alimentação que hoje dependem de planilhas desconectadas e não conseguem explicar com segurança o custo, a margem ou o impacto de produzir e vender cada item.

O produto será considerado útil quando uma pessoa gestora conseguir cadastrar a operação real, calcular uma receita sem confundir margem com markup, simular preços por canal e registrar uma produção que movimente estoque, mantendo histórico e isolamento entre empresas.

## 2. Objetivos e não objetivos

### Objetivos da primeira versão de produção

- Ser a fonte de verdade para ingredientes, compras, receitas, custos, preços, estoque e produção.
- Calcular custos e preços com precisão decimal e regras explicitáveis.
- Preservar versões e os insumos financeiros usados em resultados históricos.
- Suportar organizações, filiais e papéis com isolamento no PostgreSQL por RLS.
- Oferecer jornadas completas em desktop e celular, sem persistência simulada.
- Gerar visão de lucratividade, ponto de equilíbrio e cenários por canal.
- Ser implantável de modo reproduzível em Supabase e Vercel.

### Não objetivos desta versão

- Emissão fiscal, folha de pagamento, escrituração contábil ou conciliação bancária.
- Integração pronta com PDV, marketplace ou ERP; serão definidos pontos de extensão.
- Otimização automática de compras, previsão por aprendizado de máquina ou roteirização.
- Operação offline e sincronização posterior.
- Conversão cambial automática ou suporte fiscal fora do Brasil.

## 3. Personas e responsabilidades

| Persona/papel              | Necessidade principal                                              | Limites esperados                                                                    |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Proprietário/Administrador | Configurar empresa, pessoas, custos e metas; ver toda a operação   | Pode administrar membros e configurações; não contorna RLS                           |
| Gestor                     | Cadastrar custos, receitas, preços, produção e analisar relatórios | Não altera propriedade da organização nem concede papel superior                     |
| Operação                   | Registrar compras, estoque e lotes de produção                     | Não acessa gestão de usuários nem configurações financeiras sensíveis                |
| Visualizador               | Consultar cadastros e relatórios autorizados                       | Sem mutações operacionais                                                            |
| Auditor/suporte autorizado | Investigar trilha e reproduzir números                             | Acesso explícito, temporário quando aplicável; nenhuma chave privilegiada no cliente |

Uma mesma pessoa pode pertencer a mais de uma organização. O contexto da organização/filial ativa deve ser explícito e todas as consultas e mutações devem derivar dele, com autorização novamente validada no banco.

## 4. Escopo funcional e prioridade

Prioridade: **P0** bloqueia operação segura; **P1** completa a proposta central; **P2** amplia produtividade e análise.

| ID     | Módulo                                  | Prioridade | Resultado exigido                                                               |
| ------ | --------------------------------------- | ---------: | ------------------------------------------------------------------------------- |
| FR-001 | Autenticação e recuperação              |         P0 | Cadastro, entrada, saída, sessão e recuperação funcionam em produção            |
| FR-002 | Organizações, filiais e onboarding      |         P0 | Criar e alternar contexto; não inserir dados fictícios sem opção explícita      |
| FR-003 | Membros, papéis e permissões            |         P0 | Convites/associação e autorização por papel, reforçadas por RLS                 |
| FR-004 | Unidades e conversões                   |         P0 | Converter grandezas compatíveis e conversões específicas de ingrediente         |
| FR-005 | Ingredientes, categorias e rendimento   |         P0 | Cadastrar compra/receita, bruto/líquido/usável, perda e método de custo         |
| FR-006 | Fornecedores e vínculo com ingredientes |         P1 | Manter fornecedores e catálogos/preços por ingrediente                          |
| FR-007 | Compras, itens e anexos                 |         P0 | Registrar totais, descontos, frete, tributos, taxas e recebimento transacional  |
| FR-008 | Histórico e método de custo             |         P0 | Disponibilizar último, médio ponderado ou referência manual sem apagar história |
| FR-009 | Receitas e versões                      |         P0 | Criar ficha técnica versionada com rendimento, porções, perdas e instruções     |
| FR-010 | Sub-receitas e escala                   |         P0 | Compor receitas, impedir ciclos e recalcular quantidades/custos                 |
| FR-011 | Embalagens e consumíveis                |         P1 | Incluir consumo e custo geral ou específico por canal                           |
| FR-012 | Mão de obra e despesas                  |         P1 | Modelar custos diretos/indiretos, fixos/variáveis, centros e alocação           |
| FR-013 | Canais, tributos e taxas                |         P0 | Configurar percentuais sobre venda e valores fixos por canal                    |
| FR-014 | Motor de precificação                   |         P0 | Calcular preço mínimo/alvo, lucro, markup e margens por canal                   |
| FR-015 | Faixas, atacado e promoção              |         P1 | Simular preços por quantidade e limitar desconto que destrói margem mínima      |
| FR-016 | Locais, saldos e movimentos             |         P0 | Livro de estoque auditável, saldo derivado e ajustes autorizados                |
| FR-017 | Lotes de produção                       |         P0 | Planejar/registrar produção, consumir estoque e registrar perdas reais          |
| FR-018 | Planejado versus real                   |         P1 | Comparar consumo, rendimento, perda e custo teórico/real                        |
| FR-019 | Dashboard e alertas                     |         P1 | Indicadores provenientes de transações, com período e contexto claros           |
| FR-020 | Relatórios e ranking                    |         P1 | Custos, margens, canais, evolução de preços, estoque e produção reconciliáveis  |
| FR-021 | Ponto de equilíbrio                     |         P1 | Receita/unidades e metas diária, semanal e mensal, com premissas explícitas     |
| FR-022 | Cenários                                |         P1 | Variar inflação, custos, taxas, desconto, volume e canal sem alterar dados-base |
| FR-023 | Importação/exportação                   |         P2 | Importar com pré-validação; exportar CSV/Excel/PDF com filtros e unidade        |
| FR-024 | Auditoria                               |         P0 | Registrar ator, organização, ação, alvo e instante de mutações críticas         |
| FR-025 | Configurações                           |         P1 | Preferências regionais, precisão permitida, metas e defaults por organização    |
| FR-026 | Exclusão e arquivamento                 |         P0 | Confirmar ações destrutivas e preservar referências históricas via arquivamento |
| FR-027 | Busca, filtros e paginação              |         P1 | Localizar registros em volumes operacionais sem carregar conjuntos ilimitados   |
| FR-028 | Backup e recuperação                    |         P0 | Runbook, responsabilidades, validação de restauração e critérios de RPO/RTO     |

## 5. Regras de negócio críticas

| ID     | Regra                                                                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-001 | Valores monetários e quantidades são armazenados/calculados em tipos decimais; `number` binário não é fonte de verdade financeira.                                                  |
| BR-002 | Um ingrediente comprado por `C_compra`, com custos adicionais alocáveis `A`, desconto `D` e quantidade usável `Q_usável`, custa `(C_compra + A - D) / Q_usável` por unidade usável. |
| BR-003 | `Q_usável = Q_bruta × rendimento`; rendimento deve estar em `(0, 1]`. Perda é apresentada separadamente e não pode produzir dupla redução.                                          |
| BR-004 | Conversão automática só ocorre entre dimensões compatíveis; conversão massa↔volume exige fator específico (por exemplo, densidade) associado ao ingrediente e unidade.              |
| BR-005 | Custo de receita soma ingredientes, sub-receitas, embalagem, mão de obra, custos variáveis diretos e rateio indireto conforme regra ativa.                                          |
| BR-006 | Custo unitário usa o rendimento líquido/porções válidas da versão da receita, nunca apenas a quantidade nominal produzida.                                                          |
| BR-007 | O preço-alvo quando encargos percentuais incidem sobre a venda é `custos_monetários / (1 - encargos_percentuais - margem_alvo)`. A soma no denominador deve ser `< 1`.              |
| BR-008 | Margem é `(preço - custos aplicáveis) / preço`; markup multiplicador é `preço / custo`. A interface não usa um como sinônimo do outro.                                              |
| BR-009 | Taxas fixas por transação/unidade integram o numerador; percentuais sobre o preço integram o divisor. A base de cada taxa deve ser identificada.                                    |
| BR-010 | Desconto/promocional deve recalcular margens e alertar/bloquear conforme a margem mínima configurada e a permissão do usuário.                                                      |
| BR-011 | O custo médio ponderado só é atualizado por entrada confirmada e válida; cancelamento gera estorno rastreável, não edição silenciosa.                                               |
| BR-012 | Uma versão publicada de receita é imutável. Alteração que afete cálculo cria nova versão e preserva resultados históricos.                                                          |
| BR-013 | O grafo de sub-receitas deve ser acíclico, inclusive em dependências indiretas.                                                                                                     |
| BR-014 | Movimentos de estoque são imutáveis após confirmação; correções são movimentos compensatórios. Estoque negativo segue política explícita da organização, com alerta.                |
| BR-015 | Registrar produção, consumo e perda é uma transação: falha parcial deve reverter toda a operação.                                                                                   |
| BR-016 | Dados de uma organização nunca podem ser lidos, agregados ou modificados por membro apenas de outra organização, inclusive via URL/API direta.                                      |
| BR-017 | Filial/local pertence a uma organização e não pode referenciar cadastros de outra; FKs e RLS devem preservar essa invariância.                                                      |
| BR-018 | Exclusão física não é permitida para registros já usados em fatos financeiros; arquivamento mantém a reprodução histórica.                                                          |
| BR-019 | Dashboards e relatórios devem derivar das mesmas fontes transacionais dos detalhes e expor período, filtros, moeda e atualização.                                                   |
| BR-020 | Arredondamento monetário exibido ocorre na fronteira de apresentação/liquidação; cálculos intermediários mantêm precisão maior e regra uniforme.                                    |

## 6. Requisitos não funcionais

| ID      | Requisito mensurável                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | TypeScript em modo estrito, sem objetos de negócio `any`; validação na entrada do cliente e na fronteira confiável.                                      |
| NFR-002 | 100% das tabelas de tenant com RLS habilitada e políticas positivas mínimas; testes tentam acesso cruzado.                                               |
| NFR-003 | Nenhuma chave de serviço, token privado ou segredo no bundle, logs, histórico ou variáveis públicas; varredura antes de release.                         |
| NFR-004 | Operações financeiras multi-etapa usam transação e idempotência quando repetição de requisição puder duplicar fatos.                                     |
| NFR-005 | Testes unitários cobrem fórmulas e bordas críticas; integração cobre RLS, constraints e transações; E2E cobre jornadas P0.                               |
| NFR-006 | Telas críticas funcionam a partir de 320 px, sem rolagem horizontal da página; alvos de toque com pelo menos 44×44 px.                                   |
| NFR-007 | WCAG 2.2 nível AA como meta: teclado, foco visível, nomes acessíveis, contraste, mensagens associadas e anúncio de estados.                              |
| NFR-008 | Páginas de lista paginam e filtram no servidor; objetivo inicial de p95 < 2 s para consultas usuais com até 10 mil fatos por tenant, medido antes do GA. |
| NFR-009 | Erros têm identificador correlacionável e contexto não sensível; eventos críticos e falhas de autenticação/DB são monitoráveis.                          |
| NFR-010 | Migrations são versionadas, reproduzíveis e revisadas; mudanças destrutivas exigem estratégia expand/migrate/contract.                                   |
| NFR-011 | Produção usa HTTPS, headers seguros e dependências sem vulnerabilidade crítica conhecida não aceita.                                                     |
| NFR-012 | RPO alvo de 24 h e RTO alvo de 8 h até validação de capacidade contratada; restauração ensaiada pelo menos trimestralmente.                              |
| NFR-013 | Ambiente Development/Preview/Production separado; Preview não usa dados reais de Production.                                                             |
| NFR-014 | Rotas diretas e callbacks de autenticação funcionam após refresh em Vercel.                                                                              |
| NFR-015 | Datas são persistidas em UTC quando representam instante; timezone de negócio é explícito para competência/dia operacional.                              |

## 7. Estados obrigatórios de UX

Toda consulta ou mutação deve ter estado de carregamento, vazio, sucesso, aviso e erro. Formulários devem preservar entradas após falha recuperável, destacar o campo, explicar a correção e impedir envio duplicado. Alterações não salvas devem ser protegidas. Ações irreversíveis/compensatórias pedem confirmação com alvo e consequência. Tabelas largas no celular devem priorizar colunas, cartões ou detalhe progressivo, não apenas reduzir fonte.

### Arquitetura de informação

1. **Visão geral:** dashboard, alertas e busca.
2. **Cadastros:** ingredientes, unidades, fornecedores, embalagens e canais.
3. **Compras e estoque:** compras, recebimentos, locais, saldos e movimentos.
4. **Produtos:** receitas, versões, sub-receitas e precificação.
5. **Produção:** planejamento, lotes, consumo e perdas.
6. **Análises:** relatórios, cenários e ponto de equilíbrio.
7. **Administração:** custos, centros, pessoas, permissões, filiais, auditoria e configurações.

## 8. Critérios de aceitação de alto nível

| ID     | Critério verificável                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-001 | Após recarregar e entrar novamente, ingrediente, compra, receita, preço e produção confirmados continuam disponíveis no tenant correto.                                                                 |
| AC-002 | Um ingrediente comprado por R$ 110,00 + R$ 10,00 de frete, com 10% de desconto sobre a compra, 10 kg brutos e 80% de rendimento resulta em R$ 13,625/kg usável, conforme regra documentada de desconto. |
| AC-003 | Alterar uma receita publicada cria outra versão; uma produção antiga continua apontando para a versão e custos usados à época.                                                                          |
| AC-004 | Receita A→B→C impede tentativa de adicionar C→A e retorna mensagem acionável.                                                                                                                           |
| AC-005 | Para custo monetário R$ 60, taxas sobre venda de 20% e margem-alvo de 20%, preço sugerido é R$ 100,00; configuração total ≥100% é rejeitada.                                                            |
| AC-006 | O mesmo produto em balcão e marketplace usa embalagem/taxas do canal correto e apresenta lucro/margens reconciliáveis.                                                                                  |
| AC-007 | Confirmar compra gera entrada de estoque e custo/histórico uma única vez; repetir requisição idempotente não duplica movimento.                                                                         |
| AC-008 | Confirmar lote consome os insumos e registra o produto/perda dentro de uma transação; falha não deixa movimentos parciais.                                                                              |
| AC-009 | Usuário da organização A recebe resultado vazio/negado ao tentar acessar identificador da organização B pela camada de dados, não só pela UI.                                                           |
| AC-010 | Operador não administra membros, visualizador não grava e gestor não concede papel superior; testes cobrem UI e banco.                                                                                  |
| AC-011 | Relatório filtrado de compras/produção reconcilia seus totais com a soma dos fatos visíveis e informa período/timezone.                                                                                 |
| AC-012 | Jornada móvel P0 é concluída a 320 px por teclado e toque, sem perda de ação, conteúdo ou foco.                                                                                                         |
| AC-013 | Build, lint, typecheck, testes e varredura de segredos passam no commit candidato; Preview e Production passam smoke test.                                                                              |
| AC-014 | Restauração em ambiente isolado é documentada, testada e registra duração, ponto restaurado e validações de integridade.                                                                                |

Critérios detalhados por jornada estão em `USER_JOURNEYS.md`; a ligação entre IDs, código e testes está em `REQUIREMENTS_TRACEABILITY.md`.

## 9. Métricas e telemetria

Sem misturar telemetria de produto com dados financeiros sensíveis, medir:

- ativação: organização que cadastra ingrediente, publica receita e obtém preço por canal;
- tempo até primeiro preço calculado e taxa de abandono por etapa;
- frequência de produção registrada e de relatórios consultados;
- taxa de falha de mutações, erro por endpoint/operação e latência p50/p95;
- discrepância planejado×real e proporção de produtos abaixo da margem mínima;
- sucesso de autenticação/callbacks, build/deploy e jobs de backup.

Metas de negócio exigem baseline real após lançamento; não são inventadas neste documento.

## 10. Dependências, premissas e pendências

### Dependências

- Projeto Supabase com Auth, PostgreSQL, Storage, backup e observabilidade compatíveis.
- Projeto Vercel e domínios/callbacks configurados por ambiente.
- E-mail de autenticação e política de retenção/privacidade aprovados pelo responsável do negócio.
- Dados reais de custos, unidades e políticas de estoque fornecidos por cada organização usuária.

### Premissas registradas

- O navegador usa somente chave pública/anon do Supabase; operações privilegiadas ficam em servidor confiável.
- Uma organização usa uma moeda-base na primeira versão; valores guardam código ISO para evolução.
- O custo histórico é snapshotado nos fatos relevantes, além de ser recalculável a partir das referências.
- LGPD se aplica; a aplicação minimiza dados pessoais e dá suporte operacional a acesso/correção/exclusão quando compatível com retenção legal.
- Exportações são assíncronas apenas se o volume exigir; a primeira implementação pode ser síncrona e limitada.

### Pendências que impedem aprovação de produção, não o desenvolvimento

- Confirmar região, plano, PITR e retenção reais do Supabase.
- Definir proprietário operacional de incidentes, backups e solicitações LGPD.
- Definir política final de estoque negativo e arredondamento fiscal/comercial.
- Definir metas p95 com carga representativa e matriz legal de retenção.

## 11. Gates e definição de pronto

Um requisito só recebe status **Coberto** quando há implementação, teste automatizado ou evidência manual definida e resultado aprovado. Arquivos presentes sem execução não constituem evidência. Nenhum gate posterior compensa falha em isolamento, precisão, histórico, persistência, build ou implantação. O release é recusado com defeito crítico/alto aberto, segredo exposto, migração não ensaiada, RLS não testada, smoke de produção incompleto ou divergência entre commit e deploy.
