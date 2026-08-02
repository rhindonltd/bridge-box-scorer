# Implementation Plan: Tablet Combined Entry

## Overview

Add a responsive tablet layout to the board-entry flow that displays contract, opening lead, and board result sections on a single screen for viewports ≥ 768px. The implementation creates inline component variants first (no dependencies), then composes them in the combined entry component, and finally wires into the existing BoardFlow with CSS-only responsive switching.

## Tasks

- [x] 1. Create inline component variants
  - [x] 1.1 Create `InlineOpeningLead` component
    - Create `src/components/play/InlineOpeningLead.tsx`
    - Controlled component accepting `suit`, `rank`, `onSuitChange`, `onRankChange` props
    - Render suit selection buttons (2×2 grid) and rank selection grid (4-column) from existing `OpeningLead`
    - No `h-[100dvh]` wrapper, no card preview element, no header, no footer
    - Reuse `suitStyle()` helper and `SuitMap`/`Ranks` from `@/model/common`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 9.1, 9.3_

  - [x] 1.2 Create `InlineBoardResult` component
    - Create `src/components/play/InlineBoardResult.tsx`
    - Controlled component accepting `contract`, `mode`, `value`, `onModeChange`, `onValueChange` props
    - Render Made/Down toggle buttons and number grid from existing `BoardResult`
    - Calculate `maxOver` and `maxDown` from the `contract` string (parse level with `parseInt(contract[0], 10)`)
    - No `h-[100dvh]` wrapper, no header, no footer
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 9.2, 9.3_

- [x] 2. Create TabletCombinedEntry component
  - [x] 2.1 Create `TabletCombinedEntry` component
    - Create `src/components/play/TabletCombinedEntry.tsx`
    - Accept props: `round`, `table`, `roundBoards`, `leadCardRequired`, `onComplete`
    - Manage local state for contract (level, suit, declarer, dbl, passOut, notPlayed), lead (suit, rank), and result (mode, value)
    - Render full-viewport-height column layout: header bars → contract section → lead section (conditional) → result section → submit button
    - Contract section: render `PlayableContract` + Pass Out/Not Played buttons + contract display text
    - Lead section: render `InlineOpeningLead` with progressive reveal (opacity-50/pointer-events-none when no valid contract)
    - Result section: render `InlineBoardResult` with progressive reveal
    - Submit button: enabled per business rules (special outcome OR valid contract + result + optional lead)
    - Use proportional flex layout: 45/25/30 with lead, 55/45 without lead
    - On submit, call `onComplete` with `{ contract, result, lead }` payload
    - _Requirements: 2.1–2.6, 3.1–3.4, 4.1–4.2, 5.1–5.2, 6.1–6.3, 7.1–7.3, 8.1–8.4, 10.1–10.3_

  - [ ]* 2.2 Write property test for progressive reveal logic
    - **Property 1: Progressive Reveal Follows Contract Validity**
    - Test that for any contract state with at least one null field (level/suit/declarer), lead and result sections have disabled styling; when all three non-null, sections are interactive
    - **Validates: Requirements 4.1, 4.2, 5.1, 5.2**

  - [ ]* 2.3 Write property test for submit enablement
    - **Property 2: Submit Enablement Logic**
    - Test that for any combination of contract/lead/result states, submit is enabled iff: special outcome selected OR (valid contract AND result chosen AND lead chosen if required)
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ]* 2.4 Write property test for result range calculation
    - **Property 3: Result Range Calculation**
    - Test that for any level L in {1..7}, overtrick options = 13-6-L+1 values and undertrick options = 6+L values
    - **Validates: Requirements 5.6**

- [x] 3. Checkpoint - Ensure components build correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Modify BoardFlow for responsive switching
  - [x] 4.1 Add responsive wrapper to `BoardFlow`
    - Modify `src/components/play/BoardFlow.tsx`
    - Add new props: `round`, `table`, `roundBoards`, `leadCardRequired`
    - Wrap existing mobile flow in `<div className="md:hidden">...</div>`
    - Add tablet layout in `<div className="hidden md:block">...</div>` rendering `TabletCombinedEntry`
    - Create `handleTabletComplete` that adapts the tablet payload to the existing `onComplete` interface
    - Existing mobile flow behaviour remains completely unchanged
    - _Requirements: 1.1, 1.2, 1.3, 11.1–11.4_

  - [ ]* 4.2 Write property test for submission payload integrity
    - **Property 5: Submission Payload Integrity**
    - Test that for any valid completed state, the callback payload has matching contract/result/lead values
    - **Validates: Requirements 10.1, 10.3**

- [x] 5. Create Storybook stories
  - [x] 5.1 Create `InlineOpeningLead` stories
    - Create `src/components/play/InlineOpeningLead.stories.tsx`
    - Stories: Default (suit S, rank A), Enabled (full opacity), Disabled (wrapped in opacity-50 container)
    - Use `Meta<typeof InlineOpeningLead>` with `@storybook/nextjs-vite`
    - _Requirements: 12.2, 12.5_

  - [x] 5.2 Create `InlineBoardResult` stories
    - Create `src/components/play/InlineBoardResult.stories.tsx`
    - Stories: MadeMode, DownMode, Enabled, Disabled, HighLevel (7NT), LowLevel (1C)
    - _Requirements: 12.3, 12.5_

  - [x] 5.3 Create `TabletCombinedEntry` stories
    - Create `src/components/play/TabletCombinedEntry.stories.tsx`
    - Stories: Empty, ContractSelected, ContractAndLeadSelected, FullEntryComplete, PassOutSelected, NotPlayedSelected, WithoutLeadCard, WithLeadCard
    - Use `parameters: { layout: "fullscreen" }` and viewport set to tablet width
    - _Requirements: 12.1, 12.4, 12.5_

  - [x] 5.4 Add tablet viewport story to `BoardFlow.stories.tsx`
    - Modify `src/components/play/BoardFlow.stories.tsx`
    - Add story with tablet viewport parameters and the new props (round, table, roundBoards, leadCardRequired)
    - _Requirements: 12.5_

- [x] 6. Final checkpoint - Verify build and tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation language is TypeScript (React/Next.js with Tailwind CSS), matching the existing project
- `InlineOpeningLead` and `InlineBoardResult` have no dependencies on each other and can be built in parallel
- `TabletCombinedEntry` depends on both inline variants plus the existing `PlayableContract` component
- The mobile flow remains completely unchanged — only CSS visibility classes control which layout renders
- Property tests validate correctness properties defined in the design document

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4"] }
  ]
}
```
