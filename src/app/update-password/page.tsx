"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandLockup } from "@/components/brand-lockup";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function update(form: FormData) {
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password.length < 8 || password !== confirmation) {
      toast.error("As senhas devem coincidir e ter pelo menos 8 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada.");
      router.replace("/app");
    }
    setSaving(false);
  }
  return (
    <main className="brand-panel relative min-h-[100dvh] grid place-items-center overflow-hidden p-5">
      <section className="panel relative z-[1] w-full max-w-md p-7 md:p-9">
        <BrandLockup compact />
        <h1 className="brand-display mt-8 text-3xl font-extrabold text-[#6d0c13]">
          Defina uma nova senha
        </h1>
        <form action={update} className="mt-6 grid gap-4">
          <label>
            <span className="label">Nova senha</span>
            <input
              className="control"
              type="password"
              name="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            <span className="label">Confirme a senha</span>
            <input
              className="control"
              type="password"
              name="confirmation"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <button disabled={saving} className="btn btn-primary">
            {saving ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
