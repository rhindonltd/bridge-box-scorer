# Design Document: Tablet Combined Entry

## Architecture Overview

The tablet combined entry feature adds a responsive layout branch to the board-entry flow. On viewports ≥ 768px (Tailwind `md:` breakpoint), the existing multi-step flow is replaced with a single-screen `TabletCombinedEntry` component that stacks contract, opening lead, and board result sections vertically. The mobile flow remains completely unchanged.

The architecture follows these principles:
- **CSS-only switching** — Both layouts render in the DOM; Tailwind visibility classes (`md:hidden` / `hidden md:block`) control which is shown. No JavaScript viewport detection needed.
- **Inline component variants** — New `InlineOpeningLead` and `InlineBoardResult` components strip away viewport-height styling, headers, and footers from their full-screen counterparts. They expose controlled state via callbacks.
- **Single submission** — The tablet layout collects all data (contract + lead + result) and submits in one action, unlike the mobile flow which saves incrementally per step.
- **Progressive reveal** — Sections below the contract entry are visually disabled (opacity-50, pointer-events-none) until a valid contract is selected.

## Component Architecture

```
BoardFlow (responsive wrapper)
├── [md:hidden] — Mobile multi-step flow (unchanged)
│   ├── BoardResult (full-screen, step="result")
│   └── OpeningLead (full-screen, step="lead")
│
└── [hidden md:block] — Tablet layout
    └── TabletCombinedEntry
        ├── Header bars (event info + table/round/board selector)
        ├── Contract section (PlayableContract + PassOut/NotPlayed + display)
        ├── InlineOpeningLead (if leadCardRequired, progressive reveal)
        ├── InlineBoardResult (progressive reveal)
        └── Submit button (enabled when all required fields filled)
```

## Components

### TabletCombinedEntry

**Path:** `src/components/play/TabletCombinedEntry.tsx`

The primary new component. Renders a full-viewport-height column layout that combines all board entry sections on a single screen.

```typescript
type TabletCombinedEntryProps = {
  round: number;
  table: number;
  roundBoards: number[];
  leadCardRequired: boolean;
  onComplete: (data: {
    contract: ContractCode | SpecialBoardOutcome;
    result: number;
    lead: Card | null;
  }) => void;
};
```

**State management:**
- Contract state: `level`, `suit`, `declarer`, `dbl`, `passOut`, `notPlayed` (local useState)
- Lead state: `leadSuit`, `leadRank` (lifted from InlineOpeningLead via callbacks)
- Result state: `mode`, `resultValue` (lifted from InlineBoardResult via callbacks)

**Derived state:**
- `hasValidContract`: `level !== null && suit !== null && declarer !== null`
- `isSpecialOutcome`: `passOut || notPlayed`
- `isSubmitEnabled`: computed from business rules (see Submit Enablement Logic below)

**Layout structure (JSX):**
```tsx
<div className="h-dvh flex flex-col">
  {/* Header bars */}
  <EventInfoBar />
  <TableRoundBoardBar />

  {/* Scrollable content area */}
  <div className="flex-1 min-h-0 flex flex-col">
    {/* Contract section — ~45%/55% depending on leadCardRequired */}
    <div className={leadCardRequired ? "flex-[45]" : "flex-[55]"}>
      <ContractSection />
    </div>

    {/* Lead section — ~25% (only if leadCardRequired) */}
    {leadCardRequired && (
      <div className={`flex-[25] ${!hasValidContract ? "opacity-50 pointer-events-none" : ""}`}>
        <InlineOpeningLead />
      </div>
    )}

    {/* Result section — ~30%/45% depending on leadCardRequired */}
    <div className={`${leadCardRequired ? "flex-[30]" : "flex-[45]"} ${!hasValidContract ? "opacity-50 pointer-events-none" : ""}`}>
      <InlineBoardResult />
    </div>
  </div>

  {/* Submit button */}
  <div className="shrink-0 p-2">
    <SubmitButton disabled={!isSubmitEnabled} />
  </div>
</div>
```

