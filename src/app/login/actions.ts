"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, mode: "login" | "signup" = "login") {
  redirect(`/login?mode=${mode}&error=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) fail("Preencha e-mail e senha.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("Não foi possível entrar. Verifique seus dados.");
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error)
    fail(
      "Não foi possível criar a conta. Tente novamente em alguns minutos.",
      "signup",
    );
  redirect("/login?sent=1");
}

export async function requestRecovery(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) fail("Informe seu e-mail.");
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  redirect("/login?recovery=1");
}
