"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Ingredient, RecipeSummary, Workspace } from "@/lib/domain";
import { brl, decimal, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string };
type PurchaseItem = {
  ingredient_id: string;
  quantity: string;
  unit_price: string;
  unit_code: string;
};

export function PurchasesPage({ workspace }: { workspace: Workspace }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const s = createClient();
    const [p, su, ing] = await Promise.all([
      s
        .from("purchases")
        .select(
          "id,document_number,purchased_at,status,suppliers(legal_name),purchase_items(gross_quantity,unit_price,discount_amount,freight_amount,tax_amount,additional_fee_amount)",
        )
        .eq("organization_id", workspace.organizationId)
        .order("purchased_at", { ascending: false }),
      s
        .from("suppliers")
        .select("id,legal_name")
        .eq("organization_id", workspace.organizationId)
        .is("deleted_at", null)
        .order("legal_name"),
      s
        .from("ingredients_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .eq("active", true)
        .order("name"),
    ]);
    if (p.error) toast.error(p.error.message);
    else setRows((p.data ?? []) as Record<string, unknown>[]);
    setSuppliers(
      (su.data ?? []).map((x: { id: unknown; legal_name: unknown }) => ({
        id: String(x.id),
        name: String(x.legal_name),
      })),
    );
    setIngredients((ing.data ?? []) as Ingredient[]);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(form: FormData) {
    if (
      items.some(
        (i) =>
          !i.ingredient_id ||
          Number(i.quantity) <= 0 ||
          Number(i.unit_price) < 0,
      )
    ) {
      toast.error("Complete os itens da compra.");
      return;
    }
    const payload = items.map((i) => ({
      ...i,
      net_quantity: i.quantity,
      usable_quantity: i.quantity,
    }));
    const { error } = await createClient().rpc("register_purchase", {
      p_supplier_id: String(form.get("supplier_id") || "") || null,
      p_document: String(form.get("document") || "") || null,
      p_purchased_at: String(form.get("purchased_at")),
      p_items: payload,
      p_freight: String(form.get("freight") || "0"),
      p_tax: String(form.get("tax") || "0"),
      p_discount: String(form.get("discount") || "0"),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Compra recebida, custos e estoque atualizados.");
      setOpen(false);
      setItems([emptyItem()]);
      await load();
    }
  }
  return (
    <div className="space-y-5">
      <Toolbar
        title="Compras recebidas"
        action="Registrar compra"
        onClick={() => setOpen(true)}
      />
      <DataTable heads={["Documento", "Fornecedor", "Data", "Total", "Status"]}>
        {rows.map((r) => (
          <tr key={String(r.id)}>
            <Cell strong>{String(r.document_number ?? "Sem documento")}</Cell>
            <Cell>
              {String(
                (r.suppliers as { legal_name?: string } | null)?.legal_name ??
                  "Não informado",
              )}
            </Cell>
            <Cell>{shortDate.format(new Date(String(r.purchased_at)))}</Cell>
            <Cell numeric>{brl.format(purchaseTotal(r))}</Cell>
            <Cell>Recebida</Cell>
          </tr>
        ))}
      </DataTable>
      {!rows.length && (
        <Empty text="Registre uma compra com itens para atualizar custos e estoque." />
      )}
      {open && (
        <Drawer title="Registrar compra" close={() => setOpen(false)}>
          <form action={save} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="supplier_id"
                label="Fornecedor"
                options={suppliers}
              />
              <Field name="document" label="Documento" />
              <Field
                name="purchased_at"
                label="Data e hora"
                type="datetime-local"
                required
                defaultValue={localNow()}
              />
              <Field
                name="freight"
                label="Frete"
                type="number"
                step="0.01"
                defaultValue="0"
              />
              <Field
                name="tax"
                label="Impostos"
                type="number"
                step="0.01"
                defaultValue="0"
              />
              <Field
                name="discount"
                label="Desconto"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Itens</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setItems((v) => [...v, emptyItem()])}
                >
                  <Plus size={16} />
                  Linha
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-[10px] border border-[var(--line)] p-3 sm:grid-cols-[minmax(0,1fr)_100px_110px_70px_44px]"
                  >
                    <select
                      aria-label="Ingrediente"
                      className="control"
                      value={item.ingredient_id}
                      onChange={(e) =>
                        updateItem(setItems, index, {
                          ingredient_id: e.target.value,
                          unit_code:
                            ingredients.find((i) => i.id === e.target.value)
                              ?.base_unit ?? "g",
                        })
                      }
                    >
                      <option value="">Ingrediente</option>
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Quantidade"
                      className="control numeric"
                      type="number"
                      step="0.0001"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(setItems, index, {
                          quantity: e.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Preço unitário"
                      className="control numeric"
                      type="number"
                      step="0.0001"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(setItems, index, {
                          unit_price: e.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Unidade"
                      className="control"
                      value={item.unit_code}
                      onChange={(e) =>
                        updateItem(setItems, index, {
                          unit_code: e.target.value,
                        })
                      }
                    />
                    <button
                      aria-label="Remover item"
                      type="button"
                      className="btn btn-secondary !p-2"
                      onClick={() =>
                        setItems((v) => v.filter((_, i) => i !== index))
                      }
                    >
                      <Trash size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary">Receber compra</button>
          </form>
        </Drawer>
      )}
    </div>
  );
}

export function InventoryPage({ workspace }: { workspace: Workspace }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const s = createClient();
    const [m, i] = await Promise.all([
      s
        .from("stock_movements")
        .select(
          "id,movement_type,quantity,unit_cost_snapshot,resulting_quantity,occurred_at,ingredients(name)",
        )
        .eq("organization_id", workspace.organizationId)
        .order("occurred_at", { ascending: false })
        .limit(200),
      s
        .from("ingredients_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .eq("active", true)
        .order("name"),
    ]);
    if (m.error) toast.error(m.error.message);
    else setRows((m.data ?? []) as Record<string, unknown>[]);
    setIngredients((i.data ?? []) as Ingredient[]);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function adjust(form: FormData) {
    const amount = String(form.get("quantity"));
    const delta = form.get("direction") === "out" ? `-${amount}` : amount;
    const { error } = await createClient().rpc(
      "register_inventory_adjustment",
      {
        p_ingredient_id: String(form.get("ingredient_id")),
        p_quantity_delta: delta,
        p_unit_cost: String(form.get("unit_cost")),
        p_notes: String(form.get("notes") || "") || null,
      },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Ajuste registrado no razão de estoque.");
      setOpen(false);
      await load();
    }
  }
  return (
    <div className="space-y-5">
      <Toolbar
        title="Movimentos de estoque"
        action="Novo ajuste"
        onClick={() => setOpen(true)}
      />
      <DataTable
        heads={[
          "Ingrediente",
          "Movimento",
          "Quantidade",
          "Saldo",
          "Custo",
          "Data",
        ]}
      >
        {rows.map((r) => (
          <tr key={String(r.id)}>
            <Cell strong>
              {String(
                (r.ingredients as { name?: string } | null)?.name ??
                  "Ingrediente",
              )}
            </Cell>
            <Cell>{movementLabel(String(r.movement_type))}</Cell>
            <Cell numeric>{decimal.format(Number(r.quantity))}</Cell>
            <Cell numeric>{decimal.format(Number(r.resulting_quantity))}</Cell>
            <Cell numeric>{brl.format(Number(r.unit_cost_snapshot))}</Cell>
            <Cell>{shortDate.format(new Date(String(r.occurred_at)))}</Cell>
          </tr>
        ))}
      </DataTable>
      {!rows.length && (
        <Empty text="Compras, produções e ajustes aparecerão neste razão imutável." />
      )}
      {open && (
        <Drawer title="Ajuste de estoque" close={() => setOpen(false)}>
          <form action={adjust} className="grid gap-5">
            <SelectField
              name="ingredient_id"
              label="Ingrediente"
              required
              options={ingredients.map((i) => ({ id: i.id, name: i.name }))}
            />
            <label>
              <span className="label">Tipo</span>
              <select className="control" name="direction">
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
              </select>
            </label>
            <Field
              name="quantity"
              label="Quantidade"
              type="number"
              step="0.0001"
              min="0.0001"
              required
            />
            <Field
              name="unit_cost"
              label="Custo unitário"
              type="number"
              step="0.0001"
              min="0"
              required
            />
            <label>
              <span className="label">Motivo</span>
              <textarea className="control min-h-24" name="notes" required />
            </label>
            <button className="btn btn-primary">Registrar ajuste</button>
          </form>
        </Drawer>
      )}
    </div>
  );
}

export function ProductionPage({ workspace }: { workspace: Workspace }) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const s = createClient();
    const [r, b] = await Promise.all([
      s
        .from("recipe_summaries_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .eq("active", true)
        .order("name"),
      s
        .from("production_batches")
        .select(
          "id,batch_code,status,planned_quantity,actual_quantity,actual_cost,created_at",
        )
        .eq("organization_id", workspace.organizationId)
        .order("created_at", { ascending: false }),
    ]);
    if (r.error) toast.error(r.error.message);
    else setRecipes((r.data ?? []) as RecipeSummary[]);
    if (b.error) toast.error(b.error.message);
    else setRows((b.data ?? []) as Record<string, unknown>[]);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function produce(form: FormData) {
    const { error } = await createClient().rpc("register_production_batch", {
      p_recipe_id: String(form.get("recipe_id")),
      p_quantity: String(form.get("quantity")),
      p_complete: form.get("complete") === "on",
      p_notes: String(form.get("notes") || "") || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Lote registrado e estoque atualizado.");
      setOpen(false);
      await load();
    }
  }
  return (
    <div className="space-y-5">
      <Toolbar
        title="Lotes de produção"
        action="Nova produção"
        onClick={() => setOpen(true)}
      />
      <DataTable
        heads={[
          "Lote",
          "Status",
          "Planejado",
          "Realizado",
          "Custo real",
          "Data",
        ]}
      >
        {rows.map((r) => (
          <tr key={String(r.id)}>
            <Cell strong>{String(r.batch_code)}</Cell>
            <Cell>{String(r.status)}</Cell>
            <Cell numeric>{decimal.format(Number(r.planned_quantity))}</Cell>
            <Cell numeric>
              {r.actual_quantity == null
                ? "-"
                : decimal.format(Number(r.actual_quantity))}
            </Cell>
            <Cell numeric>
              {r.actual_cost == null ? "-" : brl.format(Number(r.actual_cost))}
            </Cell>
            <Cell>{shortDate.format(new Date(String(r.created_at)))}</Cell>
          </tr>
        ))}
      </DataTable>
      {!rows.length && (
        <Empty text="Registre uma produção planejada ou conclua com consumo do estoque." />
      )}
      {open && (
        <Drawer title="Registrar produção" close={() => setOpen(false)}>
          <form action={produce} className="grid gap-5">
            <SelectField
              name="recipe_id"
              label="Receita"
              required
              options={recipes.map((r) => ({ id: r.id, name: r.name }))}
            />
            <Field
              name="quantity"
              label="Porções a produzir"
              type="number"
              step="0.0001"
              min="0.0001"
              required
            />
            <label className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] p-4">
              <input type="checkbox" name="complete" defaultChecked />
              <span className="text-sm font-semibold">
                Concluir agora e consumir o estoque
              </span>
            </label>
            <label>
              <span className="label">Observações</span>
              <textarea className="control min-h-24" name="notes" />
            </label>
            <button className="btn btn-primary">Registrar lote</button>
          </form>
        </Drawer>
      )}
    </div>
  );
}

function Toolbar({
  title,
  action,
  onClick,
}: {
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Registros reais e auditáveis da empresa atual.
        </p>
      </div>
      <button className="btn btn-primary" onClick={onClick}>
        <Plus size={18} />
        {action}
      </button>
    </section>
  );
}
function DataTable({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead className="bg-[#fff6df] text-xs text-[var(--muted)]">
          <tr>
            {heads.map((h, i) => (
              <th key={h} className={i === 0 ? "px-5 py-3" : "py-3"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">{children}</tbody>
      </table>
    </section>
  );
}
function Cell({
  children,
  strong,
  numeric,
}: {
  children: React.ReactNode;
  strong?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={`py-3 text-sm first:px-5 ${strong ? "font-semibold" : ""} ${numeric ? "numeric" : ""}`}
    >
      {children}
    </td>
  );
}
function Drawer({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/25"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <aside
        className="h-full w-full max-w-3xl overflow-y-auto bg-white p-6 md:p-8"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn btn-secondary" onClick={close}>
            Fechar
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="panel grid min-h-48 place-items-center p-8 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}
function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label>
      <span className="label">{label}</span>
      <input className="control" {...input} />
    </label>
  );
}
function SelectField({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="control" name={name} required={required}>
        <option value="">Selecione</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function emptyItem(): PurchaseItem {
  return { ingredient_id: "", quantity: "", unit_price: "", unit_code: "g" };
}
function updateItem(
  setter: React.Dispatch<React.SetStateAction<PurchaseItem[]>>,
  index: number,
  patch: Partial<PurchaseItem>,
) {
  setter((rows) =>
    rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );
}
function purchaseTotal(row: Record<string, unknown>) {
  return (
    (row.purchase_items as Record<string, unknown>[] | null) ?? []
  ).reduce(
    (sum, item) =>
      sum +
      Number(item.gross_quantity) * Number(item.unit_price) -
      Number(item.discount_amount) +
      Number(item.freight_amount) +
      Number(item.tax_amount) +
      Number(item.additional_fee_amount),
    0,
  );
}
function movementLabel(value: string) {
  return (
    (
      {
        purchase_receipt: "Compra",
        production_consumption: "Produção",
        production_loss: "Perda",
        adjustment_in: "Ajuste de entrada",
        adjustment_out: "Ajuste de saída",
      } as Record<string, string>
    )[value] ?? value
  );
}
function localNow() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
