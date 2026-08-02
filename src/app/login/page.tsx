import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
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
    <main className="min-h-[100dvh] grid bg-[var(--brand-cream)] lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,540px)]">
      <section className="brand-panel relative hidden min-h-[100dvh] overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <BrandLockup className="relative z-[1]" />
        <div className="relative z-[1] max-w-[620px] pb-6 xl:pb-10">
          <p className="brand-display text-sm font-extrabold uppercase tracking-[.12em] text-[#680b11]">
            Gestão feita para a nossa cozinha
          </p>
          <h1 className="brand-display mt-4 max-w-[560px] text-5xl font-black uppercase leading-[.92] tracking-[-.045em] text-[#8f1018] xl:text-6xl">
            Receita boa também precisa dar lucro.
          </h1>
          <p className="mt-5 max-w-[490px] text-lg font-semibold leading-7 text-[#52271d]">
            Ingredientes, produção, estoque e preço de venda no mesmo lugar.
          </p>
        </div>
        <Image
          src="/brand/andre-mascot.png"
          alt="Mascote André da Empada acenando"
          width={1254}
          height={1254}
          priority
          sizes="(min-width: 1280px) 520px, 42vw"
          className="absolute bottom-[-7%] right-[-7%] z-[1] h-auto w-[48vw] max-w-[600px] drop-shadow-[0_18px_20px_rgba(104,11,17,.18)]"
        />
      </section>
      <section className="flex items-center justify-center bg-[var(--surface)] px-5 py-10 sm:px-8">
        <div className="w-full max-w-[390px]">
          <BrandLockup className="mb-10 lg:hidden" />
          {!isSupabaseConfigured ? (
            <div className="panel border-[#e2bc69] bg-[#fff6df] p-6">
              <h1 className="text-xl font-bold">Configuração necessária</h1>
              <p className="mt-2 text-sm leading-6 text-[#68482c]">
                Adicione as variáveis públicas do Supabase descritas no arquivo{" "}
                <code>.env.example</code> para habilitar autenticação e
                persistência.
              </p>
            </div>
          ) : (
            <>
              <h1 className="brand-display text-4xl font-extrabold leading-none tracking-[-.025em] text-[#6d0c13]">
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
                  className="mt-5 rounded-[12px] bg-[#fde7e2] p-3 text-sm font-semibold text-[#8d2118]"
                >
                  {query.error}
                </p>
              )}
              {query.sent && (
                <p
                  role="status"
                  className="mt-5 rounded-[12px] bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[#6d0c13]"
                >
                  Conta criada. Confirme o e-mail para acessar.
                </p>
              )}
              {query.recovery && (
                <p
                  role="status"
                  className="mt-5 rounded-[12px] bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[#6d0c13]"
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
