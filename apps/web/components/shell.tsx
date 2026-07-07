"use client";

import clsx from "clsx";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Folder,
  HelpCircle,
  Layers,
  Search,
  Sparkles,
  Star
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { favoriteItems, navItems, secondaryNav, type NavItem } from "@/features/demo/data";

const primaryNavOrder = [
  "/",
  "/ask",
  "/opportunities",
  "/plays",
  "/library",
  "/storyboards/sb-cloud-modernization",
  "/reviews",
  "/admin"
];

const spaces = ["Growth", "Public Sector", "Strategic Accounts", "Product Marketing"];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        {children}
      </main>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const primaryItems = orderedNavItems(navItems);
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-2 border-b border-[var(--sidebar-line)] px-4 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-black text-white">B</div>
        <div className="text-[15px] font-bold text-white">BoxBrain</div>
      </div>
      <button className="mx-3 mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--sidebar-line)] bg-white/5 px-3 text-left text-xs text-slate-200 hover:bg-white/10">
        <div className="grid h-5 w-5 place-items-center rounded bg-gradient-to-br from-sky-400 to-violet-400 text-[10px] font-bold text-white">A</div>
        <span className="min-w-0 flex-1 truncate">Acme Corp</span>
        <ChevronDown size={12} />
      </button>

      <NavGroup items={primaryItems} pathname={pathname} testIdPrefix="nav" />
      <div className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-ink-3)]">Operations</div>
      <NavGroup items={secondaryNav} pathname={pathname} testIdPrefix="operations-nav" />

      <div className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-ink-3)]">Favorites</div>
      <nav className="flex flex-col gap-1 px-2 py-2">
        {favoriteItems.map((item) => (
          <Link
            href="/library"
            key={item}
            className="flex min-h-8 items-center gap-2 rounded-md px-3 text-xs text-[var(--sidebar-ink-2)] hover:bg-white/5 hover:text-white"
          >
            <Star size={13} />
            <span className="truncate">{item}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-ink-3)]">Spaces</div>
      <nav className="flex flex-col gap-1 px-2 py-2">
        {spaces.map((space) => (
          <button
            type="button"
            role="button"
            key={space}
            className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-3 text-left text-xs text-[var(--sidebar-ink-2)] hover:bg-white/5 hover:text-white"
          >
            <Folder size={13} />
            <span className="truncate">{space}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--sidebar-line)] p-3">
        <div className="flex items-center gap-2 rounded-md bg-white/5 p-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">SC</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white">Sarah Chen</div>
            <div className="truncate text-[11px] text-[var(--sidebar-ink-3)]">Enterprise AE</div>
          </div>
          <ChevronDown size={12} />
        </div>
      </div>
    </aside>
  );
}

function orderedNavItems(items: NavItem[]) {
  return [...items].sort((left, right) => {
    const leftIndex = primaryNavOrder.indexOf(left.href);
    const rightIndex = primaryNavOrder.indexOf(right.href);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    return normalizedLeft - normalizedRight;
  });
}

function NavGroup({ items, pathname, testIdPrefix }: { items: NavItem[]; pathname: string; testIdPrefix: string }) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {items.map(({ href, label, icon: Icon, count, preview, kbd }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            href={href}
            key={href}
            data-testid={`${testIdPrefix}-${href === "/" ? "home" : href.slice(1).replaceAll("/", "-")}`}
            className={clsx(
              "flex min-h-9 items-center gap-2 rounded-md px-3 text-[13px] transition",
              isActive ? "bg-[var(--primary)] font-medium text-white hover:bg-[var(--primary-ink)]" : "text-[var(--sidebar-ink-2)] hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={15} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {kbd && <span className={clsx("ml-auto font-mono text-[10px]", isActive ? "text-white/70" : "text-[var(--sidebar-ink-3)]")}>{kbd}</span>}
            {preview && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">Preview</span>}
            {count && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Topbar() {
  const pathname = usePathname();
  const parts = pathname === "/" ? ["Home"] : pathname.split("/").filter(Boolean).map((part) => part.replaceAll("-", " "));
  return (
    <header className="topbar">
      <div className="hidden items-center gap-1 text-xs font-semibold capitalize text-slate-500 md:flex">
        {parts.map((part, index) => (
          <span className="flex items-center gap-1" key={`${part}-${index}`}>
            {index > 0 && <ChevronRight size={12} />}
            <span className={index === parts.length - 1 ? "text-slate-900" : ""}>{part}</span>
          </span>
        ))}
      </div>
      <label className="flex min-h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500">
        <Search size={14} />
        <span className="sr-only">Search BoxBrain</span>
        <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" placeholder="Search BoxBrain..." />
        <kbd className="kbd bg-white">Cmd K</kbd>
      </label>
      <Link className="icon-btn borderless" href="/ask" aria-label="Ask BoxBrain">
        <Sparkles size={16} color="var(--ai)" />
      </Link>
      <SelectionTray />
      <button className="icon-btn borderless" aria-label="Notifications">
        <Bell size={16} />
        <span className="badge-dot" aria-hidden="true" />
      </button>
      <button className="icon-btn borderless" aria-label="Help">
        <HelpCircle size={16} />
      </button>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">AK</div>
    </header>
  );
}

function SelectionTray() {
  return (
    <Link className="btn hidden lg:inline-flex" href="/storyboards/sb-cloud-modernization">
      <Layers size={14} />
      My Selection
      <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">4</span>
    </Link>
  );
}