### InlineOpeningLead

**Path:** `src/components/play/InlineOpeningLead.tsx`

A compact variant of `OpeningLead` designed for embedding in the tablet layout. Removes the `h-[100dvh]` wrapper, the card preview visual, and any header/footer.

```typescript
type InlineOpeningLeadProps = {
  suit: Suit;
  rank: Rank;
  onSuitChange: (suit: Suit) => void;
  onRankChange: (rank: Rank) => void;
};
```

**Differences from full-screen OpeningLead:**
- No `h-[100dvh]` or `flex h-[100dvh]` wrapper
- No card preview element (the large card with corner markings)
- No header or footer
- Controlled component — suit and rank state is lifted to parent via props
- Renders only: suit selection buttons (2×2 grid) + rank selection grid (4-column)

### InlineBoardResult

**Path:** `src/components/play/InlineBoardResult.tsx`

A compact variant of `BoardResult` designed for embedding. Removes the viewport-height wrapper, header, and footer.

```typescript
type InlineBoardResultProps = {
  contract: string; // e.g. "4H" — needed to calculate valid ranges
  mode: "made" | "down";
  value: number;
  onModeChange: (mode: "made" | "down") => void;
  onValueChange: (value: number) => void;
};
```

**Differences from full-screen BoardResult:**
- No `h-[100dvh]` wrapper
- No header (`<header>` with board number and contract info)
- No footer (`<footer>` with Continue button)
- Controlled component — mode and value state lifted to parent
- Renders only: Made/Down toggle buttons + number grid
- Calculates `maxOver` and `maxDown` from the contract level prop

### Modified BoardFlow

**Path:** `src/components/play/BoardFlow.tsx`

The existing `BoardFlow` gains a new prop and renders both layouts using CSS visibility:

```typescript
type Props = {
  board: number;
  contract: string;
  declarer: string;
  openingLead: boolean;

  // New props for tablet layout
  round: number;
  table: number;
  roundBoards: number[];
  leadCardRequired: boolean;

  onComplete: (data: { result: number; lead: Card | null }) => void;
};
```

**Rendering:**
```tsx
<>
  {/* Mobile: existing multi-step flow */}
  <div className="md:hidden">
    {/* ... existing step-based rendering unchanged ... */}
  </div>

  {/* Tablet: combined single-screen */}
  <div className="hidden md:block">
    <TabletCombinedEntry
      round={round}
      table={table}
      roundBoards={roundBoards}
      leadCardRequired={leadCardRequired}
      onComplete={handleTabletComplete}
    />
  </div>
</>
```

The `handleTabletComplete` callback adapts the tablet submission payload to the existing `onComplete` interface. The tablet's `onComplete` returns `{ contract, result, lead }` and the BoardFlow can handle the contract separately before calling its own `onComplete` with `{ result, lead }`.

## Data Flow

### State Diagram

```
┌─────────────────────────────────────────────────────┐
│ TabletCombinedEntry (owns all state)                │
│                                                     │
│  Contract: level | suit | declarer | dbl | special  │
│  Lead:     leadSuit | leadRank                      │
│  Result:   mode | resultValue                       │
│                                                     │
│  Derived:                                           │
│    hasValidContract = level && suit && declarer     │
│    contractCode = `${level}${suit}${dbl}${declarer}`│
│    leadCard = `${leadSuit}${leadRank}` as Card      │
│    result = mode==="made" ? value : -value          │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
  PlayableContract    InlineOpeningLead   InlineBoardResult
  (uncontrolled -     (controlled via     (controlled via
   fires callbacks)    props + callbacks)  props + callbacks)
```

### Submit Enablement Logic

```typescript
function isSubmitEnabled(state: CombinedState): boolean {
  // Special outcomes always enable submit
  if (state.passOut || state.notPlayed) return true;

  // Must have a valid contract
  if (!state.hasValidContract) return false;

  // Must have a result value selected
  const hasResult = state.resultValue !== null;

  // If lead required, must also have a lead
  if (state.leadCardRequired) {
    const hasLead = state.leadSuit !== null && state.leadRank !== null;
    return hasResult && hasLead;
  }

  return hasResult;
}
```

