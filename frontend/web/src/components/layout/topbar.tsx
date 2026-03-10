"use client";

import { Menu, Bell, Search, Globe } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[68px]" : "left-0 lg:left-64",
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-btn text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-btn px-4 py-2 w-80">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues, leaders, voices..."
            className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
          />
          <kbd className="hidden lg:inline text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
            /
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Language */}
        <button className="p-2 rounded-btn text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <Globe className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-btn text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-saffron rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-100">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">Aarav Mehta</p>
            <p className="text-xs text-gray-500">Citizen</p>
          </div>
          <Avatar name="Aarav Mehta" size="md" />
        </div>
      </div>
    </header>
  );
}
