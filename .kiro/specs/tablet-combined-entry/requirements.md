# Requirements Document

## Introduction

The Bridge Box Scorer board-entry flow currently uses three separate screens (EnterContractPage → OpeningLead → BoardResult) managed by the BoardFlow component. On tablets (viewport width ≥ 768px), this multi-step navigation is unnecessary because screen real estate allows all three sections to be visible simultaneously. This feature introduces a combined single-screen entry layout for tablets that progressively reveals the lead card and result sections as the player completes the contract selection. The mobile experience (< 768px) remains unchanged.

## Glossary

- **BoardFlow**: The component (`src/components/play/BoardFlow.tsx`) that orchestrates the multi-step board entry sequence (result → opening lead) after a contract is entered.
- **EnterContractPage**: The component (`src/components/pages/play/EnterContractPage.tsx`) that renders the contract selection UI including headers, board selector, Pass Out/Not Played buttons, and the 2×2 PlayableContract grid.
- **PlayableContract**: The component (`src/components/pages/play/PlayableContract.tsx`) that renders the 2×2 grid of Level, Suit, Declarer, and Double selection buttons.
- **OpeningLead**: The component (`src/components/play/OpeningLead.tsx`) that renders suit buttons and a rank grid for selecting the opening lead card.
- **BoardResult**: The component (`src/components/play/BoardResult.tsx`) that renders the Made/Down toggle and number grid for entering the board result.
- **ContractEntryPanel**: The director's contract correction component (`src/components/contract/ContractEntryPanel.tsx`) used for amending contracts after the fact.
- **TabletCombinedEntry**: The new combined-entry layout component rendered on tablet viewports that displays contract, lead card, and result sections on a single full-height screen.
- **Valid_Contract**: A contract selection state where level, suit, and declarer have all been chosen (all three are non-null).
- **Special_Outcome**: A board outcome of Pass Out or Not Played that bypasses lead card and result entry.
- **Tablet_Viewport**: A viewport with width ≥ 768px (Tailwind `md:` breakpoint).
- **Mobile_Viewport**: A viewport with width < 768px.

## Requirements

### Requirement 1: Responsive Layout Switching

**User Story:** As a player, I want the board entry flow to automatically adapt to my device size, so that I get a combined single-screen experience on tablets without losing the familiar step-by-step flow on my phone.

#### Acceptance Criteria

1. WHILE the viewport width is ≥ 768px, THE BoardFlow SHALL render the TabletCombinedEntry layout instead of the multi-step screen flow.
2. WHILE the viewport width is < 768px, THE BoardFlow SHALL render the existing multi-step flow (EnterContractPage → OpeningLead → BoardResult) with no changes to layout or behaviour.
3. THE BoardFlow SHALL use Tailwind responsive visibility classes (`md:hidden` and `hidden md:block`) to switch between mobile and tablet layouts.
4. THE ContractEntryPanel SHALL remain unchanged and SHALL NOT receive the tablet combined-entry treatment.

### Requirement 2: Tablet Combined Layout Structure

**User Story:** As a player on a tablet, I want contract, lead card, and result entry all visible on one screen arranged vertically, so that I can complete board entry without navigating between pages.

#### Acceptance Criteria

1. THE TabletCombinedEntry SHALL render as a single full-viewport-height column layout.
2. THE TabletCombinedEntry SHALL display sections in the following top-to-bottom order: header bars, contract section, lead card section (if leadCardRequired is true), result section, submit button.
3. THE TabletCombinedEntry header bars SHALL include the event info bar and the table/round/board selector bar, matching the existing EnterContractPage header bars.
4. WHEN `leadCardRequired` is true, THE contract section SHALL occupy approximately 45% of the remaining viewport height below the headers, the lead card section approximately 25%, and the result section approximately 30%.
5. WHEN `leadCardRequired` is false, THE contract section SHALL occupy approximately 55% of the remaining viewport height below the headers, and the result section approximately 45%.
6. THE TabletCombinedEntry SHALL include a single submit button below the result section.

