"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Ingredient, Workspace } from "@/lib/domain";
import { brl, decimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const units = ["g", "kg", "ml", "l", "un", "cx"];
export function IngredientsPage({ workspace }: { workspace: Workspace }) {
  const [rows, setRows] = useState<Ingredient[]>([]);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createClient()
      .from("ingredients_app")
      .select("*")
      .eq("organization_id", workspace.organizationId)
      .order("name");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Ingredient[]);
    setLoading(false);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(data: FormData) {
    setSaving(true);
    const args = {
      p_id: editing?.id ?? null,
      p_name: String(data.get("name")),
      p_sku: String(data.get("sku") || "") || null,
      p_brand: String(data.get("brand") || "") || null,
      p_base_unit_code: String(data.get("base_unit")),
      p_current_cost: Number(data.get("current_cost")),
      p_yield_percentage: Number(data.get("yield_percentage")),
      p_current_stock: Number(data.get("current_stock")),
      p_minimum_stock: Number(data.get("minimum_stock")),
      p_cost_method: String(data.get("cost_method")),
      p_active: data.get("active") === "on",
    };
    const { error } = await createClient().rpc("upsert_ingredient", args);
    if (error) toast.error(error.message);
    else {
      toast.success(
        editing ? "Ingrediente atualizado." : "Ingrediente cadastrado.",
      );
      setOpen(false);
      setEditing(null);
      await load();
    }
    setSaving(false);
  }
  async function archive(row: Ingredient) {
    if (
      !confirm(`Arquivar ${row.name}? O histórico financeiro será preservado.`)
    )
      return;
    const { error } = await createClient().rpc("delete_ingredient", {
      p_id: row.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Ingrediente arquivado.");
      await load();
    }
  }
  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Base de ingredientes</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            O custo efetivo considera o rendimento aproveitável.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} />
          Novo ingrediente
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-[#fff6df] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3">Ingrediente</th>
              <th>Unidade</th>
              <th>Custo atual</th>
              <th>Rendimento</th>
              <th>Estoque</th>
              <th>Situação</th>
              <th className="px-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((row) => {
              const low =
                Number(row.current_stock) <= Number(row.minimum_stock);
              return (
                <tr key={row.id} className="hover:bg-[#fffaf0]">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-sm">{row.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {[row.brand, row.sku].filter(Boolean).join(" / ") ||
                        "Sem marca ou SKU"}
                    </div>
                  </td>
                  <td className="text-sm">{row.base_unit}</td>
                  <td className="numeric text-sm">
                    {brl.format(Number(row.current_cost))}
                  </td>
                  <td className="numeric text-sm">
                    {decimal.format(Number(row.yield_percentage))}%
                  </td>
                  <td className="numeric text-sm">
                    {decimal.format(Number(row.current_stock))}
                  </td>
                  <td>
                    {low ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9a5808]">
                        <WarningCircle size={16} />
                        Abaixo do mínimo
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--accent)]">
                        Regular
                      </span>
                    )}
                  </td>
                  <td className="px-5">
                    <div className="flex justify-end">
                      <button
                        aria-label="Editar"
                        className="p-2"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <PencilSimple size={18} />
                      </button>
                      <button
                        aria-label="Arquivar"
                        className="p-2 hover:text-[var(--danger)]"
                        onClick={() => void archive(row)}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && (
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            Carregando ingredientes...
          </p>
        )}
        {!loading && !rows.length && (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <p className="font-semibold">Sua base está vazia</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Cadastre um ingrediente com custo, unidade e rendimento reais.
              </p>
              <button
                className="btn btn-primary mt-5"
                onClick={() => setOpen(true)}
              >
                <Plus size={18} />
                Cadastrar ingrediente
              </button>
            </div>
          </div>
        )}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/25"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside
            className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 md:p-8"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-bold">
              {editing ? "Editar ingrediente" : "Novo ingrediente"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Custo, rendimento e estoque são atualizados em uma única
              transação.
            </p>
            <form action={save} className="mt-7 grid gap-5 sm:grid-cols-2">
              <Input name="name" label="Nome" required value={editing?.name} />
              <Input name="sku" label="SKU" value={editing?.sku} />
              <Input name="brand" label="Marca" value={editing?.brand} />
              <Select
                name="base_unit"
                label="Unidade base"
                value={editing?.base_unit ?? "g"}
                options={units.map((v) => ({ value: v, label: v }))}
              />
              <Input
                name="current_cost"
                label="Custo bruto por unidade base"
                type="number"
                step="0.0001"
                required
                value={editing?.raw_cost ?? editing?.current_cost}
              />
              <Input
                name="yield_percentage"
                label="Rendimento aproveitável (%)"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                required
                value={editing?.yield_percentage ?? 100}
              />
              <Input
                name="current_stock"
                label="Estoque atual"
                type="number"
                step="0.0001"
                required
                value={editing?.current_stock ?? 0}
              />
              <Input
                name="minimum_stock"
                label="Estoque mínimo"
                type="number"
                step="0.0001"
                required
                value={editing?.minimum_stock ?? 0}
              />
              <Select
                name="cost_method"
                label="Método de custo"
                value={editing?.cost_method ?? "weighted_average"}
                options={[
                  { value: "weighted_average", label: "Média ponderada" },
                  { value: "latest_purchase", label: "Última compra" },
                  { value: "manual_reference", label: "Referência manual" },
                ]}
              />
              <label className="flex items-center gap-3 self-end min-h-[42px]">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editing?.active ?? true}
                />
                <span className="text-sm font-semibold">Ingrediente ativo</span>
              </label>
              <div className="sm:col-span-2 flex gap-2 border-t border-[var(--line)] pt-5">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar ingrediente"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}
function Input({
  name,
  label,
  value,
  ...props
}: { name: string; label: string; value?: unknown } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "name"
>) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="control"
        name={name}
        defaultValue={value == null ? "" : String(value)}
        {...props}
      />
    </label>
  );
}
function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="control" name={name} defaultValue={value}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
