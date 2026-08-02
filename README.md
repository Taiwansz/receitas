# Custiva - Gestão André da Empada

Plataforma da André da Empada para custos de ingredientes, fichas técnicas, compras, estoque, produção, precificação por canal e relatórios de rentabilidade.

Aplicação publicada: https://custiva.vercel.app

## Stack

- Next.js 16, React 19 e TypeScript estrito
- Supabase Auth, PostgreSQL, Storage e Row Level Security
- Decimal.js para cálculos financeiros e de quantidade
- Tailwind CSS 4, Phosphor Icons, Recharts
- Vitest, ESLint e build Vercel

## Executar localmente

1. Crie um projeto Supabase.
2. Aplique, em ordem, os arquivos de `supabase/migrations`.
3. Copie `.env.example` para `.env.local` e preencha somente a URL pública e a chave anon do projeto.
4. Execute:

```bash
npm install
npm run dev
```

O primeiro usuário cria a própria empresa e unidade. Nenhum dado fictício de negócio é inserido.

## Validação

```bash
npm run check
npm audit --omit=dev
```

O motor financeiro possui testes de custo de ingrediente, rendimento, conversões, receitas, sub-receitas, margem, markup, canais, desconto, cenários e ponto de equilíbrio.

## Segurança

- Todas as entidades de negócio têm `organization_id` e RLS.
- Operações financeiras compostas usam RPCs transacionais.
- O ledger de estoque e o histórico de auditoria são append-only para clientes.
- O bucket de anexos é privado e validado por tenant.
- Nenhum segredo deve ser adicionado ao repositório ou exposto no bundle do navegador.

Consulte `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/CALCULATIONS.md`, `docs/PERMISSIONS.md` e `docs/DEPLOYMENT.md`.
