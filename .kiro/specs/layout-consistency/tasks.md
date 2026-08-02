# Implementation Plan: Layout Consistency

## Overview

Consolidate page-level layout styling (viewport-height and background classes) into the root layout's inner container, then remove redundant classes from all page and layout components. Timer pages are excluded. Tests are updated to reflect the new class structure.

## Tasks

- [x] 1. Update Root Layout
  - [x] 1.1 Add `bg-white` and `flex flex-col` to the Inner Container in `src/app/layout.tsx`
    - Change the inner `<div>` className from `"mx-auto max-w-2xl min-h-dvh"` to `"mx-auto max-w-2xl min-h-dvh bg-white flex flex-col"`
    - The `bg-gray-100` on `<body>` remains unchanged
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.5_

- [x] 2. Update page components — white-background pages
  - [x] 2.1 Update `MainMenuPage` and `JoinMenuPage`
    - `src/components/pages/mainmenu/MainMenuPage.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/join/JoinMenuPage.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - _Requirements: 2.1, 2.3, 3.1_

  - [x] 2.2 Update `ClaimDirectorCodeView` and `ShareDirectorAccess`
    - `src/components/pages/manage/ClaimDirectorCodeView.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/manage/ShareDirectorAccess.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - _Requirements: 2.1, 2.3, 3.1_

  - [x] 2.3 Update `DirectorMenuPage`, `ManageGameList`, `SelectBoardPage`, `SelectInstancePage`, and `TravellerView`
    - `src/components/pages/manage/DirectorMenuPage.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/manage/ManageGameList.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/manage/correct-result/SelectBoardPage.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/manage/correct-result/SelectInstancePage.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - `src/components/pages/manage/correct-result/TravellerView.tsx`: remove `min-h-dvh` and `bg-white` from both root divs (loading + main), add `flex-1`
    - _Requirements: 2.1, 2.3, 3.1, 5.1, 5.2_

- [x] 3. Update page components — gray-background pages
  - [x] 3.1 Update play pages (`EnterContractPage`, `GameComplete`, `BoardResultsPage`, `RoundInfoPage`, `WaitingForConfirmation`, `ResultMismatch`)
    - Remove `h-dvh` and `bg-gray-100` from root div of each component, add `flex-1`
    - These pages use `HeaderContentBottomLayout`-style structure (flex-col with header/content/bottom)
    - _Requirements: 2.1, 2.3, 3.2, 5.1, 5.2_

  - [x] 3.2 Update movement pages (`MovementDetailsPage`, `MovementOptionsPage`, `SelectMovementPage`)
    - Remove `h-dvh` and `bg-gray-100` from root div of each component, add `flex-1`
    - _Requirements: 2.1, 2.3, 3.2, 5.1, 5.2_

  - [x] 3.3 Update join pages (`AwaitingMovementPage`, `SelectIndividualSeatPage`, `SelectPairSeatPage`)
    - Remove `min-h-dvh` and `bg-gray-100` from root div of each component, add `flex-1`
    - _Requirements: 2.1, 2.3, 3.2, 5.1, 5.2_

  - [x] 3.4 Update `LeaderboardPage` and `ChangePinPage`
    - `src/components/pages/leaderboard/LeaderboardPage.tsx`: remove `h-dvh` and `bg-gray-100` from root div, add `flex-1`
    - `src/components/pages/edit/ChangePinPage.tsx`: remove `h-dvh` and `bg-gray-100` from root div, add `flex-1`
    - _Requirements: 2.1, 2.3, 3.2, 5.1, 5.2_

  - [x] 3.5 Update `PinEntryPage`
    - `src/components/pages/settings/PinEntryPage.tsx`: remove `min-h-dvh` from root div, add `flex-1`
    - Note: `bg-white` on this component is part of a card style (with `rounded-xl shadow-md`), not a page-level background — keep it
    - _Requirements: 2.1, 2.3_

  - [x] 3.6 Update `TimerControlsView`
    - `src/components/pages/timer/TimerControlsView.tsx`: remove `min-h-dvh` and `bg-white` from root div, add `flex-1`
    - This is the director controls page, NOT the timer overlay — it renders inside the normal layout
    - _Requirements: 2.1, 2.3, 3.1_

- [x] 4. Update layout components
  - [x] 4.1 Update `HeaderContentBottomLayout`
    - `src/components/layout/HeaderContentBottomLayout.tsx`: remove `h-dvh` and `bg-gray-100` from root div, add `flex-1`
    - _Requirements: 2.2, 3.3_

  - [x] 4.2 Update `FormCardLayout`
    - `src/components/layout/FormCardLayout.tsx`: remove `min-h-dvh` from root div, add `flex-1`
    - _Requirements: 2.2_

  - [x] 4.3 Update `AwaitingMovement` component
    - `src/components/join/AwaitingMovement.tsx`: remove `min-h-dvh` from root div, add `flex-1`
    - _Requirements: 2.1, 2.3_

- [x] 5. Checkpoint — Verify changes compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update tests
  - [x] 6.1 Update `HeaderContentBottomLayout.test.tsx`
    - Remove `h-dvh` and `bg-gray-100` from class assertions, add `flex-1`
    - _Requirements: 6.3_

  - [x] 6.2 Update page component tests — play pages
    - `BoardResultsPage.test.tsx`: change assertion from `"h-dvh", "flex", "flex-col", "bg-gray-100"` to `"flex-1", "flex", "flex-col"`
    - `RoundInfoPage.test.tsx`: same change
    - _Requirements: 6.1, 6.2_

  - [x] 6.3 Update page component tests — movement pages
    - `MovementDetailsPage.test.tsx`: change assertion from `"h-dvh", "flex", "flex-col", "bg-gray-100"` to `"flex-1", "flex", "flex-col"`
    - `MovementOptionsPage.test.tsx`: same change
    - `SelectMovementPage.test.tsx`: same change
    - _Requirements: 6.1, 6.2_

  - [x] 6.4 Update page component tests — other pages
    - `LeaderboardPage.test.tsx`: change assertion from `"h-dvh", "flex", "flex-col", "bg-gray-100"` to `"flex-1", "flex", "flex-col"`
    - `ChangePinPage.test.tsx`: same change
    - `AwaitingMovementPage.test.tsx`: change assertion from `"min-h-dvh", "flex", "flex-col", "bg-gray-100"` to `"flex-1", "flex", "flex-col"`
    - `MainMenuPage.test.tsx`: remove `"min-h-dvh"` from assertion, add `"flex-1"`
    - _Requirements: 6.1, 6.2_

  - [x] 6.5 Update `AwaitingMovement.test.tsx` (join component)
    - `src/components/join/AwaitingMovement.test.tsx`: remove `"min-h-dvh"` from assertion, add `"flex-1"`
    - _Requirements: 6.1_

  - [x] 6.6 Do NOT modify `Toggle.test.tsx`, `PlayerCard.test.tsx`, or `ToggleButton.test.tsx`
    - These assert `bg-white` / `bg-gray-100` on inner child elements (cards, buttons), not page-level wrappers — they remain correct
    - _Requirements: 6.4_

- [x] 7. Final checkpoint — Verify build and all tests pass
  - Run `npm run build` and full test suite. Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.4_

## Notes

- Timer pages (`TimerPage.tsx`) use `fixed inset-0 bg-black` and are explicitly excluded from changes (Requirement 4)
- `bg-white` on inner card elements (e.g., `ShowMovementsPage`, `MovementCard`, `ResultMismatch`, `PlayerSearchView`, form inputs) is component-level styling, not page-level background — leave unchanged
- `bg-gray-100` on inner elements like table headers (`ManageGameList` status badge) is component-level styling — leave unchanged
- `WifiSettingsForm.tsx` uses `bg-white` as card styling (with `rounded-xl shadow-md`) — not a page background, leave unchanged
- The root layout change (task 1.1) enables all downstream simplifications

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    {
      "id": 1,
      "tasks": [
        "2.1",
        "2.2",
        "2.3",
        "3.1",
        "3.2",
        "3.3",
        "3.4",
        "3.5",
        "3.6",
        "4.1",
        "4.2",
        "4.3"
      ]
    },
    { "id": 2, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"] }
  ]
}
```
