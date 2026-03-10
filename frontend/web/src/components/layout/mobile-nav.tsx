"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Lock body scroll when open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar overlay */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative">
          <Sidebar />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-[-44px] p-2 rounded-r-lg bg-navy text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
