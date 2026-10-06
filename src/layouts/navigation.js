import { BookOpen, FilePenLine, LayoutDashboard, Link2, ScrollText, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/saisie", label: "Saisie Comptable", icon: FilePenLine },
  { to: "/grand-livre", label: "Grand Livre", icon: BookOpen },
  { to: "/lettrage", label: "Lettrage", icon: Link2 },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];
