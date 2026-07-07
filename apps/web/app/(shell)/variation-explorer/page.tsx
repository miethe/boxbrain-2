import { Suspense } from "react";

import { VariationExplorerClient } from "@/components/variation-explorer/variation-explorer-client";

export default function VariationExplorerPage() {
  return (
    <Suspense fallback={<VariationExplorerFallback />}>
      <VariationExplorerClient />
    </Suspense>
  );
}

function VariationExplorerFallback() {
  return (
    <div className="route-body">
      <div className="h-7 w-80 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
