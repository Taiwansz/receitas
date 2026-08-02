"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Buildings, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { MembershipRole, Workspace } from "@/lib/domain";
import { AppShell } from "./app-shell";
import { BrandLockup } from "./brand-lockup";

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
      <div className="brand-panel relative min-h-[100dvh] grid place-items-center p-6">
        <div className="panel relative z-[1] flex items-center gap-4 px-5 py-4 text-sm font-bold text-[var(--accent)]">
          <SpinnerGap className="animate-spin" size={22} />
          Preparando sua cozinha...
        </div>
      </div>
    );
  if (error)
    return (
      <div className="brand-panel relative min-h-[100dvh] grid place-items-center p-6">
        <div className="panel relative z-[1] max-w-lg p-6">
          <BrandLockup compact className="mb-6" />
          <h1 className="brand-display text-2xl font-extrabold text-[#6d0c13]">
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
    <main className="brand-panel relative min-h-[100dvh] grid place-items-center overflow-hidden p-5">
      <section className="panel w-full max-w-2xl overflow-hidden">
        <div className="relative overflow-hidden border-b border-[#5f0a10] bg-[#8f1018] p-7 text-[#fff4dc] md:p-10">
          <BrandLockup compact inverse className="mb-7" />
          <Buildings size={30} className="text-[#ffcb32]" />
          <h1 className="brand-display mt-5 text-4xl font-extrabold leading-none tracking-[-.025em]">
            Vamos configurar sua operação
          </h1>
          <p className="mt-3 max-w-xl text-[#ffe5b7]">
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
          <div className="rounded-[12px] bg-[var(--accent-soft)] p-4 text-sm font-semibold leading-6 text-[#6d0c13]">
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
