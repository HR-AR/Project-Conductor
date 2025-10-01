/**
 * Project Conductor - Advanced State Management & Module Pre-loading System
 *
 * Features:
 * - LRU Cache for module management (max 3 modules)
 * - Intelligent pre-loading based on user journey
 * - Bidirectional state synchronization
 * - State diff algorithm for minimal data transfer
 * - Offline capability with localStorage backup
 * - Version tracking for state updates
 * - Error handling and recovery
 */

// ============================================================================
// MODULE CACHE MANAGEMENT (LRU - Least Recently Used)
// ============================================================================

class ModuleCache {
    constructor(maxSize = 3) {
        this.maxSize = maxSize;
        this.cache = new Map(); // moduleId -> iframe element
        this.accessOrder = []; // Track access order for LRU
        this.loadedModules = new Set();
        this.loadingModules = new Set();
    }

    get(moduleId) {
        if (this.cache.has(moduleId)) {
            // Move to end (most recently used)
            this.updateAccessOrder(moduleId);
            return this.cache.get(moduleId);
        }
        return null;
    }

    set(moduleId, iframe) {
        // If cache is full and this is a new entry, evict LRU
        if (this.cache.size >= this.maxSize && !this.cache.has(moduleId)) {
            this.evictLRU();
        }

        this.cache.set(moduleId, iframe);
        this.updateAccessOrder(moduleId);
        this.loadedModules.add(moduleId);
    }

    evictLRU() {
        if (this.accessOrder.length === 0) return;

        const lru = this.accessOrder.shift();
        const iframe = this.cache.get(lru);

        if (iframe) {
            // Clear iframe to free memory
            iframe.src = 'about:blank';
            console.log(`[ModuleCache] Evicted LRU module: ${lru}`);
        }

        this.cache.delete(lru);
        this.loadedModules.delete(lru);
    }

    updateAccessOrder(moduleId) {
        // Remove from current position and add to end
        this.accessOrder = this.accessOrder.filter(id => id !== moduleId);
        this.accessOrder.push(moduleId);
    }

    has(moduleId) {
        return this.cache.has(moduleId);
    }

    isLoaded(moduleId) {
        return this.loadedModules.has(moduleId);
    }

    isLoading(moduleId) {
        return this.loadingModules.has(moduleId);
    }

    markLoading(moduleId) {
        this.loadingModules.add(moduleId);
    }

    markLoaded(moduleId) {
        this.loadingModules.delete(moduleId);
        this.loadedModules.add(moduleId);
    }

    clear() {
        this.cache.forEach(iframe => {
            if (iframe) iframe.src = 'about:blank';
        });
        this.cache.clear();
        this.accessOrder = [];
        this.loadedModules.clear();
        this.loadingModules.clear();
    }

    getStats() {
        return {
            cached: this.cache.size,
            loaded: this.loadedModules.size,
            loading: this.loadingModules.size,
            accessOrder: [...this.accessOrder]
        };
    }
}

// ============================================================================
// STATE VERSIONING AND DIFF ALGORITHM
// ============================================================================

class StateManager {
    constructor() {
        this.version = 0;
        this.history = [];
        this.maxHistorySize = 50;
        this.subscribers = new Map(); // moduleId -> callback
    }

    incrementVersion() {
        this.version++;
        return this.version;
    }

    getVersion() {
        return this.version;
    }

