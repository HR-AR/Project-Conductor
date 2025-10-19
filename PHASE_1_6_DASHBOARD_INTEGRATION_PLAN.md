# Phase 1.6: Dashboard Demo Data Integration

## Goal
Make the unified dashboard display demo data from sessionStorage when in demo mode.

## Current State
- ✅ Demo data is seeded and stored in sessionStorage
- ✅ Demo banner shows when in demo mode
- ❌ Dashboard still shows default/mock data (not demo data)

## Implementation Plan

### Task 1: Create Demo Data Loader
Add JavaScript function that:
1. Checks if `sessionStorage.demo === 'true'`
2. Reads `sessionStorage.demo_data`
3. Parses JSON and returns demo projects/approvals/milestones

### Task 2: Populate Dashboard Stats
Replace hardcoded stats with demo data:
- Total projects count
- Approvals pending
- Milestones in progress
- Team size

### Task 3: Render Demo Projects
Display demo projects in:
- "At-a-Glance Summary" section
- Project cards/list
- Quick actions

### Task 4: Show Demo Approvals
Populate approval queue with demo approvals showing:
- Approver name
- Status (pending/approved/rejected)
- SLA time remaining

### Task 5: Display Demo Milestones
Show demo milestones in progress tracker:
- Milestone titles
- Progress percentages
- Blocked items with reasons

## Success Criteria
- [ ] Dashboard loads demo data when demo=true
- [ ] Real data loads when demo=false
- [ ] Stats reflect demo project counts
- [ ] Projects display with demo titles/descriptions
- [ ] Approvals show demo team members
- [ ] Milestones render with demo progress

## Next Phase After 1.6
**Phase 2: Onboarding Journey** - 5-step wizard with celebration