Note: Since `InlineOpeningLead` defaults suit to "S" and rank to "A" (matching the full-screen OpeningLead behavior), the lead is always "selected" once the section exists. The submit logic treats any non-null suit + rank as a valid lead selection.

### Result Range Calculation

```typescript
function calculateResultRange(contractLevel: number) {
  const requiredTricks = 6 + contractLevel;
  const maxOver = 13 - requiredTricks;  // max overtricks possible
  const maxDown = requiredTricks;       // max down tricks possible (was 13 in legacy, now capped)

  return { maxOver, maxDown };
}
```

For a 4-level contract: requiredTricks = 10, maxOver = 3, maxDown = 10.

## Special Outcome Handling

When Pass Out or Not Played is selected:
1. Contract state resets (level, suit, declarer, dbl all null)
2. The `passOut` or `notPlayed` flag is set to true
3. Lead and result sections remain in their disabled state (since hasValidContract becomes false)
4. Submit button is immediately enabled
5. On submit, `onComplete` is called with the special outcome code ("PO" or "NP")

## Interface Contracts

### TabletCombinedEntry → Parent (BoardFlow)

```typescript
// The completion callback signature for the tablet layout
type TabletCompletionData = {
  contract: ContractCode | SpecialBoardOutcome;
  result: number;
  lead: Card | null;
};
```

### InlineOpeningLead → Parent (TabletCombinedEntry)

```typescript
// Controlled component — parent owns state
type InlineOpeningLeadProps = {
  suit: Suit;
  rank: Rank;
  onSuitChange: (suit: Suit) => void;
  onRankChange: (rank: Rank) => void;
};
```

### InlineBoardResult → Parent (TabletCombinedEntry)

```typescript
// Controlled component — parent owns state
type InlineBoardResultProps = {
  contract: string;
  mode: "made" | "down";
  value: number;
  onModeChange: (mode: "made" | "down") => void;
  onValueChange: (value: number) => void;
};
```

## Styling Strategy

### Progressive Reveal

Sections below contract use a wrapper div with conditional classes:

```tsx
<div className={hasValidContract ? "" : "opacity-50 pointer-events-none"}>
  {/* section content */}
</div>
```

This approach:
- Keeps the section rendered in the DOM (no layout shift)
- Visually communicates the section is not yet interactive
- Prevents all pointer interactions without JavaScript event blocking
- Transitions naturally when `hasValidContract` becomes true

### Proportional Layout

Uses Tailwind flex-grow values to distribute vertical space:

```tsx
// With lead card
<div className="flex-[45]">  {/* Contract: ~45% */}
<div className="flex-[25]">  {/* Lead: ~25% */}
<div className="flex-[30]">  {/* Result: ~30% */}

// Without lead card
<div className="flex-[55]">  {/* Contract: ~55% */}
<div className="flex-[45]">  {/* Result: ~45% */}
```

### Responsive Switching

Both layouts are in the DOM; CSS controls visibility:

```tsx
<div className="md:hidden h-dvh flex flex-col">
  {/* Mobile multi-step flow */}
</div>
<div className="hidden md:block h-dvh">
  {/* Tablet combined layout */}
</div>
```

## Error Handling

