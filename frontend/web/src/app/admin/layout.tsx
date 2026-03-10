"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileNav />
      <Topbar />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-64",
        )}
      >
        <div className="p-4 lg:p-8">
          <div className="mb-4 px-3 py-1.5 rounded-btn bg-red-50 border border-red-200 text-sm text-error inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-error" />
            Admin Panel
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
