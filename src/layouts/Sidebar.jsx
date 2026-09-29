import { Link, NavLink, useNavigate } from "react-router-dom";
import { Calculator, LogOut, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/layouts/navigation";

function getInitials(name = "") {
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
    >
      {getInitials(name)}
    </span>
  );
}

function UserProfile({ collapsed, onExpand }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="overflow-hidden border-t border-slate-800 p-3">
      {/* Collapsed (desktop only): avatar alone; clicking it re-expands the sidebar to reach the logout button. */}
      <button
        type="button"
        onClick={onExpand}
        title={user?.name}
        className={cn(
          "mx-auto hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "lg:flex"
        )}
      >
        <Avatar name={user?.name} />
        <span className="sr-only">{user?.name} — développer le menu</span>
      </button>

      <div className={cn("space-y-3", collapsed && "lg:hidden")}>
        <div className="flex items-center gap-3 px-1">
          <Avatar name={user?.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onExpand, mobileOpen, onCloseMobile }) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/50 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* `collapsed` only applies from lg up; the mobile drawer is always full width. */}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col whitespace-nowrap bg-slate-900 text-slate-300 transition-[width,translate,visibility] duration-200 lg:visible lg:translate-x-0",
          collapsed && "lg:w-16",
          mobileOpen ? "translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-slate-800 px-5",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <Link
            to="/"
            onClick={onCloseMobile}
            title="Tableau de bord"
            className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Calculator className="size-4" aria-hidden="true" />
            </span>
            <span className={cn("text-base font-semibold text-white", collapsed && "lg:sr-only")}>Compta MVP</span>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Fermer le menu</span>
          </button>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed && "lg:justify-center lg:px-0",
                      isActive
                        ? "bg-slate-800 text-white shadow-[inset_3px_0_0_0_var(--primary)]"
                        : "hover:bg-slate-800/60 hover:text-white"
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={cn("truncate", collapsed && "lg:sr-only")}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <UserProfile collapsed={collapsed} onExpand={onExpand} />
      </aside>
    </>
  );
}
