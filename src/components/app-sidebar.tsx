"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map as MapIcon,
  Compass,
  Users,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { WordMark } from "@/components/word-mark";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/trips",
    label: "Trips",
    icon: MapIcon,
    match: (p) => p.startsWith("/trips"),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
    match: (p) => p.startsWith("/discover"),
  },
  {
    href: "/match",
    label: "Companions",
    icon: Users,
    match: (p) => p.startsWith("/match"),
  },
];

const SECONDARY: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    match: (p) => p.startsWith("/admin"),
    adminOnly: true,
  },
];

interface AppSidebarProps {
  isAdmin: boolean;
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="border-border bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6">
        <WordMark href="/dashboard" />
      </div>
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {NAV.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
        <div className="border-sidebar-border/60 my-4 border-t" />
        <ul className="space-y-1">
          {SECONDARY.filter((i) => !i.adminOnly || isAdmin).map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match ? item.match(pathname) : pathname === item.href;
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4" />
        {item.label}
      </Link>
    </li>
  );
}
