# Known limitations

- Production consumption currently expands direct recipe ingredients. Recursive stock explosion for sub-recipes is not yet included.
- Finished-product and packaging stock are modeled but not increased or consumed by the current production RPC.
- When a user belongs to multiple companies, the most recently joined active membership is selected. Workspace switching is not yet exposed in the interface.
- Team membership is visible and protected by RBAC; invitation delivery and role editing require an authenticated administrative backend flow not included in this release.
- Hosted migrations, RLS inventory and private bucket configuration were validated on Supabase; two-tenant adversarial RLS, Auth callback and authenticated Storage drills remain pending.
- The Vercel deployment is public and its login smoke passed, but project-level environment persistence, complete authenticated browser E2E and Auth callback allowlisting remain pending.
- The shared Supabase project still has two legacy barbershop backup tables without RLS and legacy `SECURITY DEFINER` warnings; they were preserved because they are outside the Custiva schema scope.
