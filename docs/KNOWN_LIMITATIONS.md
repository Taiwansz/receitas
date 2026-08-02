# Known limitations

- Production consumption currently expands direct recipe ingredients. Recursive stock explosion for sub-recipes is not yet included.
- Finished-product and packaging stock are modeled but not increased or consumed by the current production RPC.
- When a user belongs to multiple companies, the most recently joined active membership is selected. Workspace switching is not yet exposed in the interface.
- Team membership is visible and protected by RBAC; invitation delivery and role editing require an authenticated administrative backend flow not included in this release.
- Final hosted RLS, Auth, Storage and backup-restore drills remain dependent on a real Supabase project.
- Production deployment and browser smoke remain dependent on an authenticated Vercel project and configured environment variables.
