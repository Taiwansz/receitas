# Backup, recuperação e continuidade

## 1. Objetivos e limites

Alvos iniciais, ainda sujeitos à confirmação do plano/região e teste real:

- **RPO:** 24 horas (perda máxima de dados confirmados).
- **RTO:** 8 horas (tempo para restabelecer serviço validado).
- **Retenção mínima proposta:** 30 dias para backups operacionais; requisitos legais/contratuais podem exigir outra janela.

Backup não é considerado funcional até uma restauração isolada ser concluída e verificada. A estratégia cobre PostgreSQL, Storage, configuração/versionamento e dependências externas; backup do banco não inclui automaticamente objetos de Storage nem configurações de Auth/Vercel.

## 2. Inventário e estratégia

| Ativo                        | Fonte                             | Proteção                                                            | Recuperação/validação                                              |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Schema, funções, RLS         | `supabase/migrations` no Git      | versionamento + revisão                                             | aplicar do zero e comparar schema/policies                         |
| Dados PostgreSQL             | Supabase Production               | backups gerenciados; PITR se contratado                             | restore para projeto isolado/novo e checks de integridade          |
| Objetos Storage              | buckets Supabase privados         | cópia/versionamento conforme capacidade contratada                  | restaurar metadado + objeto e testar autorização/download          |
| Usuários/Auth                | Supabase Auth                     | proteção do projeto; export/restore somente por mecanismo suportado | conferir contagem, vínculos e login controlado; não exportar senha |
| Configuração Vercel/Supabase | consoles + docs/IaC quando houver | inventário sem valores secretos                                     | recriar ambiente e validar nomes/escopos/callbacks                 |
| Segredos                     | provedores de segredo             | redundância e rotação, nunca no backup de código                    | recriar/rotacionar; validar sem revelar valor                      |
| Auditoria/logs               | banco/provedor observável         | retenção imutável adequada                                          | consultar janela/incidente e conferir correlação                   |

## 3. Responsabilidades

- **Dono do serviço:** aprova RPO/RTO, retenção e prioridade de negócio.
- **DevOps/Supabase:** confirma que backups ocorreram, mantém acesso de emergência e executa restore.
- **Data/Backend:** valida integridade, migrations, reconciliação e compatibilidade da aplicação.
- **Segurança/Compliance:** controla acesso, evidência, retenção e comunicação de incidente.
- **QA/Produto:** executa smoke e confirma jornadas/relatórios críticos.

Manter ao menos duas pessoas autorizadas para continuidade, com MFA e acesso mínimo. Não guardar credenciais de emergência neste documento.

## 4. Verificação rotineira

### Diária/automatizada

- Verificar status/timestamp do backup gerenciado e falhas de Storage/cópia.
- Alertar se a idade do último ponto exceder RPO.
- Monitorar falhas de DB, migrations, jobs e capacidade.

### Mensal

- Revisar retenção, tamanho, custo, acessos e mudanças no plano/região.
- Confirmar que novos buckets/tabelas/configurações entraram no inventário.

### Trimestral e antes de migration de alto risco

- Restaurar em ambiente isolado, cronometrar e preencher o relatório deste documento.
- Não usar apenas `SELECT 1`: executar checks relacionais, RLS e jornadas.

## 5. Procedimento de restauração ensaiada

1. Abrir incidente/exercício com coordenador, alvo temporal e critérios; registrar horários em UTC.
2. Identificar último ponto íntegro anterior ao evento e estimar gap até o RPO.
3. Criar destino **isolado**, sem callbacks/e-mails/webhooks de produção e sem acesso público.
4. Restaurar backup/PITR usando procedimento suportado pelo Supabase. Não sobrescrever Production durante a validação.
5. Aplicar somente migrations compatíveis ausentes e registrar suas versões.
6. Restaurar/reconciliar objetos Storage e referências; verificar checksums/tamanho/amostra.
7. Configurar segredos novos/isolados e app de validação; nunca reutilizar ou imprimir credencial comprometida.
8. Executar checks abaixo e comparar com baseline pré-incidente.
9. Decidir: rejeitar restore, corrigir/roll-forward ou promover/cortar tráfego.
10. Depois do corte, monitorar, preservar ambiente antigo em leitura durante janela aprovada e encerrar com post-mortem.

