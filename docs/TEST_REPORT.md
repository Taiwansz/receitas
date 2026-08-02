# Test report

Data: 2026-08-02

## Automated checks

- TypeScript strict: approved.
- ESLint: approved.
- Vitest: 25 tests in 6 files approved.
- Next.js production build: approved.
- Production dependency audit: zero known vulnerabilities after controlled dependency overrides.
- PostgreSQL 17 parser: migrations 001–009 approved.
- PostgreSQL WASM migration application: approved with Auth/Storage mocks.
- Transactional database smoke: workspace, ingredient, recipe, direct-sale price, kg-to-g purchase, FEFO production and final inventory balance approved.
- Pricing contract smoke: V2 snapshots, required-null rejection and V1→V2 direct-channel interoperability approved.

## Coverage

The automated suite covers decimal precision, ingredient acquisition cost and yield, unit conversions, recipe scaling and circular dependencies, divisor pricing, margin versus markup, profitability, channel pricing, discount limits, scenarios and break-even.

## Pending environment checks

Real Supabase Auth callbacks, hosted RLS isolation, Storage upload, Vercel runtime logs and production browser smoke require the provisioned cloud environment.
