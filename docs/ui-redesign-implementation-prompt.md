# KR Tracker UI Redesign Implementation Prompt

## Context
You are implementing a comprehensive UI/UX redesign for KR Tracker, a React + TypeScript + Vite application for tracking Key Results with weekly planning and actuals tracking. The application currently suffers from fragmented navigation, overwhelming content density, and unclear workflow. This redesign aims to reduce cognitive load by 50% and improve task completion speed by 30%.

## Current Technical Stack
- React 18.3 with TypeScript 5.6
- Vite 6.0 build system
- Zustand for state management (src/state/store.tsx)
- TailwindCSS for styling
- localStorage for persistence
- ISO 8601 week system (Monday-start weeks)

## Implementation Requirements

### Phase 1: Navigation Consolidation & Layout Structure

#### 1.1 Create Unified Navigation Component
**File**: Create `src/components/UnifiedNavigation.tsx`

Replace the current fragmented navigation (NavigationSidebar.tsx, Sidebar.tsx, and inline tabs) with a single accordion-style navigation:

```typescript
// Navigation structure to implement:
interface NavigationItem {
  id: string
  label: string
  icon: string // Use emoji icons: 📊 🎯 📈 👥 ⚙️
  path: string
  children?: NavigationSubItem[]
  badge?: number // For KR counts
}

// Navigation hierarchy:
- Dashboard (📊) - New unified landing page showing overview
- Planning (🎯)
  - Organization Setup
  - Goals & KRs  
  - Plan Builder
- Execution (📈)
  - Weekly Updates
  - Initiative Tracking
- Teams (👥) - Accordion expandable
  - [Dynamic team list with KR counts]
- Settings & Import (⚙️)
```

Key requirements:
- Only one section expanded at a time (accordion pattern)
- Show badge counts for teams (e.g., "Engineering (8 KRs)")
- Highlight current active section
- Fixed width: 240px on desktop, collapsible on mobile
- Smooth expand/collapse animations (200ms ease-in-out)

#### 1.2 Add Context Bar Component
**File**: Create `src/components/ContextBar.tsx`

Create a persistent context bar below the header showing:
```
[Period Icon] Q1 2025 • [Team Icon] Engineering Team • [Phase Icon] Phase: Execution • [Week Icon] Week 2025-W09 • [Health] 🟢 8 On Track ⚠️ 3 At Risk 🔴 1 Off Track
```

Requirements:
- Sticky position below main header
- Auto-update based on current view/filters
- Include phase workflow indicator
- Responsive: Stack on mobile, horizontal on desktop

#### 1.3 Simplify Main Layout Structure
**File**: Update `src/App.tsx`

Restructure the main layout:
```tsx
<div className="app-container">
  <UnifiedNavigation />
  <main className="main-content">
    <ContextBar />
    <div className="primary-content">
      {/* Current page content with reduced density */}
    </div>
  </main>
</div>
```

### Phase 2: Setup Wizard Implementation

#### 2.1 Create Setup Wizard Component
**File**: Create `src/components/SetupWizard/index.tsx`

Transform the current tab-based Setup.tsx into a guided 5-step wizard:

```typescript
interface WizardStep {
  id: 'welcome' | 'organization' | 'objectives' | 'key-results' | 'complete'
  title: string
  component: React.ComponentType<WizardStepProps>
  validation: (state: AppState) => { isValid: boolean; errors?: string[] }
  isOptional: boolean
}

// Step components to create:
// src/components/SetupWizard/WelcomeStep.tsx
// src/components/SetupWizard/OrganizationStep.tsx  
// src/components/SetupWizard/ObjectivesStep.tsx
// src/components/SetupWizard/KeyResultsStep.tsx
// src/components/SetupWizard/CompleteStep.tsx
```

Key features:
- Progress bar showing steps (filled circle for complete, empty for pending)
- Smart templates in OrganizationStep ("Startup Structure", "Single Team", "Enterprise")
- Objective suggestions based on team type
- KR quick creator with visual target sliders
- Persist wizard progress in localStorage
- Allow skip/exit with confirmation
- Mobile-responsive vertical step layout

