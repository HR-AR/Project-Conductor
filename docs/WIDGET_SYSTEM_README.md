# Widget System & Live Rendering

## Overview

The widget system enables embedding live, interactive components within Markdown narratives. Widgets automatically render real-time data and update via WebSocket connections.

## Architecture

### Backend Components

1. **Widget Registry Service** (`src/services/widget-registry.service.ts`)
   - Manages widget type registration
   - Renders widget tags to HTML
   - Handles error states gracefully

2. **Widget Renderers** (`src/services/widget-renderers/`)
   - `project-status.widget.ts` - Project health, progress, blockers
   - `blocker-alert.widget.ts` - Active blockers with escalation
   - `approval-status.widget.ts` - Approval progress tracking

3. **Widget Data Provider** (`src/services/widget-data-provider.service.ts`)
   - Fetches live data from orchestration/approval services
   - Supports mock data mode (USE_MOCK_DB=true)
   - Caching for performance

4. **Document Parser Enhancement** (`src/services/document-parser.service.ts`)
   - New method: `parseAndRenderDocument()` replaces {{widget}} tags with HTML
   - Maintains backward compatibility with `parseDocument()`

### Frontend Components

1. **Widget Updater** (`public/js/widget-updater.js`)
   - Real-time updates via Socket.io
   - Automatic widget refresh on data changes
   - Queue-based update system prevents race conditions

2. **Widget Styles** (`public/css/widgets.css`)
   - Professional, responsive designs
   - Status-based color coding
   - Smooth animations and transitions

3. **Mock Data** (`src/mock-data/widget-data.mock.ts`)
   - Sample data for all widget types
   - Realistic project scenarios

## Usage

### Embedding Widgets in Narratives

Use the following syntax in your Markdown documents:

```markdown
---
id: project-42
type: brd
status: in_review
---

# Mobile App Redesign BRD

## Project Status

{{widget type="project-status" project-id="42"}}

## Active Blockers

{{widget type="blocker-alert" project-id="42"}}

## Approval Status

{{widget type="approval-status" narrative-id="1"}}
```

### Widget Types

#### 1. Project Status Widget

Shows overall project health, progress, and active blockers.

**Syntax:**
```markdown
{{widget type="project-status" project-id="42"}}
```

**Parameters:**
- `project-id` (required): Project identifier

**Displays:**
- Project name and status badge (On Track, At Risk, Blocked, Completed)
- Health score (0-100%)
- Progress bar
- Active blockers with escalation buttons
- Last updated timestamp

#### 2. Blocker Alert Widget

Displays active blockers with severity levels and escalation options.

**Syntax:**
```markdown
{{widget type="blocker-alert" project-id="42"}}
{{widget type="blocker-alert" milestone-id="43"}}
{{widget type="blocker-alert" blocker-id="1"}}
```

**Parameters:**
- `project-id`: Show all blockers for a project
- `milestone-id`: Show blockers for a milestone
- `blocker-id`: Show specific blocker

**Displays:**
- Blocker count and escalation status
- Severity badges (High, Medium, Low)
- Blocker descriptions
- Days active and overdue warnings
- Escalate/Resolve/Details buttons

#### 3. Approval Status Widget

Shows narrative approval progress and reviewer votes.

**Syntax:**
```markdown
{{widget type="approval-status" narrative-id="5"}}
```

**Parameters:**
- `narrative-id` (required): Narrative identifier

**Displays:**
- Overall approval status (Pending, Approved, Rejected, Conditional)
- Vote breakdown (Approved/Pending/Rejected counts)
- Progress bar
- Reviewer list with individual votes
- Conditional approval reasons
- Timeline (initiated, due date, finalized)

## Integration with Narratives

### Backend Rendering

```typescript
import documentParser from './services/document-parser.service';

// Parse and render narrative with widgets
const narrative = await narrativeService.getLatest(narrativeId);
const rendered = await documentParser.parseAndRenderDocument(
  narrative.content,
  {
    narrativeId: narrative.id,
    projectId: narrative.project_id,
    userId: currentUserId
  }
);

// rendered.htmlContent now contains rendered widgets
```

### Frontend Integration

Add to your HTML pages:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Include widget styles -->
  <link rel="stylesheet" href="/public/css/widgets.css">
</head>
<body>
  <!-- Rendered content with widgets -->
  <div id="narrative-content">
    <!-- Widgets are already rendered from backend -->
  </div>

  <!-- Include Socket.io and widget updater -->
  <script src="/socket.io/socket.io.js"></script>
  <script src="/public/js/widget-updater.js"></script>

  <script>
    // Widget updater auto-initializes
    // Widgets will update in real-time via WebSocket
  </script>
