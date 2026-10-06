import { useMemo, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCOUNT_LABELS } from "@/data/planComptable";
import { lettrageSelection, tiersLinesFromEntries } from "@/lib/lettrage";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { postLettrage, unmatchLettrage } from "@/services/journalApi";
import { useAccountingStore } from "@/stores/useAccountingStore";
import { useToast } from "@/components/ui/toaster";

const THIRD_PARTY_ACCOUNTS = ["3421", "4411"];

export default function Lettrage() {
  const journalEntries = useAccountingStore((state) => state.journalEntries);
  const hydrateFromApi = useAccountingStore((state) => state.hydrateFromApi);
  const { toast } = useToast();
  const [account, setAccount] = useState(THIRD_PARTY_ACCOUNTS[1]);
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const entries = useMemo(() => tiersLinesFromEntries(journalEntries, account), [journalEntries, account]);
  const picked = useMemo(() => entries.filter((entry) => selected.has(entry.id) && !entry.lettrage_code), [entries, selected]);
  const selection = useMemo(() => lettrageSelection(picked), [picked]);
  const canLetter = selection.canExact || selection.canRemainder;

  const toggle = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAccountChange = (value) => {
    setAccount(value);
    setSelected(new Set());
  };

  const handleMatch = async () => {
    if (!canLetter || saving) return;
    setSaving(true);
    try {
      const result = await postLettrage(picked.map((line) => line.id));
      const rest = result?.remainder?.amount;
      toast({
        variant: rest ? "warning" : "success",
        title: rest ? `Lettrage ${result.code} avec reste` : `Lettrage ${result.code}`,
        description: rest
          ? `Le reste de ${formatCurrency(Number(rest))} reste ouvert sur ${result.remainder.piece || "la pièce"}.`
          : "Les lignes sélectionnées sont rapprochées.",
      });
      if (result?.late_payment?.days) {
        toast({
          variant: "warning",
          title: "Loi 69-21",
          description: `Règlement ${result.late_payment.days} jours après la facture.`,
        });
      }
      setSelected(new Set());
      await hydrateFromApi();
    } catch (error) {
      toast({
        variant: "error",
        title: "Lettrage impossible",
        description: error instanceof Error ? error.message : "Veuillez réessayer.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnmatch = async (code) => {
    if (saving) return;
    setSaving(true);
    try {
      await unmatchLettrage(code);
      toast({ variant: "success", title: `Lettrage ${code} annulé` });
      setSelected(new Set());
      await hydrateFromApi();
    } catch (error) {
      toast({
        variant: "error",
        title: "Délettrage impossible",
        description: error instanceof Error ? error.message : "Veuillez réessayer.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader description="Rapprochez factures et règlements du dossier courant. Un paiement partiel laisse un reste ouvert." />

      <Card className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <div className="w-full space-y-1.5 sm:w-72">
          <Label htmlFor="lettrage-account">Compte de tiers</Label>
          <Select id="lettrage-account" value={account} onChange={(e) => handleAccountChange(e.target.value)}>
            {THIRD_PARTY_ACCOUNTS.map((code) => (
              <option key={code} value={code}>
                {code} — {ACCOUNT_LABELS[code]}
              </option>
            ))}
          </Select>
        </div>

        <dl className="flex flex-wrap gap-6 text-sm" aria-live="polite">
          <div>
            <dt className="text-xs text-muted-foreground">Sélection</dt>
            <dd className="font-semibold tabular-nums">{selection.count} ligne(s)</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Débit</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(selection.debit)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Crédit</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(selection.credit)}</dd>
          </div>
          {selection.canRemainder && (
            <div>
              <dt className="text-xs text-muted-foreground">Reste</dt>
              <dd className="font-semibold tabular-nums text-amber-700">{formatCurrency(selection.remainder)}</dd>
            </div>
          )}
        </dl>

        <Button className="ml-auto" onClick={handleMatch} disabled={!canLetter || saving}>
          <Link2 aria-hidden="true" />
          {selection.canRemainder ? "Lettrer avec reste" : "Lettrer la sélection"}
        </Button>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Écritures du compte {account}</caption>
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="w-12 px-4 py-2.5">
                <span className="sr-only">Sélection</span>
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Pièce</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Compte</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Libellé</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Débit</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Crédit</th>
              <th scope="col" className="px-4 py-2.5 text-center font-semibold">Lettre</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Aucune ligne de tiers validée sur ce dossier.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const letter = entry.lettrage_code;
              const isSelected = selected.has(entry.id);
              return (
                <tr
                  key={entry.id}
                  className={cn("border-b last:border-0", isSelected && "bg-primary/5", letter && "text-muted-foreground")}
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={isSelected}
                      disabled={Boolean(letter)}
                      onChange={() => toggle(entry.id)}
                      aria-label={`Sélectionner ${entry.piece} — ${entry.label}`}
                    />
                  </td>
                  <td className="px-4 py-2">{formatDate(entry.date)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{entry.piece}</td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.account}</td>
                  <td className="px-4 py-2">{entry.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{entry.debit ? formatCurrency(entry.debit) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{entry.credit ? formatCurrency(entry.credit) : ""}</td>
                  <td className="px-4 py-2 text-center">
                    {letter ? (
                      <button
                        type="button"
                        onClick={() => handleUnmatch(letter)}
                        className="group relative inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Délettrer"
                      >
                        <Badge variant="success">{letter}</Badge>
                        <Unlink className="size-3.5 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                        <span className="sr-only">Délettrer {letter}</span>
                      </button>
                    ) : (
                      <span className="text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
