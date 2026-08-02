# Runbook de implantação — Vercel + Supabase

Este runbook descreve implantação reproduzível. Ele não afirma que um ambiente foi criado ou validado; evidências do release devem ser registradas no checklist e associadas ao commit.

## 1. Responsabilidades e pré-requisitos

| Papel           | Responsabilidade                                    |
| --------------- | --------------------------------------------------- |
| Release Manager | candidato, gates, janela, decisão e relatório       |
| Data/Supabase   | revisar/aplicar migrations, backup e validações RLS |
| DevOps/Vercel   | ambientes, variáveis, deploy, logs e rollback       |
| QA/Segurança    | smoke/E2E, isolamento, bundle e segredo             |

Pré-requisitos:

- CLI/runtime exigidos pelo `package.json`/lockfile e Supabase CLI disponível.
- Projetos Supabase distintos para Preview e Production; IDs/URLs conferidos sem imprimir chaves.
- Projeto Vercel conectado ao repositório/branch corretos.
- callback/site URLs do Supabase allowlisted por ambiente.
- backup/restauração e rollback definidos antes de migration incompatível.

## 2. Variáveis

Use `.env.example` como inventário canônico quando presente. Nomes esperados pela arquitetura devem ser confirmados no código de validação, não copiados cegamente deste texto.

| Classe                              | Escopo                                         | Regra                                                              |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| URL Supabase e chave pública/anon   | browser + server quando necessárias            | podem usar `NEXT_PUBLIC_`; ainda configurar por ambiente           |
| service role/chaves administrativas | server-only                                    | nunca `NEXT_PUBLIC_`, browser, Preview público, log ou repositório |
| URL base/callback                   | por ambiente                                   | HTTPS em Production; domínio exato allowlisted                     |
| observabilidade                     | server ou public token explicitamente limitado | redaction e escopo mínimo                                          |

Na Vercel, configure separadamente Development, Preview e Production. Preview não pode conter URL/project ref de Production. Após qualquer exposição, revogue/rotacione — apenas remover do Git não elimina histórico.

## 3. Preparar candidato

```bash
git status --short
git rev-parse HEAD
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Se um script tiver nome diferente, use o definido no `package.json` e atualize o checklist; não marque etapa como passada sem comando equivalente. Faça varredura de segredos no repositório, histórico relevante e artefato/bundle gerado. Revise dependências críticas e mudanças de migration.

## 4. Validar migrations em ambiente descartável/Preview

1. Leia migrations na ordem, procurando lock longo, perda/reescrita, função `security definer`, grants e policy ausente.
2. Suba banco limpo/local e aplique todas as migrations:

```bash
supabase start
supabase db reset
supabase status
```

3. Execute testes de integração/RLS com dois tenants e quatro papéis.
4. Quando aplicável, ensaie dados representativos e `EXPLAIN` das consultas afetadas.
5. Vincule ao projeto de Preview pelo mecanismo seguro da CLI e aplique migrations conforme o fluxo adotado (`supabase db push` ou pipeline equivalente).
6. Verifique schema/policies/funções e execute smoke Preview.

Não use `db reset` em projeto remoto. Não inclua senha/token em linha de comando gravada ou log.

## 5. Estratégia de migration

Para mudança incompatível, usar três releases:

1. **Expand:** adicionar coluna/tabela/índice/policy compatível e deployar código que lide com ambos formatos.
2. **Migrate:** backfill idempotente, em lotes, observando locks/erros e reconciliando contagens.
3. **Contract:** remover legado somente depois de confirmar que nenhum deploy/job o usa e existir backup válido.

Migration “down” só é rollback se preservar dados e for ensaiada. Caso contrário, rollback é roll-forward da correção ou restore coordenado.

## 6. Deploy Preview

1. Confirme branch/commit e integração Vercel.
2. Confirme Framework Next.js, root do app, install/build commands e versão Node derivadas do repositório.
3. Inicie Preview pelo push/PR ou CLI autorizada.
4. Inspecione build e runtime logs sem copiar valores sensíveis.
5. Teste: home/login, callback, rota protegida/direta com refresh, cadastro/persistência, acesso negado, erros e layout 320/1440 px.
6. Confirme que Preview usa Supabase de Preview.

## 7. Deploy Production

Ordem padrão para mudança compatível:

1. Registrar backup/restore point e estado da saúde.
2. Aplicar migration expand compatível em Production.
3. Verificar queries/policies/funções essenciais.
4. Promover o **mesmo artefato/commit** aprovado no Preview.
5. Executar smoke imediatamente, observando erros e latência.
6. Só então executar backfill/job controlado e habilitar mudanças por flag, se houver.
7. Registrar URL, commit SHA, deployment ID, migrations, executores, horários e resultado — sem segredos.

Smoke mínimo:

- signup/signin/signout/recuperação e callback;
- organização/filial e isolamento A×B;
- ingrediente, compra/estoque, receita/versão e preço;
- produção transacional em conta de teste autorizada;
- persistência após refresh e nova sessão;
- rota direta, mobile e erro observável;
- Storage privado, RLS e ausência de segredo no bundle.

## 8. Rollback

### Somente aplicação

Promova o último deployment saudável da Vercel se o schema ainda for compatível. Reexecute smoke e registre a diferença de commit/deploy.

### Aplicação + banco

1. Pare tráfego mutável via manutenção/feature flag quando necessário.
2. Preserve logs e determine última transação confiável.
3. Prefira roll-forward de schema/dados. Use migration reversa somente se ensaiada e não destrutiva.
4. Se corrupção/perda exigir restore, siga `BACKUP_RECOVERY.md`, restaure isoladamente, valide e planeje corte/merge de transações posteriores.
5. Nunca aponte aplicação antiga a schema incompatível.

Gatilhos: vazamento cross-tenant, segredo no bundle, corrupção/duplicação financeira, falha ampla de auth/rotas, taxa de erro crítica ou cálculo material incorreto.

## 9. Verificação pós-deploy e encerramento

- Monitorar logs, auth, RPC/DB e latência intensivamente na primeira hora e conforme criticidade nas 24 h seguintes.
- Reconciliar um cenário de compra→custo→receita→preço e produção→movimentos.
- Confirmar que dashboard/relatório usam dados reais e filtros corretos.
- Atualizar checklist, limitações/release notes e matriz de rastreabilidade.
- Release só encerra quando commit GitHub e deploy Production coincidem e todos os gates obrigatórios possuem evidência.
