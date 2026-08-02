"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Ingredient, RecipeSummary, Workspace } from "@/lib/domain";
import { brl } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Item = { ingredient_id: string; quantity: number; unit_code: string };
export function RecipesPage({ workspace }: { workspace: Workspace }) {
  const [rows, setRows] = useState<RecipeSummary[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { ingredient_id: "", quantity: 0, unit_code: "g" },
  ]);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const s = createClient();
    const [r, i] = await Promise.all([
      s
        .from("recipe_summaries_app")
        .select("*")
        .eq("organization_id", workspace.organizationId)
        .order("name"),
      s
        .from("ingredients_app")
        .select("id,name,base_unit,current_cost,yield_percentage")
        .eq("organization_id", workspace.organizationId)
        .eq("active", true)
        .order("name"),
    ]);
    if (r.error) toast.error(r.error.message);
    else setRows((r.data ?? []) as RecipeSummary[]);
    if (i.error) toast.error(i.error.message);
    else setIngredients((i.data ?? []) as Ingredient[]);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const estimated = useMemo(
    () =>
      items.reduce((sum, item) => {
        const ing = ingredients.find((i) => i.id === item.ingredient_id);
        return sum + (ing ? Number(ing.current_cost) * item.quantity : 0);
      }, 0),
    [items, ingredients],
  );
  async function save(form: FormData) {
    if (items.some((i) => !i.ingredient_id || i.quantity <= 0)) {
      toast.error("Complete todos os ingredientes da receita.");
      return;
    }
    setSaving(true);
    const args = {
      p_recipe_id: null,
      p_name: String(form.get("name")),
      p_category: String(form.get("category") || "") || null,
      p_yield_quantity: Number(form.get("yield_quantity")),
      p_yield_unit: String(form.get("yield_unit")),
      p_portions: Number(form.get("portions")),
      p_instructions: String(form.get("instructions") || "") || null,
      p_items: items,
    };
    const { error } = await createClient().rpc("save_recipe", args);
    if (error) toast.error(error.message);
    else {
      toast.success("Receita criada e versionada.");
      setOpen(false);
      setItems([{ ingredient_id: "", quantity: 0, unit_code: "g" }]);
      await load();
    }
    setSaving(false);
  }
  return (
    <div className="space-y-5">
      <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Fichas técnicas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Cada alteração cria uma versão para preservar o histórico.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setOpen(true)}
          disabled={!ingredients.length}
        >
          <Plus size={18} />
          Nova receita
        </button>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{row.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {row.category || "Sem categoria"}
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
                {row.portions} porções
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-4">
              <div>
                <dt className="text-xs text-[var(--muted)]">Custo total</dt>
                <dd className="numeric mt-1 font-semibold">
                  {brl.format(Number(row.total_cost))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Por porção</dt>
                <dd className="numeric mt-1 font-semibold">
                  {brl.format(Number(row.unit_cost))}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {!rows.length && (
        <section className="panel grid min-h-64 place-items-center p-8 text-center">
          <div>
            <p className="font-semibold">Nenhuma receita cadastrada</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cadastre ingredientes primeiro e monte sua primeira ficha técnica.
            </p>
          </div>
        </section>
      )}
      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/25"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            className="h-full w-full max-w-3xl overflow-y-auto bg-white p-6 md:p-8"
          >
            <h2 className="text-xl font-bold">Nova ficha técnica</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Informe o rendimento real e a quantidade usada de cada
              ingrediente.
            </p>
            <form action={save} className="mt-7 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="name" label="Nome da receita" required />
                <Field name="category" label="Categoria" />
                <Field
                  name="yield_quantity"
                  label="Rendimento líquido"
                  type="number"
                  step="0.0001"
                  required
                />
                <label>
                  <span className="label">Unidade do rendimento</span>
                  <select className="control" name="yield_unit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="un">un</option>
                  </select>
                </label>
                <Field
                  name="portions"
                  label="Número de porções"
                  type="number"
                  step="1"
                  min="1"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Ingredientes</h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setItems((v) => [
                        ...v,
                        { ingredient_id: "", quantity: 0, unit_code: "g" },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Adicionar linha
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_110px_80px_42px] gap-2"
                    >
                      <select
                        aria-label="Ingrediente"
                        className="control"
                        value={item.ingredient_id}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    ingredient_id: e.target.value,
                                    unit_code:
                                      ingredients.find(
                                        (g) => g.id === e.target.value,
                                      )?.base_unit ?? x.unit_code,
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="">Selecione</option>
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Quantidade"
                        className="control"
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((x, i) =>
                              i === index
                                ? { ...x, quantity: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label="Unidade"
                        className="control"
                        value={item.unit_code}
                        onChange={(e) =>
                          setItems((v) =>
                            v.map((x, i) =>
                              i === index
                                ? { ...x, unit_code: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label="Remover ingrediente"
                        type="button"
                        className="btn btn-secondary !p-2"
                        onClick={() =>
                          setItems((v) => v.filter((_, i) => i !== index))
                        }
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <label>
                <span className="label">Modo de preparo e observações</span>
                <textarea className="control min-h-28" name="instructions" />
              </label>
              <div className="flex items-center justify-between border-y border-[var(--line)] py-4">
                <span className="text-sm text-[var(--muted)]">
                  Estimativa preliminar
                </span>
                <strong className="numeric">{brl.format(estimated)}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button disabled={saving} className="btn btn-primary">
                  {saving ? "Salvando..." : "Salvar versão"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...rest } = props;
  return (
    <label>
      <span className="label">{label}</span>
      <input className="control" {...rest} />
    </label>
  );
}
