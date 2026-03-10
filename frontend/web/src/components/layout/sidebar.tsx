"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Megaphone,
  BarChart3,
  Vote,
  Handshake,
  Map,
  MessageSquare,
  Bell,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Issues", href: "/dashboard/issues", icon: AlertTriangle, badge: 24 },
  { label: "Leaders", href: "/dashboard/leaders", icon: Users },
  { label: "Voices", href: "/dashboard/voices", icon: Megaphone },
  { label: "Polls", href: "/dashboard/polls", icon: Vote },
  { label: "Promises", href: "/dashboard/promises", icon: Handshake },
  { label: "CHI Scores", href: "/dashboard/chi", icon: BarChart3 },
  { label: "Map", href: "/dashboard/map", icon: Map },
];

const secondaryNav: NavItem[] = [
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, badge: 3 },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 12 },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Admin Panel", href: "/admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapse, setSidebarOpen } = useUIStore();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors duration-150",
          active
            ? "bg-saffron text-white shadow-sm"
            : "text-gray-300 hover:text-white hover:bg-white/10",
          sidebarCollapsed && "justify-center px-2",
        )}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                active ? "bg-white/20 text-white" : "bg-saffron/20 text-saffron-300",
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-navy transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-saffron flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Civitro</h1>
            <p className="text-gray-400 text-[10px] leading-tight">Democracy you can see</p>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="space-y-1">
          {mainNav.map(renderNavItem)}
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="space-y-1">
          {secondaryNav.map(renderNavItem)}
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="space-y-1">
          {adminNav.map(renderNavItem)}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={toggleSidebarCollapse}
          className="flex items-center justify-center w-full p-2 rounded-btn text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