#### 2.2 Add Template System
**File**: Create `src/lib/templates/organizationTemplates.ts`

```typescript
interface OrganizationTemplate {
  id: string
  name: string
  description: string
  teams: TeamTemplate[]
  suggestedObjectives: string[]
  suggestedKRs: KRTemplate[]
}

// Include templates for:
// - Single Team Setup (1 team, 3 pods, basic objectives)
// - Startup Structure (Eng, Product, Marketing teams)
// - Department Focus (Single dept with multiple pods)
```

### Phase 3: Grid Simplification

#### 3.1 Implement Progressive Disclosure in Grids
**File**: Update `src/components/ActualsGrid.tsx`

Simplify the grid rows to show only essential information:

```typescript
// Collapsed row shows:
// [KR Name] [Goal Badge] [Health Icon] [Current Pace %] [Sparkline] [...Menu]

// Expanded row additionally shows:
// - Team/Pod assignment
// - Detailed metrics
// - Variance analysis
// - Recent activity

interface GridRowProps {
  isExpanded: boolean
  onToggleExpand: () => void
  showEssentialOnly: boolean // New prop for progressive disclosure
}
```

Requirements:
- Click row to expand/collapse
- Replace multiple buttons with single context menu (⋯)
- Move detailed metrics to expansion panel
- Smooth expand animation (250ms)
- Keyboard navigation support (arrow keys + space to expand)

#### 3.2 Create Context Menu Component
**File**: Create `src/components/shared/ContextMenu.tsx`

Replace inline buttons with context menu pattern:
```typescript
interface ContextMenuItem {
  label: string
  icon?: string
  action: () => void
  isDangerous?: boolean // For delete actions
  isDisabled?: boolean
}

// Usage in grids:
// <ContextMenu items={[
//   { label: 'View Details', action: viewKR },
//   { label: 'Edit', action: editKR },
//   { label: 'View Waterfall', action: showWaterfall },
//   { label: 'Delete', action: deleteKR, isDangerous: true }
// ]} />
```

### Phase 4: Initiative Panel Integration

#### 4.1 Create Integrated Initiative Side Panel
**File**: Create `src/components/InitiativePanel.tsx`

Transform initiatives from separate grid to contextual side panel:

```typescript
interface InitiativePanelProps {
  krId: string
  isOpen: boolean
  onClose: () => void
  position: 'right' | 'overlay' // Right panel on desktop, overlay on mobile
}

// Panel sections:
// 1. Quick Add Initiative (top)
// 2. Visual Coverage Indicator
// 3. Active Initiatives List
// 4. Bulk Import Option
```

Features:
- Slide in from right (desktop) or bottom sheet (mobile)
- Visual sliders for impact/confidence (not numeric inputs)
- Progress bars showing coverage
- Auto-save on change with debounce (500ms)
- Close on ESC key or outside click

#### 4.2 Create Visual Impact Sliders
**File**: Create `src/components/shared/ImpactSlider.tsx`

Replace numeric inputs with visual sliders:

```typescript
interface ImpactSliderProps {
  value: number // 0-100 representing percentage of target
  onChange: (value: number) => void
  maxValue: number // KR target value
  showPercentage: boolean
  colorScale: 'impact' | 'confidence'
}

// Visual representation:
// [────────●────] 65% (130 of 200 units)
// With color gradients: red → yellow → green
```

### Phase 5: Visual Design System

#### 5.1 Update Theme and Spacing
**File**: Update `src/styles.css`

Implement consistent spacing and visual hierarchy:

```css
:root {
  /* Spacing scale (8px grid) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Reduce visual density */
  --grid-row-height: 48px; /* Increase from current */
  --grid-row-padding: var(--spacing-md);
  
  /* Consistent borders and shadows */
  --border-subtle: 1px solid rgba(0,0,0,0.08);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-panel: 0 4px 12px rgba(0,0,0,0.08);
  
  /* Animation timings */
  --transition-fast: 200ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
}
```

#### 5.2 Create Loading States and Skeletons
**File**: Create `src/components/shared/Skeleton.tsx`

Add loading skeletons for better perceived performance:

