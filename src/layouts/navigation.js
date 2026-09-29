import { BookOpen, FilePenLine, Files, LayoutDashboard, Link2, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/saisie", label: "Saisie Comptable", icon: FilePenLine },
  { to: "/brouillons", label: "Brouillons", icon: Files },
  { to: "/grand-livre", label: "Grand Livre", icon: BookOpen },
  { to: "/lettrage", label: "Lettrage", icon: Link2 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];
