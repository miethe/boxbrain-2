# Frontend UI Skill

Use this skill when building or modifying BoxBrain frontend screens, reusable components, design tokens, Storyboard UI, Library UI, Review Hub, or Ask BoxBrain.

## Required context

Read only the relevant portions of:

- `docs/01_BoxBrain_v2_Final_PRD.md`
- `docs/04_Product_Research_and_Design_Patterns.md`
- current component library/design-token files
- current API client/types
- relevant route/component tests

## Product UI principles

- Family-first browsing is the default library behavior.
- Trust/provenance signals should be visible without overwhelming the main task.
- Storyboard is a primary workspace, not a secondary review page.
- AI suggestions must be clearly labeled as suggestions with rationale and confidence.
- Version, variant, similarity, and composition need distinct visual language.
- Comments, persistent comments, and notes need distinct labels and affordances.

## Accessibility and quality

- Use semantic HTML and keyboard-operable controls.
- Use visible focus states.
- Avoid click-only interactions for drag/drop; provide controlled alternatives.
- Include loading, empty, error, and permission-denied states.
- Keep components typed and fixture-testable.
- Prefer server/API-backed state where workflow persistence matters.

## Reimplementation note

The Claude Design single-HTML UI is a visual reference only. Do not copy it as production source. Recreate patterns with typed components, design tokens, tested state, and accessible primitives.

## Tests to add or update

- Component renders primary and edge states.
- User can navigate critical flows with keyboard-friendly controls.
- Family expansion and variant toggles work.
- Storyboard ordering and snapshot-related interactions are deterministic.
- Trust badges render from explicit data, not inferred text.
