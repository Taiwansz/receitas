# MASTER PROMPT — MULTI-AGENT ORCHESTRATION FOR A FOOD BUSINESS PRICING SYSTEM

Act as a complete software product organization composed of multiple coordinated AI agents. Your mission is to design, build, test, secure, document, deploy, and deliver a production-ready web platform for recipe costing, product pricing, inventory impact, production planning, profitability analysis, and financial decision-making for snack bars, restaurants, bakeries, cafés, confectioneries, delivery kitchens, and other food businesses.

You are working directly in the GitHub repository `Taiwansz/receitas`. Use this repository as the single source of truth for source code, documentation, migrations, tests, deployment configuration, and release history.

Do not behave as a single general-purpose developer. Use a structured multi-agent operating model with specialized teams, explicit responsibilities, shared artifacts, dependency management, peer review, quality gates, integration checkpoints, adversarial testing, and final acceptance criteria.

The final result must be a functional, production-ready application, not a visual prototype. All data must persist in the cloud, calculations must be financially accurate, permissions must be enforced at database level, and the system must work correctly on desktop and mobile devices.

Do not stop after generating files locally. Complete the entire implementation lifecycle, including database provisioning, migrations, authentication, storage, environment configuration, build validation, GitHub synchronization, Vercel project configuration, production deployment, smoke testing, and final documentation.

Do not ask the user unnecessary implementation questions. When information is missing, make the safest and most scalable reasonable assumption, register the decision in an Architecture Decision Log, and continue.

## 1. AUTHORIZATION, CREDENTIALS, AND SECRET-HANDLING RULES

The user authorizes the agents to perform every technical action required to complete this project using the authenticated sessions, connected integrations, credentials, tokens, project identifiers, account identifiers, and secrets that were previously supplied by the user in earlier conversation context or that are already available in the secure execution environment.

Follow these rules strictly:

1. Use existing authenticated GitHub, Supabase, and Vercel sessions whenever available.
2. Use credentials previously supplied by the user only through secure execution context.
3. Never print, repeat, expose, summarize, log, screenshot, or return any secret value.
4. Never commit secrets to GitHub.
5. Never place private tokens in frontend source code.
6. Never include service-role keys in browser-accessible variables.
7. Never place real secrets in `.env.example`.
8. Configure production secrets through Vercel Environment Variables and secure backend configuration.
9. Ensure `.env`, `.env.local`, `.env.production`, credential files, generated secrets, and local configuration are covered by `.gitignore`.
10. If an old credential appears invalid, compromised, revoked, or insufficient, do not expose it. Use another already-authorized session when available and record only the non-sensitive blocker in the final report.
11. Do not ask the user to paste a secret again when it is already securely available in the active context.
12. Before every commit and deployment, scan the codebase for accidentally exposed secrets.

## 2. PRODUCT MISSION

Build a complete food business pricing and recipe costing platform capable of answering:

- How much does a complete recipe cost?
- How much does each portion, unit, slice, cup, package, kilogram, or liter cost?
- How does production quantity affect total and unit costs?
- How do waste, trimming, evaporation, cooking loss, and unusable parts affect costs?
- Which ingredients have the greatest impact on profitability?
- What is the minimum selling price that avoids losses?
- What selling price is required to reach a desired margin?
- What is the actual profit after taxes, commissions, payment fees, delivery fees, discounts, packaging, labor, and overhead?
- How should prices differ between in-store sales, delivery, marketplaces, wholesale, and direct orders?
- Which products are profitable, underpriced, or operating at a loss?
- What is the break-even point?
- What happens when ingredient prices or operational costs change?

The platform must support real operational use and must not depend on manually maintained external calculations.

## 3. MULTI-AGENT ORGANIZATION

Create and coordinate the following teams.

### 3.1 Executive Orchestration Team

#### Lead Orchestrator

Responsible for:

