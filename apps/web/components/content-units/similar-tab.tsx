import { EmptyState } from "@/components/ui";
import type { SearchResultItem } from "@/lib/api";
import { SimilarityList } from "./similarity-list";

export function SimilarTab({ items }: { items: SearchResultItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-5">
        <EmptyState
          title="No similarity edges returned"
          body="Domain rule: similarity never implies shared family membership on its own. When BoxBrain finds related content, it appears here as a candidate for human review, not an automatic merge."
        />
      </div>
    );
  }
  return (
    <div className="card mt-5 p-4">
      <SimilarityList items={items} />
    </div>
  );
}
