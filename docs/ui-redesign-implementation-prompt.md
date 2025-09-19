# KR Tracker UI Redesign Prompt Set

## Overview
This prompt set replaces the old monolithic brief with five focused prompts. Each prompt can be handed to an implementation agent independently while preserving the shared context, guardrails, and dependencies needed to ship safely. Work through the prompts in order; validate and merge after every stage before moving on.

## General Guardrails
- TypeScript strict mode, React functional components, and ESM imports only.
- Operate within the existing architecture: Zustand store (`src/state/store.tsx`), TailwindCSS plus custom tokens (`src/styles.css`), ISO-week helpers (`src/utils/weeks.ts`), and persisted state under the localStorage key `kr-tracker-state-v3`.
- Maintain backward compatibility: do not modify domain types in `src/models/types.ts`, the ISO week utilities, or existing keyboard shortcuts.
- Reuse existing hooks/components and avoid adding new UI libraries. Favor `React.memo` for heavy rerenders; keep business logic in state/components and ensure `src/metrics` and `src/utils` stay pure.
- Include the ASCII mockups provided in the relevant prompts as code comments inside new components for quick visual reference.
- When introducing new persisted fields, extend `coalesceState` defaults so legacy payloads migrate cleanly.

---

## Prompt 1 — Navigation & Layout Consolidation

### Scope
Create a unified navigation experience and supporting layout shell that reduces cognitive load while remaining responsive.

### Deliverables
- `src/components/UnifiedNavigation.tsx`
- `src/components/ContextBar.tsx`
- `src/App.tsx` layout restructuring (wrapping existing routes/pages)
- Supporting styles (Tailwind classes or updates to `src/styles.css`)

### Core Requirements
- Accordion navigation replacing `NavigationSidebar.tsx`, `Sidebar.tsx`, and inline tab controls.
- Persistent context bar beneath the header showing current period, team, phase, reporting week, and health rollup.
- Fixed desktop sidebar width (240 px) with mobile collapse/expand affordance.
- Smooth expand/collapse animations (≈200 ms ease-in-out).
- Layout container that reserves space for navigation + context bar and yields a primary content slot for routed pages.

```
ASCII Reference — include in components as a comment:
UNIFIED NAVIGATION:          CONTEXT BAR:                    SIMPLIFIED GRID ROW:
┌─ KR TRACKER ───┐           ┌────────────────────────┐      ┌─ KR Name ─────┬─W1─┬─W2─┐
├─ 📊 Dashboard  │           │ Q1 2025 • Eng Team     │      │ Revenue       │125 │142 │
├─ 🎯 Planning   │           │ Phase: Execution • W09 │      │ 🎯 100→300    │    │    │
├─ 📈 Execution  │           │ 🟢 8 ⚠️ 3 🔴 1          │      │ 📈 102% • ⋯   │    │    │
├─ 👥 Teams ▼    │           └────────────────────────┘      └───────────────┴────┴────┘
│  └─ Eng (8)    │
└─ ⚙️ Settings   │
```

### UI Specification
- **Sidebar aesthetic:** use `var(--panel)` background, `var(--border)` divider lines, 20 px padding top/bottom, 16 px left/right padding, and 12 px vertical spacing between items. Typography: `text-sm` for section labels, `text-xs uppercase tracking-wide text-[var(--muted)]` for group titles.
- **Icons:** prefix labels with emoji provided; align icons and text using a 8 px gap; ensure icons remain 20 px wide for alignment.
- **Accordion states:**
  - Default: label text `var(--text)` with 70% opacity.
  - Hover: background switches to `rgba(37,99,235,0.08)` in light mode or `rgba(34,197,94,0.12)` in dark; text opacity 100%.
  - Active: left border indicator 3 px in `var(--accent)` (light) / `var(--success)` (dark); background `var(--accent-50)`; bold label typography.
  - Focus (keyboard): 2 px outline using `var(--focus)` with 4 px corner radius.
