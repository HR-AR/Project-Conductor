# Demo Architecture Implementation Plan - Option C (Hybrid)

**Decision Date**: 2025-10-12
**Chosen Approach**: Option C - Hybrid Demo Architecture
**Implementation Timeline**: 2-3 weeks (3 sprints)
**Status**: 🔄 Ready to Start

---

## 🎯 Executive Summary

**What We're Building**: Integrated demo mode using demo-specific API endpoints and feature flags, allowing users to experience the "Killer Demo" without affecting production data.

**Why Option C**:
- **Lowest 5-year cost**: $12,400 (saves $7,900 vs separate environment)
- **Lowest maintenance**: 20 hours/year
- **Production-safe**: Isolated demo logic, zero data corruption risk
- **Self-service**: Investors/users can explore independently
- **Always in sync**: Demo stays current with production features

**Expected ROI**:
- Saves 3-5 hours per demo presentation
- 80%+ "wow" reaction rate from viewers
- Self-service reduces scheduling burden
- Always-available demo for async viewing

---

## 📋 Implementation Checklist

### Sprint 1: Backend Infrastructure (Week 1)
- [ ] 1.1 - Create demo routes structure
- [ ] 1.2 - Implement demo controllers
- [ ] 1.3 - Build demo services with canned data
- [ ] 1.4 - Create demo data fixtures
- [ ] 1.5 - Add feature flag middleware
- [ ] 1.6 - Test demo endpoints

### Sprint 2: Frontend Integration (Week 2)
- [ ] 2.1 - Create DemoManager class
- [ ] 2.2 - Add demo mode toggle to Settings
- [ ] 2.3 - Build demo mode banner
- [ ] 2.4 - Integrate demo endpoints with UI
- [ ] 2.5 - Add demo reset functionality
- [ ] 2.6 - Test demo mode switching

### Sprint 3: Testing & Launch (Week 3)
- [ ] 3.1 - End-to-end "Killer Demo" flow testing
- [ ] 3.2 - Cross-browser compatibility testing
- [ ] 3.3 - Performance testing (demo mode vs production)
- [ ] 3.4 - Documentation and user guide
- [ ] 3.5 - Deploy to staging
- [ ] 3.6 - Production deployment

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Project Conductor                        │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Production Mode │         │    Demo Mode     │         │
│  │                  │         │                  │         │
│  │  /api/v1/brds   │         │ /api/v1/demo/    │         │
│  │  /api/v1/prds   │         │      brds        │         │
│  │  /api/v1/...    │         │      prds        │         │
│  │                  │         │      conflicts   │         │
│  │  ↓               │         │      ...         │         │
│  │  PostgreSQL     │         │  ↓               │         │
│  │  (Real Data)    │         │  Canned Data     │         │
│  │                  │         │  (In-Memory)     │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │         DemoManager (Frontend)                 │        │
│  │  - Mode toggle (demo vs. production)           │        │
│  │  - State management (isDemoMode flag)          │        │
│  │  - Banner display ("You're in Demo Mode")      │        │
│  │  - Endpoint routing (demo/* vs. production)    │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Sprint 1: Backend Infrastructure (Week 1)

### Task 1.1: Create Demo Routes Structure

**Files to Create**:
```bash
src/routes/demo.routes.ts          # Master demo router
src/routes/demo/
  ├── demo-brd.routes.ts            # Demo BRD endpoints
  ├── demo-prd.routes.ts            # Demo PRD endpoints
  ├── demo-engineering.routes.ts   # Demo Eng Design endpoints
  ├── demo-conflicts.routes.ts     # Demo Conflicts endpoints
  └── demo-activity.routes.ts      # Demo Activity Feed events
```

**Implementation**:
```typescript
// src/routes/demo.routes.ts
import { Router } from 'express';
import demoBRDRoutes from './demo/demo-brd.routes';
import demoPRDRoutes from './demo/demo-prd.routes';
import demoEngineeringRoutes from './demo/demo-engineering.routes';
import demoConflictsRoutes from './demo/demo-conflicts.routes';
import demoActivityRoutes from './demo/demo-activity.routes';

const router = Router();

// Mount all demo routes
router.use('/brds', demoBRDRoutes);
router.use('/prds', demoPRDRoutes);
router.use('/engineering-designs', demoEngineeringRoutes);
router.use('/conflicts', demoConflictsRoutes);
router.use('/activity', demoActivityRoutes);

export default router;
```

**Register in src/index.ts**:
```typescript
import demoRoutes from './routes/demo.routes';

// Add after existing routes
app.use('/api/v1/demo', demoRoutes);
```

**Time Estimate**: 2-3 hours

---

### Task 1.2: Implement Demo Controllers

**Files to Create**:
```bash
src/controllers/demo/
  ├── demo-brd.controller.ts
  ├── demo-prd.controller.ts
  ├── demo-engineering.controller.ts
  ├── demo-conflicts.controller.ts
  └── demo-activity.controller.ts
```

**Example Implementation** (demo-brd.controller.ts):
```typescript
import { Request, Response } from 'express';
import { DemoBRDService } from '../../services/demo/demo-brd.service';

class DemoBRDController {
  private demoService: DemoBRDService;

  constructor() {
    this.demoService = new DemoBRDService();
  }

  /**
   * GET /api/v1/demo/brds
   * Returns canned BRD data for demo
   */
  getAllBRDs = async (req: Request, res: Response): Promise<void> => {
    try {
      const brds = await this.demoService.getAllBRDs();
      res.json({
        success: true,
        data: brds,
        message: 'Demo BRDs retrieved successfully',
        isDemo: true, // Flag to indicate demo data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve demo BRDs',
      });
    }
  };

  /**
   * GET /api/v1/demo/brds/:id
   * Returns specific canned BRD
   */
  getBRDById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const brd = await this.demoService.getBRDById(id);

      if (!brd) {
        res.status(404).json({
          success: false,
          message: 'Demo BRD not found',
        });
        return;
      }

      res.json({
        success: true,
        data: brd,
        message: 'Demo BRD retrieved successfully',
        isDemo: true,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve demo BRD',
      });
    }
  };

  /**
   * POST /api/v1/demo/brds
   * Simulates BRD creation (doesn't persist)
   */
  createBRD = async (req: Request, res: Response): Promise<void> => {
    try {
      const brd = await this.demoService.createBRD(req.body);

      res.status(201).json({
        success: true,
        data: brd,
        message: 'Demo BRD created successfully (not persisted)',
        isDemo: true,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create demo BRD',
      });
    }
  };
}

