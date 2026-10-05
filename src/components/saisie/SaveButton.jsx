import { FilePen, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A balanced entry is posted. An unbalanced one is stored as a brouillon. */
export function SaveButton({ isBalanced, disabled, saving = false }) {
  const Icon = saving ? LoaderCircle : isBalanced ? Save : FilePen;
  return (
    <Button
      type="submit"
      variant={isBalanced ? "default" : "warning"}
      disabled={disabled || saving}
      aria-busy={saving}
      className="min-w-44"
    >
      <Icon className={saving ? "animate-spin" : undefined} aria-hidden="true" />
      {isBalanced ? "Enregistrer" : "Brouillon"}
    </Button>
  );
}
