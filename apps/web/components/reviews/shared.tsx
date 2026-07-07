"use client";

import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui";

export function LoadingCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <RefreshCw size={16} className="mt-0.5 animate-spin text-blue-600" />
        <div>
          <div className="text-sm font-bold text-slate-800">{title}</div>
          <p className="m-0 mt-1 text-sm text-slate-500">{body}</p>
        </div>
      </div>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 text-red-700">
        <AlertCircle size={16} className="mt-0.5" />
        <div>
          <div className="text-sm font-bold">Reviews API unavailable</div>
          <p className="m-0 mt-1 text-sm text-red-700">{message}</p>
        </div>
      </div>
    </Card>
  );
}

export function RestrictedCopy({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "mt-3 p-3" : "p-5"}>
      <div className="flex items-start gap-3 text-slate-700">
        <ShieldAlert size={16} className="mt-0.5 text-amber-600" />
        <div>
          <div className="text-sm font-bold">Reviewer access required</div>
          <p className="m-0 mt-1 text-sm text-slate-500">This user cannot view review queues, previews, snippets, or action metadata for restricted content.</p>
        </div>
      </div>
    </Card>
  );
}

export function InlineAlert({ tone, message }: { tone: "ok" | "danger"; message: string }) {
  return <div className={`mt-3 rounded-lg border p-3 text-sm ${tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message}</div>;
}