### Requirement 3: Contract Section on Tablet

**User Story:** As a player on a tablet, I want the contract entry grid to look and work identically to the current mobile contract screen, so that the interaction is familiar.

#### Acceptance Criteria

1. THE contract section SHALL render the existing PlayableContract 2×2 grid (Level, Suit, Declarer, Double) with square buttons.
2. THE contract section SHALL include the Pass Out and Not Played buttons in the same layout as EnterContractPage.
3. THE contract section SHALL include the contract display text showing the currently selected contract.
4. WHEN a player selects contract values (level, suit, declarer, doubling), THE contract section SHALL update the contract display text to reflect the selection.

### Requirement 4: Progressive Reveal of Lead Card Section

**User Story:** As a player on a tablet, I want the lead card section to become active only after I have selected a valid contract, so that the interface guides me through entry in the correct order.

#### Acceptance Criteria

1. WHILE no Valid_Contract is selected, THE lead card section SHALL be displayed with reduced opacity (opacity-50) and pointer events disabled (pointer-events-none).
2. WHEN a Valid_Contract is selected (level, suit, and declarer are all non-null), THE lead card section SHALL become fully opaque and interactive.
3. THE lead card section SHALL render suit selection buttons and a rank selection grid.
4. THE lead card section SHALL NOT render the card preview visual element that the full-screen OpeningLead displays.
5. THE lead card section SHALL NOT include its own header or footer elements.
6. THE lead card section SHALL NOT use `h-[100dvh]` or any full-viewport-height styling.
7. THE lead card section SHALL only be rendered when `leadCardRequired` is true.

### Requirement 5: Progressive Reveal of Result Section

**User Story:** As a player on a tablet, I want the result section to become active only after I have selected a valid contract, so that I cannot enter a result without first specifying what contract was played.

#### Acceptance Criteria

1. WHILE no Valid_Contract is selected, THE result section SHALL be displayed with reduced opacity (opacity-50) and pointer events disabled (pointer-events-none).
2. WHEN a Valid_Contract is selected (level, suit, and declarer are all non-null), THE result section SHALL become fully opaque and interactive.
3. THE result section SHALL render a Made/Down toggle and a number grid for selecting overtricks or undertricks.
4. THE result section SHALL NOT include its own header or footer elements.
5. THE result section SHALL NOT use `h-[100dvh]` or any full-viewport-height styling.
6. THE result section SHALL calculate the valid overtrick and undertrick ranges based on the selected contract level.

### Requirement 6: Special Outcome Handling

**User Story:** As a player on a tablet, I want Pass Out and Not Played to immediately submit without requiring lead or result entry, so that these special cases are handled efficiently.

#### Acceptance Criteria

1. WHEN the player selects Pass Out, THE TabletCombinedEntry SHALL submit the Pass Out outcome immediately without requiring lead card or result input.
2. WHEN the player selects Not Played, THE TabletCombinedEntry SHALL submit the Not Played outcome immediately without requiring lead card or result input.
3. WHEN a Special_Outcome is selected, THE lead card section and result section SHALL remain in their disabled state.

### Requirement 7: Lead Card Section Visibility

**User Story:** As a player on a tablet, I want the lead card section to only appear when the director has configured the game to require opening leads, so that I am not presented with unnecessary fields.

#### Acceptance Criteria

1. WHEN the game setting `leadCardRequired` is false, THE lead card section SHALL NOT be rendered in the TabletCombinedEntry layout.
2. WHEN the game setting `leadCardRequired` is true, THE lead card section SHALL be rendered between the contract section and the result section.
3. THE TabletCombinedEntry SHALL accept a `leadCardRequired: boolean` prop (defaulting to false until the setting is implemented).
4. WHEN `leadCardRequired` is false on mobile, THE OpeningLead step SHALL be skipped in the BoardFlow multi-step sequence.

