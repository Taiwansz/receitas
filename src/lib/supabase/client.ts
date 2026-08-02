import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  browserClient ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
