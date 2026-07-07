// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SearchResultCard, explanationChipIcon, normalizeSearchScore, searchResultHref } from "./search-result-card";
import type { SearchResultItem } from "@/lib/api";

const result: SearchResultItem = {
  objectType: "content_unit_family",
  objectId: "00000000-0000-4000-8000-000000000101",
  resultGrain: "family",
  title: "Cloud modernization ROI",
  summary: "Approved executive proof points for cloud economics.",
  previewUri: "/api/assets/cloud-roi.png",
  score: 0.925,
  explanationChips: ["semantic match", "approved source"],
  statusChips: {
    approvalState: "approved",
    freshnessState: "fresh",
    isCanonical: true,
    linkSource: "manual"
  }
};

describe("SearchResultCard", () => {
  beforeAll(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders result status, normalized score, explanations, preview, and link", () => {
    render(<SearchResultCard item={result} showDebug />);

    expect(screen.getByRole("link", { name: /open cloud modernization roi/i })).toHaveAttribute(
      "href",
      "/content-units/00000000-0000-4000-8000-000000000101"
    );
    expect(screen.getByText("93")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("fresh")).toBeInTheDocument();
    expect(screen.getByText("semantic match")).toBeInTheDocument();
    expect(screen.getByLabelText("Cloud modernization ROI preview")).toBeInTheDocument();
    expect(screen.getByText("raw 0.925")).toBeInTheDocument();
  });

  it("hides preview and summary details for restricted results", () => {
    render(
      <SearchResultCard
        item={{
          ...result,
          statusChips: {
            approvalState: "approved",
            freshnessState: "fresh",
            isCanonical: true,
            isRestricted: true,
            linkSource: "manual"
          },
          summary: "Confidential client metric"
        }}
      />
    );

    expect(screen.getByText("Restricted result")).toBeInTheDocument();
    expect(screen.queryByText("Confidential client metric")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cloud modernization ROI preview")).not.toBeInTheDocument();
  });

  it("renders an optional rank badge without requiring it", () => {
    const { rerender } = render(<SearchResultCard item={result} />);
    expect(screen.queryByLabelText("Rank 1")).not.toBeInTheDocument();

    rerender(<SearchResultCard item={result} rank={1} />);
    expect(screen.getByLabelText("Rank 1")).toHaveTextContent("1");
  });

  it("renders a My Selection toggle only when a handler is provided, and does not navigate when clicked", () => {
    const onToggleSelect = vi.fn();
    render(<SearchResultCard item={result} selected={false} onToggleSelect={onToggleSelect} />);

    const toggle = screen.getByRole("button", { name: /add cloud modernization roi to my selection/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it("reflects the selected state via aria-pressed and label", () => {
    render(<SearchResultCard item={result} selected onToggleSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /remove cloud modernization roi from my selection/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the My Selection toggle for restricted results, even when a handler is provided", () => {
    render(
      <SearchResultCard
        item={{ ...result, statusChips: { ...result.statusChips!, isRestricted: true } }}
        onToggleSelect={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /my selection/i })).not.toBeInTheDocument();
  });

  it("renders a tile layout for grid-style sections while keeping the same accessible link", () => {
    render(<SearchResultCard item={result} layout="tile" rank={1} />);
    expect(screen.getByRole("link", { name: /open cloud modernization roi/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Rank 1")).toBeInTheDocument();
    // Tile layout omits the row-only summary paragraph and external-link glyph.
    expect(screen.queryByText("Approved executive proof points for cloud economics.")).not.toBeInTheDocument();
  });
});

describe("search result helpers", () => {
  it("normalizes decimal, percent, and invalid scores", () => {
    expect(normalizeSearchScore(0.885)).toBe(89);
    expect(normalizeSearchScore(92.2)).toBe(92);
    expect(normalizeSearchScore(180)).toBe(100);
    expect(normalizeSearchScore(Number.NaN)).toBe(0);
  });

  it("routes result grains to detail pages", () => {
    expect(searchResultHref({ objectId: "cu-1", objectType: "content_unit_family", resultGrain: "family" })).toBe("/content-units/cu-1");
    expect(searchResultHref({ objectId: "block-1", objectType: "content_block_version", resultGrain: "block" })).toBe("/content-blocks/block-1");
    expect(searchResultHref({ objectId: "wp-1", objectType: "work_product_family", resultGrain: "work_product" })).toBe("/work-products/wp-1");
  });

  it("maps real explanation-chip labels to a distinguishing icon without fabricating usage signals", () => {
    expect(explanationChipIcon("keyword match")).toBe(explanationChipIcon("keyword match"));
    expect(explanationChipIcon("semantic match")).not.toBe(explanationChipIcon("keyword match"));
    expect(explanationChipIcon("approved/trusted")).not.toBe(explanationChipIcon("fresh"));
    expect(explanationChipIcon("5 matching versions")).not.toBe(explanationChipIcon("family rollup"));
  });
});
