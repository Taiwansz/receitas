"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Basket,
  Buildings,
  Calculator,
  ChartBar,
  ClipboardText,
  Factory,
  Gear,
  House,
  List,
  Package,
  Receipt,
  SignOut,
  Storefront,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/domain";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { IngredientsPage } from "@/features/ingredients/ingredients-page";
import { ResourcePage } from "@/features/resources/resource-page";
import { RecipesPage } from "@/features/recipes/recipes-page";
import { PricingPage } from "@/features/pricing/pricing-page";
import { ReportsPage } from "@/features/reports/reports-page";
import {
  InventoryPage,
  ProductionPage,
  PurchasesPage,
} from "@/features/operations/operations-pages";

const nav = [
  { id: "dashboard", label: "Visão geral", icon: House, group: "Operação" },
  { id: "ingredients", label: "Ingredientes", icon: Basket, group: "Operação" },
  {
    id: "suppliers",
    label: "Fornecedores",
    icon: Storefront,
    group: "Operação",
  },
  { id: "purchases", label: "Compras", icon: Receipt, group: "Operação" },
  { id: "recipes", label: "Receitas", icon: ClipboardText, group: "Produção" },
  { id: "packaging", label: "Embalagens", icon: Package, group: "Produção" },
  {
    id: "production",
    label: "Lotes de produção",
    icon: Factory,
    group: "Produção",
  },
  { id: "inventory", label: "Estoque", icon: Archive, group: "Produção" },
  {
    id: "expenses",
    label: "Custos operacionais",
    icon: Wallet,
    group: "Financeiro",
  },
  {
    id: "channels",
    label: "Canais de venda",
    icon: Storefront,
    group: "Financeiro",
  },
  {
    id: "pricing",
    label: "Precificação",
    icon: Calculator,
    group: "Financeiro",
  },
  { id: "reports", label: "Relatórios", icon: ChartBar, group: "Financeiro" },
  { id: "users", label: "Equipe", icon: Users, group: "Administração" },
  {
    id: "settings",
    label: "Configurações",
    icon: Gear,
    group: "Administração",
  },
] as const;

const titles: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: "Visão geral",
    description: "Custos, margem e operação em um só lugar.",
  },
  ingredients: {
    title: "Ingredientes",
    description: "Custos, rendimentos e níveis de estoque.",
  },
  suppliers: {
    title: "Fornecedores",
    description: "Contatos e condições de fornecimento.",
  },
  purchases: {
    title: "Compras",
    description: "Entradas, preços e documentos de compra.",
  },
  recipes: {
    title: "Receitas",
    description: "Fichas técnicas, versões, porções e custos.",
  },
  packaging: {
    title: "Embalagens",
    description: "Itens usados na produção e por canal.",
  },
  production: {
    title: "Lotes de produção",
    description: "Planejado, realizado, consumo e perdas.",
  },
  inventory: {
    title: "Estoque",
    description: "Saldos, movimentos, validade e ajustes.",
  },
  expenses: {
    title: "Custos operacionais",
    description: "Despesas fixas, variáveis e centros de custo.",
  },
  channels: {
    title: "Canais de venda",
    description: "Loja, delivery, marketplaces e atacado.",
  },
  pricing: {
    title: "Precificação",
    description: "Preço mínimo, preço sugerido e margem por canal.",
  },
  reports: {
    title: "Relatórios",
    description: "Análises financeiras e exportações.",
  },
  users: { title: "Equipe", description: "Acessos, papéis e permissões." },
  settings: {
    title: "Configurações",
    description: "Empresa, unidades e preferências.",
  },
};

export function AppShell({
  user,
  workspace,
  section,
}: {
  user: User;
  workspace: Workspace;
  section: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const current = titles[section] ? section : "dashboard";
  const meta = titles[current];
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      {open && (
        <button
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[276px] bg-[#173f2d] text-white transition-transform lg:sticky lg:top-0 lg:w-auto lg:h-[100dvh] ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-full flex flex-col">
          <div className="h-[72px] flex items-center justify-between px-5 border-b border-white/10">
            <span className="text-xl font-extrabold tracking-[-.05em]">
              custiva
            </span>
            <button
              className="lg:hidden p-2"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav
            className="flex-1 overflow-y-auto px-3 py-4"
            aria-label="Navegação principal"
          >
            {["Operação", "Produção", "Financeiro", "Administração"].map(
              (group) => (
                <div key={group} className="mb-5">
                  <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#9bb8a8]">
                    {group}
                  </p>
                  {nav
                    .filter((i) => i.group === group)
                    .map((item) => {
                      const Icon = item.icon;
                      const active = item.id === current;
                      return (
                        <Link
                          onClick={() => setOpen(false)}
                          key={item.id}
                          href={`/app/${item.id}`}
                          className={`mb-1 flex min-h-10 items-center gap-3 rounded-[9px] px-3 text-sm font-semibold ${active ? "bg-white text-[#173f2d]" : "text-[#d8e4dc] hover:bg-white/10 hover:text-white"}`}
                        >
                          <Icon
                            size={18}
                            weight={active ? "fill" : "regular"}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              ),
            )}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button
              className="w-full flex items-center gap-3 rounded-[9px] px-3 py-2 text-left hover:bg-white/10"
              onClick={signOut}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {user.user_metadata.full_name ?? user.email}
                </div>
                <div className="truncate text-xs text-[#9bb8a8]">
                  {workspace.organizationName}
                </div>
              </div>
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 min-h-[72px] flex items-center gap-3 border-b border-[var(--line)] bg-white/95 px-4 md:px-7 backdrop-blur">
          <button
            aria-label="Abrir menu"
            className="btn btn-secondary !p-2 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <List size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-[-.025em]">
              {meta.title}
            </h1>
            <p className="hidden sm:block truncate text-xs text-[var(--muted)]">
              {meta.description}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-[var(--muted)]">
            <Buildings size={17} />
            {workspace.branchName ?? workspace.organizationName}
          </div>
        </header>
        <main className="p-4 md:p-7 xl:p-9">
          <Section section={current} workspace={workspace} />
        </main>
      </div>
    </div>
  );
}

function Section({
  section,
  workspace,
}: {
  section: string;
  workspace: Workspace;
}) {
  if (section === "dashboard") return <DashboardPage workspace={workspace} />;
  if (section === "ingredients")
    return <IngredientsPage workspace={workspace} />;
  if (section === "purchases") return <PurchasesPage workspace={workspace} />;
  if (section === "recipes") return <RecipesPage workspace={workspace} />;
  if (section === "production") return <ProductionPage workspace={workspace} />;
  if (section === "inventory") return <InventoryPage workspace={workspace} />;
  if (section === "pricing") return <PricingPage workspace={workspace} />;
  if (section === "reports") return <ReportsPage workspace={workspace} />;
  return <ResourcePage section={section} workspace={workspace} />;
}
