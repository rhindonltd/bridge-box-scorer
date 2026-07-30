# Implementation Plan: Director Menu Page

## Overview

Replace the direct-to-timer-controls flow with a Director Menu page that lists 8 director operations. The timer controls become accessible via a dedicated `/manage/[id]/timer` route. Only the "Create/Amend Timer" option navigates anywhere; the rest are placeholder callbacks.

## Tasks

- [x] 1. Create the DirectorMenuPage presentational component
  - [x] 1.1 Create `src/components/pages/manage/DirectorMenuPage.tsx`
    - Define the `DirectorMenuPageProps` interface with 8 callback props
    - Use `useGame()` to display the event name in the header
    - Render a header bar with `bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg`
    - Render 8 stacked buttons with icons from `lucide-react` (Clock, PenLine, ToggleRight, ArrowRightLeft, ClipboardList, Lock, Download, Trash2)
    - Apply standard button styling for items 1-7
    - Apply destructive red styling and extra top margin for "Delete Game"
    - Each button uses flex layout with icon on the left and label text
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ]* 1.2 Write property test for menu item completeness and callback isolation
    - **Property 1: Menu item completeness and ordering**
    - **Property 2: Callback isolation**
    - **Validates: Requirements 1.1, 1.3**

- [x] 2. Set up routing and wire navigation
  - [x] 2.1 Create `src/app/manage/[id]/timer/page.tsx`
    - Import and render `ControlsPage` from `@/components/pages/timer/ControlsPage`
    - This extracts the timer into its own dedicated route
    - _Requirements: 1.2_

  - [x] 2.2 Update `src/app/manage/[id]/menu/page.tsx`
    - Replace the current `ManageGamePage` import with `DirectorMenuPage`
    - Use `useRouter()` and read `params.id` for navigation
    - Wire `onTimerClick` to `router.push(\`/manage/${id}/timer\`)`
    - Wire all other callbacks to `alert("Coming soon")` placeholders
    - _Requirements: 1.2, 1.3_

  - [x] 2.3 Update `src/components/pages/manage/ManageGamePage.tsx`
    - Remove or simplify the component since its current role (wrapping ControlsPage) is now handled by the route pages directly
    - _Requirements: 1.1_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing `GameContext` is provided by the `manage/[id]/layout.tsx`, so both the menu and timer routes have access to game data
- Only "Create/Amend Timer" has real navigation; other menu items are placeholder callbacks for future features
- Property tests validate that the menu renders all items in the correct order and that each click invokes only its corresponding callback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3"] }
  ]
}
```