- **Badge counts:** pill with `var(--panel-2)` background, `var(--text-secondary)` text, 10 px horizontal padding, 16 px height, medium weight; when active, background `var(--accent)` and text white.
- **Teams section:** dynamic list renders as nested items with 28 px left padding, truncated text with ellipsis, and badge showing count (e.g., `8 KRs`).
- **Mobile collapse:** on ≤768 px width, sidebar hides behind a slide-in drawer from the left with 16 px top inset, 100% height overlay with `rgba(15,23,42,0.45)` backdrop; toggle button lives in header (hamburger icon SVG) with hit-area ≥44 px.
- **Context bar layout:** 56 px tall container spanning full width of main column, background `var(--panel-2)`, bottom border `1px solid var(--border)`, content padded 12 px vertical / 24 px horizontal. Items arranged horizontally with 12 px gap on ≥1024 px; stack vertically (8 px gap) on <768 px. Include icon chips (24 px circle, tinted background) and use bullet separator `•` with `var(--muted)` color.
- **Health pill group:** row of pill badges (🟢, ⚠️, 🔴) with respective background tints (`var(--success-50)`, etc.), counts in bold.
- **Layout:** main content should have 32 px padding on desktop, 16 px on mobile. Ensure the main scroll container has `min-height: 100vh` with `display: grid` to align sidebar and content columns.

### Acceptance Criteria
1. Expanding any top-level navigation section (pointer click or `Enter/Space`) collapses all other sections 100% of the time; focus remains on the toggled header.
2. Active route highlighting matches the current view filter from the store (organization, planning, execution, team, etc.) and updates immediately when dispatching `SET_VIEW_FILTER` or `SET_PHASE`.
3. Desktop sidebar width measures 240 px ± 2 px at ≥1024 px viewport, while ≤768 px viewports collapse the sidebar behind a toggle reachable via keyboard (`Tab` → `Enter`).
4. The context bar displays the period label, selected team/pod, phase label, reporting ISO week, and aggregate KR health counts derived from metrics; each source update in the store reflects within one render cycle.
5. Layout shell ensures main content scrolls independently of navigation; the context bar remains sticky under the header without overlapping content on scroll.

### Validation Checklist
- Resize browser to 320 px, 768 px, and 1440 px to confirm responsive behavior and context bar stickiness.
- Keyboard test: navigate accordion with Arrow Up/Down, toggle via `Space/Enter`, and ensure no focus trap when sidebar collapses.
- Dispatch `SET_PHASE` and `SET_REPORTING_DATE` in devtools to confirm reactive updates.
- Inspect animations in devtools performance panel to verify duration ≤220 ms.

### Integration Notes
- Existing navigation logic lives in `src/components/NavigationSidebar.tsx`, `Sidebar.tsx`, and tab controls inside `src/pages/*`; use them to map views and routes.
- View filters align with `ViewFilter` in `src/models/types.ts`; reuse store actions `SET_VIEW_FILTER`, `SET_PHASE`, and `SET_REPORTING_DATE`.
- Health counts should reuse `summarizeMetrics(state, weeks)` from `src/metrics/engine.ts`. Derive counts per status for the context bar.
- Persist any new UI state (e.g., sidebar collapsed flag) within `AppState` under a namespaced key like `ui.navigation`, and add defaults in `coalesceState` so legacy payloads migrate.

---

## Prompt 2 — Guided Setup Wizard

### Scope
Replace `src/pages/Setup.tsx` tabs with a guided five-step wizard that persists user progress and offers smart templates.

### Deliverables
- `src/components/SetupWizard/index.tsx`
- Step components: `WelcomeStep.tsx`, `OrganizationStep.tsx`, `ObjectivesStep.tsx`, `KeyResultsStep.tsx`, `CompleteStep.tsx`
- Wizard-specific hooks/utilities under `src/components/SetupWizard/`
- `src/lib/templates/organizationTemplates.ts`

### Core Requirements
- Five-step wizard with progress indicator (filled vs. hollow step markers).
- Template presets (“Single Team”, “Startup Structure”, “Department Focus”) seeding organization, team, objective, and KR scaffolding.
- Objective suggestions and KR quick-creator with slider-based goal targets.
- Persist wizard state/progress to localStorage (within the `kr-tracker-state-v3` payload, e.g., `state.ui.wizard`).
- Mobile-responsive layout that stacks navigation vertically and supports keyboard navigation.

