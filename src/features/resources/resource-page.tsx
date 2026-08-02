"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DownloadSimple,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Workspace, SimpleResourceRecord } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import {
  brl,
  civilDate,
  decimal,
  safeSpreadsheetText,
  shortDate,
} from "@/lib/format";

type FieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime-local"
  | "select"
  | "relation"
  | "boolean"
  | "textarea";
type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  relation?: { table: string; label: string; global?: boolean };
  defaultValue?: string | number | boolean;
  list?: boolean;
};
type Config = {
  table: string;
  singular: string;
  empty: string;
  fields: Field[];
  order?: string;
  auto?: Record<string, string | number | boolean | null>;
};
const configs: Record<string, Config> = {
  suppliers: {
    table: "suppliers",
    singular: "fornecedor",
    empty: "Cadastre o primeiro fornecedor para organizar suas compras.",
    fields: [
      {
        name: "legal_name",
        label: "Razão social ou nome",
        type: "text",
        required: true,
        list: true,
      },
      { name: "tax_id", label: "CPF ou CNPJ", type: "text", list: true },
      { name: "email", label: "E-mail", type: "text", list: true },
      { name: "phone", label: "Telefone", type: "text", list: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "active",
        options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ],
        list: true,
      },
    ],
  },
  purchases: {
    table: "purchases",
    singular: "compra",
    empty: "Registre compras para formar o histórico real de preços.",
    order: "purchased_at",
    fields: [
      {
        name: "supplier_id",
        label: "Fornecedor",
        type: "relation",
        relation: { table: "suppliers", label: "legal_name" },
        list: true,
      },
      { name: "document_number", label: "Documento", type: "text", list: true },
      {
        name: "purchased_at",
        label: "Data",
        type: "datetime-local",
        required: true,
        list: true,
      },
      {
        name: "header_discount",
        label: "Desconto",
        type: "currency",
        defaultValue: 0,
        list: true,
      },
      {
        name: "freight_total",
        label: "Frete",
        type: "currency",
        defaultValue: 0,
        list: true,
      },
      {
        name: "tax_total",
        label: "Impostos",
        type: "currency",
        defaultValue: 0,
        list: true,
      },
      {
        name: "additional_fees_total",
        label: "Taxas",
        type: "currency",
        defaultValue: 0,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "draft", label: "Rascunho" },
          { value: "cancelled", label: "Cancelada" },
        ],
        defaultValue: "draft",
        list: true,
      },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  },
  packaging: {
    table: "packaging_items",
    singular: "embalagem",
    empty: "Inclua embalagens para que elas componham o custo final.",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, list: true },
      { name: "sku", label: "SKU", type: "text", list: true },
      {
        name: "unit_id",
        label: "Unidade",
        type: "relation",
        relation: { table: "measurement_units", label: "code", global: true },
        required: true,
        list: true,
      },
      {
        name: "current_unit_cost",
        label: "Custo unitário",
        type: "currency",
        required: true,
        list: true,
      },
      {
        name: "minimum_stock",
        label: "Estoque mínimo",
        type: "number",
        defaultValue: 0,
        list: true,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "active",
        options: [
          { value: "active", label: "Ativa" },
          { value: "inactive", label: "Inativa" },
        ],
        list: true,
      },
    ],
  },
  expenses: {
    table: "expenses",
    singular: "custo",
    empty: "Cadastre aluguel, energia, salários e outros custos da operação.",
    fields: [
      {
        name: "name",
        label: "Descrição",
        type: "text",
        required: true,
        list: true,
      },
      {
        name: "category",
        label: "Categoria",
        type: "select",
        required: true,
        list: true,
        options: [
          { value: "labor", label: "Mão de obra" },
          { value: "rent", label: "Aluguel" },
          { value: "electricity", label: "Energia" },
          { value: "water", label: "Água" },
          { value: "gas", label: "Gás" },
          { value: "marketing", label: "Marketing" },
          { value: "other", label: "Outro" },
        ],
      },
      {
        name: "behavior",
        label: "Comportamento",
        type: "select",
        options: [
          { value: "fixed", label: "Fixo" },
          { value: "variable", label: "Variável" },
        ],
        required: true,
        list: true,
      },
      {
        name: "attribution",
        label: "Atribuição",
        type: "select",
        options: [
          { value: "direct", label: "Direto" },
          { value: "indirect", label: "Indireto" },
        ],
        required: true,
      },
      {
        name: "amount",
        label: "Valor",
        type: "currency",
        required: true,
        list: true,
      },
      {
        name: "recurrence",
        label: "Frequência",
        type: "select",
        options: [
          { value: "monthly", label: "Mensal" },
          { value: "weekly", label: "Semanal" },
          { value: "one_time", label: "Único" },
        ],
        required: true,
        list: true,
      },
      { name: "effective_from", label: "Início", type: "date", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "active",
        options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ],
        list: true,
      },
    ],
  },
  channels: {
    table: "sales_channels",
    singular: "canal",
    empty:
      "Cadastre loja, delivery ou marketplace para calcular preços específicos.",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, list: true },
      {
        name: "channel_type",
        label: "Tipo",
        type: "select",
        required: true,
        list: true,
        options: [
          { value: "in_store", label: "Loja física" },
          { value: "direct_delivery", label: "Delivery próprio" },
          { value: "marketplace", label: "Marketplace" },
          { value: "wholesale", label: "Atacado" },
          { value: "direct_order", label: "Pedido direto" },
          { value: "other", label: "Outro" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "active",
        options: [
          { value: "active", label: "Ativo" },
          { value: "inactive", label: "Inativo" },
        ],
        list: true,
      },
      {
        name: "percentage_fee",
        label: "Taxa percentual (%)",
        type: "number",
        defaultValue: 0,
      },
      {
        name: "fixed_fee",
        label: "Taxa fixa",
        type: "currency",
        defaultValue: 0,
      },
    ],
  },
};
export function ResourcePage({
  section,
  workspace,
}: {
  section: string;
  workspace: Workspace;
}) {
  if (section === "users") return <TeamPage workspace={workspace} />;
  if (section === "settings") return <SettingsPage workspace={workspace} />;
  const config = configs[section];
  if (!config) return <div className="panel p-6">Módulo não encontrado.</div>;
  return <Manager config={config} workspace={workspace} />;
}