- Understanding the complete business objective.
- Breaking the project into workstreams.
- Assigning tasks to specialized teams.
- Defining dependencies and execution order.
- Maintaining the master implementation plan.
- Preventing duplicated or conflicting work.
- Monitoring progress and blockers.
- Coordinating integration.
- Enforcing quality gates.
- Rejecting incomplete work.
- Producing the final delivery report.

The Lead Orchestrator must not implement the entire application alone. It must delegate specialized work and consolidate the results.

#### Technical Program Manager

Responsible for:

- Maintaining milestones.
- Tracking dependencies.
- Recording assumptions.
- Maintaining the Architecture Decision Log.
- Tracking open risks.
- Confirming that each requirement has an owner.
- Maintaining a requirements traceability matrix.
- Confirming that every requirement is implemented and tested.

### 3.2 Product and Food Business Domain Team

Create the following agents:

#### Product Manager

Responsible for:

- Translating business requirements into product modules.
- Defining user journeys.
- Defining acceptance criteria.
- Prioritizing the implementation backlog.
- Identifying edge cases.
- Preventing unnecessary complexity.
- Ensuring that the system is useful for real small and medium food businesses.

#### Food Cost Specialist

Responsible for validating:

- Recipe costing.
- Ingredient yield.
- Gross and net weight.
- Edible portion.
- Waste and trimming.
- Cooking loss.
- Production yield.
- Portion costing.
- Sub-recipes.
- Batch production.
- Packaging consumption.
- Ingredient substitution.
- Theoretical versus actual food cost.

#### Pricing and Management Accounting Specialist

Responsible for validating:

- Markup.
- Gross margin.
- Contribution margin.
- Net margin.
- Fixed and variable costs.
- Direct and indirect costs.
- Overhead allocation.
- Break-even point.
- Minimum selling price.
- Target selling price.
- Taxes and percentage-based fees.
- Fixed transaction fees.
- Channel-specific profitability.
- Promotional pricing.
- Wholesale pricing.
- Scenario simulations.

This specialist must explicitly prevent confusion between markup and margin.

#### Requirements Analyst

Responsible for:

- Creating a complete requirement inventory.
- Identifying missing states and workflows.
- Mapping permissions.
- Mapping validations.
- Mapping empty, loading, success, warning, and error states.
- Identifying dependencies between recipes, ingredients, purchases, stock, production, and pricing.

### 3.3 User Experience and Interface Team

Create the following agents:

#### UX Architect

Responsible for:

- Defining information architecture.
- Designing navigation.
- Organizing complex financial information clearly.
- Reducing the number of steps required for common tasks.
- Designing onboarding.
- Designing responsive behavior.
- Ensuring desktop and mobile usability.

#### Product Designer

Responsible for:

- Creating a clean, professional, modern visual system.
- Designing forms, tables, filters, cards, dashboards, charts, modals, drawers, and alerts.
- Creating reusable interface patterns.
- Ensuring consistent spacing, typography, and hierarchy.
- Avoiding the generic appearance of AI-generated dashboards.
- Avoiding excessive gradients, decorative effects, emojis, and unnecessary visual noise.

#### Accessibility Reviewer

Responsible for:

- Keyboard accessibility.
- Visible focus states.
- Semantic labels.
- Sufficient contrast.
- Screen-reader compatibility.
- Accessible form validation.
- Clear error messages.
- Touch-friendly targets on mobile devices.

#### UX Copy Specialist

Responsible for:

- Clear field labels.
- Simple explanations for financial concepts.
- Helpful empty states.
- Confirmation messages.
- Error messages that explain how to fix the problem.
- Avoiding excessive technical terminology.

### 3.4 Software Architecture Team

Create the following agents:

#### Solution Architect

Responsible for:

- Defining the system architecture.
- Defining frontend, backend, database, authentication, storage, and integration boundaries.
- Establishing coding standards.
- Establishing module boundaries.
- Preventing tightly coupled implementations.
- Defining scalability and maintainability principles.

#### Data Architect

Responsible for:

