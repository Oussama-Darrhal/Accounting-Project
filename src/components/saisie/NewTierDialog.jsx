import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCOUNT_LABELS } from "@/data/planComptable";
import { createAccount } from "@/services/journalApi";
import { useAccountingStore } from "@/stores/useAccountingStore";

const PARENTS = ["4411", "3421"];

export function NewTierDialog({ open, onClose }) {
  const addAccount = useAccountingStore((state) => state.addAccount);
  const [parentCode, setParentCode] = useState("4411");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const account = await createAccount({ parent_code: parentCode, name: name.trim() });
      addAccount({ ...account, parent_code: parentCode });
      setName("");
      onClose(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le tiers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-tier-title"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <h2 id="new-tier-title" className="text-lg font-semibold">Nouveau tiers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le compte auxiliaire est créé sur le dossier courant (44110001, 34210001, …).
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tier-parent">Collectif</Label>
            <Select id="tier-parent" value={parentCode} onChange={(event) => setParentCode(event.target.value)}>
              {PARENTS.map((code) => (
                <option key={code} value={code}>
                  {code} — {ACCOUNT_LABELS[code]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tier-name">Nom</Label>
            <Input id="tier-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Oasis Voyages" required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onClose(null)}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
