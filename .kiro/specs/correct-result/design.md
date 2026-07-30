# Design: Correct Result

## Architecture Overview

The Correct Result feature is a multi-step wizard within the director management area. It allows a director to override player-entered board results or void boards. The flow is implemented as a single client-side page (`/manage/[id]/correct-result`) with state-machine navigation between steps.

The architecture consists of:
- **Two new API endpoints** for fetching board data and saving overrides
- **A wizard page component** orchestrating the multi-step flow
- **Two new page-level components** (SelectBoardPage, SelectInstancePage)
- **A refactored ContractEntryPanel** extracted from the existing `EnterContractPage`
- **Reuse of the existing `BoardResult` component** with the footer enabled

## Routing

| Route | Purpose |
|-------|---------|
| `/manage/[id]/correct-result` | Client-side multi-step wizard for correcting results |

The page lives under the existing `/manage/[id]` layout which provides `GameProviderClient` context.

## Component Architecture

### State Machine (Wizard)

The wizard page manages a state machine with transitions:

```
selectBoard → selectInstance → enterContract → enterResult → saving → (navigate to menu)
                                    │                │
                                    │ (PO/NP)        │
                                    └────────────────┼──→ saving → (navigate to menu)
```

```typescript
type WizardStep =
  | { step: "selectBoard" }
  | { step: "selectInstance"; boardNumber: number }
  | { step: "enterContract"; boardNumber: number; roundNumber: number; tableNumber: number }
  | { step: "enterResult"; boardNumber: number; roundNumber: number; tableNumber: number; contract: ContractCode }
  | { step: "saving" };
```

### Component Hierarchy

```
page.tsx (CorrectResultRoute)
├── SelectBoardPage          — grid of board number buttons
├── SelectInstancePage       — list of instances for the selected board
├── ContractEntryPanel       — extracted contract entry UI (no context deps)
├── BoardResult              — existing tricks made/down component (footer enabled)
└── (saving state)           — calls override API, navigates back
```

### New Components

#### `SelectBoardPage`

**Location:** `src/components/pages/manage/correct-result/SelectBoardPage.tsx`

```typescript
interface SelectBoardPageProps {
  boards: number[];
  isLoading: boolean;
  onBoardSelected: (boardNumber: number) => void;
}
```

Renders a grid of board number buttons using `bg-gray-200 text-gray-800 rounded-xl` styling. Header shows game name via `useGame()`.

#### `SelectInstancePage`

**Location:** `src/components/pages/manage/correct-result/SelectInstancePage.tsx`

```typescript
interface BoardInstance {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  participants: PairsParticipants | IndividualParticipants;
  currentResult: string | null;
  status: BoardStatus | null;
}

interface PairsParticipants {
  type: "PAIRS";
  ns: string; // e.g. "Smith & Jones"
  ew: string;
}

interface IndividualParticipants {
  type: "INDIVIDUAL";
  n: string;
  s: string;
  e: string;
  w: string;
}

interface SelectInstancePageProps {
  boardNumber: number;
  instances: BoardInstance[];
  isLoading: boolean;
  onInstanceSelected: (instance: BoardInstance) => void;
}
```

Renders a list of cards (`bg-gray-50 border border-gray-200 rounded-xl`) showing participant names and current result.

#### `ContractEntryPanel` (Extracted)

**Location:** `src/components/contract/ContractEntryPanel.tsx`

Extracted from `EnterContractPage`. Contains the contract selection UI without any dependency on `usePlay()`, `useAssignment()`, or `useGame()`.

```typescript
interface ContractEntryPanelProps {
  headerText: string;
  subHeaderText?: string;
  onOk: (contract: ContractCode | SpecialBoardOutcome) => void;
}
```

Internally manages `level`, `suit`, `declarer`, `dbl`, `passOut`, `notPlayed` state. Renders:
- A context bar with the provided `headerText`
- Pass Out / Not Played buttons
- The `PlayableContract` 2x2 grid
- A submit button

The existing `EnterContractPage` is refactored to wrap `ContractEntryPanel` with the play-specific context (board selector, participant info).

## API Endpoints

### GET `/api/games/[gameId]/boards`

Returns distinct board numbers for the game.

```typescript
// Response
{ boards: number[] }
```

Implementation:
1. Look up the game from the game index to determine `gameType`
2. Open the appropriate game database (pairs or individual)
3. Query `SELECT DISTINCT board_number FROM boards ORDER BY board_number`
4. Return the sorted array

