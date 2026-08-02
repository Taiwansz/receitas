# Delivery status

## Implemented

Application source, 10 versioned database migrations, RLS, Storage policies, hardened RPC grants, decimal-safe calculation engine, operational RPCs, responsive interface, automated checks and technical/user documentation.

## Participating teams

Lead orchestration and frontend integration; product/program/documentation; data/Supabase/security; financial calculation and QA; independent adversarial QA.

## Reviews completed

Financial formulas, PostgreSQL syntax, transactional database smoke, TypeScript, lint, production build, dependency vulnerability scan, frontend/schema contract review and secret scan.

## Corrected defects

Workspace contract aliases, ingredient RPC arguments/enums, yield-adjusted ingredient cost, direct-sale pricing, pricing snapshot reproducibility, channel fixed fee profitability, dashboard views, operational RPC adapters, password recovery, callback redirect validation, civil-date rendering, CSV formula injection and vulnerable dependencies.

## Release boundary

O Custiva está publicado em `https://custiva.vercel.app` pelo deployment Vercel `dpl_GdS3ic8HGx8khXCF3wp2Mpiia6RV` e conectado ao projeto Supabase `BarbeariaJao` (`ejnuzwbzyrrtgjultcnl`, região `sa-east-1`). O deploy está `READY`, a rota pública e o login responderam com HTTP 200 e o build não apresentou erros.

As migrations 001–010 foram aplicadas sem substituir as tabelas legadas da barbearia. A validação hospedada encontrou 42 tabelas Custiva com RLS, 80 políticas, zero grants de tabela ou RPC para `anon`, 16 RPCs autorizadas para `authenticated` e o bucket privado `business-attachments`.

O release público ainda não equivale à aprovação operacional completa: callbacks de Auth precisam ser allowlisted no painel do Supabase, as variáveis devem ser persistidas por ambiente na Vercel e os testes E2E com duas organizações, upload/download de Storage e restauração de backup permanecem pendentes.

O Supabase Advisor também aponta dois backups legados da barbearia sem RLS e funções legadas `SECURITY DEFINER` com configuração permissiva. Esses objetos não pertencem ao Custiva e não foram alterados sem autorização específica.