### UI Specification
- **Layout:** Two-column arrangement on ≥1024 px (nav rail 280 px, content 1fr) with 32 px horizontal gutter; switch to stacked layout on smaller breakpoints with nav above content.
- **Progress indicator:** horizontal stepper bar (height 4 px) plus step chips:
  - Chip size 36 px circle, border `1px solid var(--border)`, background `var(--panel)`.
  - Completed: filled with `var(--accent)` (light) or `var(--success)` (dark) and white text; display check icon.
  - Current: ring effect using 2 px `var(--accent)` outline, inner circle filled `var(--accent-50)`, step title bold.
  - Future: muted label `var(--text-secondary)`.
- **Navigation rail:** display step titles in vertical list with 16 px spacing, show optional step labels via badge tag `Optional` using `var(--warning-50)` background. Provide short description (≤70 chars) under each title.
- **Form cards:** each step content enclosed in panel with 24 px padding, 16 px vertical field spacing, 12 px label spacing. Use `text-base` for field labels, `text-sm text-[var(--muted)]` for helper text.
- **Template card design:** grid of cards (min 240 px width) with icon, title, and description; selected state shows `var(--accent)` border (2 px) + subtle shadow (`var(--shadow-sm)`). Include bullet list summarizing seeded teams/objectives.
- **Slider UI:** use horizontal track (`height: 6 px`, radius 999px) with gradient from `#dc2626` → `#d97706` → `#16a34a` depending on value. Thumb 16 px circle with white border; show floating tooltip above thumb with current value and target units. Provide keyboard step of 1% on arrow press, 10% on Shift+Arrow.
- **Button stack:** primary CTA `Next` in `var(--accent)` background with 44 px height, secondary `Back` as outline button (border `var(--border)`), tertiary links for `Skip Step` (text button with confirmation modal). Buttons right-aligned desktop, full width mobile.
- **Error presentation:** inline alert bar (full width) with `var(--danger-50)` background, left accent border 3 px in `var(--danger)`, message text `text-sm`, bullet errors below fields.

### Acceptance Criteria
1. Forward navigation enforces per-step validation: invalid state blocks `Next` and surfaces errors returned from `validation()`.
2. Progress indicator renders five steps with correct completion states (current step highlighted, completed steps filled) and reflects optional steps when they become optional.
3. Selecting a template seeds teams/objectives/KRs exactly as defined in `organizationTemplates.ts`, marks seeded entities for later editing, and re-selection resets seeded data only after explicit confirmation.
4. Wizard persistence: after completing at least two steps, reloading restores the last visited step and form data without mutating unrelated portions of `AppState`.
5. Users can skip optional steps only after acknowledging a confirmation modal; the skip action logs state and surfaces a reminder banner on the Complete step.

### Validation Checklist
- Run through each template path and verify seeded data via `useStore.getState()`.
- Test on 360 px width to confirm vertical layout and slider usability.
- Accessibility: ensure step controls are reachable via `Tab`, `Enter`, and `Escape` (for modal dismissal).
- Inspect localStorage to confirm wizard fields nest under `ui.wizard` and do not overwrite plan/actual data.

### Integration Notes
- Use `src/pages/Setup.tsx` for existing logic, form sections, and validation patterns; migrate logic into dedicated step components.
- Templates must conform to types in `src/models/types.ts` (`Organization`, `Team`, `Objective`, `KeyResult`, `Initiative`).
- Persisted wizard state should merge via `coalesceState`; add default values to maintain backward compatibility.
- When seeding data, reuse existing store actions (`ADD_TEAM`, `ADD_OBJECTIVE`, `ADD_KR`) instead of mutating state directly.

---

## Prompt 3 — Grid Simplification & Context Menu

### Scope
Introduce progressive disclosure for primary grids and consolidate row actions into a shared context menu component.

### Deliverables
- Updates to `src/components/ActualsGrid.tsx`, `PlanGrid.tsx`, and `InitiativesGrid.tsx`
- New shared component `src/components/shared/ContextMenu.tsx`
- Grid row prop updates enabling collapsed/expanded states (`showEssentialOnly`, `isExpanded`, etc.)

### Core Requirements
- Collapsed row displays KR name, goal badge, health icon/status, current pace %, sparkline, and overflow menu.
- Expanded row reveals team/pod assignment, detailed metrics, variance analysis, and recent activity.
- `ContextMenu` accepts action descriptors with optional danger/disabled states and supports keyboard access.
- Smooth expand/collapse animation (≈250 ms) and arrow-key navigation to cycle focus between rows.

