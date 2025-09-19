# Management Dashboard Design Brief
*For Executive KR Tracker Overview*

## Project Context

You're designing a management dashboard for a KR (Key Results) tracking system used by executives to monitor organizational performance across teams, objectives, and initiatives. This is the "10,000 foot view" that leadership needs to make strategic decisions.

## Target Users
- **Primary**: Executives/VPs who need high-level organizational insights
- **Secondary**: Directors who manage multiple teams and need cross-team visibility

## Core Data Model Understanding

The system tracks:
- **Organizations** → **Teams** → **Pods** → **Individuals**
- **Objectives** (quarterly goals) → **Key Results** (measurable outcomes)
- **Initiatives** (specific projects/experiments to drive KR improvement)
- **Metrics**: Weekly actuals vs. plans, health status (green/yellow/red), pace to goal

### Sample Data Context
- **3 Teams**: Live Order Experience, Go-To-Market, Support  
- **7 Key Results** across these teams (e.g., "Reduce handoff failure rate", "Increase menu coverage")
- **21 Initiatives** with varying impact/confidence levels
- **13-week quarterly tracking** with weekly actual vs. plan data

## Key Design Requirements

### 1. Executive Summary (Hero Section)
**Must answer: "How are we doing overall?"**
- Overall organizational health score/indicator
- Total KRs by status (Green/Yellow/Red count)
- Quarterly progress percentage (e.g., "Week 6 of 13, 78% pace to goals")
- Critical alerts/items needing executive attention

### 2. Team Performance Grid
**Must answer: "Which teams need attention?"**
- Team-by-team performance overview
- KR health rollup per team
- Trend indicators (improving/declining)
- Resource allocation vs. performance correlation

### 3. Initiative ROI Analysis  
**Must answer: "Are our investments working?"**
- High-impact initiatives dashboard
- Confidence vs. Impact scatter plot
- Initiative status breakdown (On Track/At Risk/Blocked/Needs Decision)
- "Placeholder gap analysis" - where we need more concrete plans

### 4. Early Warning System
**Must answer: "What needs our immediate focus?"**
- KRs trending downward
- Blocked initiatives requiring decisions
- Teams with multiple at-risk KRs
- Resource bottlenecks

### 5. Drill-Down Capability
- Click through from summary → team → individual KR detail
- Time period filtering (current quarter, previous quarters)
- Export capabilities for board reporting

## Design Principles

### Visual Hierarchy
1. **Glanceable Metrics** (5-second scan): Overall health, critical alerts
2. **Actionable Insights** (30-second scan): Team performance, initiative status  
3. **Deep Analysis** (5-minute exploration): Trends, drill-downs, root causes

### Data Visualization Preferences
- **Health Status**: Clear red/yellow/green indicators with context
- **Trends**: Sparklines and mini-charts for week-over-week movement
- **Comparisons**: Team vs. team, actual vs. plan, initiative impact
- **Progress**: Progress bars, pace indicators, completion percentages

### Executive-Friendly Design
- **Dense but scannable**: Lots of information without clutter
- **Action-oriented**: Clear CTAs for items needing attention
- **Context-rich**: Numbers with meaning (not just raw metrics)
- **Mobile-responsive**: Viewable on tablets for on-the-go reviews

## Specific Metrics to Highlight

### Organizational Level
- KR Health Distribution (e.g., "5 Green, 1 Yellow, 1 Red")
- Overall Pace to Quarterly Goals (e.g., "94% on track")
- Initiative Coverage Ratio (planned impact vs. KR gaps)

### Team Level  
- Team Health Score (rollup of their KRs)
- Initiative Success Rate per team
- Resource Allocation (FTE/budget vs. performance)
- Cross-team dependency indicators

### Initiative Level
- ROI Quadrant Analysis (Impact vs. Confidence)
- Blocked/At-Risk Initiative Count
- Placeholder Initiative Gap Analysis
- Week-over-week initiative health changes

## User Scenarios

### Scenario 1: Weekly Executive Review (5 minutes)
*"I need to understand organizational health and identify what needs my attention this week"*
- Quick health overview
- Critical alerts
- Items requiring executive decision/support

### Scenario 2: Quarterly Planning Prep (15 minutes)  
*"I'm preparing for quarterly business review and need performance insights"*
- Team performance comparison
- Initiative ROI analysis
- Trend analysis across quarters
- Resource reallocation recommendations

### Scenario 3: Board Reporting (10 minutes)
*"I need to extract key insights and data for board presentation"*
- Executive summary cards
- Exportable visualizations
- Narrative insights (what's working, what isn't)

## Technical Constraints

- Built with React/TypeScript
- Uses existing design system (shadcn/ui components)
- Responsive design (desktop primary, tablet secondary)
- Dark/light theme support
- Data refreshes weekly but should handle real-time updates

## Inspiration & Style Notes

Think:
- **Amplitude/Mixpanel dashboards** - clean, data-dense, executive-friendly
- **Linear's project overview** - clear status indicators, actionable insights  
- **Notion's database views** - flexible filtering and drill-down
- **Stripe's business dashboards** - financial clarity with context

**Avoid:**
- Generic admin dashboards
- Overly playful/consumer-focused designs
- Cluttered layouts that bury key insights
- Charts without clear actionable takeaways

## Deliverables Requested

### Primary Mockups (3-4 screens)
1. **Executive Summary Dashboard** - the main landing page
2. **Team Performance Detail** - drill-down view for team analysis
3. **Initiative ROI Analysis** - initiative impact and status overview
4. **Mobile/Tablet Responsive** - how it adapts to smaller screens

### Secondary Explorations (if time permits)
- Alternative layout approaches for dense data display
- Creative visualizations for initiative ROI quadrants
- Early warning/alert system UI patterns
- Export/sharing flow mockups

## Success Criteria

The design succeeds if:
- Executives can understand organizational health in under 30 seconds
- Critical issues requiring attention are immediately obvious
- Decision-making is supported with clear, contextual data
- The interface scales from quick glances to deep analysis
- Teams and initiatives can be compared fairly and meaningfully

---

*This dashboard will be the primary tool for executive decision-making around resource allocation, team support, and strategic pivots. The design should reflect the gravity and importance of these decisions while remaining approachable and actionable.*