- **Missing game context:** If `useGame()` returns undefined game, header bars show placeholder text (existing behavior from EnterContractPage).
- **Invalid contract level in result calculation:** The contract string is parsed with `parseInt(contract[0], 10)`. If parsing fails (NaN), defaults to level 1 (safest range: maxOver=6, maxDown=7).
- **Lead card not required but section renders:** The `leadCardRequired` prop gates the entire lead section. If false, the section is not rendered and lead is submitted as `null`.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/play/TabletCombinedEntry.tsx` | Main combined layout component |
| `src/components/play/TabletCombinedEntry.stories.tsx` | Storybook stories |
| `src/components/play/InlineOpeningLead.tsx` | Compact lead card component |
| `src/components/play/InlineOpeningLead.stories.tsx` | Storybook stories |
| `src/components/play/InlineBoardResult.tsx` | Compact result component |
| `src/components/play/InlineBoardResult.stories.tsx` | Storybook stories |

### Modified Files
| File | Change |
|------|--------|
| `src/components/play/BoardFlow.tsx` | Add responsive wrapper with both layouts |
| `src/components/play/BoardFlow.stories.tsx` | Add tablet viewport story |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/components/contract/ContractEntryPanel.tsx` | Director component — not part of this feature |
| `src/components/pages/play/PlayableContract.tsx` | Reused as-is in tablet layout |
| `src/components/play/OpeningLead.tsx` | Full-screen version used by mobile flow unchanged |
| `src/components/play/BoardResult.tsx` | Full-screen version used by mobile flow unchanged |

## Storybook Stories

### TabletCombinedEntry.stories.tsx

Stories covering:
- **Empty** — No selections, all sections visible but lead/result disabled
- **ContractSelected** — Valid contract selected, lead/result enabled
- **ContractAndLeadSelected** — Contract + lead chosen, result interactive
- **FullEntryComplete** — All fields filled, submit enabled
- **PassOutSelected** — Special outcome, submit enabled immediately
- **NotPlayedSelected** — Special outcome, submit enabled immediately
- **WithoutLeadCard** — `leadCardRequired=false`, lead section hidden
- **WithLeadCard** — `leadCardRequired=true`, lead section visible

### InlineOpeningLead.stories.tsx

Stories covering:
- **Default** — Suit S, Rank A (initial state)
- **Enabled** — Full opacity, interactive
- **Disabled** — Wrapped in opacity-50 pointer-events-none container

### InlineBoardResult.stories.tsx

Stories covering:
- **MadeMode** — Mode set to "made", showing overtrick grid
- **DownMode** — Mode set to "down", showing undertrick grid
- **Enabled** — Full opacity, interactive
- **Disabled** — Wrapped in opacity-50 pointer-events-none container
- **HighLevel** — 7NT contract (maxOver=0, maxDown=13)
- **LowLevel** — 1C contract (maxOver=6, maxDown=7)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Progressive Reveal Follows Contract Validity

For any contract state where at least one of level, suit, or declarer is null, the lead card section and result section SHALL be rendered with disabled styling (opacity-50 and pointer-events-none). Conversely, for any contract state where all three are non-null, both sections SHALL be fully opaque and interactive.

**Validates: Requirements 4.1, 4.2, 5.1, 5.2**

### Property 2: Submit Enablement Logic

For any combination of (contract validity state, lead card selection state, result selection state, leadCardRequired flag), the submit button SHALL be enabled if and only if: (a) a special outcome (Pass Out or Not Played) is selected, OR (b) a valid contract is selected AND a result value is chosen AND (if leadCardRequired is true) a lead card is selected.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 3: Result Range Calculation

For any contract level L in {1, 2, 3, 4, 5, 6, 7}, the result section SHALL display exactly (13 - 6 - L + 1) overtrick options (0 through 13-6-L inclusive) and exactly (6 + L) undertrick options (1 through 6+L inclusive).

**Validates: Requirements 5.6**

### Property 4: Contract Display Reflects Selection

For any valid combination of level, suit, declarer, and doubling selections, the contract display text SHALL contain the level digit, the suit symbol, and the declarer direction. For any special outcome selection, the display text SHALL show the corresponding label ("Pass Out" or "Not Played").

**Validates: Requirements 3.4**

### Property 5: Submission Payload Integrity

For any valid completed entry state (valid contract + result value + optional lead card), when submit is pressed the completion callback SHALL receive a payload where the contract code matches the selected level/suit/dbl/declarer, the result value matches mode and value (positive for made, negative for down), and the lead card matches the selected suit + rank (or null if leadCardRequired is false).

**Validates: Requirements 10.1, 10.3**