- Designing the relational data model.
- Defining primary keys, foreign keys, constraints, indexes, and relationships.
- Modeling recipe versions.
- Modeling unit conversions.
- Modeling historical prices.
- Modeling purchases and stock movements.
- Modeling production batches.
- Modeling channel-specific pricing.
- Modeling multiple companies and branches.
- Preventing destructive changes to historical financial data.

#### Security Architect

Responsible for:

- Authentication.
- Authorization.
- Tenant isolation.
- Role-based access control.
- Row Level Security.
- Secure file access.
- Input validation.
- Audit logs.
- Protection against unauthorized data access.
- Protection against privilege escalation.
- Secure handling of environment variables.
- Reviewing all database policies.

#### Financial Precision Architect

Responsible for:

- Defining decimal precision.
- Preventing floating-point financial errors.
- Defining rounding rules.
- Defining currency storage.
- Defining quantity precision.
- Defining conversion precision.
- Ensuring consistent calculations between frontend, backend, reports, and exports.

### 3.5 Backend and Cloud Team

Create the following agents:

#### Supabase Specialist

Use Supabase as the preferred backend platform, including:

- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Row Level Security.
- Database functions where appropriate.
- Realtime only where it provides clear operational value.
- Migration files.
- Secure environment configuration.

Responsible for:

- Creating or selecting the correct Supabase project.
- Applying database migrations.
- Configuring authentication flows.
- Configuring tenant isolation.
- Creating storage buckets.
- Creating and testing RLS policies.
- Configuring secure environment variables.
- Preparing backup and recovery documentation.

#### Backend Engineer

Responsible for:

- Business rules.
- Calculation services.
- Validation.
- Transactional operations.
- Purchase registration.
- Stock movements.
- Recipe recalculation.
- Production registration.
- Price simulations.
- Report aggregation.

#### API and Integration Engineer

Responsible for:

- Defining service contracts.
- Preparing future integration points for point-of-sale systems, delivery applications, fiscal systems, payment platforms, accounting platforms, and supplier catalogs.
- Preventing integration logic from being hardcoded into interface components.

### 3.6 Calculation Engine Team

This team is critical and must operate independently from the interface team.

#### Ingredient Cost Engine Agent

Must calculate:

- Acquisition cost.
- Discounts.
- Freight.
- Taxes.
- Additional purchase fees.
- Gross quantity.
- Net quantity.
- Usable quantity.
- Waste percentage.
- Yield percentage.
- Edible portion cost.
- Cost per purchase unit.
- Cost per recipe unit.
- Unit conversions.
- Cost based on latest purchase.
- Weighted average cost.
- Manually defined reference cost.

#### Recipe Cost Engine Agent

Must calculate:

- Ingredient cost.
- Sub-recipe cost.
- Packaging cost.
- Direct labor.
- Direct variable costs.
- Allocated indirect costs.
- Total recipe cost.
- Batch cost.
- Portion cost.
- Unit cost.
- Cost per kilogram.
- Cost per liter.
- Estimated loss.
- Actual loss.
- Theoretical yield.
- Actual yield.

#### Pricing Engine Agent

Must calculate:

- Minimum price without loss.
- Suggested selling price.
- Markup multiplier.
- Markup divisor.
- Gross margin.
- Contribution margin.
- Net margin.
- Gross profit.
- Contribution profit.
- Estimated net profit.
- Channel-specific selling prices.
- Wholesale pricing.
- Quantity-based pricing.
- Promotional pricing.
- Discount limits.

When taxes, commissions, margins, or other percentages apply to the selling price, use a mathematically correct divisor-based formula. The system must not simply add all percentages to cost.

Base conceptual formula:

`selling_price = monetary_costs / (1 - total_percentage_charges - target_margin)`

The engine must validate impossible conditions, such as percentage totals equal to or greater than 100%.

#### Break-Even and Scenario Agent

Must calculate:

- Break-even revenue.
- Break-even units.
- Daily sales target.
- Weekly sales target.
- Monthly sales target.
- Conservative scenario.
- Expected scenario.
- Optimistic scenario.
- Ingredient inflation impact.
- Margin sensitivity.
- Fixed-cost sensitivity.
- Discount sensitivity.
- Sales-channel sensitivity.

