"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Basket,
  Calculator,
  ChartLineUp,
  Warning,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type { DashboardMetrics, Workspace } from "@/lib/domain";
import { brl, decimal } from "@/lib/format";

const empty: DashboardMetrics = {
  ingredients: 0,
  recipes: 0,
  lowStock: 0,
  averageMargin: 0,
  monthlyPurchases: 0,
  inventoryValue: 0,
};

export function DashboardPage({ workspace }: { workspace: Workspace }) {
  const [metrics, setMetrics] = useState(empty);
  const [ingredients, setIngredients] = useState<
    {
      name: string;
      current_stock: number;
      minimum_stock: number;
      current_cost: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const s = createClient();
    const org = workspace.organizationId;
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();
    const [i, summary, purchases, recipes] = await Promise.all([
      s
        .from("ingredients_app")
        .select("name,current_stock,minimum_stock,current_cost")
        .eq("organization_id", org)
        .eq("active", true),
      s
        .from("dashboard_metrics_app")
        .select("ingredient_count,active_recipe_count,inventory_value")
        .eq("organization_id", org)
        .maybeSingle(),
      s
        .from("purchase_items")
        .select(
          "gross_quantity,unit_price,discount_amount,freight_amount,tax_amount,additional_fee_amount,purchases!inner(purchased_at)",
        )
        .eq("organization_id", org)
        .gte("purchases.purchased_at", monthStart),
      s
        .from("recipe_summaries_app")
        .select("margin_percentage")
        .eq("organization_id", org)
        .eq("active", true),
    ]);
    for (const result of [i, summary, purchases, recipes]) {
      if (result.error) toast.error(result.error.message);
    }
    const rows = (i.data ?? []) as typeof ingredients;
    const priceRows = (recipes.data ?? []) as {
      margin_percentage: number | null;
    }[];
    const purchaseRows = (purchases.data ?? []) as unknown as {
      gross_quantity: number;
      unit_price: number;
      discount_amount: number;
      freight_amount: number;
      tax_amount: number;
      additional_fee_amount: number;
    }[];
    const margins = priceRows
      .filter((v) => v.margin_percentage != null)
      .map((v) => Number(v.margin_percentage));
    const summaryRow = summary.data as {
      ingredient_count: number;
      active_recipe_count: number;
      inventory_value: number;
    } | null;
    setIngredients(rows);
    setMetrics({
      ingredients: Number(summaryRow?.ingredient_count ?? rows.length),
      recipes: Number(summaryRow?.active_recipe_count ?? 0),
      lowStock: rows.filter(
        (v) => Number(v.current_stock) <= Number(v.minimum_stock),
      ).length,
      averageMargin: margins.length
        ? margins.reduce((a: number, b: number) => a + b, 0) / margins.length
        : 0,
      monthlyPurchases: purchaseRows.reduce(
        (total, row) =>
          total +
          Number(row.gross_quantity) * Number(row.unit_price) -
          Number(row.discount_amount) +
          Number(row.freight_amount) +
          Number(row.tax_amount) +
          Number(row.additional_fee_amount),
        0,
      ),
      inventoryValue: Number(summaryRow?.inventory_value ?? 0),
    });
    setLoading(false);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const chart = useMemo(
    () =>
      [...ingredients]
        .sort((a, b) => Number(b.current_cost) - Number(a.current_cost))
        .slice(0, 7)
        .map((v) => ({
          name: v.name.length > 12 ? `${v.name.slice(0, 11)}…` : v.name,
          custo: Number(v.current_cost),
        })),
    [ingredients],
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <Metric
          loading={loading}
          label="Valor em estoque"
          value={brl.format(metrics.inventoryValue)}
          icon={Basket}
          strong
        />
        <Metric
          loading={loading}
          label="Compras no mês"
          value={brl.format(metrics.monthlyPurchases)}
          icon={ArrowDown}
        />
        <Metric
          loading={loading}
          label="Margem média"
          value={`${decimal.format(metrics.averageMargin)}%`}
          icon={ChartLineUp}
        />
        <Metric
          loading={loading}
          label="Estoque baixo"
          value={String(metrics.lowStock)}
          icon={Warning}
          warning={metrics.lowStock > 0}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)]">
        <section className="panel min-h-[360px] p-5 md:p-6">
          <div className="mb-6">
            <h2 className="font-bold">Ingredientes de maior custo</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Custo atual por unidade base.
            </p>
          </div>
          {chart.length ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={chart}>
                <CartesianGrid vertical={false} stroke="#eadcc4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6d594c" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6d594c" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => brl.format(Number(v))} />
                <Bar dataKey="custo" fill="#8f1018" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="Cadastre ingredientes para acompanhar os principais custos." />
          )}
        </section>
        <section className="panel p-5 md:p-6">
          <div>
            <h2 className="font-bold">Saúde da operação</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pontos que pedem atenção.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Health
              label="Ingredientes cadastrados"
              value={metrics.ingredients}
              good={metrics.ingredients > 0}
            />
            <Health
              label="Receitas cadastradas"
              value={metrics.recipes}
              good={metrics.recipes > 0}
            />
            <Health
              label="Itens abaixo do mínimo"
              value={metrics.lowStock}
              good={metrics.lowStock === 0}
            />
            <Health
              label="Margem média positiva"
              value={`${decimal.format(metrics.averageMargin)}%`}
              good={metrics.averageMargin > 0}
            />
          </div>
          <Link className="btn btn-secondary mt-6 w-full" href="/app/pricing">
            <Calculator size={18} />
            Simular preço
          </Link>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  strong,
  warning,
  loading,
}: {
  label: string;
  value: string;
  icon: typeof ArrowUp;
  strong?: boolean;
  warning?: boolean;
  loading: boolean;
}) {
  return (
    <div
      className={`panel p-5 transition-shadow ${
        strong
          ? "border-[#e6a100] bg-[#ffc629] text-black shadow-md"
          : "bg-[var(--surface)] text-[var(--ink)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            strong ? "text-black font-extrabold" : "text-[var(--muted)]"
          }`}
        >
          {label}
        </span>
        <Icon
          size={22}
          className={
            warning
              ? "text-[#d97706]"
              : strong
                ? "text-black"
                : "text-[var(--accent)]"
          }
        />
      </div>
      <div
        className={`numeric mt-4 text-3xl font-extrabold tracking-tight ${
          strong ? "text-black" : "text-[var(--ink)]"
        } ${loading ? "animate-pulse opacity-30" : ""}`}
      >
        {loading ? "--" : value}
      </div>
    </div>
  );
}
function Health({
  label,
  value,
  good,
}: {
  label: string;
  value: string | number;
  good: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] bg-[#fff6df] p-3">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${good ? "bg-[#ffcb32] text-[#5f0a10]" : "bg-[#fde4ca] text-[#9a4808]"}`}
      >
        {good ? "✓" : "!"}
      </span>
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <strong className="numeric text-sm">{value}</strong>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="h-[260px] grid place-items-center rounded-[12px] border border-dashed border-[#d5bd95] bg-[#fff9ec] p-8 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}