### UI Specification
- **Row height:** collapsed rows set to `var(--grid-row-height)` (increase to 56 px), padding `var(--grid-row-padding)` horizontally, 12 px vertical; expanded rows animate to content height + 16 px padding.
- **Collapsed layout:**
  - Left column: KR name bold `text-sm`, second line (if needed) `text-xs text-[var(--muted)]` with goal badge.
  - Health indicator: circular badge (16 px) filled with success/warning/danger color; include `aria-label` describing status.
  - Pace %: right-aligned `text-sm font-mono` with color-coded text (success/warning/danger) matching status thresholds.
  - Sparkline: 80 px width inline chart using existing component, bordered by `var(--spark-border)`.
  - Overflow button: 32 px square icon button with `⋯`, ghost background, focus ring using `var(--focus)`.
- **Expanded panel content:**
  - Use 2-column grid on desktop (metrics left, activity right) with 24 px gap; stack columns on <1024 px.
  - Show key metrics (plan vs actual, variance, forecast) in cards with 12 px padding, `var(--shadow-sm)` shadow.
  - Display team/pod assignment as pill badges (background `var(--panel-2)`).
  - Include timeline list for recent activity with date stamps (`text-xs uppercase text-[var(--muted)]`).
- **Animation:** height transition using `max-height` or `useAutoAnimate`; opacity fade 150 ms when revealing details; ensure `prefers-reduced-motion` disables transitions.
- **Context menu:**
  - Trigger button icon rotates 90° when menu open.
  - Menu uses popover positioned relative to row right edge, width 200 px, background `var(--panel)`, border `var(--border)`, `box-shadow: var(--shadow-panel)`.
  - Menu items: 40 px height, 12 px padding, left icon optional (emoji or heroicon). Hover color `var(--panel-2)`, focus ring `var(--focus)`. Danger actions display red text and icon.
- **Keyboard navigation:** rows become focusable via `tabIndex={0}`, arrow keys (`ArrowUp/ArrowDown`) move focus, `Home/End` jump to first/last row. `Enter` toggles expansion, `Escape` collapses.

### Acceptance Criteria
1. Grids render collapsed rows by default and toggle expansion on row click or `Space/Enter`; toggling preserves scroll position.
2. `ContextMenu` renders as a submenu triggered by a single button per row; items are keyboard navigable (Arrow keys + `Enter`) and expose accessible labels.
3. Expanded content loads lazily—metrics calculations run only after expansion (validate via React profiler or logging).
4. Grid navigation honors `visibleWeeks`; expanding rows does not shift column headers, and horizontal scroll behaves identically to current implementation.
5. Manual paste/edit shortcuts still operate while rows are collapsed or expanded (regression test plan and actuals workflows).

### Validation Checklist
- Keyboard traversal across ≥20 rows to confirm focus order and collapse behavior.
- Screen reader (VoiceOver or NVDA) check for menu announcement and row toggle messaging.
- Performance sanity: expand/collapse scripting cost stays under 16 ms in devtools performance tab.

### Integration Notes
- Base logic for grids lives in `ActualsGrid.tsx`, `PlanGrid.tsx`, and `InitiativesGrid.tsx`; retain paste handlers, sticky columns, and `useElementWidth`/`useVisibleWeeks` hooks.
- Leverage `summarizeMetrics` and other helpers in `src/metrics/engine.ts` when presenting health, pace, and variance.
- Reuse existing dispatch actions (`UPDATE_PLAN_DRAFT`, `UPDATE_ACTUALS`, `SET_VIEW_FILTER`) instead of creating duplicates.
- Persist expanded-row state (if needed) under `ui.grids` and set defaults in `coalesceState` to maintain compatibility.

---

## Prompt 4 — Initiative Panel Integration

### Scope
Embed initiatives management as a contextual side panel opened from KR rows.

### Deliverables
- `src/components/InitiativePanel.tsx`
- `src/components/shared/ImpactSlider.tsx`
- Wiring from grids (Actuals/Plan) to open the panel with the relevant `krId`
- Debounced auto-save hook for initiative edits