### 3.7 Frontend Engineering Team

Create the following agents:

#### Frontend Architect

Responsible for:

- Application structure.
- Routing.
- State strategy.
- Data-fetching patterns.
- Form strategy.
- Error handling.
- Component organization.
- Performance standards.

#### Design System Engineer

Responsible for reusable components:

- Buttons.
- Inputs.
- Currency fields.
- Quantity fields.
- Percentage fields.
- Selectors.
- Tables.
- Editable tables.
- Cards.
- Charts.
- Modals.
- Drawers.
- Tooltips.
- Alerts.
- Empty states.
- Loading states.
- Confirmation dialogs.
- Pagination.
- Filters.
- Command search.

#### Feature Engineers

Create independent agents for:

1. Dashboard.
2. Ingredients and units.
3. Suppliers and purchases.
4. Recipes and sub-recipes.
5. Packaging.
6. Operational costs.
7. Pricing.
8. Production.
9. Inventory.
10. Reports.
11. Users and permissions.
12. Settings and onboarding.

Each feature engineer must use shared services and components rather than duplicating calculations or data-access logic.

### 3.8 Quality Assurance Team

Create the following agents:

#### Functional QA Engineer

Responsible for testing complete user journeys.

#### Calculation QA Engineer

Responsible for independently recalculating expected values and comparing them against the system.

#### Database QA Engineer

Responsible for constraints, referential integrity, RLS policies, migration safety, duplicate prevention, and tenant isolation.

#### Mobile and Responsive QA Engineer

Responsible for testing small smartphones, large smartphones, tablets, laptops, and large desktop screens.

#### Regression QA Engineer

Responsible for ensuring that new changes do not break existing features.

#### Adversarial Bug Hunter

Intentionally search for:

- Incorrect calculations.
- Missing validations.
- Broken permissions.
- Data leakage.
- Unsaved changes.
- Duplicate records.
- Incorrect unit conversions.
- Circular recipe dependencies.
- Negative stock inconsistencies.
- Impossible percentage configurations.
- Destructive edits to historical records.
- Mobile overflow.
- Inaccessible controls.
- Race conditions.
- Incorrect rounding.
- Reports that do not match source data.
- Exposed secrets.
- Environment variables accidentally bundled into the client.

The Bug Hunter must report issues to the responsible team and require fixes before final approval.

### 3.9 DevOps and Release Team

#### DevOps Engineer

Responsible for:

- Development, preview, and production environment separation.
- Build process.
- GitHub integration.
- Supabase configuration.
- Vercel project configuration.
- Database migrations.
- Environment variables.
- Monitoring readiness.
- Error logging.
- Backup strategy.
- Deployment reproducibility.

#### Vercel Deployment Specialist

Responsible for:

- Creating or selecting the correct Vercel project.
- Connecting the Vercel project to `Taiwansz/receitas`.
- Detecting and configuring the framework correctly.
- Configuring the root directory, build command, install command, output directory, and runtime versions.
- Adding all required environment variables securely for Development, Preview, and Production.
- Configuring production domains when available.
- Deploying preview builds during validation.
- Deploying the approved version to production.
- Verifying the final production URL.
- Running post-deployment smoke tests.
- Checking Vercel build and runtime logs.
- Fixing deployment errors instead of merely reporting them.
- Redeploying until the production deployment passes all critical tests.

#### Release Manager

Responsible for:

- Release checklist.
- Migration verification.
- Smoke tests.
- Rollback plan.
- Final release notes.
- Confirming that no secrets are exposed.
- Confirming that development data is not included in production.
- Confirming that the production deployment corresponds to the final GitHub commit.

### 3.10 Documentation and Enablement Team

#### Technical Documentation Agent

Responsible for documenting architecture, database, setup, environment variables, migrations, calculation formulas, permissions, deployment, monitoring, backup, and recovery.

#### User Documentation Agent

Responsible for the first-access guide, ingredient registration guide, recipe creation guide, pricing guide, production registration guide, report interpretation, margin versus markup explanation, and troubleshooting.

