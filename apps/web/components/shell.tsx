"use client";

import clsx from "clsx";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Layers,
  Search,
  Sparkles,
  Star
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { favoriteItems, navItems, secondaryNav } from "@/features/demo/data";

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

      <NavGroup items={navItems} pathname={pathname} />
      <div className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-ink-3)]">Operations</div>
      <NavGroup items={secondaryNav} pathname={pathname} />

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

function NavGroup({ items, pathname }: { items: typeof navItems; pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {items.map(({ href, label, icon: Icon, count, preview }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            href={href}
            key={href}
            className={clsx(
              "flex min-h-9 items-center gap-2 rounded-md px-3 text-[13px] transition",
              isActive ? "bg-[var(--sidebar-active)] text-white" : "text-[var(--sidebar-ink-2)] hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={15} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {preview && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">Preview</span>}
            {count && <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>}
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
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">Cmd K</kbd>
      </label>
      <Link className="icon-btn" href="/ask" aria-label="Ask BoxBrain">
        <Sparkles size={16} color="var(--ai)" />
      </Link>
      <SelectionTray />
      <button className="icon-btn" aria-label="Notifications">
        <Bell size={16} />
      </button>
      <button className="icon-btn" aria-label="Help">
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