function Manager({
  config,
  workspace,
}: {
  config: Config;
  workspace: Workspace;
}) {
  const [rows, setRows] = useState<SimpleResourceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SimpleResourceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const load = useCallback(async () => {
    setLoading(true);
    const s = createClient();
    let q = s
      .from(config.table)
      .select("*")
      .eq("organization_id", workspace.organizationId);
    q = q.order(config.order ?? "created_at", { ascending: false });
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data ?? []) as SimpleResourceRecord[]);
    setLoading(false);
  }, [config, workspace.organizationId]);
  useEffect(() => {
    void load();
    const s = createClient();
    config.fields
      .filter((f) => f.relation)
      .forEach(async (f) => {
        const rel = f.relation!;
        let query = s.from(rel.table).select(`id,${rel.label}`);
        if (!rel.global)
          query = query.eq("organization_id", workspace.organizationId);
        const { data } = await query.order(rel.label);
        setOptions((v) => ({
          ...v,
          [f.name]: (data ?? []).map((r: Record<string, unknown>) => ({
            value: String(r.id),
            label: String(r[rel.label]),
          })),
        }));
      });
  }, [load, config, workspace.organizationId]);
  const visible = useMemo(() => config.fields.filter((f) => f.list), [config]);
  async function save(formData: FormData) {
    setSaving(true);
    const payload: Record<string, unknown> = {
      organization_id: workspace.organizationId,
      ...config.auto,
    };
    if (
      workspace.branchId &&
      (config.table === "purchases" ||
        config.table === "production_batches" ||
        config.table === "stock_movements")
    )
      payload.branch_id = workspace.branchId;
    for (const f of config.fields) {
      if (f.type === "boolean") payload[f.name] = formData.get(f.name) === "on";
      else {
        const raw = String(formData.get(f.name) ?? "").trim();
        payload[f.name] =
          f.type === "number" || f.type === "currency"
            ? raw === ""
              ? null
              : Number(raw)
            : raw || null;
      }
    }
    const s = createClient();
    let result: { error: { message: string } | null };
    if (config.table === "suppliers") {
      result = await s.rpc("save_supplier", {
        p_id: editing?.id ?? null,
        p_name: payload.legal_name,
        p_tax_id: payload.tax_id,
        p_email: payload.email,
        p_phone: payload.phone,
        p_active: payload.status === "active",
      });
    } else if (config.table === "packaging_items") {
      const unitCode = options.unit_id?.find(
        (option) => option.value === payload.unit_id,
      )?.label;
      result = await s.rpc("save_packaging", {
        p_id: editing?.id ?? null,
        p_name: payload.name,
        p_sku: payload.sku,
        p_unit_code: unitCode,
        p_unit_cost: payload.current_unit_cost,
        p_minimum_stock: payload.minimum_stock,
        p_active: payload.status === "active",
      });
    } else if (config.table === "expenses") {
      result = await s.rpc("save_expense", {
        p_id: editing?.id ?? null,
        p_name: payload.name,
        p_category: payload.category,
        p_behavior: payload.behavior,
        p_attribution: payload.attribution,
        p_amount: payload.amount,
        p_recurrence: payload.recurrence,
        p_effective_from: payload.effective_from,
        p_active: payload.status === "active",
      });
    } else if (config.table === "sales_channels" && !editing) {
      result = await s.rpc("create_sales_channel", {
        p_name: payload.name,
        p_channel_type: payload.channel_type,
        p_percentage_fee: payload.percentage_fee ?? 0,
        p_fixed_fee: payload.fixed_fee ?? 0,
      });
    } else {
      delete payload.percentage_fee;
      delete payload.fixed_fee;
      result = editing
        ? await s.from(config.table).update(payload).eq("id", editing.id)
        : await s.from(config.table).insert(payload);
    }
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(
        `${capitalize(config.singular)} ${editing ? "atualizada" : "cadastrada"}.`,
      );
      setOpen(false);
      setEditing(null);
      await load();
    }
    setSaving(false);
  }
  async function remove(row: SimpleResourceRecord) {
    if (!confirm(`Excluir ${config.singular}? Esta ação será registrada.`))
      return;
    const s = createClient();
    const { error } =
      config.table === "suppliers"
        ? await s.rpc("soft_delete_supplier", { p_id: row.id })
        : await s
            .from(config.table)
            .update({
              status: "inactive",
              deleted_at: new Date().toISOString(),
            })
            .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Registro excluído.");
      await load();
    }
  }
  function exportCsv() {
    const header = visible.map((f) => f.label);
    const content = [
      header,
      ...rows.map((r) =>
        visible.map((f) => String(display(r[f.name], f, options[f.name]))),
      ),
    ]
      .map((line) =>
        line
          .map((v) => `"${safeSpreadsheetText(v).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `${config.table}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <h2 className="font-bold capitalize">
            {config.table.replaceAll("_", " ")}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {rows.length} registro{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            <DownloadSimple size={18} />
            Exportar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={18} />
            Adicionar
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-[#fff6df] text-xs text-[var(--muted)]">
            <tr>
              {visible.map((f) => (
                <th key={f.name} className="px-5 py-3 font-semibold">
                  {f.label}
                </th>
              ))}
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {loading ? (
              <tr>
                <td
                  colSpan={visible.length + 1}
                  className="p-8 text-center text-sm text-[var(--muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#fffaf0]">
                  {visible.map((f) => (
                    <td key={f.name} className="px-5 py-3 text-sm">
                      {display(row[f.name], f, options[f.name])}
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="p-2 text-[var(--muted)] hover:text-[var(--accent)]"
                        aria-label="Editar"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <PencilSimple size={18} />
                      </button>
                      <button
                        className="p-2 text-[var(--muted)] hover:text-[var(--danger)]"
                        aria-label="Excluir"
                        onClick={() => void remove(row)}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && !rows.length && (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <p className="font-semibold">Nenhum registro ainda</p>
              <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
                {config.empty}
              </p>
              <button
                className="btn btn-primary mt-5"
                onClick={() => setOpen(true)}
              >
                <Plus size={18} />
                Adicionar {config.singular}
              </button>
            </div>
          </div>
        )}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/25"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl md:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editing ? "Editar" : "Adicionar"} {config.singular}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Os dados são salvos na sua empresa atual.
                </p>
              </div>
              <button
                className="btn btn-secondary !p-2"
                onClick={() => setOpen(false)}
              >
                Fechar
              </button>
            </div>
            <form action={save} className="mt-7 grid gap-5 sm:grid-cols-2">
              {config.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={editing?.[f.name] ?? f.defaultValue}
                  options={options[f.name]}
                />
              ))}
              <div className="flex gap-2 sm:col-span-2 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="btn btn-primary"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}

function FieldInput({
  field,
  value,
  options = [],
}: {
  field: Field;
  value: unknown;
  options?: { value: string; label: string }[];
}) {
  const wrap = field.type === "textarea" ? "sm:col-span-2" : "";
  if (field.type === "boolean")
    return (
      <label
        className={`${wrap} flex items-center gap-3 rounded-[10px] border border-[var(--line)] p-3`}
      >
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={Boolean(value)}
        />
        <span className="text-sm font-semibold">{field.label}</span>
      </label>
    );
  return (
    <label className={wrap}>
      <span className="label">{field.label}</span>
      {field.type === "select" || field.type === "relation" ? (
        <select
          className="control"
          name={field.name}
          required={field.required}
          defaultValue={String(value ?? "")}
        >
          <option value="">Selecione</option>
          {(field.options ?? options).map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          className="control min-h-24"
          name={field.name}
          defaultValue={String(value ?? "")}
        />
      ) : (
        <input
          className="control"
          name={field.name}
          type={
            field.type === "currency" || field.type === "number"
              ? "number"
              : field.type
          }
          step={
            field.type === "currency"
              ? "0.01"
              : field.type === "number"
                ? "0.0001"
                : undefined
          }
          required={field.required}
          defaultValue={String(value ?? "")}
        />
      )}
    </label>
  );
}
function display(
  value: unknown,
  field: Field,
  opts: { value: string; label: string }[] = [],
) {
  if (value == null || value === "") return "-";
  if (field.type === "currency") return brl.format(Number(value));
  if (field.type === "number") return decimal.format(Number(value));
  if (field.type === "date") return civilDate(String(value));
  if (field.type === "datetime-local")
    return shortDate.format(new Date(String(value)));
  if (field.type === "select")
    return (
      field.options?.find((o) => o.value === value)?.label ?? String(value)
    );
  if (field.type === "relation")
    return opts.find((o) => o.value === value)?.label ?? "Registro relacionado";
  if (field.type === "boolean") return value ? "Sim" : "Não";
  return String(value);
}
function capitalize(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function TeamPage({ workspace }: { workspace: Workspace }) {
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    async function loadMembers(){
      const result=await createClient().from("memberships").select("id,user_id,status,joined_at,membership_roles(roles(name))").eq("organization_id",workspace.organizationId).order("created_at");
      if(result.error)toast.error(result.error.message);else setMembers((result.data??[]) as Record<string,unknown>[]);
    }
    void loadMembers();
  }, [workspace.organizationId]);
  return (
    <section className="panel overflow-x-auto">
      <div className="border-b border-[var(--line)] p-5">
        <h2 className="font-bold">Membros ativos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Papéis e permissões são aplicados pelo banco.
        </p>
      </div>
      <table className="w-full min-w-[600px] text-left">
        <thead className="bg-[#fff6df] text-xs text-[var(--muted)]">
          <tr>
            <th className="px-5 py-3">Usuário</th>
            <th>Status</th>
            <th>Papel</th>
            <th>Entrada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {members.map((member) => (
            <tr key={String(member.id)}>
              <td className="px-5 py-3 font-mono text-xs">
                {String(member.user_id)}
              </td>
              <td className="text-sm">{String(member.status)}</td>
              <td className="text-sm">{memberRoles(member)}</td>
              <td className="text-sm">
                {member.joined_at
                  ? shortDate.format(new Date(String(member.joined_at)))
                  : "Pendente"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
function memberRoles(member: Record<string, unknown>) {
  const links =
    (member.membership_roles as
      { roles?: { name?: string } | null }[] | null) ?? [];
  return (
    links
      .map((link) => link.roles?.name)
      .filter(Boolean)
      .join(", ") || "Sem papel"
  );
}
function SettingsPage({ workspace }: { workspace: Workspace }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-6">
        <h2 className="font-bold">Empresa</h2>
        <dl className="mt-5 grid gap-4 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Nome</dt>
            <dd className="mt-1 font-semibold">{workspace.organizationName}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Unidade</dt>
            <dd className="mt-1 font-semibold">
              {workspace.branchName ?? "Nenhuma"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Moeda e fuso</dt>
            <dd className="mt-1 font-semibold">BRL, America/Sao_Paulo</dd>
          </div>
        </dl>
      </section>
      <section className="panel p-6">
        <h2 className="font-bold">Seu acesso</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Papel atual:{" "}
          <strong className="text-[var(--ink)]">{workspace.role}</strong>. A
          autorização também é validada no banco de dados.
        </p>
      </section>
    </div>
  );
}