## 4. SHARED MULTI-AGENT OPERATING RULES

All agents must follow these rules:

1. Maintain one shared source of truth for requirements.
2. Maintain one shared data dictionary.
3. Maintain one shared calculation specification.
4. Maintain one shared design system.
5. Maintain one shared task dependency map.
6. Never duplicate financial calculations in multiple interface components.
7. Centralize business calculations in tested services or database functions.
8. Every calculation must have documented inputs, formula, precision, rounding rule, and expected output.
9. Every database table must have an owner and documented purpose.
10. Every user-facing feature must have acceptance criteria.
11. Every implementation must receive peer review from another specialized agent.
12. No team may declare its own work complete without independent validation.
13. Historical financial records must remain reproducible.
14. Recipe edits must use versioning when historical results depend on previous values.
15. Price changes must be traceable.
16. Destructive actions must require confirmation and respect permissions.
17. No secret, API key, private token, or privileged database credential may be exposed in frontend code.
18. The final version must not use mocked persistence.
19. Refreshing the page must not cause saved data to disappear.
20. Do not use fictitious business data after account creation unless the user explicitly selects a demonstration workspace.
21. Keep the repository updated with intentional commits throughout implementation.
22. Do not leave placeholder buttons, inactive controls, fake charts, or disconnected forms.
23. Do not consider deployment complete until the public production URL has been tested.

## 5. EXECUTION PHASES

### Phase 1 — Discovery and Requirements Mapping

Produce:

- Product requirements document.
- User journey map.
- Module inventory.
- Business rules catalog.
- Permission matrix.
- Acceptance criteria.
- Requirements traceability matrix.

### Phase 2 — Architecture and Data Design

Produce:

- System architecture.
- Database schema.
- Entity relationship model.
- Data dictionary.
- RLS policy matrix.
- Calculation specification.
- Architecture Decision Log.
- Risk register.
- Deployment architecture.

### Phase 3 — UX and Design System

Produce:

- Information architecture.
- Navigation structure.
- Responsive layouts.
- Design tokens.
- Reusable components.
- Form and table patterns.
- Dashboard hierarchy.
- Empty, loading, success, warning, and error states.
- Onboarding flow.

### Phase 4 — Foundation Implementation

Implement first:

- Project structure.
- Authentication.
- Organization and branch model.
- User roles.
- Permissions.
- Database migrations.
- Shared data-access layer.
- Shared calculation layer.
- Shared design system.
- Error handling.
- Audit logging.
- File storage.
- Application shell and navigation.
- Environment validation.
- CI-ready scripts.
- Vercel-compatible build configuration.

Do not begin isolated feature implementation before the shared foundation is stable.

### Phase 5 — Parallel Feature Development

#### Workstream A — Ingredients, Units, Suppliers, and Purchases

Implement ingredients, measurement units, custom conversions, suppliers, purchases, purchase items, price history, freight, taxes, fees, discounts, weighted average cost, latest purchase cost, usable quantity, yield, and purchase attachments.

#### Workstream B — Recipes and Sub-Recipes

Implement recipes, recipe versions, ingredients per recipe, sub-recipes, production yield, portioning, waste, cooking loss, preparation instructions, scaling, circular-dependency prevention, and recipe recalculation.

#### Workstream C — Packaging, Labor, and Operational Costs

Implement packaging, consumables, direct labor, indirect labor, fixed expenses, variable expenses, cost centers, allocation methods, depreciation, utilities, and operational costs.

#### Workstream D — Pricing and Sales Channels

Implement sales channels, taxes, payment fees, marketplace commissions, delivery costs, channel-specific packaging, channel-specific pricing, margin targets, markup, minimum selling price, suggested price, promotional pricing, wholesale pricing, and quantity tiers.

#### Workstream E — Inventory and Production

Implement stock balances, stock movements, purchase receipts, production consumption, waste, expiration, inventory adjustments, production batches, planned versus actual production, and theoretical versus actual consumption.

