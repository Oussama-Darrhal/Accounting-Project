import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { EntryGrid } from "@/components/saisie/EntryGrid";
import { SaveButton } from "@/components/saisie/SaveButton";
import { hasAmount } from "@/hooks/useJournalLines";
import { formatCurrency } from "@/lib/utils";
import { TIER_SUGGESTIONS } from "@/data/planComptable";
import { tiersOptionLabels } from "@/lib/lettrage";
import { buildJournalPayload } from "@/services/journalApi";
import { useAccountingStore } from "@/stores/useAccountingStore";

/** @param journal Return value of useJournalLines(), owned by the Saisie page so the PDF preview shares it. */
export function EntryForm({ journal }) {
  const { journalLines, totals, updateLine, addLine, removeLine, reset, editingEntryId } = journal;
  const accounts = useAccountingStore((state) => state.accounts);
  const [customTiers, setCustomTiers] = useState([]);
  const [newTier, setNewTier] = useState(null);
  const [tierName, setTierName] = useState("");
  const [tierPrefix, setTierPrefix] = useState("");
  const [tierError, setTierError] = useState("");
  const tiersOptions = useMemo(
    () => [...new Set([...TIER_SUGGESTIONS, ...tiersOptionLabels(accounts), ...customTiers])],
    [accounts, customTiers]
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const openNewTier = (lineId) => {
    setNewTier({ lineId });
    setTierName("");
    setTierPrefix("");
    setTierError("");
  };

  const closeNewTier = () => {
    setNewTier(null);
    setTierError("");
  };

  const handleCreateTier = (event) => {
    event.preventDefault();
    const name = tierName.trim();
    const prefix = tierPrefix.trim();
    if (!name || !prefix) {
      setTierError("Le nom et le préfixe du compte sont obligatoires.");
      return;
    }
    if (!/^\d{1,10}$/.test(prefix)) {
      setTierError("Le préfixe doit contenir uniquement des chiffres (ex. 3421).");
      return;
    }
    const tier = `${prefix} - ${name}`;
    setCustomTiers((current) => (current.includes(tier) ? current : [...current, tier]));
    updateLine(newTier.lineId, "tiers", tier);
    closeNewTier();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving || totals.isEmpty) return;

    const incompleteIndex = journalLines.findIndex((line) => hasAmount(line) && (!line.date || !line.compte));
    if (incompleteIndex !== -1) {
      toast({
        variant: "error",
        title: "Ligne incomplète",
        description: `Ligne ${incompleteIndex + 1} : la date et le compte sont obligatoires.`,
      });
      return;
    }

    const { debit: totalDebit, credit: totalCredit } = totals;
    setSaving(true);
    try {
      const saved = await useAccountingStore.getState().saveJournalEntry(buildJournalPayload(journalLines), editingEntryId);
      const countLabel = `${saved.lines.length} ligne${saved.lines.length > 1 ? "s" : ""} · ${formatCurrency(totalDebit)}`;
      if (saved.is_draft) {
        toast({
          variant: "warning",
          title: editingEntryId ? "Brouillon mis à jour" : "Brouillon enregistré",
          description: `${countLabel}. Écart ${formatCurrency(Math.abs(totals.difference))}. Le compteur du tableau de bord est à jour. Cette écriture n'entre pas au grand livre.`,
          duration: 8000,
        });
      } else {
        toast({
          variant: "success",
          title: "Écriture enregistrée",
          description: `${countLabel}. Elle est visible dans le grand livre.`,
        });
      }
      if (editingEntryId && saved.is_draft) return;
      reset();
      if (editingEntryId) navigate("/saisie", { replace: true });
    } catch (error) {
      toast({
        variant: "error",
        title: "Échec de l'enregistrement",
        description: error instanceof Error ? error.message : "Veuillez réessayer.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="entry-form-title"
      className="flex min-h-[420px] min-w-0 flex-col rounded-lg border bg-card shadow-sm md:min-h-0"
    >
      <div className="flex h-11 items-center justify-between gap-2 border-b px-4">
        <h2 id="entry-form-title" className="text-sm font-medium">
          Saisie de l'écriture
        </h2>
        {totals.isEmpty ? (
          <Badge variant="outline">Vide</Badge>
        ) : totals.isBalanced ? (
          <Badge variant="success">
            <CircleCheck className="size-3" aria-hidden="true" /> Équilibrée
          </Badge>
        ) : (
          <Badge variant="warning">
            <TriangleAlert className="size-3" aria-hidden="true" /> Écart {formatCurrency(Math.abs(totals.difference))}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col p-3">
        <EntryGrid
          lines={journalLines}
          totals={totals}
          onChange={updateLine}
          onAdd={addLine}
          onRemove={removeLine}
          tiersOptions={tiersOptions}
          onNewTier={openNewTier}
        />

        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t pt-3">
          <SaveButton isBalanced={totals.isBalanced} disabled={totals.isEmpty} saving={saving} />
        </div>
      </form>

      {newTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-tier-title"
        >
          <form onSubmit={handleCreateTier} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="new-tier-title" className="text-lg font-semibold">Nouveau tiers</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ajoutez-le pour le sélectionner sur les prochaines lignes.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeNewTier} title="Annuler">
                <X aria-hidden="true" />
                <span className="sr-only">Annuler</span>
              </Button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Nom
                <input
                  autoFocus
                  className="h-9 rounded-md border bg-transparent px-3 outline-none focus:ring-2 focus:ring-ring"
                  value={tierName}
                  onChange={(event) => setTierName(event.target.value)}
                  placeholder="Ex. Client ABC"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Préfixe du compte
                <input
                  inputMode="numeric"
                  className="h-9 rounded-md border bg-transparent px-3 outline-none focus:ring-2 focus:ring-ring"
                  value={tierPrefix}
                  onChange={(event) => setTierPrefix(event.target.value)}
                  placeholder="Ex. 3421"
                />
              </label>
              {tierError && <p className="text-sm text-destructive">{tierError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeNewTier}>Annuler</Button>
              <Button type="submit">Ajouter le tiers</Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