    /**
     * Create a diff between old and new state to minimize data transfer
     */
    createStateDiff(oldState, newState) {
        const changes = [];

        const compareObjects = (old, current, path = '') => {
            const allKeys = new Set([
                ...Object.keys(old || {}),
                ...Object.keys(current || {})
            ]);

            allKeys.forEach(key => {
                const fullPath = path ? `${path}.${key}` : key;
                const oldVal = old?.[key];
                const newVal = current?.[key];

                // Deep comparison
                const oldJson = JSON.stringify(oldVal);
                const newJson = JSON.stringify(newVal);

                if (oldJson !== newJson) {
                    changes.push({
                        path: fullPath,
                        oldValue: oldVal,
                        newValue: newVal,
                        type: oldVal === undefined ? 'added' :
                              newVal === undefined ? 'removed' : 'modified'
                    });

                    // Recursively compare nested objects (but not arrays)
                    if (
                        typeof newVal === 'object' &&
                        newVal !== null &&
                        !Array.isArray(newVal) &&
                        typeof oldVal === 'object' &&
                        oldVal !== null &&
                        !Array.isArray(oldVal)
                    ) {
                        compareObjects(oldVal, newVal, fullPath);
                    }
                }
            });
        };

        compareObjects(oldState, newState);

        const diff = {
            changes,
            version: this.incrementVersion(),
            timestamp: Date.now(),
            changedPaths: changes.map(c => c.path)
        };

        // Store in history
        this.history.push(diff);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        return diff;
    }

    /**
     * Apply a state patch/diff to reconstruct state
     */
    applyPatch(state, patch) {
        const newState = JSON.parse(JSON.stringify(state));

        patch.changes.forEach(change => {
            const keys = change.path.split('.');
            let current = newState;

            // Navigate to parent
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }

            // Apply change
            const lastKey = keys[keys.length - 1];
            if (change.type === 'removed') {
                delete current[lastKey];
            } else {
                current[lastKey] = change.newValue;
            }
        });

        return newState;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(moduleId, callback) {
        this.subscribers.set(moduleId, callback);
    }

    /**
     * Unsubscribe from state changes
     */
    unsubscribe(moduleId) {
        this.subscribers.delete(moduleId);
    }

    /**
     * Notify all subscribers of state change
     */
    notifySubscribers(stateDiff) {
        this.subscribers.forEach((callback, moduleId) => {
            try {
                callback(stateDiff);
            } catch (error) {
                console.error(`[StateManager] Error notifying module ${moduleId}:`, error);
            }
        });
    }

    getHistory() {
        return [...this.history];
    }

    getLastChange() {
        return this.history[this.history.length - 1] || null;
    }
}

// ============================================================================
// INTELLIGENT PRE-LOADING STRATEGY
// ============================================================================

class PreloadStrategy {
    /**
     * Define pre-loading rules based on user journey
     * Module 0 → pre-load Module 2
     * Module 2 → pre-load Module 3
     * Module 3 → pre-load Module 4
     * Module 4 → pre-load Module 5
     */
    static STRATEGY = {
        0: [2],      // Learn → Problem Input
        1: [0, 2],   // Present → Learn, Problem Input
        2: [3],      // Problem → Align
        3: [4],      // Align → Build
        4: [5],      // Build → Impact
        5: []        // Impact → none
    };

    static getModulesToPreload(currentModule) {
        return this.STRATEGY[currentModule] || [];
    }

    static shouldPreload(moduleId, currentModule, cache) {
        const toPreload = this.getModulesToPreload(currentModule);
        return toPreload.includes(moduleId) &&
               !cache.isLoaded(moduleId) &&
               !cache.isLoading(moduleId);
    }
}

// ============================================================================
// OFFLINE STORAGE MANAGER
// ============================================================================

class OfflineStorage {
    constructor() {
        this.storageKey = 'conductorState';
        this.backupPrefix = 'conductorState_backup_';
        this.syncKey = 'conductorLastSync';
        this.maxBackups = 5;
    }

    /**
     * Save state with versioned backup
     */
    save(state) {
        try {
            const timestamp = Date.now();
            state.lastSyncTime = timestamp;

            // Save primary state
            localStorage.setItem(this.storageKey, JSON.stringify(state));
            localStorage.setItem(this.syncKey, timestamp.toString());

            // Create versioned backup
            const backupKey = `${this.backupPrefix}${state.version}`;
            localStorage.setItem(backupKey, JSON.stringify(state));

            // Clean old backups
            this.cleanOldBackups();

            console.log(`[OfflineStorage] State saved (v${state.version})`);
            return true;
        } catch (error) {
            console.error('[OfflineStorage] Error saving state:', error);
            return false;
        }
    }