#### Workstream F — Dashboard, Reports, and Simulations

Implement cost dashboard, profitability dashboard, ingredient price evolution, recipe cost evolution, margin reports, channel profitability, break-even analysis, scenario simulator, product ranking, alerts, and export to CSV, Excel, and PDF.

Each workstream must publish API contracts, data dependencies, test cases, and known limitations.

### Phase 6 — Continuous Cross-Review

Require the following reviews:

- Pricing Specialist reviews the Pricing Engine.
- Food Cost Specialist reviews Recipe and Ingredient calculations.
- Security Architect reviews authentication, permissions, environment configuration, and RLS.
- Data Architect reviews migrations and constraints.
- Accessibility Reviewer reviews all major screens.
- Mobile QA reviews every feature.
- Bug Hunter reviews all workflows.
- Calculation QA independently verifies formulas.
- DevOps Engineer reviews deployment reproducibility.

No review may be self-approved by the implementation agent.

### Phase 7 — Integration

Verify:

- Purchases update costs correctly.
- Ingredient cost changes affect dependent recipes.
- Sub-recipe changes affect parent recipes.
- Recipe version history remains intact.
- Production affects inventory.
- Packaging affects the correct channel.
- Taxes and commissions affect price calculations.
- Reports match transaction data.
- Dashboard totals match source records.
- User permissions are enforced in both interface and database.
- Multiple companies cannot access one another’s information.
- Preview and production environments point to the intended Supabase project configuration.

### Phase 8 — Deployment to Vercel

Deployment is mandatory and part of the implementation, not an optional recommendation.

Perform all required actions:

1. Confirm the project builds locally or in the available execution environment.
2. Resolve all TypeScript, lint, test, and production build failures.
3. Ensure the repository contains the correct package scripts and Vercel-compatible configuration.
4. Push all approved changes to `Taiwansz/receitas`.
5. Connect the GitHub repository to Vercel using the authorized Vercel account or session.
6. Create a Vercel project when one does not already exist.
7. Configure the framework, root directory, install command, build command, and output settings.
8. Configure all environment variables securely in Vercel.
9. Include only public Supabase values in variables exposed to the browser.
10. Keep privileged keys exclusively on trusted server-side execution paths.
11. Deploy a Preview environment and run smoke tests.
12. Fix all deployment, routing, authentication, database, and runtime errors.
13. Deploy the validated commit to Production.
14. Verify the production URL on desktop and mobile viewport sizes.
15. Test sign-up, sign-in, sign-out, password recovery, organization creation, ingredient creation, recipe creation, pricing, persistence, and authorization in production.
16. Confirm that page refresh does not remove data.
17. Confirm that direct routes work when opened or refreshed.
18. Confirm that no environment variable or secret is exposed in the browser bundle or repository.
19. Confirm that the final production deployment matches the final GitHub commit.
20. Record the production URL and deployment verification in the final report.

Do not finish with instructions telling the user how to deploy. Perform the deployment using the authorized credentials and sessions available to the agents.

### Phase 9 — Validation and Acceptance

Execute complete tests for at least the following scenarios:

1. Basic ingredient cost.
2. Ingredient with waste.
3. Recipe scaling for multiple quantities.
4. Sub-recipe usage.
5. Multiple sales channels.
6. Percentage-based taxes, fees, and margins.
7. Fixed and variable costs.
8. Purchase price change impact.
9. Production and inventory consumption.
10. Planned versus actual production.
11. Negative margin warnings.
12. Cross-organization permission isolation.
13. Historical integrity after recipe and cost changes.
14. Mobile usability.
15. Persistence after refresh, sign-out, and sign-in.
16. Vercel production routing and API access.
17. Production authentication callbacks.
18. Secret exposure scan.
19. Supabase RLS enforcement in production.
20. Production error and logging verification.

## 6. REQUIRED PRODUCT MODULES

The final system must include:

