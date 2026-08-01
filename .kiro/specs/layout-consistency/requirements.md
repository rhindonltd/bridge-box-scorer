# Requirements Document

## Introduction

The Bridge Box Scorer application requires a consistent page layout pattern across all pages (except timer pages). The root layout provides a gray outer background with a fixed-width centered white container holding page content. On mobile devices the content fills the full screen width (no gray visible); the gray outer background only appears on larger screens where the content area doesn't span the full viewport. Currently, individual page components redundantly set their own viewport-height and background classes, causing inconsistency and maintenance burden. This feature consolidates layout responsibility into the root layout and removes redundant styling from page components.

## Glossary

- **Root_Layout**: The Next.js root layout component (`src/app/layout.tsx`) that wraps all pages with the application shell including the `<html>`, `<body>`, and inner container `<div>`.
- **Inner_Container**: The `<div>` element inside the Root_Layout body that provides `mx-auto max-w-2xl min-h-dvh` centering and constrains content width.
- **Page_Component**: A React component in `src/components/pages/` that renders the full visual content for a given route.
- **Timer_Page**: The TimerPage component (`src/components/pages/timer/TimerPage.tsx`) that uses `fixed inset-0 bg-black` positioning to overlay the entire viewport regardless of parent layout.
- **Layout_Component**: Reusable layout wrapper components such as `HeaderContentBottomLayout` in `src/components/layout/` that provide structural patterns for page content.
- **Viewport_Height_Class**: Tailwind CSS classes `min-h-dvh` or `h-dvh` that set an element's minimum or exact height to the dynamic viewport height.
- **Page_Background_Class**: Tailwind CSS classes `bg-white` or `bg-gray-100` applied to a Page_Component's outermost wrapper element to set its background colour.

## Requirements

### Requirement 1: Root Layout White Background

**User Story:** As a user, I want page content displayed on a white background within a max-width container, so that on mobile the app is full-width and on desktop/tablet the content is centered with a gray surround.

#### Acceptance Criteria

1. THE Inner_Container SHALL include the `bg-white` class in addition to the existing `mx-auto max-w-2xl min-h-dvh` classes.
2. THE Root_Layout body element SHALL retain the `bg-gray-100` class to provide the outer gray background.
3. THE Inner_Container SHALL remain the single source of page-level background colour and viewport-height constraint for all non-timer pages.
4. ON mobile devices (viewport width ≤ max-w-2xl / 672px), THE Inner_Container SHALL fill 100% of the viewport width so that no gray background is visible.

### Requirement 2: Remove Redundant Viewport-Height Classes from Page Components

**User Story:** As a developer, I want page components to not duplicate viewport-height styling already provided by the root layout, so that layout behaviour is defined in one place and easier to maintain.

#### Acceptance Criteria

1. WHEN a Page_Component renders its outermost wrapper, THE Page_Component SHALL NOT include a Viewport_Height_Class (`min-h-dvh` or `h-dvh`) on that wrapper element.
2. WHEN a Layout_Component (such as HeaderContentBottomLayout) renders its outermost wrapper, THE Layout_Component SHALL NOT include a Viewport_Height_Class on that wrapper element.
3. IF a Page_Component previously relied on `min-h-dvh` or `h-dvh` for flex-column layout stretching, THEN THE Page_Component SHALL use `flex-1` or equivalent flex-grow behaviour to fill the available space provided by the Inner_Container.

### Requirement 3: Remove Redundant Page-Level Background Classes

**User Story:** As a developer, I want page components to not set their own page-level background colour, so that the consistent white background is inherited from the root layout.

#### Acceptance Criteria

1. WHEN a Page_Component renders its outermost wrapper, THE Page_Component SHALL NOT include `bg-white` as a Page_Background_Class on that wrapper element.
2. WHEN a Page_Component renders its outermost wrapper, THE Page_Component SHALL NOT include `bg-gray-100` as a Page_Background_Class on that wrapper element.
3. WHEN a Layout_Component renders its outermost wrapper, THE Layout_Component SHALL NOT include a Page_Background_Class on that wrapper element.

### Requirement 4: Timer Page Exclusion

**User Story:** As a user, I want the timer to display as a full-screen black overlay regardless of the page layout, so that the timer is maximally visible during play.

#### Acceptance Criteria

1. THE Timer_Page SHALL retain the `fixed inset-0 bg-black` classes on its outermost wrapper element.
2. THE Timer_Page SHALL NOT be modified by layout-consistency changes.
3. WHILE the Timer_Page is displayed, THE Timer_Page SHALL visually overlay the entire viewport independent of the Inner_Container dimensions.

### Requirement 5: Preserve Contextual Headers

**User Story:** As a user, I want to continue seeing event names, player information, and navigation headers on pages that have them, so that I maintain context about where I am in the app.

#### Acceptance Criteria

1. WHEN a Page_Component contains a contextual header (event name, player info, round/table info, or navigation elements), THE Page_Component SHALL retain that header element and its styling unchanged.
2. THE Page_Component SHALL only remove the outermost wrapper's Viewport_Height_Class and Page_Background_Class without altering internal content structure or styling.

### Requirement 6: Update Tests Asserting Removed Classes

**User Story:** As a developer, I want tests to pass after layout changes, so that the test suite accurately reflects the new component structure.

#### Acceptance Criteria

1. WHEN a unit test asserts that a Page_Component root element has a Viewport_Height_Class, THEN THE test SHALL be updated to no longer assert that class.
2. WHEN a unit test asserts that a Page_Component root element has a Page_Background_Class, THEN THE test SHALL be updated to no longer assert that class.
3. WHEN a unit test asserts the class list of a Layout_Component root element, THEN THE test SHALL be updated to reflect the removal of Viewport_Height_Class and Page_Background_Class.
4. THE updated test suite SHALL pass without failures after all layout-consistency changes are applied.

### Requirement 7: Visual Consistency Across Pages

**User Story:** As a user, I want every page (except timer) to look visually consistent — full-width on mobile, and a centered white content area with gray surround on wider screens — so that the app feels polished and cohesive.

#### Acceptance Criteria

1. THE Root_Layout SHALL produce a visual result where body background is gray (`bg-gray-100`) and the content column is white (`bg-white`), centered horizontally with a maximum width of `max-w-2xl` (672px).
2. ON viewports narrower than 672px, THE Inner_Container SHALL span 100% width so the user sees only the white content area with no gray surround.
3. ON viewports wider than 672px, THE Inner_Container SHALL be horizontally centered with the gray body background visible on either side.
4. WHEN navigating between any non-timer pages, THE user SHALL observe a consistent white content area that fills the viewport height against the appropriate background for their screen size.
5. THE Inner_Container SHALL stretch to at least the full dynamic viewport height (`min-h-dvh`) so that short-content pages still show a full-height white column.
