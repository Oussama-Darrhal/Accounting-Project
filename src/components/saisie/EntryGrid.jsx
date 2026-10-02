import { memo, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { ACCOUNT_CLASSES, JOURNALS, TIER_SUGGESTIONS, TVA_RATES } from "@/data/planComptable";
import { cn, formatCurrency } from "@/lib/utils";

const COLUMNS = [
  { key: "date", label: "Date", width: "w-36" },
  { key: "journal", label: "Journal", width: "w-24" },
  { key: "facture", label: "N° Facture", width: "w-32" },
  { key: "libelle", label: "Libellé", width: "min-w-48" },
  { key: "compte", label: "Compte", width: "min-w-56" },
  { key: "tiers", label: "Tiers", width: "min-w-48" },
  { key: "debit", label: "Débit", width: "w-32", numeric: true },
  { key: "credit", label: "Crédit", width: "w-32", numeric: true },
  { key: "tva", label: "TVA", width: "w-24" },
];

const cellInput =
  "h-9 w-full rounded-none border-0 bg-transparent px-2 text-sm outline-none focus:bg-primary/5 focus:ring-2 focus:ring-inset focus:ring-ring";

const EntryRow = memo(function EntryRow({ line, index, canRemove, onChange, onRemove }) {
  const cellProps = (col) => ({
    "data-row": index,
    "data-col": col,
    "aria-label": `${COLUMNS[col].label}, ligne ${index + 1}`,
  });

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/40">
      <th scope="row" className="w-10 border-r bg-muted/60 text-center text-xs font-normal text-muted-foreground">
        {index + 1}
      </th>
      <td className="border-r p-0">
        <DateInput
          inputClassName={cellInput}
          value={line.date}
          onChange={(iso) => onChange(line.id, "date", iso)}
          {...cellProps(0)}
        />
      </td>
      <td className="border-r p-0">
        <select
          className={cn(cellInput, "cursor-pointer")}
          value={line.journal}
          onChange={(e) => onChange(line.id, "journal", e.target.value)}
          {...cellProps(1)}
        >
          {JOURNALS.map((journal) => (
            <option key={journal} value={journal}>
              {journal}
            </option>
          ))}
        </select>
      </td>
      <td className="border-r p-0">
        <input
          className={cellInput}
          placeholder="FA-…"
          value={line.facture}
          onChange={(e) => onChange(line.id, "facture", e.target.value)}
          {...cellProps(2)}
        />
      </td>
      <td className="border-r p-0">
        <input
          className={cellInput}
          placeholder="Description de l'opération"
          value={line.libelle}
          onChange={(e) => onChange(line.id, "libelle", e.target.value)}
          {...cellProps(3)}
        />
      </td>
      <td className="border-r p-0">
        <select
          className={cn(cellInput, "cursor-pointer", !line.compte && "text-muted-foreground")}
          value={line.compte}
          onChange={(e) => onChange(line.id, "compte", e.target.value)}
          {...cellProps(4)}
        >
          <option value="">Sélectionner…</option>
          {ACCOUNT_CLASSES.map((group) => (
            <optgroup key={group.classe} label={group.label}>
              {group.accounts.map((account) => (
                <option key={account.code} value={account.code} className="text-foreground">
                  {account.code} — {account.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>
      <td className="border-r p-0">
        <select
          className={cn(cellInput, "cursor-pointer", !line.tiers && "text-muted-foreground")}
          value={line.tiers}
          onChange={(e) => onChange(line.id, "tiers", e.target.value)}
          {...cellProps(5)}
        >
          <option value="">Sélectionner…</option>
          {TIER_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} className="text-foreground">
              {suggestion}
            </option>
          ))}
        </select>
      </td>
      <td className="border-r p-0">
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.debit}
          onChange={(e) => onChange(line.id, "debit", e.target.value)}
          {...cellProps(6)}
        />
      </td>
      <td className="border-r p-0">
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.credit}
          onChange={(e) => onChange(line.id, "credit", e.target.value)}
          {...cellProps(7)}
        />
      </td>
      <td className="border-r p-0">
        <select
          className={cn(cellInput, "cursor-pointer")}
          value={line.tva}
          onChange={(e) => onChange(line.id, "tva", e.target.value)}
          {...cellProps(8)}
        >
          {TVA_RATES.map((rate) => (
            <option key={rate.value} value={rate.value}>
              {rate.label}
            </option>
          ))}
        </select>
      </td>
      <td className="w-10 p-0 text-center">
        <button
          type="button"
          onClick={() => onRemove(line.id)}
          disabled={!canRemove}
          className="relative inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Supprimer la ligne {index + 1}</span>
        </button>
      </td>
    </tr>
  );
});

export function EntryGrid({ lines, totals, onChange, onAdd, onRemove }) {
  const tableRef = useRef(null);
  const pendingFocus = useRef(null);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { row, col } = pendingFocus.current;
    pendingFocus.current = null;
    tableRef.current?.querySelector(`[data-row="${row}"][data-col="${col}"]`)?.focus();
  }, [lines.length]);

  /** Spreadsheet behaviour: Enter moves down one row in the same column, appending a row at the end. */
  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const { row, col } = event.target.dataset;
    if (row === undefined) return;
    event.preventDefault();
    const nextRow = Number(row) + 1;
    const next = tableRef.current.querySelector(`[data-row="${nextRow}"][data-col="${col}"]`);
    if (next) {
      next.focus();
    } else {
      pendingFocus.current = { row: nextRow, col };
      onAdd();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <table ref={tableRef} onKeyDown={handleKeyDown} className="w-full min-w-[1280px] border-collapse text-sm">
          <caption className="sr-only">Lignes de l'écriture comptable</caption>
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr className="border-b">
              <th scope="col" className="w-10 border-r">
                <span className="sr-only">N° de ligne</span>
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "h-9 border-r px-2 text-xs font-semibold uppercase tracking-wide text-slate-600",
                    column.width,
                    column.numeric ? "text-right" : "text-left"
                  )}
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-10">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <EntryRow
                key={line.id}
                line={line}
                index={index}
                canRemove={lines.length > 1}
                onChange={onChange}
                onRemove={onRemove}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
            <tr className="border-t-2 border-slate-300">
              <td colSpan={7} className="h-9 border-r px-2 text-right text-xs uppercase tracking-wide text-slate-600">
                Totaux
              </td>
              <td className="border-r px-2 text-right tabular-nums">{formatCurrency(totals.debit)}</td>
              <td className="border-r px-2 text-right tabular-nums">{formatCurrency(totals.credit)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="mt-2 self-start">
        <Plus aria-hidden="true" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
