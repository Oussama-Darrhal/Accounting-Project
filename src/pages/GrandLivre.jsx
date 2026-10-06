import { useDeferredValue, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ledgerRowsFromEntries } from "@/lib/ledger";
import { ACCOUNT_LABELS } from "@/data/planComptable";
import { useAccountingStore } from "@/stores/useAccountingStore";
import { downloadFile, toCSV } from "@/lib/csv";
import { DEFAULT_PRESET_ID, getPresetRange } from "@/lib/dateRange";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const CSV_HEADER = ["Date", "Pièce", "Compte", "Débit", "Crédit"];

export default function GrandLivre() {
  const journalEntries = useAccountingStore((state) => state.journalEntries);
  const ledgerRows = useMemo(() => ledgerRowsFromEntries(journalEntries), [journalEntries]);
  const ledgerAccounts = useMemo(
    () => [...new Set(ledgerRows.map((entry) => entry.account))].sort(),
    [ledgerRows]
  );
  const [account, setAccount] = useState("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [dateRange, setDateRange] = useState(() => getPresetRange(DEFAULT_PRESET_ID));

  const { rows, totals } = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const filtered = ledgerRows.filter(
      (entry) =>
        (account === "all" || entry.account === account) &&
        (!dateRange.startDate || entry.date >= dateRange.startDate) &&
        (!dateRange.endDate || entry.date <= dateRange.endDate) &&
        (!needle || entry.label.toLowerCase().includes(needle) || entry.piece.toLowerCase().includes(needle))
    );

    let balance = 0;
    const withBalance = filtered.map((entry) => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });

    return {
      rows: withBalance,
      totals: {
        debit: filtered.reduce((sum, entry) => sum + entry.debit, 0),
        credit: filtered.reduce((sum, entry) => sum + entry.credit, 0),
        balance,
      },
    };
  }, [account, deferredQuery, ledgerRows, dateRange]);

  const handleExportCSV = () => {
    const lines = rows.map((row) => [formatDate(row.date), row.piece, row.account, row.debit, row.credit]);
    downloadFile(toCSV(CSV_HEADER, lines), "grand-livre-export.csv");
  };

  return (
    <>
      <PageHeader
        description="Détail des mouvements par compte avec solde progressif."
        actions={
          <>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={rows.length === 0}>
            <Download aria-hidden="true" /> Exporter en CSV
            </Button>
          </>
        }
      />

      <Card className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <div className="w-full space-y-1.5 sm:w-72">
          <Label htmlFor="gl-account">Compte</Label>
          <Select id="gl-account" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="all">Tous les comptes</option>
            {ledgerAccounts.map((code) => (
              <option key={code} value={code}>
                {ACCOUNT_LABELS[code] ? `${code} — ${ACCOUNT_LABELS[code]}` : code}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full space-y-1.5 sm:w-72">
          <Label htmlFor="gl-search">Recherche</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="gl-search"
              type="search"
              placeholder="Libellé ou n° de pièce"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Mouvements du grand livre</caption>
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Pièce</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Compte</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Libellé</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Débit</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Crédit</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Solde</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {ledgerRows.length === 0
                    ? "Aucune écriture validée. Enregistrez une écriture équilibrée depuis la saisie."
                    : "Aucun mouvement ne correspond aux filtres (compte, dates ou recherche)."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2 text-muted-foreground">{formatDate(row.date)}</td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{row.piece}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.account}</td>
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.debit ? formatCurrency(row.debit) : ""}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.credit ? formatCurrency(row.credit) : ""}</td>
                <td className={cn("px-4 py-2 text-right tabular-nums", row.balance < 0 && "text-destructive")}>
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-slate-50 font-semibold">
            <tr>
              <td colSpan={4} className="px-4 py-2.5 text-right text-xs uppercase tracking-wide text-slate-600">
                Totaux
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.debit)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.credit)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.balance)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </>
  );
}