### Requirement 8: Submit Button Enablement

**User Story:** As a player on a tablet, I want the submit button to only be active when all required fields are filled, so that I cannot submit an incomplete entry.

#### Acceptance Criteria

1. WHEN Pass Out or Not Played is selected, THE submit button SHALL be enabled immediately (no result or lead card required).
2. WHEN a standard Valid_Contract is selected AND `leadCardRequired` is true, THE submit button SHALL be enabled only when BOTH a lead card AND a result value have been chosen.
3. WHEN a standard Valid_Contract is selected AND `leadCardRequired` is false, THE submit button SHALL be enabled only when a result value has been chosen.
4. WHILE the submit button is disabled, it SHALL appear visually muted (reduced opacity or grayed color).

### Requirement 9: Compact Inline Component Variants

**User Story:** As a developer, I want compact inline variants of OpeningLead and BoardResult that can be embedded in the tablet layout without viewport-height sizing or standalone headers/footers, so that the tablet layout remains a single scrollable screen.

#### Acceptance Criteria

1. THE OpeningLead component (or a new inline variant) SHALL support rendering without `h-[100dvh]` styling, without a header, and without a footer when used in the tablet combined layout.
2. THE BoardResult component (or a new inline variant) SHALL support rendering without `h-[100dvh]` styling, without a header, and without a footer when used in the tablet combined layout.
3. THE inline variants SHALL expose the same selection state (suit, rank for lead; mode, value for result) via callbacks or controlled props so that the parent TabletCombinedEntry can read the current selections.
4. THE existing full-screen OpeningLead and BoardResult components SHALL continue to function unchanged when rendered in the mobile multi-step flow.

### Requirement 10: Single Submission

**User Story:** As a player on a tablet, I want all my board entry data sent in one action when I press submit, so that the system receives a complete board record without partial saves.

#### Acceptance Criteria

1. WHEN the player presses the submit button, THE TabletCombinedEntry SHALL invoke the completion callback with the contract code, the optional lead card (or null), and the result value.
2. THE TabletCombinedEntry SHALL NOT invoke intermediate save callbacks between sections.
3. THE submission payload format SHALL match the data structure expected by the existing BoardFlow onComplete callback (`{ result: number; lead: Card | null }`), plus the contract code.

### Requirement 11: Mobile Flow Preserved

**User Story:** As a player on a phone, I want the existing three-screen entry flow to work exactly as it does today, so that the tablet feature does not regress my experience.

#### Acceptance Criteria

1. WHILE the viewport width is < 768px, THE EnterContractPage SHALL render as a full-screen contract entry page with its own submit button.
2. WHILE the viewport width is < 768px, THE BoardResult SHALL render as a full-screen result entry page with its own Continue button.
3. WHILE the viewport width is < 768px, THE OpeningLead SHALL render as a full-screen lead entry page.
4. THE mobile flow navigation sequence (EnterContractPage → BoardResult → OpeningLead) SHALL remain managed by the existing BoardFlow step state.

### Requirement 12: Storybook Stories

**User Story:** As a developer, I want Storybook stories for all new and modified components in the tablet combined-entry feature, so that I can visually develop and review the UI in isolation.

#### Acceptance Criteria

1. THE TabletCombinedEntry component SHALL have a Storybook story file with stories showing: empty state, contract selected, contract + lead selected, contract + result selected, full entry complete, Pass Out selected, Not Played selected.
2. THE compact inline OpeningLead variant SHALL have a Storybook story showing the component in its enabled and disabled states.
3. THE compact inline BoardResult variant SHALL have a Storybook story showing the component in its enabled and disabled states, for both Made and Down modes.
4. THE TabletCombinedEntry story SHALL include a variant where `leadCardRequired` is false (lead section hidden) and a variant where it is true (lead section visible).
5. ALL Storybook stories SHALL be placed next to their component files following the existing convention (`*.stories.tsx`).
