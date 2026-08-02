"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, FloppyDisk, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { RecipeSummary, Workspace } from "@/lib/domain";
import { brl } from "@/lib/format";
import { calculatePricing, calculateProfitability } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";

type Channel = {
  id: string;
  name: string;
  percentage_fees: number;
  fixed_fee: number;
  active: boolean;
};
export function PricingPage({ workspace }: { workspace: Workspace }) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [packaging, setPackaging] = useState(0);
  const [labor, setLabor] = useState(0);
  const [overhead, setOverhead] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [fees, setFees] = useState(0);
  const [margin, setMargin] = useState(25);
  const [currentPrice, setCurrentPrice] = useState(0);
  useEffect(() => {
    const s = createClient();
    void Promise.all([
      s
        .from("recipe_summaries_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .order("name"),
      s
        .from("sales_channels_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .eq("active", true)
        .order("name"),
    ]).then(([r, c]) => {
      setRecipes((r.data ?? []) as RecipeSummary[]);
      setChannels((c.data ?? []) as Channel[]);
      if (r.data?.[0]) setRecipeId(String(r.data[0].id));
      if (c.data?.[0]) setChannelId(String(c.data[0].id));
    });
  }, [workspace.organizationId]);
  const recipe = recipes.find((r) => r.id === recipeId);
  const channel = channels.find((c) => c.id === channelId);
  const result = useMemo(() => {
    try {
      const cost = Number(recipe?.unit_cost ?? 0);
      const charges = [
        { id: "taxes", rate: taxes / 100 },
        {
          id: "fees",
          rate: (fees + Number(channel?.percentage_fees ?? 0)) / 100,
        },
      ];
      const price = calculatePricing({
        monetaryCosts: [cost, packaging, labor, overhead],
        fixedSaleCharges: [Number(channel?.fixed_fee ?? 0)],
        percentageCharges: charges,
        targetMargin: margin / 100,
      });
      const profitability =
        currentPrice > 0
          ? calculateProfitability({
              sellingPrice: currentPrice,
              productCost: cost,
              variableMonetaryCosts: [
                packaging,
                labor,
                Number(channel?.fixed_fee ?? 0),
              ],
              fixedAllocatedCosts: [overhead],
              percentageCharges: charges,
            })
          : null;
      return { price, profitability, error: null };
    } catch (e) {
      return {
        price: null,
        profitability: null,
        error: e instanceof Error ? e.message : "Parâmetros inválidos.",
      };
    }
  }, [
    recipe,
    channel,
    packaging,
    labor,
    overhead,
    taxes,
    fees,
    margin,
    currentPrice,
  ]);
  async function save() {
    if (!recipe || !result.price) return;
    const { error } = await createClient().rpc("save_product_price_v2", {
      p_recipe_id: recipe.id,
      p_channel_id: channelId || null,
      p_price: Number(
        result.price.suggestedSellingPrice.toDecimalPlaces(2).toString(),
      ),
      p_target_margin: margin,
      p_minimum_price: Number(
        result.price.minimumPriceWithoutLoss.toDecimalPlaces(2).toString(),
      ),
      p_extra_monetary_cost: packaging + labor + overhead,
      p_additional_percentage_rate: taxes + fees,
      p_notes:
        "Calculado pelo motor Custiva com snapshots dos componentes adicionais.",
    });
    if (error) toast.error(error.message);
    else toast.success("Preço salvo com histórico.");
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="panel p-5 md:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Calculator size={22} />
          </span>
          <div>
            <h2 className="font-bold">Composição do preço</h2>
            <p className="text-sm text-[var(--muted)]">
              Percentuais são calculados pelo divisor correto.
            </p>
          </div>
        </div>
        {!recipes.length ? (
          <div className="mt-7 rounded-[12px] border border-dashed border-[#cad2cb] p-8 text-center text-sm text-[var(--muted)]">
            Cadastre uma receita antes de calcular seu preço.
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Select
              label="Receita"
              value={recipeId}
              onChange={setRecipeId}
              options={recipes.map((r) => ({ value: r.id, label: r.name }))}
            />
            <Select
              label="Canal de venda"
              value={channelId}
              onChange={setChannelId}
              options={[
                { value: "", label: "Venda direta" },
                ...channels.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <NumberField
              label="Embalagem por venda"
              value={packaging}
              onChange={setPackaging}
            />
            <NumberField
              label="Mão de obra direta"
              value={labor}
              onChange={setLabor}
            />
            <NumberField
              label="Custo fixo alocado"
              value={overhead}
              onChange={setOverhead}
            />
            <NumberField
              label="Impostos (%)"
              value={taxes}
              onChange={setTaxes}
            />
            <NumberField
              label="Outras taxas (%)"
              value={fees}
              onChange={setFees}
            />
            <NumberField
              label="Margem desejada (%)"
              value={margin}
              onChange={setMargin}
            />
            <NumberField
              label="Preço atual (opcional)"
              value={currentPrice}
              onChange={setCurrentPrice}
            />
          </div>
        )}
        {result.error && (
          <p
            role="alert"
            className="mt-5 flex items-center gap-2 rounded-[10px] bg-[#fff0ee] p-4 text-sm text-[#8d2118]"
          >
            <Warning size={19} />
            {result.error}
          </p>
        )}
      </section>
      <aside className="space-y-5">
        <section className="panel overflow-hidden">
          <div className="bg-[#173f2d] p-6 text-white">
            <p className="text-sm text-[#bdd2c5]">Preço sugerido</p>
            <strong className="numeric mt-2 block text-4xl tracking-[-.04em]">
              {result.price
                ? brl.format(
                    Number(
                      result.price.suggestedSellingPrice
                        .toDecimalPlaces(2)
                        .toString(),
                    ),
                  )
                : "-"}
            </strong>
            <p className="mt-3 text-xs text-[#bdd2c5]">
              Para {margin}% de margem após taxas e custos informados.
            </p>
          </div>
          <dl className="grid gap-4 p-6 text-sm">
            <Line
              label="Custo da receita"
              value={brl.format(Number(recipe?.unit_cost ?? 0))}
            />
            <Line
              label="Preço mínimo sem prejuízo"
              value={
                result.price
                  ? brl.format(
                      Number(
                        result.price.minimumPriceWithoutLoss
                          .toDecimalPlaces(2)
                          .toString(),
                      ),
                    )
                  : "-"
              }
            />
            <Line
              label="Markup multiplicador"
              value={
                result.price?.markupMultiplier
                  ? `${result.price.markupMultiplier.toDecimalPlaces(3).toString()}x`
                  : "-"
              }
            />
            <Line
              label="Divisor"
              value={
                result.price
                  ? result.price.markupDivisor.toDecimalPlaces(4).toString()
                  : "-"
              }
            />
            {result.profitability && (
              <>
                <Line
                  label="Lucro líquido no preço atual"
                  value={brl.format(
                    Number(
                      result.profitability.estimatedNetProfit
                        .toDecimalPlaces(2)
                        .toString(),
                    ),
                  )}
                />
                <Line
                  label="Margem líquida atual"
                  value={`${result.profitability.netMargin.times(100).toDecimalPlaces(2).toString()}%`}
                />
              </>
            )}
          </dl>
          <div className="p-6 pt-0">
            <button
              className="btn btn-primary w-full"
              disabled={!recipe || !result.price}
              onClick={() => void save()}
            >
              <FloppyDisk size={18} />
              Salvar preço
            </button>
          </div>
        </section>
        <div className="rounded-[12px] border border-[#d8e3da] bg-[#edf5f0] p-4 text-sm leading-6 text-[#315a43]">
          <strong>Margem não é markup.</strong> A margem mede o lucro sobre a
          venda. O markup mede quanto o preço representa sobre o custo.
        </div>
      </aside>
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="control numeric"
        type="number"
        min="0"
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select
        className="control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="numeric font-semibold text-right">{value}</dd>
    </div>
  );
}
