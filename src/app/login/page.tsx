import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { requestRecovery, signIn, signUp } from "./actions";

export const metadata: Metadata = { title: "Acessar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const signup = query.mode === "signup";
  const recovery = query.mode === "recovery";
  return (
    <main className="min-h-[100dvh] grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] bg-[#e9efe9]">
      <section className="hidden lg:flex p-14 flex-col justify-between bg-[#163e2c] text-[#f4faf6]">
        <div className="text-xl font-extrabold tracking-[-.04em]">custiva</div>
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-bold text-[#a9cbb8]">
            GESTÃO DE CUSTOS PARA ALIMENTAÇÃO
          </p>
          <h1 className="text-5xl leading-[1.04] font-semibold tracking-[-.045em]">
            Da compra ao preço de venda, com cada centavo explicado.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#cadbd1]">
            Centralize ingredientes, receitas, estoque, produção e margem em uma
            operação financeira consistente.
          </p>
        </div>
        <p className="text-sm text-[#a9cbb8]">
          Dados isolados por empresa. Permissões aplicadas no banco.
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 text-xl font-extrabold tracking-[-.04em] text-[#176b45]">
            custiva
          </div>
          {!isSupabaseConfigured ? (
            <div className="panel p-6 border-[#e6bb79] bg-[#fffaf1]">
              <h1 className="text-xl font-bold">Configuração necessária</h1>
              <p className="mt-2 text-sm leading-6 text-[#6e5632]">
                Adicione as variáveis públicas do Supabase descritas no arquivo{" "}
                <code>.env.example</code> para habilitar autenticação e
                persistência.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold tracking-[-.035em]">
                {recovery
                  ? "Recupere seu acesso"
                  : signup
                    ? "Crie sua conta"
                    : "Acesse seu espaço"}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {recovery
                  ? "Informe seu e-mail para receber um link seguro."
                  : signup
                    ? "Comece com dados reais da sua empresa."
                    : "Use seu e-mail e senha para continuar."}
              </p>
              {query.error && (
                <p
                  role="alert"
                  className="mt-5 rounded-[10px] bg-[#fff0ee] p-3 text-sm text-[#8d2118]"
                >
                  {query.error}
                </p>
              )}
              {query.sent && (
                <p
                  role="status"
                  className="mt-5 rounded-[10px] bg-[var(--accent-soft)] p-3 text-sm text-[#175d3e]"
                >
                  Conta criada. Confirme o e-mail para acessar.
                </p>
              )}
              {query.recovery && (
                <p
                  role="status"
                  className="mt-5 rounded-[10px] bg-[var(--accent-soft)] p-3 text-sm text-[#175d3e]"
                >
                  Se o e-mail existir, enviaremos as instruções.
                </p>
              )}
              <form
                action={recovery ? requestRecovery : signup ? signUp : signIn}
                className="mt-7 space-y-4"
              >
                {signup && (
                  <label>
                    <span className="label">Seu nome</span>
                    <input
                      className="control"
                      name="name"
                      autoComplete="name"
                      required
                    />
                  </label>
                )}
                <label>
                  <span className="label">E-mail</span>
                  <input
                    className="control"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                {!recovery && (
                  <label>
                    <span className="label">Senha</span>
                    <input
                      className="control"
                      name="password"
                      type="password"
                      minLength={8}
                      autoComplete={
                        signup ? "new-password" : "current-password"
                      }
                      required
                    />
                  </label>
                )}
                <button className="btn btn-primary w-full" type="submit">
                  {recovery ? "Enviar link" : signup ? "Criar conta" : "Entrar"}
                </button>
              </form>
              {!signup && !recovery && (
                <Link
                  href="/login?mode=recovery"
                  className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              )}
              <p className="mt-8 text-sm text-[var(--muted)]">
                {signup || recovery
                  ? "Já tem uma conta?"
                  : "Ainda não tem conta?"}{" "}
                <Link
                  className="font-bold text-[var(--accent)] hover:underline"
                  href={signup || recovery ? "/login" : "/login?mode=signup"}
                >
                  {signup || recovery ? "Entrar" : "Criar conta"}
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
