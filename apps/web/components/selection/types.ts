// Shared types for the "My Selection" cross-app collection tray.
// Design truth: docs/project_plans/init/boxbrain-v2-project-handoff/project/src_v2/my_selection.jsx

export type SelectionItemType = "workproduct" | "play" | "contentunit" | "slide" | "opportunity" | "asset" | "generated";

export type SelectionItem = {
  id: string;
  type: SelectionItemType;
  title: string;
  subtitle?: string;
  thumb?: string;
};