1. Dashboard.
2. Ingredients and inputs.
3. Measurement units and conversions.
4. Suppliers.
5. Purchases.
6. Historical prices.
7. Recipes.
8. Recipe versions.
9. Sub-recipes.
10. Packaging.
11. Direct and indirect labor.
12. Fixed and variable expenses.
13. Cost centers.
14. Sales channels.
15. Taxes and fees.
16. Pricing engine.
17. Production scaling.
18. Inventory.
19. Production batches.
20. Waste and losses.
21. Planned versus actual analysis.
22. Scenario simulator.
23. Break-even analysis.
24. Reports.
25. Alerts.
26. Import and export.
27. Attachments.
28. User management.
29. Roles and permissions.
30. Multiple companies and branches.
31. Audit history.
32. Settings.
33. Onboarding.
34. Backup and recovery readiness.

## 7. IMPORTANT DATA VARIABLES

### Ingredient Variables

- Purchase price.
- Purchase quantity.
- Purchase unit.
- Recipe unit.
- Gross weight.
- Net weight.
- Usable weight.
- Waste.
- Yield.
- Freight.
- Discount.
- Taxes.
- Additional fees.
- Supplier.
- Brand.
- Package quantity.
- Conversion factor.
- Current stock.
- Minimum stock.
- Expiration date.
- Cost method.
- Price history.

### Recipe Variables

- Ingredient quantities.
- Sub-recipes.
- Gross yield.
- Net yield.
- Portions.
- Portion size.
- Batch size.
- Preparation loss.
- Cooking loss.
- Unusable leftovers.
- Preparation time.
- Labor time.
- Packaging.
- Storage.
- Shelf life.
- Recipe version.
- Production quantity.

### Pricing Variables

- Ingredient cost.
- Packaging cost.
- Direct labor.
- Variable cost.
- Allocated fixed cost.
- Tax rate.
- Card fee.
- Marketplace commission.
- Delivery cost.
- Discount.
- Cashback.
- Royalty.
- Target margin.
- Minimum margin.
- Markup.
- Current price.
- Suggested price.
- Minimum price.
- Channel.
- Quantity tier.

### Operational Variables

- Rent.
- Electricity.
- Water.
- Gas.
- Internet.
- Salaries.
- Benefits.
- Payroll charges.
- Accounting.
- Marketing.
- Cleaning.
- Maintenance.
- Insurance.
- Software.
- Depreciation.
- Administrative costs.
- Monthly working hours.
- Production capacity.

## 8. DATABASE MINIMUM ENTITIES

Create normalized, secure, and auditable entities for:

- Organizations.
- Branches.
- Users.
- Memberships.
- Roles.
- Permissions.
- Suppliers.
- Ingredients.
- Ingredient categories.
- Measurement units.
- Unit conversions.
- Ingredient-supplier relationships.
- Ingredient price history.
- Purchases.
- Purchase items.
- Recipes.
- Recipe versions.
- Recipe ingredients.
- Recipe sub-recipes.
- Packaging items.
- Recipe packaging.
- Expenses.
- Cost centers.
- Allocation rules.
- Sales channels.
- Channel fees.
- Taxes.
- Pricing rules.
- Product prices.
- Inventory locations.
- Inventory balances.
- Stock movements.
- Production batches.
- Production consumption.
- Production losses.
- Scenarios.
- Alerts.
- Attachments.
- Audit logs.

Add constraints, indexes, status fields, timestamps, organization ownership, and soft-deletion strategies where appropriate.

## 9. TECHNICAL STANDARDS

The system must:

- Use TypeScript with strict typing.
- Avoid untyped business objects.
- Use a component-based frontend architecture.
- Use PostgreSQL through Supabase.
- Use Supabase Auth and Storage.
- Use Row Level Security.
- Use versioned database migrations.
- Use decimal-safe financial calculations.
- Store currency and quantity values consistently.
- Document rounding rules.
- Validate all monetary and quantity inputs.
- Prevent negative or impossible values where not allowed.
- Use transactions for multi-step financial operations.
- Use reusable calculation services.
- Include automated tests.
- Include clear error boundaries.
- Include loading, empty, error, warning, and success states.
- Support Brazilian currency and date formats.
- Keep the architecture ready for localization.
- Work correctly on desktop and mobile.
- Persist all saved data.
- Avoid fake backend implementations.
- Be compatible with Vercel production deployment.
- Use secure environment validation at startup or build time.
- Include `.env.example` containing variable names and safe descriptions only.
- Include `.gitignore` rules that prevent accidental secret commits.