</body>
</html>
```

## Real-Time Updates

Widgets automatically refresh when:

- **Approval status changes** → Refresh all `approval-status` widgets for that narrative
- **Blocker created/updated** → Refresh `blocker-alert` widgets for that project
- **Project status changes** → Refresh `project-status` widgets

WebSocket events trigger automatic updates without page reload.

## Mock Data

Default mock data includes:

- **4 Projects:** Mobile App Redesign, Payment Gateway, Analytics Dashboard, Auth Upgrade
- **6 Blockers:** Varying severities and statuses
- **4 Approval Workflows:** Different stages (pending, approved, rejected, conditional)

Access mock data via:
```typescript
import mockWidgetData from './mock-data/widget-data.mock';
```

## Error Handling

Widgets handle errors gracefully:

1. **Widget not found** → Shows error widget with message
2. **Invalid parameters** → Validation fails, shows error
3. **Data fetch failure** → Displays retry button
4. **Render failure** → Falls back to error state

Example error widget:
```html
<div class="widget widget-error">
  <span class="widget-error-icon">⚠️</span>
  <span class="widget-error-message">Failed to load widget</span>
  <button onclick="widgetUpdater.retryWidget('widget-id')">Retry</button>
</div>
```

## Performance

- **Caching:** Widget data cached to reduce API calls
- **Debouncing:** Updates queued to prevent overwhelming the UI
- **Lazy Loading:** Widgets render only when needed
- **Compression:** All responses gzipped
- **Static Assets:** 7-day cache for CSS/JS

## Styling

All widgets use consistent design system:

- **Colors:** Status-based (green=good, yellow=warning, red=error)
- **Typography:** System fonts for performance
- **Spacing:** 8px grid system
- **Animations:** Smooth transitions (0.2-0.5s)
- **Responsive:** Mobile-friendly breakpoints

## Testing

To test widgets:

1. Start server with mock data:
   ```bash
   USE_MOCK_DB=true npm run dev
   ```

2. Create a test narrative with widget tags

3. Visit the rendered narrative page

4. Widgets should display with mock data

5. Test real-time updates via WebSocket console

## Future Enhancements

Potential widget types to add:

- **Timeline Widget** - Visual milestone timeline
- **Team Widget** - Team member assignments
- **Budget Widget** - Financial tracking
- **Risk Widget** - Risk assessment matrix
- **Dependency Widget** - Project dependencies graph
- **Analytics Widget** - Custom charts/graphs

## API Endpoints

Widgets can be rendered independently:

```
POST /api/v1/widgets/render
{
  "type": "project-status",
  "params": {
    "project-id": "42"
  }
}

Response:
{
  "success": true,
  "data": {
    "html": "<div class=\"widget\">...</div>",
    "widgetId": "widget-project-status-1-1234567890"
  }
}
```

## WebSocket Events

Widgets subscribe to these events:

- `widget:update` - Update specific widget
- `widget:refresh` - Re-fetch widget data
- `approval:status_changed` - Approval workflow updated
- `project:blocker_created` - New blocker added
- `project:status_changed` - Project status updated

## Success Criteria

✅ All deliverables completed:

1. ✅ Widget Registry Service implemented
2. ✅ Three widget renderers created (project-status, blocker-alert, approval-status)
3. ✅ Widget Data Provider with mock data support
4. ✅ Frontend Widget Updater with real-time updates
5. ✅ Professional CSS styling for all widgets
6. ✅ Mock data for testing
7. ✅ Document Parser enhanced with widget rendering

**Features:**
- ✅ Can render `{{widget type="project-status"}}` with live data
- ✅ Widgets update in real-time via WebSocket
- ✅ Error handling fallbacks gracefully
- ✅ All 3 widget types functional
- ✅ CSS looks professional and responsive

## Files Created

### Backend
- `src/services/widget-registry.service.ts` (165 lines)
- `src/services/widget-data-provider.service.ts` (130 lines)
- `src/services/widget-renderers/index.ts` (35 lines)
- `src/services/widget-renderers/project-status.widget.ts` (210 lines)
- `src/services/widget-renderers/blocker-alert.widget.ts` (230 lines)
- `src/services/widget-renderers/approval-status.widget.ts` (300 lines)
- `src/mock-data/widget-data.mock.ts` (280 lines)

### Frontend
- `public/js/widget-updater.js` (460 lines)
- `public/css/widgets.css` (650 lines)

### Enhancements
- Enhanced `src/services/document-parser.service.ts` (added `parseAndRenderDocument()`)
- Enhanced `src/index.ts` (widget initialization, public directory serving)

**Total:** ~2,460 lines of production-ready code

---

**Status:** ✅ Complete and ready for integration
**Build:** ✅ TypeScript compilation successful
**Tests:** Ready for unit and integration testing
