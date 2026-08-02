"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileCsv, FilePdf, FileXls } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecipeSummary, Workspace } from "@/lib/domain";
import { brl, safeSpreadsheetText } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function ReportsPage({ workspace }: { workspace: Workspace }) {
  const [rows, setRows] = useState<RecipeSummary[]>([]);
  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("recipe_summaries_app")
      .select("*")
      .eq("organization_id", workspace.organizationId)
      .order("name");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as RecipeSummary[]);
  }, [workspace.organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const chart = useMemo(
    () =>
      rows
        .map((r) => ({
          name: r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name,
          custo: Number(r.unit_cost),
          preco: Number(r.current_price ?? 0),
        }))
        .slice(0, 10),
    [rows],
  );
  const exportRows = rows.map((r) => ({
    Receita: r.name,
    "Custo total": Number(r.total_cost),
    "Custo unitário": Number(r.unit_cost),
    "Preço atual": Number(r.current_price ?? 0),
    "Margem (%)": Number(r.margin_percentage ?? 0),
  }));
  function csv() {
    const keys = Object.keys(exportRows[0] ?? {});
    const content = [
      keys,
      ...exportRows.map((r) => keys.map((k) => String(r[k as keyof typeof r]))),
    ]
      .map((line) =>
        line
          .map((v) => `"${safeSpreadsheetText(v).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    download(
      new Blob(["\ufeff", content], { type: "text/csv" }),
      "rentabilidade.csv",
    );
  }
  async function xlsx() {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Rentabilidade");
    const keys = Object.keys(exportRows[0] ?? {});
    sheet.addRow(keys);
    exportRows.forEach((row) =>
      sheet.addRow(keys.map((key) => row[key as keyof typeof row])),
    );
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    download(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "rentabilidade.xlsx",
    );
  }
  async function pdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de rentabilidade", 14, 18);
    doc.setFontSize(9);
    let y = 30;
    exportRows.forEach((r) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(
        `${r.Receita} | Custo ${brl.format(r["Custo unitário"])} | Preço ${brl.format(r["Preço atual"])} | Margem ${r["Margem (%)"]}%`,
        14,
        y,
      );
      y += 7;
    });
    doc.save("rentabilidade.pdf");
  }
  return (
    <div className="space-y-5">
      <section className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-bold">Rentabilidade por receita</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Dados calculados a partir das versões e preços salvos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            disabled={!rows.length}
            onClick={csv}
          >
            <FileCsv size={18} />
            CSV
          </button>
          <button
            className="btn btn-secondary"
            disabled={!rows.length}
            onClick={() => void xlsx()}
          >
            <FileXls size={18} />
            Excel
          </button>
          <button
            className="btn btn-secondary"
            disabled={!rows.length}
            onClick={() => void pdf()}
          >
            <FilePdf size={18} />
            PDF
          </button>
        </div>
      </section>
      <section className="panel p-5 md:p-7">
        <h3 className="font-bold">Custo e preço de venda</h3>
        <div className="mt-5 h-[330px]">
          {chart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid vertical={false} stroke="#e7ebe7" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => brl.format(Number(v))} />
                <Bar
                  dataKey="custo"
                  name="Custo"
                  fill="#8ba59a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="preco"
                  name="Preço"
                  fill="#176b45"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
              Salve preços para gerar o relatório.
            </div>
          )}
        </div>
      </section>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-[#f7f9f7] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-5 py-3">Receita</th>
              <th>Custo total</th>
              <th>Custo por porção</th>
              <th>Preço atual</th>
              <th>Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 text-sm font-semibold">{r.name}</td>
                <td className="numeric text-sm">
                  {brl.format(Number(r.total_cost))}
                </td>
                <td className="numeric text-sm">
                  {brl.format(Number(r.unit_cost))}
                </td>
                <td className="numeric text-sm">
                  {brl.format(Number(r.current_price ?? 0))}
                </td>
                <td
                  className={`numeric text-sm font-semibold ${Number(r.margin_percentage) < 0 ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}
                >
                  {Number(r.margin_percentage ?? 0).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