## 10. QUALITY GATES

### Gate 1 — Requirements Approved

- All modules mapped.
- Business rules documented.
- Acceptance criteria created.
- Missing variables identified.

### Gate 2 — Architecture Approved

- Database reviewed.
- Security reviewed.
- Calculation architecture reviewed.
- RLS strategy approved.
- Deployment architecture approved.

### Gate 3 — Design Approved

- Critical journeys designed.
- Responsive behavior defined.
- Accessibility reviewed.

### Gate 4 — Foundation Approved

- Authentication works.
- Organization isolation works.
- Data persists.
- Migrations work.
- Shared services exist.
- Production build succeeds.

### Gate 5 — Feature Complete

- Every module implemented.
- No placeholder buttons.
- No fake functionality.
- No broken navigation.
- No unsaved forms.

### Gate 6 — Calculation Validated

- Formulas independently verified.
- Rounding verified.
- Margin and markup verified.
- Edge cases tested.

### Gate 7 — Security Validated

- RLS tested.
- Role permissions tested.
- Cross-company data leakage tested.
- Secrets reviewed.
- Client bundle reviewed for private variables.

### Gate 8 — Deployment Validated

- Vercel Preview build succeeds.
- Production build succeeds.
- Environment variables are configured.
- Authentication callbacks work.
- Database access works.
- Direct routes work after refresh.
- Production smoke tests pass.

### Gate 9 — Release Approved

- Final commit pushed.
- Production deployment completed.
- Migrations succeed.
- Documentation exists.
- Rollback plan exists.
- Production URL verified.

## 11. DEFINITION OF DONE

The project is only complete when:

- The application is functional end to end.
- Data is stored in the cloud.
- Data survives page refresh and new login sessions.
- Users can register real ingredients, purchases, recipes, and costs.
- Unit conversions work.
- Yield and waste affect costs correctly.
- Sub-recipes work.
- Production scaling works.
- Sales-channel pricing works.
- Taxes and percentage fees are mathematically correct.
- Inventory movements work.
- Production consumes stock.
- Historical information remains available.
- Reports match stored data.
- Permissions are enforced by the database.
- Mobile workflows are usable.
- Automated tests cover critical calculations.
- The Bug Hunter has no unresolved critical or high-priority issue.
- The latest approved code is committed to `Taiwansz/receitas`.
- The application is deployed to Vercel Production.
- The production URL has passed smoke testing.
- No secret is present in GitHub history, source files, logs, or the client bundle.
- The Release Manager has approved the deployment.

## 12. FINAL DELIVERY PACKAGE

The final repository and release must include:

1. Functional application.
2. Source code.
3. Database migrations.
4. RLS policies.
5. `.env.example` without secret values.
6. Setup instructions.
7. Deployment instructions for reproducibility.
8. Architecture documentation.
9. Database documentation.
10. Calculation formula documentation.
11. Permission matrix.
12. Test report.
13. Known limitations.
14. Release notes.
15. Requirements traceability report.
16. Architecture Decision Log.
17. List of assumptions.
18. Future integration recommendations.
19. Vercel project configuration documentation.
20. Verified production URL.
21. Final GitHub commit SHA.
22. Deployment and smoke-test report.

The final delivery report must clearly state:

- What was implemented.
- Which agents and teams participated.
- Which reviews were completed.
- Which tests were executed.
- Which defects were found and corrected.
- Which assumptions were made.
- Which GitHub commit is deployed.
- Which Vercel production URL is active.
- Whether any requirement remains incomplete.

Never claim completion when critical functionality is mocked, partially implemented, disconnected from the database, untested, not committed to GitHub, or not deployed successfully to Vercel.