# Test report

Data: 2026-08-02

## Automated checks

- TypeScript strict: approved.
- ESLint: approved.
- Vitest: 25 tests in 6 files approved.
- Next.js production build: approved.
- Production dependency audit: zero known vulnerabilities after controlled dependency overrides.
- PostgreSQL 17 parser: migrations 001–010 approved.
- PostgreSQL WASM migration application: approved with Auth/Storage mocks.
- Transactional database smoke: workspace, ingredient, recipe, direct-sale price, kg-to-g purchase, FEFO production and final inventory balance approved.
- Pricing contract smoke: V2 snapshots, required-null rejection and V1→V2 direct-channel interoperability approved.
- Supabase hosted migrations: 001–010 applied on PostgreSQL 17.
- Supabase hosted security inventory: 42 RLS tables, 80 policies, zero anonymous table/RPC grants, 16 authenticated RPC grants and private `business-attachments` bucket.
- Vercel deployment: `READY`; root redirect and `/login` HTTP 200 smoke approved; error-only build log contains no build failure.

## Coverage

The automated suite covers decimal precision, ingredient acquisition cost and yield, unit conversions, recipe scaling and circular dependencies, divisor pricing, margin versus markup, profitability, channel pricing, discount limits, scenarios and break-even.

## Pending environment checks

Supabase Auth callback allowlisting, two-tenant adversarial RLS tests, authenticated Storage upload/download, complete browser E2E and backup restore drill remain pending. The current deployment packaged public environment values for that build; persistence and scoping of project-level Vercel variables still require confirmation.