    /**
     * Load state from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const lastSync = localStorage.getItem(this.syncKey);

            if (saved) {
                const state = JSON.parse(saved);

                if (lastSync) {
                    const syncDate = new Date(parseInt(lastSync));
                    console.log(`[OfflineStorage] State restored. Last sync: ${syncDate.toLocaleString()}`);
                }

                return state;
            }

            return null;
        } catch (error) {
            console.error('[OfflineStorage] Error loading state:', error);
            return null;
        }
    }

    /**
     * Clean old backups (keep only last N)
     */
    cleanOldBackups() {
        try {
            const backupKeys = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.backupPrefix)) {
                    backupKeys.push(key);
                }
            }

            if (backupKeys.length > this.maxBackups) {
                // Sort by version number and remove oldest
                backupKeys
                    .sort()
                    .slice(0, backupKeys.length - this.maxBackups)
                    .forEach(key => {
                        localStorage.removeItem(key);
                        console.log(`[OfflineStorage] Removed old backup: ${key}`);
                    });
            }
        } catch (error) {
            console.error('[OfflineStorage] Error cleaning backups:', error);
        }
    }

    /**
     * Get all backups
     */
    getBackups() {
        const backups = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.backupPrefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key,
                        version: data.version,
                        timestamp: data.lastSyncTime
                    });
                } catch (error) {
                    console.error(`[OfflineStorage] Error reading backup ${key}:`, error);
                }
            }
        }

        return backups.sort((a, b) => b.version - a.version);
    }

    /**
     * Restore from specific backup
     */
    restoreBackup(version) {
        try {
            const backupKey = `${this.backupPrefix}${version}`;
            const backup = localStorage.getItem(backupKey);

            if (backup) {
                const state = JSON.parse(backup);
                this.save(state);
                console.log(`[OfflineStorage] Restored from backup v${version}`);
                return state;
            }

            return null;
        } catch (error) {
            console.error('[OfflineStorage] Error restoring backup:', error);
            return null;
        }
    }

    /**
     * Clear all data
     */
    clear() {
        try {
            // Remove main state
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.syncKey);

            // Remove all backups
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.backupPrefix)) {
                    localStorage.removeItem(key);
                }
            }

            console.log('[OfflineStorage] All data cleared');
            return true;
        } catch (error) {
            console.error('[OfflineStorage] Error clearing data:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    getStats() {
        let totalSize = 0;
        let backupCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key === this.storageKey || key.startsWith(this.backupPrefix))) {
                const value = localStorage.getItem(key);
                totalSize += (key.length + (value?.length || 0)) * 2; // UTF-16 encoding

                if (key.startsWith(this.backupPrefix)) {
                    backupCount++;
                }
            }
        }

        return {
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            backupCount,
            hasMainState: !!localStorage.getItem(this.storageKey)
        };
    }
}

// ============================================================================
// PROGRESS TRACKER
// ============================================================================

class ProgressTracker {
    constructor() {
        this.moduleProgress = {
            0: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };
    }

    updateModuleProgress(moduleId, progress) {
        this.moduleProgress[moduleId] = Math.min(100, Math.max(0, progress));
    }

    getModuleProgress(moduleId) {
        return this.moduleProgress[moduleId] || 0;
    }

    getOverallProgress() {
        const modules = Object.keys(this.moduleProgress);
        const total = modules.reduce((sum, id) => sum + this.moduleProgress[id], 0);
        return Math.round(total / modules.length);
    }

    getProgressBreakdown() {
        return { ...this.moduleProgress };
    }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    logError(module, error, context = {}) {
        const errorLog = {
            timestamp: Date.now(),
            module,
            error: error.toString(),
            stack: error.stack,
            context
        };

        this.errors.push(errorLog);

        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        console.error(`[ErrorHandler] ${module}:`, error, context);
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }

    getErrorsByModule(module) {
        return this.errors.filter(e => e.module === module);
    }
}

// ============================================================================
// EXPORT FOR INTEGRATION
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModuleCache,
        StateManager,
        PreloadStrategy,
        OfflineStorage,
        ProgressTracker,
        ErrorHandler
    };
}
