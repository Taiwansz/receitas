# Checklist de release

**Regra:** preencha com evidência do commit candidato. `[ ]` significa não verificado, não “presumido”. Bloqueadores: falha de isolamento/segredo, cálculo material, corrupção/duplicação, migration/restore inseguro, build/teste P0 ou smoke Production.

## Identificação

| Campo                           | Valor                         |
| ------------------------------- | ----------------------------- |
| Versão/release                  |                               |
| Commit SHA candidato            |                               |
| Branch/tag                      |                               |
| Preview URL/deployment ID       |                               |
| Production URL/deployment ID    |                               |
| Supabase Preview project ref    | registrar de modo não secreto |
| Supabase Production project ref | registrar de modo não secreto |
| Janela e responsáveis           |                               |

## 1. Escopo e rastreabilidade — Gate 1

- [ ] PRD, jornadas, arquitetura, ADR, riscos e limitações revisados.
- [ ] Matriz `REQUIREMENTS_TRACEABILITY.md` aponta código e teste reais; nenhum P0 marcado coberto sem evidência.
- [ ] Requisitos/migrations/flags deste release possuem dono e aceite.
- [ ] Itens fora do escopo estão ocultos ou identificados; nenhum botão/form/chart fictício.
- [ ] Mudanças de fórmula receberam revisão independente de domínio/financeiro.
- [ ] Riscos ≥15 mitigados ou release recusado; riscos residuais têm aceite nominal.

Evidência/notas:

## 2. Código e qualidade — Gates 4 a 6

- [ ] Instalação limpa pelo lockfile passou (`npm ci` ou equivalente).
- [ ] Lint passou.
- [ ] Typecheck estrito passou.
- [ ] Testes unitários passaram, incluindo casos dourados e bordas decimais.
- [ ] Testes de integração passaram, incluindo migrations, constraints, RPC/transações e idempotência.
- [ ] Testes E2E P0 passaram.
- [ ] Build production passou.
- [ ] Nenhum `any`/mock/fallback em memória afeta regra/persistência de produção.
- [ ] Falhas/concorrência/retry não deixam fatos parciais ou duplicados.
- [ ] Relatórios/dashboard reconciliam com fatos conhecidos.

Comandos, duração e links de CI:

## 3. Banco, histórico e segurança — Gates 2 e 7

- [ ] Migrations revisadas em ordem e aplicadas do zero em banco limpo.
- [ ] Mudanças destrutivas usam expand/migrate/contract e foram ensaiadas.
- [ ] Backup/restore point confirmado; rollback compatível documentado.
- [ ] Todas as tabelas de tenant têm RLS habilitada, policy e índice relevante.
- [ ] Testes com tenants A/B negam SELECT/INSERT/UPDATE/RPC/Storage cruzados.
- [ ] Papéis Admin/Gestor/Operação/Visualizador testados; sem escalada/último admin órfão.
- [ ] Versão publicada, preço, compra, movimentos, lote e audit log preservam histórico.
- [ ] Confirmação de compra/produção é transacional e idempotente.
- [ ] Storage é privado; tipo/tamanho/caminho e URL assinada foram testados.
- [ ] Logs/erros não expõem token, segredo, payload financeiro completo ou PII desnecessária.

Evidência de policies/checks:

## 4. Segredos, dependências e ambientes — Gate 7

- [ ] Repositório, diff/histórico relevante e bundle passaram secret scan.
- [ ] Nenhuma service role está em `NEXT_PUBLIC_*`, código cliente, log ou artefato.
- [ ] `.env.example` contém apenas nomes/descrições seguras; `.gitignore` cobre envs/credenciais.
- [ ] Vulnerabilidades críticas conhecidas foram corrigidas; exceções menores possuem risco/dono/prazo.
- [ ] Development, Preview e Production estão isolados.
- [ ] Validação de ambiente falha cedo e não imprime valores.
- [ ] Callbacks/site URLs e domínios estão corretos por ambiente.

Ferramenta/resultado de scan e audit:

## 5. UX, acessibilidade e responsividade — Gates 3 e 5