export default new DemoBRDController();
```

**Time Estimate**: 4-6 hours (5 controllers)

---

### Task 1.3: Build Demo Services with Canned Data

**Files to Create**:
```bash
src/services/demo/
  ├── demo-brd.service.ts
  ├── demo-prd.service.ts
  ├── demo-engineering.service.ts
  ├── demo-conflicts.service.ts
  └── demo-activity.service.ts
```

**Example Implementation** (demo-brd.service.ts):
```typescript
import { v4 as uuidv4 } from 'uuid';
import { BRD } from '../../models/brd.model';
import { DEMO_BRDS } from '../../fixtures/demo-brds.fixture';

export class DemoBRDService {
  private inMemoryBRDs: BRD[];

  constructor() {
    // Initialize with fixture data
    this.inMemoryBRDs = [...DEMO_BRDS];
  }

  /**
   * Get all demo BRDs
   */
  async getAllBRDs(): Promise<BRD[]> {
    return this.inMemoryBRDs;
  }

  /**
   * Get demo BRD by ID
   */
  async getBRDById(id: string): Promise<BRD | undefined> {
    return this.inMemoryBRDs.find(brd => brd.id === id);
  }

  /**
   * Simulate BRD creation (in-memory only)
   */
  async createBRD(data: Partial<BRD>): Promise<BRD> {
    const newBRD: BRD = {
      id: uuidv4(),
      projectId: data.projectId || 'demo-project-1',
      title: data.title || 'New Demo BRD',
      businessObjectives: data.businessObjectives || 'Demo objectives',
      status: 'draft',
      createdBy: 'demo-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as BRD;

    // Add to in-memory store
    this.inMemoryBRDs.push(newBRD);

    return newBRD;
  }

  /**
   * Reset demo data to original fixtures
   */
  resetDemoData(): void {
    this.inMemoryBRDs = [...DEMO_BRDS];
  }
}
```

**Time Estimate**: 6-8 hours (5 services)

---

### Task 1.4: Create Demo Data Fixtures

**Files to Create**:
```bash
src/fixtures/
  ├── demo-brds.fixture.ts
  ├── demo-prds.fixture.ts
  ├── demo-engineering.fixture.ts
  ├── demo-conflicts.fixture.ts
  └── demo-activity.fixture.ts
```

**Example Fixture** (demo-brds.fixture.ts):
```typescript
import { BRD } from '../models/brd.model';

export const DEMO_BRDS: BRD[] = [
  {
    id: 'demo-brd-001',
    projectId: 'demo-project-mobile-app',
    title: 'Mobile App Redesign',
    businessObjectives: `
      Modernize the mobile app user experience to increase engagement
      and reduce churn. Current app has 2.5⭐ rating - we need to improve
      to 4.0+ to compete effectively.
    `,
    problemStatement: `
      Our mobile app hasn't been updated in 3 years. Users complain about:
      - Slow load times (5-7 seconds)
      - Confusing navigation
      - Lack of dark mode
      - No offline support
    `,
    businessImpact: `
      - Expected 40% increase in DAU
      - 25% reduction in churn
      - $500K additional annual revenue
    `,
    stakeholders: [
      { id: 'demo-user-001', name: 'Sarah Chen', role: 'Product Lead', email: 'sarah@example.com' },
      { id: 'demo-user-002', name: 'Mike Johnson', role: 'Engineering Manager', email: 'mike@example.com' },
    ],
    scopeInclusions: [
      'Complete UI redesign',
      'Dark mode support',
      'Offline functionality',
      'Performance optimization',
    ],
    scopeExclusions: [
      'Backend API changes',
      'New features (only redesign)',
      'Desktop app',
    ],
    successCriteria: [
      { criterion: 'App Store rating improves to 4.0+', metric: '4.0 stars', achieved: false },
      { criterion: 'Load time under 2 seconds', metric: '<2s', achieved: false },
      { criterion: '40% increase in DAU', metric: '+40% DAU', achieved: false },
    ],
    timeline: {
      startDate: '2025-01-15',
      targetDate: '2025-04-15',
    },
    budget: 150000,
    status: 'approved',
    approvals: [
      { userId: 'demo-user-001', vote: 'approved', timestamp: new Date('2025-01-10'), comment: 'Strong business case' },
    ],
    createdBy: 'demo-user-001',
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-10'),
  },
  {
    id: 'demo-brd-002',
    projectId: 'demo-project-ai-requirements',
    title: 'AI-Powered Requirements Analysis',
    businessObjectives: `
      Reduce time spent writing and reviewing requirements by 50%
      using AI-assisted generation and quality analysis.
    `,
    problemStatement: `
      Product teams spend 10-15 hours per week writing requirements.
      Many requirements are ambiguous or incomplete, leading to rework.
    `,
    businessImpact: `
      - Save 200+ engineering hours per quarter
      - 30% reduction in requirement-related bugs
      - Faster time-to-market
    `,
    stakeholders: [
      { id: 'demo-user-003', name: 'Alex Rodriguez', role: 'Head of Product', email: 'alex@example.com' },
    ],
    scopeInclusions: [
      'AI requirement generator',
      'Ambiguity detection',
      'Quality scoring',
    ],
    scopeExclusions: [
      'Full test case generation',
      'Code generation',
    ],
    successCriteria: [
      { criterion: '50% time reduction in writing requirements', metric: '-50% time', achieved: false },
      { criterion: '80%+ quality score on generated requirements', metric: '>80% quality', achieved: false },
    ],
    timeline: {
      startDate: '2025-02-01',
      targetDate: '2025-05-01',
    },
    budget: 200000,
    status: 'in_progress',
    approvals: [],
    createdBy: 'demo-user-003',
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-25'),
  },
];
```

**Fixtures for "Killer Demo" Story**:
- demo-conflicts.fixture.ts → Include the security conflict (hardcoded credentials)
- demo-activity.fixture.ts → Pre-populate agent activity events

**Time Estimate**: 4-5 hours

---

### Task 1.5: Add Feature Flag Middleware

**File to Create**: `src/middleware/demo.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to mark requests as demo mode
 * Sets req.isDemo = true for all /api/v1/demo/* routes
 */
export function markDemoMode(req: Request, res: Response, next: NextFunction): void {
  // Add isDemo flag to request
  (req as any).isDemo = true;

  // Add demo indicator to all responses
  const originalJson = res.json;
  res.json = function (data: any) {
    return originalJson.call(this, {
      ...data,
      isDemo: true,
    });
  };

  next();
}

/**
 * Prevent demo routes from modifying production data
 */
export function preventDemoWrites(req: Request, res: Response, next: NextFunction): void {
  const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (writeOperations.includes(req.method)) {
    // Allow write operations in demo mode (they won't persist)
    // But log them for monitoring
    console.log(`[DEMO] ${req.method} ${req.path} - Simulated (not persisted)`);
  }

  next();
}
```

**Apply to Demo Routes**:
```typescript
// src/routes/demo.routes.ts
import { markDemoMode, preventDemoWrites } from '../middleware/demo.middleware';

const router = Router();

// Apply demo middleware to all demo routes
router.use(markDemoMode);
router.use(preventDemoWrites);

// Mount demo routes
router.use('/brds', demoBRDRoutes);
// ... other routes
```

**Time Estimate**: 1-2 hours

---

### Task 1.6: Test Demo Endpoints

**Create Test Script**: `test-demo-endpoints.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "Testing Demo Endpoints..."
echo "=========================="

# Test GET /api/v1/demo/brds
echo ""
echo "1. GET /demo/brds"
curl -s $BASE_URL/demo/brds | jq '.data | length'
curl -s $BASE_URL/demo/brds | jq '.isDemo'

# Test GET /api/v1/demo/brds/:id
echo ""
echo "2. GET /demo/brds/demo-brd-001"
curl -s $BASE_URL/demo/brds/demo-brd-001 | jq '.data.title'

# Test POST /api/v1/demo/brds
echo ""
echo "3. POST /demo/brds (create)"
curl -s -X POST $BASE_URL/demo/brds \
  -H "Content-Type: application/json" \
  -d '{"title": "Test BRD", "projectId": "test-001"}' \
  | jq '.message'

# Test demo conflicts
echo ""
echo "4. GET /demo/conflicts (should include security conflict)"
curl -s $BASE_URL/demo/conflicts | jq '.data[0].title'

# Test demo activity
echo ""
echo "5. GET /demo/activity (agent events)"
curl -s $BASE_URL/demo/activity | jq '.data | length'

echo ""
echo "=========================="
echo "Demo endpoints test complete!"
```

**Run Tests**:
```bash
chmod +x test-demo-endpoints.sh
./test-demo-endpoints.sh
```

**Expected Output**:
```
Testing Demo Endpoints...
==========================

1. GET /demo/brds
2
true

2. GET /demo/brds/demo-brd-001
"Mobile App Redesign"

3. POST /demo/brds (create)
"Demo BRD created successfully (not persisted)"

4. GET /demo/conflicts (should include security conflict)
"Critical: Hardcoded API Credentials Detected"

5. GET /demo/activity (agent events)
15

==========================
Demo endpoints test complete!
```

**Time Estimate**: 2-3 hours

---

## 🎨 Sprint 2: Frontend Integration (Week 2)

### Task 2.1: Create DemoManager Class

**File to Create**: `public/js/demo-manager.js`

```javascript
/**
 * DemoManager - Manages demo mode state and API routing
 */
class DemoManager {
  constructor() {
    this.isDemoMode = false;
    this.demoStateKey = 'conductor_demo_mode';
    this.apiBaseUrl = '/api/v1';

    // Load demo state from localStorage
    this.loadDemoState();

    // Initialize UI if in demo mode
    if (this.isDemoMode) {
      this.showDemoBanner();
    }
  }