## 6. Checks de integridade

Adapte os nomes às tabelas realmente migradas e execute queries auditáveis:

- contagens por organização e status para organizações, memberships, ingredientes, compras, versões, preços, movimentos e lotes;
- FKs órfãs e referências cross-tenant iguais a zero;
- memberships sem organização/usuário e organização sem administrador conforme regra;
- versões publicadas duplicadas/não sequenciais ou componentes sem versão;
- saldo materializado reconciliado com soma de movimentos;
- compra confirmada sem movimentos/histórico, ou origem duplicada;
- lote confirmado sem consumo/perda/movimentos esperados;
- valores nulos, negativos/impossíveis e percentuais com divisor não positivo;
- presença e ativação de RLS/policies/grants esperados;
- objetos de anexo existentes, privados e acessíveis somente no tenant.

Todos os checks têm total esperado/observado; amostra visual não substitui reconciliação.

## 7. Smoke pós-restore

- Login em conta controlada e troca de organização.
- Acesso A×B negado diretamente no banco/API.
- Consulta de ingrediente/compra/receita/preço/lote histórico.
- Criação e reversão de um fato de teste autorizado.
- Recalcular caso dourado e comparar snapshot histórico.
- Abrir anexo privado autorizado e negar acesso cruzado.
- Relatório e dashboard reconciliados.
- Rota direta/refresco e sessão/callback no ambiente de recuperação.

## 8. Recuperação por cenário

### Exclusão/corrupção lógica localizada

Bloqueie mutações afetadas, preserve evidência, restaure backup em paralelo, extraia somente registros consistentes e reintroduza por script/migration idempotente revisado. Não importe linhas cruzando tenant ou que quebrem versões/auditoria.

### Região/projeto indisponível

Acione suporte/provedor, avalie RTO e prepare novo projeto na região aprovada. Restaure DB/Storage/configuração, rotacione segredos, atualize Vercel/callbacks e faça smoke antes do DNS/tráfego.

### Credencial comprometida

Revogue/rotacione primeiro, encerre sessões quando aplicável e investigue logs. Restore não remove acesso indevido nem substitui rotação. Valide bundle/histórico e reimplante.

### Ransomware/alteração maliciosa

Preserve evidência e escolha ponto anterior ao primeiro evento, não apenas ao alerta. Restaure isolado com credenciais novas, avalie exfiltração e comunicação legal.

## 9. Reconciliação de dados após o ponto restaurado

Transações posteriores ao restore podem existir em documentos externos, e-mails ou integrações. Não reaplique automaticamente. Liste-as, deduplique por IDs/idempotency keys, valide tenant e ordem temporal e reimporte por processo auditado. Registre lacunas conhecidas e aceite do dono.

## 10. Relatório obrigatório de exercício/incidente

```text
ID e tipo:
Coordenador/aprovador:
Início UTC / serviço restaurado UTC:
Motivo e escopo:
Backup/PITR selecionado (sem credencial):
Ponto temporal recuperado:
RPO observado / RTO observado:
Migrations e versão da aplicação:
Contagens e checks de integridade:
Resultado RLS/Storage/smoke:
Dados perdidos/reconciliados:
Desvios, riscos residuais e ações com dono/prazo:
Decisão final:
```

## 11. Critérios de aprovação

- RPO/RTO observados dentro do alvo ou exceção aceita nominalmente.
- Zero referência cross-tenant/órfã crítica; saldo/fatos reconciliados.
- RLS, Storage e jornadas críticas aprovados.
- Versão do schema e app compatíveis.
- Credenciais/configuração revisadas e logs/alertas ativos.
- Relatório armazenado em local operacional restrito, sem segredo ou dump anexado indevidamente.
