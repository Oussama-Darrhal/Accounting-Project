import { memo, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { ACCOUNT_CLASSES, JOURNALS, TVA_RATES } from "@/data/planComptable";
import { cn, formatCurrency, toCents } from "@/lib/utils";

const COLUMNS = [
  { key: "date", label: "Date", width: "w-36" },
  { key: "journal", label: "Journal", width: "w-20" },
  { key: "facture", label: "N° Facture", width: "w-28" },
  { key: "compte", label: "Compte", width: "min-w-44" },
  { key: "ht", label: "HT", width: "w-28", numeric: true, title: "Hors taxes — base avant TVA" },
  { key: "tva", label: "TVA %", width: "w-24", title: "Taux de TVA. Recalcule HT et TTC (TTC = HT + taxe)" },
  { key: "ttc", label: "TTC", width: "w-28", numeric: true, title: "Toutes taxes comprises — HT + TVA" },
  { key: "debit", label: "Débit", width: "w-28", numeric: true },
  { key: "credit", label: "Crédit", width: "w-28", numeric: true },
  { key: "libelle", label: "Libellé", width: "min-w-40" },
  { key: "tiers", label: "Tiers", width: "min-w-40" },
];

const cellInput =
  "h-9 w-full rounded-none border-0 bg-transparent px-2 text-sm outline-none focus:bg-primary/5 focus:ring-2 focus:ring-inset focus:ring-ring";

const NEW_TIER_VALUE = "__new_tier__";

const EntryRow = memo(function EntryRow({ line, index, canRemove, onChange, onRemove, tiersOptions, onNewTier }) {
  const cellProps = (col) => ({
    "data-row": index,
    "data-col": col,
    "aria-label": `${COLUMNS[col].label}, ligne ${index + 1}`,
  });
  const taxCents = Math.max(0, toCents(line.ttc) - toCents(line.ht));

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
        <select
          className={cn(cellInput, "cursor-pointer", !line.compte && "text-muted-foreground")}
          value={line.compte}
          onChange={(e) => onChange(line.id, "compte", e.target.value)}
          {...cellProps(3)}
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
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.ht ?? ""}
          onChange={(e) => onChange(line.id, "ht", e.target.value)}
          {...cellProps(4)}
        />
      </td>
      <td className="border-r p-0 align-top">
        <select
          className={cn(cellInput, "cursor-pointer")}
          value={String(line.tva ?? "20")}
          title="Taux de TVA marocain. Change le HT (à partir du TTC) et le montant de taxe."
          aria-describedby="tva-help"
          onChange={(e) => onChange(line.id, "tva", e.target.value)}
          {...cellProps(5)}
        >
          {TVA_RATES.map((rate) => (
            <option key={rate.value} value={rate.value}>
              {rate.label}
            </option>
          ))}
        </select>
        {taxCents > 0 ? (
          <p className="px-2 pb-1 text-[10px] tabular-nums text-muted-foreground" title="Montant de TVA = TTC − HT">
            {formatCurrency(taxCents / 100)}
          </p>
        ) : null}
      </td>
      <td className="border-r p-0">
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.ttc ?? ""}
          onChange={(e) => onChange(line.id, "ttc", e.target.value)}
          {...cellProps(6)}
        />
      </td>
      <td className="border-r p-0">
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.debit}
          onChange={(e) => onChange(line.id, "debit", e.target.value)}
          {...cellProps(7)}
        />
      </td>
      <td className="border-r p-0">
        <input
          inputMode="decimal"
          className={cn(cellInput, "text-right tabular-nums")}
          placeholder="0,00"
          value={line.credit}
          onChange={(e) => onChange(line.id, "credit", e.target.value)}
          {...cellProps(8)}
        />
      </td>
      <td className="border-r p-0">
        <input
          className={cellInput}
          placeholder="Description de l'opération"
          value={line.libelle}
          onChange={(e) => onChange(line.id, "libelle", e.target.value)}
          {...cellProps(9)}
        />
      </td>
      <td className="border-r p-0">
        <select
          className={cn(cellInput, "cursor-pointer", !line.tiers && "text-muted-foreground")}
          value={line.tiers}
          onChange={(e) => {
            if (e.target.value === NEW_TIER_VALUE) {
              onNewTier(line.id);
              return;
            }
            onChange(line.id, "tiers", e.target.value);
          }}
          {...cellProps(10)}
        >
          <option value="">Sélectionner…</option>
          <option value={NEW_TIER_VALUE} className="font-medium text-primary">
            + Nouveau tiers…
          </option>
          {line.tiers && !tiersOptions.includes(line.tiers) && (
            <option value={line.tiers} className="text-foreground">
              {line.tiers}
            </option>
          )}
          {tiersOptions.map((suggestion) => (
            <option key={suggestion} value={suggestion} className="text-foreground">
              {suggestion}
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

export function EntryGrid({ lines, totals, onChange, onAdd, onRemove, tiersOptions = [], onNewTier }) {
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
        <table ref={tableRef} onKeyDown={handleKeyDown} className="w-full min-w-[1360px] border-collapse text-sm">
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
                  title={column.title}
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
                tiersOptions={tiersOptions}
                onChange={onChange}
                onRemove={onRemove}
                onNewTier={onNewTier}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
            <tr className="border-t-2 border-slate-300">
              <td colSpan={5} className="h-9 border-r px-2 text-right text-xs uppercase tracking-wide text-slate-600">
                Totaux
              </td>
              <td className="border-r" />
              <td className="border-r" />
              <td className="border-r" />
              <td className="border-r px-2 text-right tabular-nums">{formatCurrency(totals.debit)}</td>
              <td className="border-r px-2 text-right tabular-nums">{formatCurrency(totals.credit)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p id="tva-help" className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">HT</span> = hors taxes (base).{" "}
        <span className="font-medium text-foreground">TVA</span> = le taux (20, 14, 10, 7 ou 0 %). Le montant sous le taux
        est la taxe (TTC − HT). <span className="font-medium text-foreground">TTC</span> = HT + taxe. Changer le taux
        garde le TTC et recalcule le HT. Le débit ou le crédit suit le compte : HT pour les classes 6/7, taxe pour
        3455/4455, TTC pour les tiers.
      </p>

      <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="mt-2 self-start">
        <Plus aria-hidden="true" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
