"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, mode: "login" | "signup" = "login") {
  redirect(`/login?mode=${mode}&error=${encodeURIComponent(message)}`);
}

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL?.trim();
  return vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) fail("Preencha e-mail e senha.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("Não foi possível entrar. Verifique seus dados de e-mail e senha.");
  redirect("/app");
}

export async function signUp(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 8)
    fail(
      "Informe nome, e-mail e uma senha com pelo menos 8 caracteres.",
      "signup",
    );
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });
  if (error) {
    const msg = error.message?.includes("already registered")
      ? "Este e-mail já está cadastrado. Tente fazer login."
      : error.message || "Não foi possível criar a conta. Tente novamente.";
    fail(msg, "signup");
  }
  if (!data.session) {
    fail(
      "A conta foi criada com sucesso! Caso a confirmação de e-mail esteja ativada, verifique sua caixa de entrada.",
      "signup",
    );
  }
  redirect("/app");
}

export async function requestRecovery(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) fail("Informe seu e-mail.");
  const supabase = await createClient();
  const origin = siteOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  redirect("/login?recovery=1");
}