### Core Requirements
- Panel slides from the right on desktop and becomes a bottom-sheet overlay on mobile.
- Sections: quick add form, coverage visualization, active initiatives list, bulk import affordance.
- Visual sliders for impact/confidence using gradient color scales; primary interaction should not rely on raw numeric inputs.
- Auto-save initiative edits with 500 ms debounce and optimistic UI feedback.
- Close behavior: ESC key, overlay click, and close button, without disrupting grid focus.

### UI Specification
- **Desktop panel:** width 420 px, background `var(--panel)`, padding 24 px, drop shadow `var(--shadow-panel)`. Panel header includes title, `krId` reference pill, and close icon button (24 px). Use sticky header (shadow when scrolled) and sticky footer with action buttons when forms overflow.
- **Mobile bottom sheet:** height 88 vh, rounded top corners 20 px, drag handle indicator (40 px × 4 px, `var(--border)`), entry animation from bottom with spring (duration 220 ms). Body scrollable; background overlay `rgba(15,23,42,0.55)`.
- **Sections:**
  - Quick Add Initiative: inline form with name input (`text-sm`), two sliders for impact/confidence, `Add` button. Display inline validation text under inputs.
  - Coverage visualization: radial progress chart or stacked bar showing impact coverage vs target; include legend linking color to initiatives.
  - Active initiatives list: cards with initiative name, status pill, impact/confidence sliders (inline edit), last-updated timestamp `text-xs`. Provide reorder drag handle placeholder for future iteration (visually indicated but non-functional).
  - Bulk import: button styled as outline with upload icon, opens modal stub or tooltip with instructions.
- **Sliders:** track gradient color scale (`impact` red→green, `confidence` yellow→green), tick marks at 0, 25, 50, 75, 100; value bubble anchored above thumb showing absolute and percentage (e.g., `65% • 130 of 200`). Provide error state (red outline) when exceeding KR target.
- **Auto-save feedback:** show subtle toast anchored at bottom-left of panel (“Saved just now”) and spinner indicator on individual card while debounce pending. Use `aria-live="polite"` for announcements.
- **Keyboard focus:** trap focus inside panel when open; first focusable element is panel container, closing returns focus to originating row.

### Acceptance Criteria
1. Opening the panel injects the correct `krId`, loads initiatives, and locks background scrolling while open on mobile (overlay) but leaves grid scroll intact on desktop.
2. Impact/confidence sliders emit values 0–100 mapped to the KR target; thumbs show tooltips and respond to pointer drag and keyboard arrows (5% increments).
3. Auto-save dispatches `UPDATE_INITIATIVE` / `UPDATE_INITIATIVE_WEEKLY` only after debounce; quick successive edits coalesce into one dispatch.
4. Coverage indicator recalculates immediately after edits and matches `metrics/engine.ts` coverage logic.
5. Closing the panel returns focus to the originating grid element, preserving accessibility.

### Validation Checklist
- Desktop (≥1280 px) and mobile (<600 px) open/close cycles, verifying scroll locking behavior.
- Rapid slider adjustments to confirm debounced dispatch and absence of dropped edits.
- Accessibility: ensure ARIA roles (`dialog`, `slider`) are present and keyboard shortcuts operate.

### Integration Notes
- Initiatives data and actions are defined in `src/state/store.tsx` (`initiatives`, `UPDATE_INITIATIVE`, `UPDATE_INITIATIVE_WEEKLY`, `DELETE_INITIATIVE`). Reuse these actions to persist changes.
- Coverage calculations should piggyback on helpers in `metrics/engine.ts` (e.g., pace/variance utilities) to stay consistent.
- Persist panel state under `ui.initiatives` (open `krId`, layout mode) with defaults in `coalesceState` for migration.
- Honor existing keyboard shortcuts within grids (paste, navigation); ensure panel toggles do not block them when closed.

---

## Prompt 5 — Polish & Loading Experience

### Scope
Apply consistent spacing/theme tokens, introduce skeleton loading states, add error boundaries, and code-split heavy components.

### Deliverables
- Updates to `src/styles.css` introducing spacing scale, border/shadow tokens, and animation timing variables.
- `src/components/shared/Skeleton.tsx`
- Error boundary component (e.g., `src/components/ErrorBoundary.tsx`) applied to major UI sections.
- Code-splitting for the Setup Wizard via `React.lazy`/`Suspense`.

