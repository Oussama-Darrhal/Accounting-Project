import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AccountingSync } from "@/components/AccountingSync";
import { PageLoader } from "@/components/PageLoader";
import { Header } from "@/layouts/Header";
import { Sidebar } from "@/layouts/Sidebar";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "compta-mvp:sidebar-collapsed";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), []);
  const expandSidebar = useCallback(() => setCollapsed(false), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Aller au contenu
      </a>

      <AccountingSync />
      <Sidebar
        collapsed={collapsed}
        onExpand={expandSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />
      <Header
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        sidebarOpen={mobileSidebarOpen}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
      />

      <main
        id="main-content"
        className={cn("pt-16 transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}
      >
        <div className="mx-auto max-w-[1600px] p-4 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
