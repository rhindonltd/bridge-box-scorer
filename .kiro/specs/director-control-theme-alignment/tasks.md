# Implementation Plan: Director Control Theme Alignment

## Overview

Replace dark theme Tailwind classes in `ControlsPage.tsx` with the app's standard light theme classes. Single-file change, no logic modifications.

## Tasks

- [x] 1. Update page container and title
  - [x] 1.1 Replace page container classes
    - Change `bg-gray-950 text-white` to `bg-white text-gray-900` on the root `<div>`
    - _Requirements: Page background, text colour_
  - [x] 1.2 Update status panel styling
    - Change `bg-gray-900 rounded-lg` to `bg-gray-50 border border-gray-200 rounded-xl`
    - Change all `text-white/60` labels inside the panel to `text-gray-500`
    - Change `text-white/50` "No active session" text to `text-gray-500`
    - _Requirements: Status panel, labels_

- [x] 2. Update form inputs and labels
  - [x] 2.1 Update input label colours
    - Change all `text-white/60` on `<label>` and `<span>` elements in the config section to `text-gray-600`
    - _Requirements: Label text colour_
  - [x] 2.2 Update number input styling
    - Replace `p-2 rounded bg-gray-800` with `p-2 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`
    - For inputs with `w-20`, include `w-20` in the new class string
    - _Requirements: Input styling_

- [x] 3. Update button styles with proper interaction states
  - [x] 3.1 Update Create button
    - Replace `bg-cyan-600 py-6 rounded-xl text-xl font-semibold col-span-2` with `bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
    - _Requirements: Primary button styling_
  - [x] 3.2 Update Apply Changes button
    - Replace `bg-blue-600 py-6 rounded-xl text-xl font-semibold col-span-2` with `bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
    - _Requirements: Primary button styling_
  - [x] 3.3 Update Start button
    - Replace `bg-green-600 py-6 rounded-xl text-xl font-semibold` with `bg-green-600 text-white py-6 rounded-xl text-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`
    - _Requirements: Semantic button with interaction states_
  - [x] 3.4 Update Pause button
    - Replace `bg-yellow-600 py-6 rounded-xl text-xl font-semibold` with `bg-yellow-500 text-gray-900 py-6 rounded-xl text-xl font-semibold hover:bg-yellow-600 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2`
    - _Requirements: Semantic button with interaction states, contrast fix_

- [x] 4. Final checkpoint
  - Ensure TypeScript compiles without errors, existing tests pass, and the page renders with the light theme. Ask the user if questions arise.

## Notes

- This is a single-file visual change — no logic, no new dependencies
- The Start and Pause buttons retain their semantic colours (green/yellow) rather than converting to blue, to preserve at-a-glance meaning for the director
- The Pause button switches from white text on yellow-600 to dark text on yellow-500 for better contrast on the light background
- No property-based tests are applicable for CSS-only changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2", "3.3", "3.4"] }
  ]
}
```