### GET `/api/games/[gameId]/boards/[boardNumber]`

Returns all instances of a specific board with participant information.

```typescript
// Response
{
  instances: BoardInstance[]
}
```

Implementation:
1. Determine game type from game index
2. Query all board records for the given `boardNumber`
3. For PAIRS: join with pairs/participants tables to get player names, format as "Player1 & Player2"
4. For INDIVIDUAL: join with individual/participants and players tables to get names for each seat
5. For each instance, compute `currentResult` as `directorOverrideResult ?? nsResult` (pairs) or `directorOverrideResult ?? nResult` (individual)
6. Return instances array

### POST `/api/games/[gameId]/boards/[boardNumber]/override`

Saves the director's override result.

```typescript
// Request body
{
  roundNumber: number;
  tableNumber: number;
  result: BoardOutcome; // PlayedContractCode like "3NTN=" or SpecialBoardOutcome like "PO" | "NP"
  directorToken: string;
}

// Response
{ success: true }
```

Implementation:
1. Validate `directorToken` using `validateDirectorToken(token, gameId)`
2. Determine game type from game index
3. Open the appropriate game database
4. Update the board record at `(roundNumber, tableNumber, boardNumber)`:
   - Set `director_override_result` to the provided `result`
   - Set `status` to `"OVERRIDDEN"`
5. Return success

## Data Flow

### Result Encoding

When the director enters a contract and result, the system must combine them into a `PlayedContractCode`:

```typescript
function buildPlayedContractCode(
  level: Level,
  suit: ContractSuit,
  doubling: Doubling,
  declarer: Direction,
  trickResult: number, // 0 = exact, positive = overtricks, negative = down
): PlayedContractCode {
  const contractPart = `${level}${suit}${doubling}${declarer}`;
  const resultPart = trickResult === 0 ? "=" : trickResult > 0 ? `+${trickResult}` : `${trickResult}`;
  return `${contractPart}${resultPart}` as PlayedContractCode;
}
```

The `BoardResult` component's `onSave` callback provides the trick result as a number:
- `0` = made exactly
- `+N` = N overtricks
- `-N` = N down

### Override Precedence

The scoring system already handles the override precedence in the USEBIO export:
```typescript
b.directorOverrideResult ?? b.nsResult
```

No changes needed to the scoring pipeline.

## Director Token Validation

The override API uses HTTP (not sockets), so it validates the director token from the request body:

1. Client reads token from `localStorage` via `getDirectorToken(gameId)`
2. Client includes token in the POST body as `directorToken`
3. Server calls `validateDirectorToken(directorToken, gameId)` which checks the login session DB
4. If invalid, returns 401 Unauthorized

## Wiring to Director Menu

Update `src/app/manage/[id]/menu/page.tsx`:

```typescript
onCorrectResultClick={() => router.push(`/manage/${id}/correct-result`)}
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Boards API returns empty | Show "No boards found" message |
| Instances API returns empty | Show "No instances found for this board" message |
| Director token invalid | Show error toast, remain on page |
| Save API fails | Show error toast, allow retry |
| Network error during fetch | Show error state with retry button |

## UI Conventions

All new components follow existing app patterns:
- Page background: `bg-white`
- Headers: `bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0`
- Cards: `bg-gray-50 border border-gray-200 rounded-xl`
- Primary buttons: `bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- Grid buttons (board numbers): `bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition`
- Scrollable areas: `flex-1 min-h-0 overflow-y-auto`
- Headers fixed: `shrink-0`

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Override result takes precedence

*For any* board instance that has both a player-entered result (`nsResult` / `nResult`) and a `directorOverrideResult`, the `currentResult` displayed to the director SHALL always equal the `directorOverrideResult`, regardless of what the player-entered result contains.

**Validates: Requirements 2.4**

### Property 2: PlayedContractCode construction validity

*For any* valid combination of level (1-7), suit (S/H/D/C/NT), doubling (""/X/XX), declarer (N/E/S/W), and trick result (0 for exact, +1 to +6 for overtricks, -1 to -7 for undertricks), the `buildPlayedContractCode` function SHALL produce a string that matches the PlayedContractCode regex pattern `^[1-7](S|H|D|C|NT)(X|XX)?[NESW](=|\+[1-6]|-[1-7])$`.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 3: Board instance completeness

*For any* game with N board records sharing the same board number, the instances API endpoint SHALL return exactly N instances, each containing non-null participant information and a `currentResult` value (which may be null only if no result has been entered and no override exists).

**Validates: Requirements 2.1**
