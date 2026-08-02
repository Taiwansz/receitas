import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceGate } from "@/components/workspace-gate";

export const metadata: Metadata = { title: "Painel" };
export default async function AppPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { section = [] } = await params;
  return <WorkspaceGate user={user} section={section[0] ?? "dashboard"} />;
}