### Core Requirements
- Adopt an 8 px spacing scale via CSS variables and apply across updated components.
- Define skeleton variants (`text`, `row`, `card`, `panel`) with optional shimmer animation.
- Ensure loading states cover navigation, grids, wizard sections, and initiative panel while data hydrates.
- Wrap key routes/pages with error boundaries offering retry + error detail.
- Lazy-load Setup Wizard bundle to keep initial load time down.

### UI Specification
- **Spacing tokens:** add `--spacing-xs:4px`, `--spacing-sm:8px`, `--spacing-md:16px`, `--spacing-lg:24px`, `--spacing-xl:32px`; define `--shadow-panel`, `--shadow-sm`, `--border-subtle`. Apply tokens to components updated in prior prompts (navigation, wizard, grids, panel).
- **Skeleton variants:**
  - `text`: 100% width, 12 px height, 4 px radius; stacked with 8 px gap.
  - `row`: mimic grid row height with 100% width, 8 px radius, optional sparkline placeholders.
  - `card`: 280 px width, 160 px height, gradient shimmer (left-to-right 1500 ms) disabled when `prefers-reduced-motion` true.
  - `panel`: full container placeholder with header/footer segments; use `background: linear-gradient` with subtle stripes.
- **Error boundary UI:** card with illustration placeholder (rounded rectangle), headline `Something went wrong`, supporting copy `We’re logging this issue. Try again or refresh.`, primary button `Retry`, secondary `View details` toggling stack trace (collapsible area with monospace font). Colors: use `var(--danger-50)` background, `var(--danger)` headline accent.
- **Reduced motion:** wrap all CSS transitions/animations in media query `@media (prefers-reduced-motion: reduce)` to remove shimmer and set durations to 1 ms.
- **Lazy load fallback:** use `Skeleton` component matching target container (e.g., `variant="panel"` for Setup Wizard) wrapped in `Suspense` fallback. Provide `aria-busy="true"` while loading.

### Acceptance Criteria
1. `:root` exposes spacing (`--spacing-xs` … `--spacing-xl`), row height, padding, border, and animation variables; updated components consume variables instead of hard-coded values.
2. Skeleton component renders accessible placeholders (`aria-busy`, `aria-live` considerations) and matches sizing tokens; skeletons disappear when data arrives.
3. Error boundaries capture thrown errors, log via console, and offer a retry action that re-renders the subtree without full reload.
4. Code-splitting reduces the initial bundle chunk containing Setup Wizard by ≥30 % compared to current build (verify via `npm run build` output or Vite stats).
5. Animations (expand/collapse, skeleton shimmer) respect `prefers-reduced-motion: reduce` by disabling non-essential transitions.

### Validation Checklist
- Run `npm run build` to confirm bundle size reduction and absence of TypeScript errors.
- Toggle OS-level reduced motion and confirm animations scale down appropriately.
- Trigger artificial errors (temporarily throw inside a child) to verify boundary capture and recovery.
- Exercise loading states by throttling network or delaying Zustand hydration.

### Integration Notes
- Extend `src/styles.css` root tokens; audit existing components touched in earlier prompts to adopt the shared variables.
- Use Tailwind utilities alongside new CSS vars for consistency (`className="flex gap-[var(--spacing-md)]"`).
- Apply skeletons to entry points that currently flash empty content (navigation, grids, wizard, initiative panel).
- Place the new error boundary around major routes in `App.tsx`; log errors via `console.error` and expose a retry button tied to boundary reset.
- Lazy-load Setup Wizard (`React.lazy(() => import('…/SetupWizard'))`) and wrap in `<Suspense fallback={<Skeleton variant="panel" … />}>`.

---

## Backlog / Out of Scope
- Command palette (`Cmd+K`) for power users.
- Analytics instrumentation for wizard completion rates.
- "What's New" modal for returning users.
- First-time user tooltips/tours.
- Virtualized renderers for grids >50 rows (capture requirements separately).
- Additional theming variants beyond existing light/dark/contrast presets.

Document learnings after each prompt so future backlog items inherit accurate context.
