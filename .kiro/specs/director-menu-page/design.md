# Design: Director Menu Page

## Overview

Replace the current direct-to-timer-controls flow with a proper Director Menu page that shows a list of director operations when a director selects a game from the manage list. The timer controls become one option accessible from this menu.

## Architecture

The feature follows the existing presentational component pattern used by `MainMenuPage`:

- **Presentational component** (`DirectorMenuPage.tsx`) — receives callback props, renders the menu UI
- **Route page** (`/manage/[id]/menu/page.tsx`) — wires the component with navigation logic
- **Timer route** (`/manage/[id]/timer/page.tsx`) — dedicated route for the existing timer controls

The `GameContext` is already provided by the `manage/[id]/layout.tsx`, so the menu component has access to game data via `useGame()`.

## Components

### DirectorMenuPage

**Location:** `src/components/pages/manage/DirectorMenuPage.tsx`

```typescript
interface DirectorMenuPageProps {
  onTimerClick: () => void;
  onCorrectResultClick: () => void;
  onChangeStatusClick: () => void;
  onMovementClick: () => void;
  onViewRoundStatusClick: () => void;
  onLockUnlockRoundClick: () => void;
  onExportResultsClick: () => void;
  onDeleteGameClick: () => void;
}
```

**Responsibilities:**

- Renders a full-page menu with the game/event name in a header bar
- Displays 8 menu items as stacked buttons with icons
- Uses `useGame()` to read the event name for the header
- Applies destructive (red) styling to the "Delete Game" button
- Separates "Delete Game" visually with extra top margin

**Menu Items (in order):**

| Label              | Icon             | Callback                 |
| ------------------ | ---------------- | ------------------------ |
| Create/Amend Timer | `Clock`          | `onTimerClick`           |
| Correct Result     | `PenLine`        | `onCorrectResultClick`   |
| Change Game Status | `ToggleRight`    | `onChangeStatusClick`    |
| Movement           | `ArrowRightLeft` | `onMovementClick`        |
| View Round Status  | `ClipboardList`  | `onViewRoundStatusClick` |
| Lock/Unlock Round  | `Lock`           | `onLockUnlockRoundClick` |
| Export Results     | `Download`       | `onExportResultsClick`   |
| Delete Game        | `Trash2`         | `onDeleteGameClick`      |

### Styling Conventions

Following existing codebase patterns:

- **Page container:** `min-h-dvh flex flex-col bg-white`
- **Header bar:** `bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0`
- **Standard menu button:** `w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- **Delete button:** `w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`
- **Button layout:** Each button has a flex row with icon (size 20) on the left and label text
- **Button container:** `flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto`
- **Delete separation:** `mt-6` on the Delete Game button wrapper

## Routing

| Route                | Component                  | Purpose                  |
| -------------------- | -------------------------- | ------------------------ |
| `/manage/[id]/menu`  | `DirectorMenuPage` (wired) | Director operations menu |
| `/manage/[id]/timer` | `ControlsPage`             | Timer creation/amendment |

### Route: `/manage/[id]/menu/page.tsx`

Updates the existing file to wire `DirectorMenuPage` with `useRouter()` navigation:

- `onTimerClick` → `router.push(\`/manage/${id}/timer\`)`
- All other callbacks → `alert("Coming soon")` placeholder

### Route: `/manage/[id]/timer/page.tsx`

New file that renders `ControlsPage` directly (extracting it from the current `ManageGamePage` usage).

## Data Flow

```
manage/[id]/layout.tsx (provides GameContext)
  └── menu/page.tsx (reads params.id, creates callbacks)
        └── DirectorMenuPage (useGame() for event name, renders UI)
  └── timer/page.tsx
        └── ControlsPage (existing timer controls)
```

## Error Handling

- If `game` is undefined/loading in `DirectorMenuPage`, the header shows a loading state or empty string (consistent with how `ControlsPage` handles `if (!game) return null`)
- The presentational component itself does not handle errors — the route-level page or layout handles missing game data

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Menu item completeness and ordering

_For any_ rendered instance of DirectorMenuPage, the component SHALL display exactly 8 menu items in the specified order: Create/Amend Timer, Correct Result, Change Game Status, Movement, View Round Status, Lock/Unlock Round, Export Results, Delete Game.

**Validates: Requirements 1.1**

### Property 2: Callback isolation

_For any_ menu item click, the component SHALL invoke exactly the corresponding callback prop and no other callback prop.

**Validates: Requirements 1.3**