- [ ] J-01 a J-08 possuem loading/vazio/sucesso/aviso/erro.
- [ ] Formulários mantêm entrada após erro, focam primeiro campo inválido e impedem duplo envio.
- [ ] Teclado, foco visível, nomes acessíveis, contraste AA e anúncio de status verificados.
- [ ] Gráficos têm tabela/equivalente textual e não dependem só de cor.
- [ ] Ações destrutivas/compensatórias mostram alvo, consequência e confirmação.
- [ ] 320, 375, 768, 1024 e 1440 px verificados sem overflow de página/perda de ação.
- [ ] Alvos de toque críticos têm pelo menos 44×44 px.
- [ ] BRL, vírgula decimal, datas e timezone funcionam sem ambiguidade.

Dispositivos/browser/evidência:

## 6. Preview — Gate 8

- [ ] Preview corresponde ao SHA candidato e usa Supabase Preview.
- [ ] Build e runtime logs não têm erro crítico.
- [ ] Signup/signin/signout/recuperação/callback passaram.
- [ ] Organização/filial e onboarding sem dados demo involuntários passaram.
- [ ] Ingrediente/compra/estoque/receita/preço/produção persistem após refresh e nova sessão.
- [ ] Rota direta/refresco e página de erro passaram.
- [ ] Caso AC-002, AC-005 e isolamento AC-009 passaram.
- [ ] Teste móvel P0 e Storage privado passaram.

Executor, horário e resultado:

## 7. Aprovação para Production

- [ ] Release Manager aprovou o SHA e a janela.
- [ ] Data/Supabase aprovou migrations, restore point e rollback.
- [ ] Segurança aprovou RLS, papéis, Storage e scans.
- [ ] QA/Cálculos aprovou regressão, fórmulas e reconciliação.
- [ ] Produto aprovou jornadas e limitações conhecidas.
- [ ] Monitoramento, alertas e on-call/proprietário estão definidos.

Decisão **GO/NO-GO**, aprovadores e horário:

## 8. Production e smoke — Gates 8 e 9

- [ ] Migration compatível aplicada e verificada.
- [ ] Mesmo SHA/artefato aprovado promovido para Production.
- [ ] URL HTTPS e deployment ID registrados.
- [ ] Auth/callback/logout/recuperação passaram.
- [ ] Rotas diretas e refresh passaram.
- [ ] Persistência e CRUD P0 autorizado passaram em tenant de teste.
- [ ] Isolamento cross-tenant e papéis foram verificados sem tocar dados alheios.
- [ ] Compra→custo→estoque e receita→preço reconciliaram.
- [ ] Produção→consumo/perda/movimento foi atômica e reconciliou.
- [ ] Dashboard/relatório e Storage privado passaram.
- [ ] Bundle/rede/logs não expõem segredo.
- [ ] Desktop/mobile e erro observável passaram.

Executor, início/fim e evidência:

## 9. Monitoramento e encerramento

- [ ] Erros, latência, Auth, RPC/DB e logs observados na primeira hora.
- [ ] Sem alerta crítico/alto ou regressão financeira; ou rollback iniciado.
- [ ] Commit GitHub, migrations e deploy Production conferem.
- [ ] Release notes, limitações, matriz e documentação atualizadas.
- [ ] Backlog de riscos/defeitos residuais tem prioridade, dono e prazo.
- [ ] Verificação de 24 h concluída conforme criticidade.

Resultado final e métricas:

## Registro de defeitos

| ID  | Severidade | Jornada/requisito | Resultado | Correção/decisão | Evidência |
| --- | ---------- | ----------------- | --------- | ---------------- | --------- |
|     |            |                   |           |                  |           |

## Critérios de rollback imediato

- Vazamento ou autorização cross-tenant, segredo exposto ou conta privilegiada comprometida.
- Cálculo material incorreto, perda/corrupção/duplicação de fato financeiro/estoque.
- Migration incompatível, falha ampla de autenticação/callback/rota ou indisponibilidade acima do limite aprovado.
- Taxa de erro/latência crítica sem mitigação segura dentro da janela.

Ao acionar rollback, registrar horário, responsável, deployment/schema, motivo, dados afetados e smoke pós-rollback; seguir `DEPLOYMENT.md` e `BACKUP_RECOVERY.md`.