  /**
   * Enter demo mode
   */
  enterDemoMode() {
    this.isDemoMode = true;
    localStorage.setItem(this.demoStateKey, 'true');
    this.showDemoBanner();
    this.broadcastStateChange();

    // Reload current module with demo data
    this.reloadCurrentModule();
  }

  /**
   * Exit demo mode
   */
  exitDemoMode() {
    this.isDemoMode = false;
    localStorage.setItem(this.demoStateKey, 'false');
    this.hideDemoBanner();
    this.broadcastStateChange();

    // Reload current module with production data
    this.reloadCurrentModule();
  }

  /**
   * Toggle demo mode on/off
   */
  toggleDemoMode() {
    if (this.isDemoMode) {
      this.exitDemoMode();
    } else {
      this.enterDemoMode();
    }
  }

  /**
   * Get API endpoint with demo prefix if in demo mode
   *
   * @param {string} endpoint - Original endpoint (e.g., '/brds')
   * @returns {string} - Demo endpoint if in demo mode, otherwise original
   */
  getEndpoint(endpoint) {
    if (this.isDemoMode) {
      // Remove leading slash if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      return `${this.apiBaseUrl}/demo/${cleanEndpoint}`;
    }
    return `${this.apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
  }

  /**
   * Fetch data with demo mode awareness
   *
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise} - Fetch promise
   */
  async fetch(endpoint, options = {}) {
    const url = this.getEndpoint(endpoint);
    const response = await fetch(url, options);
    const data = await response.json();

    // Check if response indicates demo mode
    if (data.isDemo && !this.isDemoMode) {
      console.warn('[DemoManager] Received demo data but not in demo mode');
    }

    return data;
  }

  /**
   * Show demo mode banner
   */
  showDemoBanner() {
    let banner = document.getElementById('demo-mode-banner');

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'demo-mode-banner';
      banner.className = 'demo-banner';
      banner.innerHTML = `
        <div class="demo-banner-content">
          <span class="demo-icon">🎭</span>
          <span class="demo-text">
            <strong>Demo Mode Active</strong> - You're viewing sample data.
            <a href="#" id="exit-demo-mode">Exit Demo</a>
          </span>
        </div>
      `;
      document.body.prepend(banner);

      // Add exit handler
      document.getElementById('exit-demo-mode').addEventListener('click', (e) => {
        e.preventDefault();
        this.exitDemoMode();
      });
    }

    banner.style.display = 'block';
  }

  /**
   * Hide demo mode banner
   */
  hideDemoBanner() {
    const banner = document.getElementById('demo-mode-banner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  /**
   * Load demo state from localStorage
   */
  loadDemoState() {
    const savedState = localStorage.getItem(this.demoStateKey);
    this.isDemoMode = savedState === 'true';
  }

  /**
   * Broadcast state change to other windows/iframes
   */
  broadcastStateChange() {
    window.dispatchEvent(new CustomEvent('demo-mode-changed', {
      detail: { isDemoMode: this.isDemoMode }
    }));

    // Also use storage event for cross-window sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.demoStateKey,
      newValue: this.isDemoMode.toString(),
    }));
  }

  /**
   * Reload current module with new data
   */
  reloadCurrentModule() {
    // Trigger module reload if function exists
    if (typeof window.reloadCurrentModule === 'function') {
      window.reloadCurrentModule();
    } else {
      // Fallback: reload page
      window.location.reload();
    }
  }

  /**
   * Check if currently in demo mode
   *
   * @returns {boolean}
   */
  isDemo() {
    return this.isDemoMode;
  }

  /**
   * Get demo mode status with helpful context
   *
   * @returns {object}
   */
  getStatus() {
    return {
      isDemoMode: this.isDemoMode,
      endpoint: this.isDemoMode ? '/api/v1/demo/*' : '/api/v1/*',
      dataSource: this.isDemoMode ? 'Canned Demo Data' : 'PostgreSQL Database',
    };
  }
}

// Initialize global DemoManager instance
window.demoManager = new DemoManager();

// Listen for storage changes (for cross-window sync)
window.addEventListener('storage', (e) => {
  if (e.key === 'conductor_demo_mode') {
    window.demoManager.loadDemoState();
    if (window.demoManager.isDemoMode) {
      window.demoManager.showDemoBanner();
    } else {
      window.demoManager.hideDemoBanner();
    }
  }
});
```

**Time Estimate**: 3-4 hours

---

### Task 2.2: Add Demo Mode Toggle to Settings

**Modify**: `conductor-unified-dashboard.html`

**Add to Settings Panel**:
```html
<!-- In the Settings Panel -->
<div class="settings-section">
  <h4>Demo Mode</h4>
  <p class="settings-description">
    Switch between demo data and production data. Demo mode is perfect
    for presentations and exploring features without affecting real data.
  </p>

  <div class="demo-toggle-container">
    <label class="demo-switch">
      <input type="checkbox" id="demo-mode-toggle" />
      <span class="demo-slider"></span>
    </label>
    <span class="demo-status" id="demo-status">
      Production Mode
    </span>
  </div>

  <div class="demo-info" id="demo-info" style="display: none;">
    <p>
      <strong>Demo Mode Active</strong><br>
      Data source: Canned sample data (not persisted)<br>
      Perfect for: Investor demos, user onboarding, feature exploration
    </p>
    <button class="btn btn-secondary" id="reset-demo-data">
      Reset Demo Data
    </button>
  </div>
</div>

<script>
// Demo mode toggle handler
document.getElementById('demo-mode-toggle').addEventListener('change', function() {
  window.demoManager.toggleDemoMode();
  updateDemoStatus();
});

// Update demo status display
function updateDemoStatus() {
  const statusEl = document.getElementById('demo-status');
  const infoEl = document.getElementById('demo-info');
  const toggleEl = document.getElementById('demo-mode-toggle');

  if (window.demoManager.isDemo()) {
    statusEl.textContent = 'Demo Mode';
    statusEl.classList.add('demo-active');
    infoEl.style.display = 'block';
    toggleEl.checked = true;
  } else {
    statusEl.textContent = 'Production Mode';
    statusEl.classList.remove('demo-active');
    infoEl.style.display = 'none';
    toggleEl.checked = false;
  }
}

// Reset demo data button
document.getElementById('reset-demo-data').addEventListener('click', async function() {
  if (confirm('Reset all demo data to original state?')) {
    try {
      await fetch('/api/v1/demo/reset', { method: 'POST' });
      alert('Demo data reset successfully!');
      window.location.reload();
    } catch (error) {
      alert('Failed to reset demo data');
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  updateDemoStatus();
});
</script>
```

**Add CSS Styles**:
```css
/* Demo Mode Toggle */
.demo-toggle-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 15px 0;
}

.demo-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.demo-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.demo-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.demo-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .demo-slider {
  background-color: #9b59b6;
}

input:checked + .demo-slider:before {
  transform: translateX(26px);
}

.demo-status {
  font-weight: 600;
  color: #34495e;
}

.demo-status.demo-active {
  color: #9b59b6;
}

.demo-info {
  background: #f8f9fa;
  border-left: 4px solid #9b59b6;
  padding: 15px;
  margin-top: 15px;
  border-radius: 4px;
}

.demo-info strong {
  color: #9b59b6;
}
```

**Time Estimate**: 2-3 hours

---

### Task 2.3: Build Demo Mode Banner

**Add CSS** (in public/css/demo-banner.css or main.css):

```css
/* Demo Mode Banner */
.demo-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  z-index: 100000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  display: none; /* Hidden by default */
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.demo-banner-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 15px;
}

.demo-icon {
  font-size: 24px;
}

.demo-text {
  flex: 1;
  font-size: 14px;
}

.demo-text strong {
  font-weight: 700;
}

.demo-text a {
  color: white;
  text-decoration: underline;
  margin-left: 10px;
}

.demo-text a:hover {
  opacity: 0.8;
}

/* Adjust page content when banner is visible */
body.demo-mode-active {
  padding-top: 56px; /* Height of banner */
}
```

**Auto-Apply Body Class**:
```javascript
// In demo-manager.js - add to showDemoBanner()
document.body.classList.add('demo-mode-active');

// In demo-manager.js - add to hideDemoBanner()
document.body.classList.remove('demo-mode-active');
```

**Time Estimate**: 1-2 hours

---

### Task 2.4: Integrate Demo Endpoints with UI

**Update API Calls** in all modules to use DemoManager:

**Before** (existing code):
```javascript
async function loadBRDs() {
  const response = await fetch('/api/v1/brds');
  const data = await response.json();
  // ... render BRDs
}
```

**After** (demo-aware):
```javascript
async function loadBRDs() {
  const data = await window.demoManager.fetch('brds');
  // ... render BRDs
}
```

**Files to Update**:
- `module-2-brd.html` - Update all BRD API calls
- `module-3-prd.html` - Update all PRD API calls
- `module-4-implementation.html` - Update Eng Design calls
- `module-5-alignment.html` - Update conflict calls
- `module-1-dashboard.html` - Update dashboard data calls

**Example Update** (module-2-brd.html):
```javascript
// Find all fetch() calls and replace with window.demoManager.fetch()

// Old:
const response = await fetch('/api/v1/brds');

// New:
const data = await window.demoManager.fetch('brds');

// Old:
const response = await fetch(`/api/v1/brds/${brdId}`);

// New:
const data = await window.demoManager.fetch(`brds/${brdId}`);

// Old:
const response = await fetch('/api/v1/brds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(brdData)
});

// New:
const data = await window.demoManager.fetch('brds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(brdData)
});
```

**Time Estimate**: 4-6 hours (all modules)

---

### Task 2.5: Add Demo Reset Functionality

**Backend Endpoint**: Add to demo routes

```typescript
// src/routes/demo.routes.ts

/**
 * POST /api/v1/demo/reset
 * Resets all demo data to original fixtures
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // Reset all demo services
    const demoBRDService = new DemoBRDService();
    const demoPRDService = new DemoPRDService();
    const demoEngineeringService = new DemoEngineeringService();
    const demoConflictsService = new DemoConflictsService();
    const demoActivityService = new DemoActivityService();

    demoBRDService.resetDemoData();
    demoPRDService.resetDemoData();
    demoEngineeringService.resetDemoData();
    demoConflictsService.resetDemoData();
    demoActivityService.resetDemoData();

    res.json({
      success: true,
      message: 'Demo data reset to original fixtures',
      isDemo: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset demo data',
    });
  }
});
```

**Time Estimate**: 1-2 hours

---

### Task 2.6: Test Demo Mode Switching

**Manual Test Checklist**:

1. **Enter Demo Mode**
   - [ ] Click demo toggle in Settings
   - [ ] Banner appears at top
   - [ ] Status shows "Demo Mode"
   - [ ] BRDs page shows demo data

2. **Navigation with Demo Mode**
   - [ ] Navigate to Module 2 (BRD)
   - [ ] See "Mobile App Redesign" demo BRD
   - [ ] Navigate to Module 5 (Conflicts)
   - [ ] See security conflict ("Hardcoded Credentials")

3. **Create Action in Demo Mode**
   - [ ] Try creating a new BRD
   - [ ] See success message "(not persisted)"
   - [ ] Refresh page - new BRD disappears (not in fixtures)

4. **Exit Demo Mode**
   - [ ] Click "Exit Demo" in banner
   - [ ] Banner disappears
   - [ ] Status shows "Production Mode"
   - [ ] BRDs page shows real/empty data

5. **Reset Demo Data**
   - [ ] Enter demo mode
   - [ ] Create a demo BRD
   - [ ] Click "Reset Demo Data"
   - [ ] Confirm created BRD is gone

**Time Estimate**: 2-3 hours

---

## 🧪 Sprint 3: Testing & Launch (Week 3)

### Task 3.1: End-to-End "Killer Demo" Flow Testing

**Test the Complete Demo Story**:

1. **Setup**
   - [ ] Enter demo mode
   - [ ] Navigate to Module 0 (Onboarding)

2. **Act 1: Create BRD**
   - [ ] Navigate to Module 2
   - [ ] View "Mobile App Redesign" BRD
   - [ ] Activity feed shows "AgentBusiness analyzing..."

3. **Act 2: Auto-Generate PRD**
   - [ ] Navigate to Module 3
   - [ ] See auto-generated PRD from BRD
   - [ ] Activity feed shows "AgentQuality completed"

4. **Act 3: Engineering Design**
   - [ ] Navigate to Module 4
   - [ ] View "Mobile App" engineering design
   - [ ] Activity feed shows "AgentSecurity scanning..."

5. **Act 4: Conflict Detection (THE WOW MOMENT)**
   - [ ] Activity feed shows "⚠️ Conflict detected"
   - [ ] Conflict modal pops up: "Hardcoded API Credentials"
   - [ ] Workflow pauses
   - [ ] Auto-navigate to Module 5

6. **Act 5: Conflict Resolution**
   - [ ] See conflict in Module 5
   - [ ] View voting options
   - [ ] Select resolution
   - [ ] Workflow resumes

7. **Act 6: History & Audit**
   - [ ] Navigate to Module 6
   - [ ] See complete decision trail
   - [ ] See all agent activity

**Time to Complete Demo**: Target 8-12 minutes

**Time Estimate**: 3-4 hours (multiple run-throughs, refinement)

---

### Task 3.2: Cross-Browser Compatibility Testing

**Browsers to Test**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Test Cases per Browser**:
1. Demo mode toggle works
2. Banner displays correctly
3. API calls route to demo endpoints
4. Activity feed updates
5. Conflict modal appears
6. Navigation works smoothly

**Known Issues to Watch**:
- Safari: localStorage sync across iframes
- Firefox: WebSocket connection handling
- Edge: CSS grid layout in modules

**Time Estimate**: 2-3 hours

---

### Task 3.3: Performance Testing

**Metrics to Measure**:

1. **Demo Mode Overhead**
   - [ ] Time to enter demo mode: Target <200ms
   - [ ] Time to exit demo mode: Target <200ms
   - [ ] API response time (demo vs production): Should be faster (in-memory)

2. **Page Load with Demo Banner**
   - [ ] Initial page load: Target <2s
   - [ ] Module switching: Target <100ms (same as production)

3. **Memory Usage**
   - [ ] Demo data fixtures size: Target <5MB
   - [ ] Memory leak check: No increase after 30 min use

**Performance Test Script**:
```bash
#!/bin/bash

echo "Performance Testing Demo Mode..."

# Test demo endpoint response time
echo "1. Demo endpoint response time:"
time curl -s http://localhost:3000/api/v1/demo/brds > /dev/null

# Test production endpoint response time (for comparison)
echo "2. Production endpoint response time:"
time curl -s http://localhost:3000/api/v1/brds > /dev/null

# Test demo data payload size
echo "3. Demo data payload size:"
curl -s http://localhost:3000/api/v1/demo/brds | wc -c

echo "Performance test complete!"
```

**Time Estimate**: 2-3 hours

---

### Task 3.4: Documentation and User Guide

**Create**: `DEMO_MODE_USER_GUIDE.md`

```markdown
# Demo Mode User Guide

## What is Demo Mode?

Demo Mode allows you to explore Project Conductor with sample data without affecting your production environment. Perfect for:
- Investor presentations
- User onboarding
- Feature exploration
- Training sessions

## How to Use Demo Mode

### Entering Demo Mode

1. Click the **Settings** icon (⚙️) in the top navigation
2. Scroll to the **Demo Mode** section
3. Toggle the switch to **ON**
4. A purple banner will appear: "🎭 Demo Mode Active"

### What Happens in Demo Mode?

- All data comes from pre-populated sample fixtures
- You can create, edit, and delete items (changes won't persist)
- The "Killer Demo" story is pre-configured and ready to show
- Activity feed shows pre-populated agent events

### Exiting Demo Mode

1. Click **Exit Demo** in the purple banner, OR
2. Go to Settings and toggle Demo Mode **OFF**

### Resetting Demo Data

If you've made changes in demo mode and want to start fresh:

1. Open **Settings** (while in Demo Mode)
2. Click **Reset Demo Data**
3. Confirm the reset
4. All demo data returns to original fixtures

## The "Killer Demo" Story

Demo mode includes a pre-configured story that showcases Project Conductor's AI orchestration:

1. **Mobile App Redesign BRD** - Business requirements with stakeholder approvals
2. **Auto-Generated PRD** - Product requirements derived from BRD
3. **Engineering Design** - Technical architecture with intentional security issue
4. **Security Conflict** - AgentSecurity detects "Hardcoded API Credentials"
5. **Workflow Pause** - System pauses for human resolution
6. **Conflict Resolution** - Democratic voting to resolve issue
7. **Audit Trail** - Complete history of decisions

**Time to present**: 8-12 minutes

## FAQ

**Q: Will demo mode affect my production data?**
A: No. Demo mode uses completely separate in-memory data that never touches your database.

**Q: Can other users see my demo mode activity?**
A: No. Demo mode is local to your browser session.

**Q: What happens if I create something in demo mode?**
A: It will appear temporarily but disappear when you exit demo mode or refresh the page.

**Q: How do I share demo mode with others?**
A: Send them the link with `?demo=true` parameter, or have them toggle demo mode in Settings.
```

**Update README.md** with demo mode section:

```markdown
## 🎭 Demo Mode

Try Project Conductor risk-free with Demo Mode:

1. Visit the app at [https://your-render-url.com](https://your-render-url.com)
2. Click Settings (⚙️) → Toggle "Demo Mode" ON
3. Experience the "Killer Demo" with pre-populated data
4. No account needed, no data persists

Perfect for exploring features before committing!
```

**Time Estimate**: 2-3 hours

---

### Task 3.5: Deploy to Staging

**Pre-Deployment Checklist**:

- [ ] All demo endpoints tested locally
- [ ] Demo fixtures contain "Killer Demo" story
- [ ] DemoManager class integrated in all modules
- [ ] Demo banner styled and functional
- [ ] Reset endpoint working
- [ ] Cross-browser testing complete
- [ ] Performance benchmarks met

**Deployment Steps**:

```bash
# 1. Commit all demo mode changes
git add .
git commit -m "Add Option C demo architecture (hybrid approach)

- Created demo API endpoints (/api/v1/demo/*)
- Built demo services with in-memory canned data
- Created demo fixtures for Killer Demo story
- Added DemoManager class for frontend state
- Integrated demo toggle in Settings panel
- Added demo mode banner and UI indicators
- Updated all modules to use DemoManager.fetch()
- Tested end-to-end demo flow

✅ Demo mode ready for staging deployment
✅ Zero risk to production data
✅ Self-service investor/user exploration enabled
"

# 2. Push to staging branch
git push origin main

# 3. Monitor Render deployment
# (Render auto-deploys from main branch)

# 4. Test on staging URL
curl https://your-app-staging.onrender.com/api/v1/demo/brds

# 5. Manual smoke test
# - Visit staging URL
# - Enter demo mode
# - Run through Killer Demo
# - Verify no errors
```

**Time Estimate**: 1-2 hours

---

### Task 3.6: Production Deployment

**Production Deployment Checklist**:

- [ ] Staging testing complete (no critical bugs)
- [ ] Demo mode documentation complete
- [ ] User guide published
- [ ] README updated with demo instructions
- [ ] Performance monitoring in place
- [ ] Rollback plan ready

**Deployment Steps**:

```bash
# 1. Final commit
git add .
git commit -m "Production deployment: Demo Mode (Option C)

Ready for production deployment.
"

# 2. Tag release
git tag -a v1.1.0-demo -m "Demo Mode Release (Option C - Hybrid Architecture)"
git push origin v1.1.0-demo

# 3. Push to production
git push origin main

# 4. Monitor deployment
# Watch Render logs for any errors

# 5. Post-deployment verification
# - Visit production URL
# - Test demo mode toggle
# - Run Killer Demo end-to-end
# - Verify production mode still works
# - Check metrics (response times, error rates)

# 6. Announce launch
# - Update PROJECT_STATUS.md
# - Post to LinkedIn (using INVESTOR_OVERVIEW.md)
# - Share demo link
```

**Rollback Plan** (if critical issues):
```bash
# Revert to previous version
git revert HEAD
git push origin main
```

**Time Estimate**: 2-3 hours (including monitoring)

---

## 📊 Success Metrics

### Technical Metrics

**Performance**:
- [ ] Demo mode toggle: <200ms
- [ ] Demo API response: <100ms (faster than production)
- [ ] Page load with banner: <2s
- [ ] Memory usage: <5MB for fixtures

**Reliability**:
- [ ] Demo mode works in all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Zero production data corruption risk
- [ ] Reset functionality works 100% of time
- [ ] Demo/production mode switching seamless

### Business Metrics

**User Experience**:
- [ ] 80%+ "wow" reaction rate from demo viewers
- [ ] <5 minute average time to complete Killer Demo
- [ ] Self-service rate: 60%+ users can run demo without help

**Efficiency Gains**:
- [ ] 3-5 hours saved per investor presentation
- [ ] 50%+ reduction in demo scheduling coordination
- [ ] 24/7 availability for async viewing

### Cost Metrics

**5-Year TCO**: $12,400 (vs $20,300 for Option A, $27,600 for Option B)

**Annual Breakdown**:
- Infrastructure: $0 (same servers)
- Maintenance: $2,000/year (20 hours @ $100/hr)
- Updates: $500/year (fixture updates)

**Total Savings**: $7,900 vs Option A, $15,200 vs Option B

---

## 🎯 Timeline Summary

| Sprint | Duration | Tasks | Deliverables |
|--------|----------|-------|--------------|
| **Sprint 1** | Week 1 (5 days) | Backend (Tasks 1.1-1.6) | Demo API endpoints, services, fixtures |
| **Sprint 2** | Week 2 (5 days) | Frontend (Tasks 2.1-2.6) | DemoManager, toggle, banner, integration |
| **Sprint 3** | Week 3 (5 days) | Testing & Launch (Tasks 3.1-3.6) | Full testing, docs, staging, production |
| **Total** | **2-3 weeks** | **18 tasks** | **Production-ready demo mode** |

---

## 🚀 Next Steps

**Immediate (This Week)**:
1. Review this implementation plan
2. Approve Option C approach
3. Allocate development time (2-3 weeks)

**Sprint 1 (Week 1)**:
1. Start with Task 1.1 (create demo routes)
2. Build demo services and fixtures
3. Test demo endpoints locally

**Sprint 2 (Week 2)**:
1. Create DemoManager class
2. Add demo toggle to Settings
3. Integrate all modules with demo endpoints

**Sprint 3 (Week 3)**:
1. Full end-to-end testing
2. Deploy to staging
3. Production launch

**Post-Launch**:
1. Monitor usage metrics
2. Gather user feedback
3. Iterate on demo story
4. Update fixtures based on feedback

---

## 📞 Questions or Issues?

If you encounter issues during implementation:

1. **Check the demo-manager.js console logs** - Verbose logging enabled
2. **Test demo endpoints directly** - Use `test-demo-endpoints.sh`
3. **Review fixtures** - Ensure "Killer Demo" story is complete
4. **Verify routing** - Check that DemoManager.getEndpoint() works

**Common Issues**:
- Demo toggle not working → Check localStorage permissions
- Banner not showing → Verify demo-banner.css loaded
- Wrong data showing → Confirm DemoManager.isDemo() state
- API errors → Check demo routes registered in index.ts

---

**Ready to implement Option C! 🎉**

*This plan ensures zero risk to production data while enabling self-service demos that save time and impress viewers.*