```typescript
interface SkeletonProps {
  variant: 'text' | 'row' | 'card' | 'panel'
  width?: string
  height?: string
  animate?: boolean
}
```

### Implementation Execution Order

1. **Day 1-2**: Navigation & Layout
   - Create UnifiedNavigation.tsx
   - Create ContextBar.tsx
   - Update App.tsx layout structure
   - Test responsive behavior

2. **Day 3-4**: Setup Wizard
   - Create SetupWizard component structure
   - Implement all 5 step components
   - Add organization templates
   - Wire up state management

3. **Day 5-6**: Grid Simplification
   - Update ActualsGrid with progressive disclosure
   - Create ContextMenu component
   - Simplify PlanGrid and InitiativesGrid
   - Add keyboard navigation

4. **Day 7-8**: Initiative Integration
   - Create InitiativePanel component
   - Implement ImpactSlider component
   - Add visual coverage indicators
   - Integrate with ActualsGrid

5. **Day 9-10**: Polish & Testing
   - Update CSS for consistent spacing
   - Add loading skeletons
   - Test all responsive breakpoints
   - Ensure keyboard accessibility

## Success Criteria

The implementation is successful when:

1. **Navigation**: Single, clear navigation system with accordion behavior
2. **Context**: Persistent context bar shows current phase/period/team
3. **Setup**: 5-step wizard reduces setup time to under 7 minutes
4. **Grids**: Progressive disclosure shows only essential info by default
5. **Initiatives**: Side panel appears contextually with visual sliders
6. **Performance**: All animations run at 60fps
7. **Accessibility**: Full keyboard navigation and ARIA labels
8. **Responsive**: Works on viewports from 320px to 4K
9. **State**: All changes properly update Zustand store
10. **Persistence**: UI state preserved in localStorage

## Testing Requirements

After implementation, verify:

1. Run existing tests: `npm run test`
2. Check ESLint: `npm run lint`
3. Test responsive design at 320px, 768px, 1024px, 1440px
4. Verify keyboard navigation (Tab, Arrow keys, Space, Enter, Esc)
5. Test with screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
6. Ensure localStorage migration from old to new structure
7. Verify no console errors or warnings
8. Check loading states and error handling
9. Test with both empty and seeded data states
10. Verify undo/redo functionality where applicable

## Key Constraints

- DO NOT break existing state management structure
- DO NOT modify the core domain model in src/models/types.ts
- DO NOT change the ISO week system implementation
- DO NOT remove any existing functionality, only reorganize
- DO NOT use any UI libraries not already in the project
- MAINTAIN backward compatibility with existing localStorage data
- PRESERVE all existing keyboard shortcuts
- ENSURE all changes are TypeScript strict mode compliant

## Visual ASCII References

Include these ASCII mockups as comments in your components for reference:

```
UNIFIED NAVIGATION:          CONTEXT BAR:                    SIMPLIFIED GRID ROW:
┌─ KR TRACKER ───┐           ┌────────────────────────┐      ┌─ KR Name ─────┬─W1─┬─W2─┐
├─ 📊 Dashboard  │           │ Q1 2025 • Eng Team     │      │ Revenue       │125 │142 │
├─ 🎯 Planning   │           │ Phase: Execution • W09 │      │ 🎯 100→300    │    │    │
├─ 📈 Execution  │           │ 🟢 8 ⚠️ 3 🔴 1          │      │ 📈 102% • ⋯   │    │    │
├─ 👥 Teams ▼    │           └────────────────────────┘      └───────────────┴────┴────┘
│  └─ Eng (8)    │
└─ ⚙️ Settings   │
```

## Additional Notes

- Use React.memo() for performance optimization on heavy components
- Implement virtual scrolling for grids with 50+ rows
- Add error boundaries around major UI sections
- Use React.lazy() for code splitting the Setup Wizard
- Consider adding a "What's New" modal for existing users
- Add analytics tracking for wizard completion rates
- Include tooltips for first-time users
- Add a command palette (Cmd+K) for power users in future iteration

This implementation should transform KR Tracker from a powerful but overwhelming tool into an intuitive, guided experience that maintains all functionality while dramatically improving usability.