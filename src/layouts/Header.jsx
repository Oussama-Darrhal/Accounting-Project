import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { NAV_ITEMS } from "@/layouts/navigation";
import { cn } from "@/lib/utils";

const ghostButton =
  "p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function usePageTitle() {
  const { pathname } = useLocation();
  const item = NAV_ITEMS.find(({ to, end }) => matchPath({ path: to, end: end ?? false }, pathname));
  return item?.label ?? "Compta MVP";
}

export function Header({ collapsed, onToggleCollapsed, sidebarOpen, onOpenSidebar }) {
  const title = usePageTitle();
  const toggleLabel = collapsed ? "Afficher le menu latéral" : "Masquer le menu latéral";
  const ToggleIcon = collapsed ? PanelLeft : PanelLeftClose;

  useEffect(() => {
    document.title = `${title} · Compta MVP`;
  }, [title]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-2 border-b bg-white px-4 transition-[left] duration-200 lg:px-6",
        collapsed ? "lg:left-16" : "lg:left-64"
      )}
    >
      {/* Mobile: opens the drawer. Desktop: collapses/expands the fixed sidebar. */}
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-controls="app-sidebar"
        aria-expanded={sidebarOpen}
        className={cn(ghostButton, "-ml-2 lg:hidden")}
      >
        <Menu className="size-5" aria-hidden="true" />
        <span className="sr-only">Ouvrir le menu</span>
      </button>
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-controls="app-sidebar"
        aria-expanded={!collapsed}
        title={toggleLabel}
        className={cn(ghostButton, "-ml-2 hidden lg:inline-flex")}
      >
        <ToggleIcon className="size-5" aria-hidden="true" />
        <span className="sr-only">{toggleLabel}</span>
      </button>

      <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
