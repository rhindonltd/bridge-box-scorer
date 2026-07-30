# Design Document: Director Control Theme Alignment

## Overview

Update the Director Control page (`ControlsPage.tsx`) from its current dark theme to match the app's standard light colour scheme. This is a visual-only change — layout structure and component logic remain unchanged.

## Architecture

This change is confined to a single file: `src/components/pages/timer/ControlsPage.tsx`. No new components, hooks, or utilities are introduced. The approach is a direct class-by-class replacement of Tailwind utility classes.

## Design Approach

The app's standard light theme is established across `MainMenuPage`, `ManageGameList`, `ClaimDirectorCode`, `PlayHeader`, and `RoundInfoPage`. The Director Control page will adopt the same palette, border treatments, and interaction states.

### Reference Patterns Extracted from Codebase

| Element | Pattern | Source |
|---------|---------|--------|
| Page background | `bg-white` or `bg-gray-100` | MainMenuPage, RoundInfoPage |
| Page header | `bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg` | ManageGameList |
| Body text | `text-gray-900` | ManageGameList, ClaimDirectorCode |
| Secondary/label text | `text-gray-600` or `text-gray-500` | PlayHeader, ManageGameList |
| Primary button | `bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` | MainMenuPage, ClaimDirectorCode, RoundInfoPage |
| Secondary button | `bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` | MainMenuPage |
| Card/panel | `bg-gray-50 border border-gray-200 rounded-xl` | ManageGameList |
| Form input | `border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500` | ClaimDirectorCode |

## Detailed Class Mappings

### 1. Page Container

**Current:**
```tsx
<div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-6">
```

**Target:**
```tsx
<div className="min-h-dvh bg-white text-gray-900 flex flex-col items-center justify-center gap-6 p-6">
```

### 2. Page Title

**Current:**
```tsx
<h1 className="text-3xl font-bold mb-2">Director Controls</h1>
```

**Target:**
```tsx
<h1 className="text-3xl font-bold mb-2 text-gray-900">Director Controls</h1>
```

Note: `text-gray-900` is inherited from the container but made explicit for clarity. The title stays inline (no separate header bar) to preserve the centred layout.

### 3. Status Panel

**Current:**
```tsx
<div className="w-full max-w-md bg-gray-900 rounded-lg p-4 text-sm">
```

**Target:**
```tsx
<div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
```

### 4. Status Labels

**Current:**
```tsx
<span className="text-white/60">Status</span>
```

**Target:**
```tsx
<span className="text-gray-500">Status</span>
```

Apply to all `text-white/60` instances within the status panel.

### 5. "No active session" Text

**Current:**
```tsx
<div className="text-white/50 mb-2">No active session</div>
```

**Target:**
```tsx
<div className="text-gray-500 mb-2">No active session</div>
```

### 6. Form Input Labels

**Current:**
```tsx
<label className="text-sm text-white/60">
```
and
```tsx
<span className="text-sm text-white/60">
```

**Target:**
```tsx
<label className="text-sm text-gray-600">
```
and
```tsx
<span className="text-sm text-gray-600">
```

### 7. Number Inputs

**Current:**
```tsx
className="p-2 rounded bg-gray-800"
```
and
```tsx
className="p-2 rounded bg-gray-800 w-20"
```

**Target:**
```tsx
className="p-2 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
```
and
```tsx
className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
```

### 8. Radio Button Labels

The radio fieldset text inherits `text-gray-900` from the container. No change needed for the radio labels themselves — they use default text colour.

### 9. Create Button (no active session)

**Current:**
```tsx
className="bg-cyan-600 py-6 rounded-xl text-xl font-semibold col-span-2"
```

**Target:**
```tsx
className="bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
```

Rationale: The app uses `bg-blue-600` as the single primary action colour. The cyan is non-standard.

### 10. Apply Changes Button

**Current:**
```tsx
className="bg-blue-600 py-6 rounded-xl text-xl font-semibold col-span-2"
```

**Target:**
```tsx
className="bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
```

### 11. Start Button

**Current:**
```tsx
className="bg-green-600 py-6 rounded-xl text-xl font-semibold"
```

**Target:**
```tsx
className="bg-green-600 text-white py-6 rounded-xl text-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
```

Rationale: Green is retained for semantic meaning (start/go) but given proper hover, active, and focus-visible states consistent with the app's interaction pattern.

### 12. Pause Button

**Current:**
```tsx
className="bg-yellow-600 py-6 rounded-xl text-xl font-semibold"
```

**Target:**
```tsx
className="bg-yellow-500 text-gray-900 py-6 rounded-xl text-xl font-semibold hover:bg-yellow-600 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
```

Rationale: Yellow-600 on a light background has poor contrast with white text. Switching to `yellow-500` with `text-gray-900` ensures readable text and maintains the caution/pause semantic. Hover darkens to yellow-600.

## Summary of All Class Changes

| # | Element | Old Classes | New Classes |
|---|---------|-------------|-------------|
| 1 | Page container | `bg-gray-950 text-white` | `bg-white text-gray-900` |
| 2 | Status panel | `bg-gray-900 rounded-lg` | `bg-gray-50 border border-gray-200 rounded-xl` |
| 3 | Status labels | `text-white/60` | `text-gray-500` |
| 4 | No session text | `text-white/50` | `text-gray-500` |
| 5 | Input labels | `text-white/60` | `text-gray-600` |
| 6 | Number inputs | `bg-gray-800` (+ `rounded`) | `bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500` |
| 7 | Create button | `bg-cyan-600` (no states) | `bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition focus-visible:...` |
| 8 | Apply Changes | `bg-blue-600` (no states) | `bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition focus-visible:...` |
| 9 | Start button | `bg-green-600` (no states) | `bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] transition focus-visible:...` |
| 10 | Pause button | `bg-yellow-600` (no states) | `bg-yellow-500 text-gray-900 hover:bg-yellow-600 active:scale-[0.98] transition focus-visible:...` |

## Scope Boundaries

- **In scope:** Colour, border, focus/hover/active state changes in `ControlsPage.tsx`
- **Out of scope:** Layout changes, component restructuring, logic changes, adding/removing elements, changes to other files

## Error Handling

No error handling changes — this is a purely visual update.

## Correctness Properties

This is a visual-only refactor with no logic changes. Property-based testing is not applicable for CSS class replacements. Correctness is verified by:
- Visual inspection (the page renders with light theme colours)
- No TypeScript compilation errors after the change
- Existing tests continue to pass (no behavioural change)
