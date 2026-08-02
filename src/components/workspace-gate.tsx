"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Buildings, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { MembershipRole, Workspace } from "@/lib/domain";
import { AppShell } from "./app-shell";

export function WorkspaceGate({
  user,
  section,
}: {
  user: User;
  section: string;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const result = await supabase.rpc("get_current_workspace");
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    const row = (Array.isArray(result.data) ? result.data[0] : result.data) as {
      organization_id: string;
      display_name: string;
      branch_id: string | null;
      branch_name: string | null;
      role: string;
    } | null;
    if (!row) {
      setLoading(false);
      return;
    }
    setWorkspace({
      organizationId: row.organization_id,
      organizationName: row.display_name,
      branchId: row.branch_id,
      branchName: row.branch_name,
      role: normalizeRole(row.role),
    });
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="min-h-[100dvh] grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <SpinnerGap className="animate-spin" size={20} />
          Carregando seu espaço...
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6">
        <div className="panel max-w-lg p-6">
          <h1 className="text-xl font-bold">
            Não foi possível carregar seus dados
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
          <button className="btn btn-primary mt-5" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  if (!workspace) return <Onboarding onDone={load} />;
  return <AppShell user={user} workspace={workspace} section={section} />;
}

function Onboarding({ onDone }: { onDone: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  async function createWorkspace(formData: FormData) {
    setSaving(true);
    const supabase = createClient();
    const name = String(formData.get("company") ?? "").trim();
    const branchName =
      String(formData.get("branch") ?? "Matriz").trim() || "Matriz";
    if (!name) {
      toast.error("Informe o nome da empresa.");
      setSaving(false);
      return;
    }
    const result = await supabase.rpc("create_workspace", {
      p_name: name,
      p_branch_name: branchName,
    });
    if (result.error) {
      toast.error(result.error.message);
      setSaving(false);
      return;
    }
    toast.success("Empresa criada com sucesso.");
    await onDone();
    setSaving(false);
  }
  return (
    <main className="min-h-[100dvh] grid place-items-center p-5 bg-[#e8efe9]">
      <section className="panel w-full max-w-2xl overflow-hidden">
        <div className="p-7 md:p-10 border-b border-[var(--line)] bg-[#173f2d] text-white">
          <Buildings size={30} />
          <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em]">
            Vamos configurar sua operação
          </h1>
          <p className="mt-3 max-w-xl text-[#c5d9cd]">
            Comece com seus dados reais. Nenhuma receita ou valor fictício será
            criado.
          </p>
        </div>
        <form action={createWorkspace} className="grid gap-5 p-7 md:p-10">
          <label>
            <span className="label">Nome da empresa</span>
            <input
              name="company"
              className="control"
              placeholder="Ex.: Lanchonete da família"
              required
            />
          </label>
          <label>
            <span className="label">Nome da primeira unidade</span>
            <input
              name="branch"
              className="control"
              defaultValue="Matriz"
              required
            />
          </label>
          <div className="rounded-[10px] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[#285842]">
            Moeda BRL, datas brasileiras e fuso de São Paulo serão usados
            inicialmente. Você poderá alterar essas preferências depois.
          </div>
          <button
            disabled={saving}
            className="btn btn-primary justify-self-start"
            type="submit"
          >
            {saving ? "Criando..." : "Criar meu espaço"}
          </button>
        </form>
      </section>
    </main>
  );
}

function normalizeRole(role: string): MembershipRole {
  if (role.includes("Owner")) return "owner";
  if (role.includes("Administrador")) return "admin";
  if (role.includes("Gestor")) return "manager";
  if (role.includes("Leitor")) return "viewer";
  return "operator";
}
