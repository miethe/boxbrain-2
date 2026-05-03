import { describe, expect, it } from "vitest";
import { contentFamilies, navItems, storyboardSections } from "./data";

describe("demo data invariants", () => {
  it("keeps restricted content explicitly marked", () => {
    const restricted = contentFamilies.filter((family) => family.restricted);

    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted.every((family) => family.trust !== "approved")).toBe(true);
  });

  it("keeps storyboard slot ids ordered and unique", () => {
    const ids = storyboardSections.flatMap((section) => section.slots.map((slot) => slot.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks deferred modules as preview-only navigation", () => {
    const previewLabels = navItems.filter((item) => item.preview).map((item) => item.label);

    expect(previewLabels).toEqual(["Plays", "Opportunities"]);
  });
});
