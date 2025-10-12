# Conflict Resolution UI Guide

**Project Conductor - Priority 6: Jira Integration**

A comprehensive guide to the Jira integration conflict resolution user interface.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [User Guide](#user-guide)
6. [Developer Guide](#developer-guide)
7. [API Integration](#api-integration)
8. [Customization](#customization)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

---

## Overview

The Conflict Resolution UI provides an intuitive interface for resolving synchronization conflicts between Project Conductor and Jira. It features side-by-side diff views, real-time updates via WebSocket, and multiple resolution strategies.

### Key Components

1. **integration-jira.html** - Jira connection management
2. **sync-conflicts.html** - Conflict list and resolution
3. **sync-status.html** - Sync history and status monitoring
4. **jira-client.js** - OAuth flow and connection management
5. **sync-manager.js** - Sync progress monitoring
6. **conflict-resolver-ui.js** - Interactive conflict resolution
7. **jira.css** - Jira integration styles
8. **conflict-resolution.css** - Conflict resolution styles

---

## Features

### 1. Conflict List View

- **Display all pending conflicts** with severity indicators
- **Color-coded severity** (Critical, High, Medium, Low)
- **Filter and sort** by severity, field, or status
- **Bulk resolution options** for efficient conflict management
- **Real-time updates** via WebSocket

### 2. Conflict Detail View

- **3-column diff display** (Base, Local, Remote)
- **Syntax highlighting** for changes
- **Side-by-side comparison** with timestamps and authors
- **Metadata display** (field, severity, IDs)

### 3. Resolution Options

- **Keep Local** - Use Conductor data
- **Keep Remote** - Use Jira data
- **Merge** - Combine both (when possible)
- **Edit Manually** - Custom resolution with text editor

### 4. Data Freshness Indicators

- **Visual status indicators** (✓ Synced, ⚠ Out of Sync, ⚡ Conflict, ✕ Error)
- **Last sync timestamps** with relative time display
- **Sync progress monitoring** with real-time updates

### 5. User Experience

- **Keyboard shortcuts** (←/→ to navigate, Enter to confirm)
- **Undo resolution** (5-minute window)
- **Conflict resolution history**
- **Tooltips and help text**
- **Mobile responsive** design

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  integration-jira.html  │  sync-conflicts.html  │  sync-    │
│                         │                       │  status   │
│  - OAuth flow           │  - Conflict list      │  .html    │
│  - Connection status    │  - Diff viewer        │           │
│  - Project management   │  - Resolution actions │  - Sync   │
│                         │                       │    history│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   JavaScript Client Layer                    │
├─────────────────────────────────────────────────────────────┤
│  jira-client.js         │  sync-manager.js     │  conflict- │
│                         │                      │  resolver  │
│  - OAuth initiation     │  - Sync monitoring   │  -ui.js    │
│  - Connection mgmt      │  - Progress updates  │            │
│  - Test connection      │  - Freshness data    │  - Diff    │
│  - Config updates       │  - WebSocket events  │    display │
│                         │                      │  - Actions │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
├─────────────────────────────────────────────────────────────┤
│  /api/v1/integrations/jira/*                                │
│                                                              │
│  - /status              - Connection status                  │
│  - /oauth/authorize     - Start OAuth flow                   │
│  - /oauth/callback      - OAuth callback handler             │
│  - /conflicts           - Get conflict list                  │
│  - /conflicts/:id       - Get conflict details               │
│  - /conflicts/:id/resolve - Resolve conflict                 │
│  - /sync                - Trigger manual sync                │
│  - /sync/history        - Get sync history                   │
│  - /freshness           - Get freshness indicators           │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
├─────────────────────────────────────────────────────────────┤
│  JiraService            │  ConflictService     │  SyncService│
│                         │                      │             │
│  - OAuth management     │  - Conflict detection│  - Sync     │
│  - API communication    │  - Resolution logic  │    execution│
│  - Field mapping        │  - History tracking  │  - Progress │
│                         │                      │    tracking │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database & External                       │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL             │  Redis Cache         │  Jira API   │
│  - Requirements         │  - Sync status       │             │
│  - Conflicts            │  - Freshness data    │  - Issues   │
│  - Sync history         │  - Session data      │  - Projects │
│  - Resolution log       │                      │  - Webhooks │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- Node.js 16+
- Project Conductor backend running
- Jira account with OAuth credentials

### Step 1: Copy Files

All files have been created in the correct locations:

```
/Users/h0r03cw/Desktop/Coding/Project Conductor/
├── integration-jira.html
├── sync-conflicts.html
├── sync-status.html
├── public/
│   ├── js/
│   │   └── integrations/
│   │       ├── jira-client.js
│   │       ├── sync-manager.js
│   │       └── conflict-resolver-ui.js
│   └── css/
│       └── integrations/
│           ├── jira.css
│           └── conflict-resolution.css
```

### Step 2: Add to Dashboard Navigation

Edit `conductor-unified-dashboard.html` and add the Jira integration link:

```html
<!-- In the nav-tabs section -->
<a href="integration-jira.html" class="nav-tab">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 17h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
    Jira Integration
</a>
```

### Step 3: Configure Environment Variables

Add to `.env`:

```env
# Jira Integration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_CLOUD_ID=your-cloud-id
JIRA_OAUTH_CLIENT_ID=your-oauth-client-id
JIRA_OAUTH_CLIENT_SECRET=your-oauth-client-secret
JIRA_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/integrations/jira/oauth/callback
```

### Step 4: Install Dependencies

```bash
npm install socket.io-client
```

---

## User Guide

### Connecting to Jira

1. Navigate to **Jira Integration** page
2. Click **"Connect to Jira"** button
3. Authorize Project Conductor in the popup window
4. Select projects to sync
5. Configure sync settings

### Resolving Conflicts

#### Method 1: From Conflict List

1. Navigate to **Sync Conflicts** page
2. Click on a conflict to view details
3. Review the 3-column diff (Base, Local, Remote)
4. Choose a resolution strategy:
   - **Keep Local** - Preserve Conductor changes
   - **Keep Remote** - Accept Jira changes
   - **Edit Manually** - Create custom resolution

#### Method 2: Using Keyboard Shortcuts

- **←** (Left Arrow) - Keep Local
- **→** (Right Arrow) - Keep Remote
- **Esc** - Cancel/Close modal

#### Method 3: Bulk Resolution

1. Filter conflicts by severity or field
2. Click **"Resolve All"** button
3. Confirm the default resolution strategy

### Monitoring Sync Status

1. Navigate to **Sync Status** page
2. View current sync progress (if active)
3. Check data freshness indicators
4. Review sync history timeline

### Undoing a Resolution

- Resolutions can be undone within **5 minutes**
- Click the **"Undo"** button in the notification
- Or navigate to **Conflict Resolution History**

---

## Developer Guide

### JavaScript API

#### JiraClient

```javascript
const jiraClient = new JiraClient({
  onConnectionChange: (status) => {
    console.log('Connection status:', status);
  },
  onError: (error) => {
    console.error('Jira error:', error);
  }
});

// Check connection
await jiraClient.checkConnection();

// Initiate OAuth flow
await jiraClient.initiateOAuthFlow();

// Disconnect
await jiraClient.disconnect();

// Test connection
await jiraClient.testConnection();

// Trigger sync
await jiraClient.triggerManualSync();
```

#### SyncManager

```javascript
const syncManager = new SyncManager({
  onSyncProgress: (progress) => {
    console.log('Sync progress:', progress);
  },
  onSyncComplete: (result) => {
    console.log('Sync complete:', result);
  },
  onError: (error) => {
    console.error('Sync error:', error);
  }
});

// Trigger sync
await syncManager.triggerSync();

// Get sync history
const history = await syncManager.getSyncHistory();

// Get freshness indicators
const freshness = await syncManager.getFreshnessIndicators();

// Connect WebSocket
syncManager.connectWebSocket((event) => {
  console.log('WebSocket event:', event);
});
```

#### ConflictResolverUI

```javascript
const conflictResolver = new ConflictResolverUI({
  onConflictResolved: (conflictId, resolution) => {
    console.log('Conflict resolved:', conflictId, resolution);
  },
  onError: (error) => {
    console.error('Resolution error:', error);
  }
});

// Load conflicts
const conflicts = await conflictResolver.loadConflicts();

// Show resolution modal
await conflictResolver.showResolutionModal(conflictId);

// Resolve conflict
await conflictResolver.resolveConflict(conflictId, 'keep-local');

// Resolve all conflicts
await conflictResolver.resolveAllConflicts('keep-local');

// Undo resolution
await conflictResolver.undoResolution(conflictId);
```

### WebSocket Events

The conflict resolution UI listens for these WebSocket events:

```javascript
// Sync events
socket.on('sync:progress', (data) => {
  // Update sync progress UI
});

socket.on('sync:complete', (data) => {
  // Refresh conflict list
});

// Conflict events
socket.on('conflict:created', (data) => {
  // Add new conflict to list
});

socket.on('conflict:updated', (data) => {
  // Update conflict in list
});

socket.on('conflict:resolved', (data) => {
  // Remove conflict from list
});

// Freshness events
socket.on('freshness:update', (data) => {
  // Update freshness indicators
});
```

### Extending the UI

#### Custom Resolution Strategy

Add a new resolution strategy:

```javascript
// In conflict-resolver-ui.js
async resolveConflict(conflictId, strategy, manualValue = null) {
  // Add custom strategy handling
  if (strategy === 'custom-merge') {
    // Implement custom merge logic
    manualValue = this.customMergeLogic(conflict);
  }

  // Continue with existing logic
  const resolution = {
    strategy: strategy,
    manualValue: manualValue
  };

  // ... rest of the method
}
```

#### Custom Diff Highlighting

Customize the diff highlighting algorithm:

```javascript
// In conflict-resolver-ui.js
highlightDiff(baseValue, newValue, type) {
  // Implement custom diff algorithm
  // Example: Character-level diff, semantic diff, etc.

  // Use libraries like diff-match-patch for advanced diffing
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(baseValue, newValue);
  dmp.diff_cleanupSemantic(diffs);

  return this.formatDiffs(diffs);
}
```

---

## API Integration

### Backend API Endpoints

The UI expects these API endpoints to be implemented:

#### Connection Management

```
GET    /api/v1/integrations/jira/status
POST   /api/v1/integrations/jira/oauth/authorize
POST   /api/v1/integrations/jira/oauth/callback
POST   /api/v1/integrations/jira/disconnect
POST   /api/v1/integrations/jira/test
PUT    /api/v1/integrations/jira/config
PUT    /api/v1/integrations/jira/projects/:key
```

#### Sync Management

```
POST   /api/v1/integrations/jira/sync
GET    /api/v1/integrations/jira/sync/active
GET    /api/v1/integrations/jira/sync/:id/progress
POST   /api/v1/integrations/jira/sync/:id/cancel
GET    /api/v1/integrations/jira/sync/history
GET    /api/v1/integrations/jira/sync/stats
POST   /api/v1/integrations/jira/sync/:id/retry
```

#### Conflict Management

```
GET    /api/v1/integrations/jira/conflicts
GET    /api/v1/integrations/jira/conflicts/:id
POST   /api/v1/integrations/jira/conflicts/:id/resolve
POST   /api/v1/integrations/jira/conflicts/:id/undo
POST   /api/v1/integrations/jira/conflicts/resolve-all
GET    /api/v1/integrations/jira/freshness
```

### Request/Response Examples

#### Get Conflicts

**Request:**
```http
GET /api/v1/integrations/jira/conflicts?severity=critical&field=title
```

**Response:**
```json
{
  "success": true,
  "conflicts": [
    {
      "id": "conflict-123",
      "requirementId": "REQ-001",
      "requirementTitle": "Mobile App Redesign",
      "localId": "BRD-001",
      "jiraKey": "EPIC-42",
      "field": "title",
      "severity": "critical",
      "baseValue": "Mobile App Redesign",
      "localValue": "Mobile App Redesign v2",
      "remoteValue": "Mobile Payment Redesign",
      "baseAuthor": "Sarah Chen",
      "localAuthor": "Alex Rodriguez",
      "remoteAuthor": "Mike Johnson",
      "baseTimestamp": "2025-10-10T10:00:00Z",
      "localTimestamp": "2025-10-12T14:30:00Z",
      "remoteTimestamp": "2025-10-12T15:45:00Z",
      "lastModified": "2025-10-12T15:45:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### Resolve Conflict

**Request:**
```http
POST /api/v1/integrations/jira/conflicts/conflict-123/resolve
Content-Type: application/json

{
  "strategy": "keep-local",
  "manualValue": null
}
```

**Response:**
```json
{
  "success": true,
  "conflict": {
    "id": "conflict-123",
    "status": "resolved",
    "resolvedValue": "Mobile App Redesign v2",
    "resolvedBy": "user-456",
    "resolvedAt": "2025-10-12T16:00:00Z"
  },
  "previousValue": "Mobile App Redesign"
}
```

---

## Customization

### Theming

Customize the color scheme in CSS files:

```css
/* In jira.css or conflict-resolution.css */

:root {
  --primary-color: #0052cc;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;

  --bg-color: #f8f9fa;
  --border-color: #e9ecef;
  --text-color: #2c3e50;
  --text-muted: #6c757d;
}
```

### Localization

Add language support:

```javascript
// In conflict-resolver-ui.js

const TRANSLATIONS = {
  en: {
    'conflict.title': 'Resolve Conflict',
    'conflict.keep-local': 'Keep Local',
    'conflict.keep-remote': 'Keep Remote',
    // ... more translations
  },
  es: {
    'conflict.title': 'Resolver Conflicto',
    'conflict.keep-local': 'Mantener Local',
    'conflict.keep-remote': 'Mantener Remoto',
    // ... more translations
  }
};

function t(key, lang = 'en') {
  return TRANSLATIONS[lang][key] || key;
}
```

### Custom Conflict Severity

Define custom severity levels:

```javascript
// In conflict-resolver-ui.js

const CUSTOM_SEVERITIES = {
  blocker: {
    color: '#8b0000',
    label: 'Blocker',
    priority: 1
  },
  critical: {
    color: '#dc3545',
    label: 'Critical',
    priority: 2
  },
  // ... more severities
};
```

---

## Troubleshooting

### Common Issues

#### 1. OAuth Popup Blocked

**Problem:** Browser blocks OAuth popup window

**Solution:**
- Allow popups for your domain
- Use OAuth redirect flow instead of popup
- Show user instructions to allow popups

#### 2. WebSocket Connection Failed

**Problem:** Real-time updates not working

**Solution:**
- Check WebSocket URL in JavaScript files
- Verify Socket.io is installed and running
- Check firewall/proxy settings
- Fall back to polling if WebSocket unavailable

```javascript
// In sync-manager.js or conflict-resolver-ui.js
this.socket = io(wsUrl, {
  path: '/socket.io',
  transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

#### 3. Conflicts Not Loading

**Problem:** Conflict list shows error or empty state

**Solution:**
- Check API endpoint is accessible
- Verify authentication credentials
- Check browser console for errors
- Verify database connection

```javascript
// Debug API calls
const response = await fetch('/api/v1/integrations/jira/conflicts');
console.log('Response status:', response.status);
const data = await response.json();
console.log('Response data:', data);
```

#### 4. Diff View Not Rendering Correctly

**Problem:** Changes not highlighted properly

**Solution:**
- Verify conflict data structure
- Check escapeHtml function
- Review highlightDiff algorithm
- Test with different conflict types

---

## Future Enhancements

### Phase 1 (Current Implementation)

- ✅ Conflict list view
- ✅ 3-column diff display
- ✅ Basic resolution strategies
- ✅ Real-time updates
- ✅ Mobile responsive

### Phase 2 (Planned)

- [ ] **Advanced Diff Algorithm**
  - Character-level diff
  - Semantic diff
  - Syntax-aware diff for code

- [ ] **Intelligent Merge**
  - Auto-merge non-conflicting changes
  - Conflict resolution suggestions
  - ML-powered merge recommendations

- [ ] **Batch Operations**
  - Select multiple conflicts
  - Apply same resolution to multiple conflicts
  - Conflict templates

- [ ] **Collaboration Features**
  - Comments on conflicts
  - @ mentions for stakeholders
  - Resolution approval workflow

### Phase 3 (Future)

- [ ] **Analytics & Insights**
  - Conflict trends dashboard
  - Most common conflict fields
  - Resolution time metrics
  - User performance analytics

- [ ] **Advanced Filtering**
  - Saved filter presets
  - Complex filter combinations
  - Smart filters (ML-based)

- [ ] **Integration Extensions**
  - GitHub/GitLab integration
  - Slack notifications
  - Microsoft Teams integration
  - Custom webhook support

- [ ] **Offline Support**
  - Service worker for offline access
  - Local storage for conflict data
  - Sync when connection restored

---

## Best Practices

### For Users

1. **Regular Sync** - Sync frequently to minimize conflicts
2. **Review Before Resolve** - Always check all 3 columns before resolving
3. **Use Manual Edit Carefully** - Verify manual edits don't break data integrity
4. **Monitor Freshness** - Keep an eye on data freshness indicators
5. **Document Decisions** - Add comments to explain complex resolutions

### For Developers

1. **Error Handling** - Always wrap API calls in try-catch
2. **Loading States** - Show loading indicators for async operations
3. **User Feedback** - Provide clear success/error messages
4. **Performance** - Lazy load conflict details, paginate lists
5. **Security** - Sanitize user input, validate on backend
6. **Testing** - Test with various conflict scenarios
7. **Accessibility** - Support keyboard navigation, screen readers

---

## Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Project Conductor Issues](https://github.com/your-org/project-conductor/issues)
- **Documentation**: [Full Documentation](https://docs.project-conductor.com)
- **Email**: support@project-conductor.com
- **Slack**: #project-conductor channel

---

## License

This conflict resolution UI is part of Project Conductor and is licensed under the same terms as the main project.

---

## Changelog

### Version 1.0.0 (2025-10-12)

- ✅ Initial release
- ✅ 3-column diff viewer
- ✅ Multiple resolution strategies
- ✅ Real-time WebSocket updates
- ✅ Mobile responsive design
- ✅ Keyboard shortcuts
- ✅ Undo functionality
- ✅ Data freshness indicators
- ✅ Sync progress monitoring

---

**Last Updated:** October 12, 2025
**Version:** 1.0.0
**Author:** Project Conductor Team
