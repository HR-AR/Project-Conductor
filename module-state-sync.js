/**
 * Module State Synchronization Script
 *
 * Add this script to each module HTML file to enable:
 * - Bidirectional state synchronization with dashboard
 * - LocalStorage backup for offline capability
 * - State change notifications
 * - Automatic state persistence
 *
 * Usage: Include this script at the end of each module's HTML file
 */

(function() {
    'use strict';

    // Module-specific state
    const ModuleState = {
        moduleId: null,
        localState: {},
        version: 0,
        lastUpdate: Date.now(),
        isDirty: false,
        isOnline: navigator.onLine
    };

    // Storage key prefix
    const STORAGE_PREFIX = 'conductor_module_';

    /**
     * Initialize module state system
     */
    function initModuleState(moduleId) {
        ModuleState.moduleId = moduleId;

        // Load state from localStorage first
        loadLocalState();

        // Set up message listeners
        setupMessageListeners();

        // Set up online/offline detection
        setupNetworkListeners();

        // Set up auto-save
        setupAutoSave();

        // Notify dashboard that module is ready
        notifyDashboard('MODULE_READY', { moduleId });

        // Request current state from dashboard
        requestStateFromDashboard();

        console.log(`[Module ${moduleId}] State system initialized`);
    }

    /**
     * Load state from localStorage
     */
    function loadLocalState() {
        try {
            const storageKey = STORAGE_PREFIX + ModuleState.moduleId;
            const saved = localStorage.getItem(storageKey);

            if (saved) {
                const data = JSON.parse(saved);
                ModuleState.localState = data.state || {};
                ModuleState.version = data.version || 0;
                ModuleState.lastUpdate = data.lastUpdate || Date.now();

                console.log(`[Module ${ModuleState.moduleId}] Loaded state from localStorage (v${ModuleState.version})`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('[ModuleState] Error loading from localStorage:', error);
            return false;
        }
    }

    /**
     * Save state to localStorage
     */
    function saveLocalState() {
        try {
            const storageKey = STORAGE_PREFIX + ModuleState.moduleId;
            const data = {
                state: ModuleState.localState,
                version: ModuleState.version,
                lastUpdate: Date.now(),
                moduleId: ModuleState.moduleId
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
            ModuleState.isDirty = false;

            console.log(`[Module ${ModuleState.moduleId}] Saved state to localStorage (v${ModuleState.version})`);
            return true;
        } catch (error) {
            console.error('[ModuleState] Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * Set up message listeners for dashboard communication
     */
    function setupMessageListeners() {
        window.addEventListener('message', (event) => {
            const { type, state, data } = event.data;

            switch (type) {
                case 'STATE_UPDATE':
                    handleStateUpdate(state);
                    break;

                case 'REQUEST_STATE':
                    sendStateUpdate();
                    break;

                case 'STATE_SYNC':
                    handleStateSync(data);
                    break;

                default:
                    // Ignore unknown message types
                    break;
            }
        });
    }

    /**
     * Handle state update from dashboard
     */
    function handleStateUpdate(newState) {
        if (!newState) return;

        // Merge with local state
        const previousState = { ...ModuleState.localState };
        ModuleState.localState = {
            ...ModuleState.localState,
            ...newState
        };

        ModuleState.version++;
        ModuleState.lastUpdate = Date.now();
        ModuleState.isDirty = true;

        // Trigger custom event for module to respond
        const event = new CustomEvent('conductorStateUpdate', {
            detail: {
                previousState,
                newState: ModuleState.localState,
                changes: getStateChanges(previousState, ModuleState.localState)
            }
        });
        window.dispatchEvent(event);

        // Save to localStorage
        saveLocalState();

        console.log(`[Module ${ModuleState.moduleId}] State updated from dashboard (v${ModuleState.version})`);
    }

    /**
     * Handle state sync request
     */
    function handleStateSync(data) {
        if (data.version > ModuleState.version) {
            // Dashboard has newer state, accept it
            handleStateUpdate(data.state);
        } else if (data.version < ModuleState.version) {
            // Local state is newer, send it to dashboard
            sendStateUpdate();
        }
    }

    /**
     * Get differences between two states
     */
    function getStateChanges(oldState, newState) {
        const changes = [];
        const allKeys = new Set([
            ...Object.keys(oldState || {}),
            ...Object.keys(newState || {})
        ]);

        allKeys.forEach(key => {
            const oldVal = oldState[key];
            const newVal = newState[key];

            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes.push({
                    key,
                    oldValue: oldVal,
                    newValue: newVal,
                    type: oldVal === undefined ? 'added' :
                          newVal === undefined ? 'removed' : 'modified'
                });
            }
        });

        return changes;
    }

    /**
     * Set up network listeners for online/offline detection
     */
    function setupNetworkListeners() {
        window.addEventListener('online', () => {
            ModuleState.isOnline = true;
            console.log(`[Module ${ModuleState.moduleId}] Back online - syncing state`);

            // Sync state when coming back online
            if (ModuleState.isDirty) {
                sendStateUpdate();
            }
        });

        window.addEventListener('offline', () => {
            ModuleState.isOnline = false;
            console.log(`[Module ${ModuleState.moduleId}] Offline - using localStorage`);
        });
    }

    /**
     * Set up auto-save timer
     */
    function setupAutoSave() {
        // Auto-save every 10 seconds if dirty
        setInterval(() => {
            if (ModuleState.isDirty) {
                saveLocalState();
            }
        }, 10000);

        // Save before unload
        window.addEventListener('beforeunload', () => {
            if (ModuleState.isDirty) {
                saveLocalState();
            }
        });
    }

    /**
     * Request current state from dashboard
     */
    function requestStateFromDashboard() {
        notifyDashboard('REQUEST_STATE', {
            moduleId: ModuleState.moduleId,
            version: ModuleState.version
        });
    }

    /**
     * Send state update to dashboard
     */
    function sendStateUpdate() {
        notifyDashboard('UPDATE_STATE', {
            moduleId: ModuleState.moduleId,
            state: ModuleState.localState,
            version: ModuleState.version,
            timestamp: Date.now()
        });

        console.log(`[Module ${ModuleState.moduleId}] Sent state update to dashboard (v${ModuleState.version})`);
    }

    /**
     * Notify dashboard with message
     */
    function notifyDashboard(type, data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type,
                ...data
            }, '*');
        }
    }

    /**
     * Update module state (to be called by module code)
     */
    function updateState(updates, options = {}) {
        const previousState = { ...ModuleState.localState };

        // Apply updates
        ModuleState.localState = {
            ...ModuleState.localState,
            ...updates
        };

        ModuleState.version++;
        ModuleState.lastUpdate = Date.now();
        ModuleState.isDirty = true;

        // Save locally
        if (options.saveImmediately !== false) {
            saveLocalState();
        }

        // Sync with dashboard
        if (options.syncWithDashboard !== false && ModuleState.isOnline) {
            sendStateUpdate();
        }

        // Trigger custom event
        const event = new CustomEvent('conductorStateChanged', {
            detail: {
                previousState,
                newState: ModuleState.localState,
                updates,
                version: ModuleState.version
            }
        });
        window.dispatchEvent(event);

        return ModuleState.localState;
    }

    /**
     * Get current state
     */
    function getState(key) {
        if (key) {
            return ModuleState.localState[key];
        }
        return { ...ModuleState.localState };
    }

    /**
     * Clear module state
     */
    function clearState() {
        ModuleState.localState = {};
        ModuleState.version = 0;
        ModuleState.isDirty = false;

        const storageKey = STORAGE_PREFIX + ModuleState.moduleId;
        localStorage.removeItem(storageKey);

        console.log(`[Module ${ModuleState.moduleId}] State cleared`);
    }

    /**
     * Get state metadata
     */
    function getMetadata() {
        return {
            moduleId: ModuleState.moduleId,
            version: ModuleState.version,
            lastUpdate: ModuleState.lastUpdate,
            isDirty: ModuleState.isDirty,
            isOnline: ModuleState.isOnline,
            stateSize: JSON.stringify(ModuleState.localState).length
        };
    }

    // ===========================================================================
    // PUBLIC API
    // ===========================================================================

    window.ConductorModuleState = {
        init: initModuleState,
        updateState: updateState,
        getState: getState,
        clearState: clearState,
        getMetadata: getMetadata,
        save: saveLocalState,
        load: loadLocalState,
        sync: sendStateUpdate,

        // Event helpers
        onStateUpdate: (callback) => {
            window.addEventListener('conductorStateUpdate', (e) => callback(e.detail));
        },
        onStateChanged: (callback) => {
            window.addEventListener('conductorStateChanged', (e) => callback(e.detail));
        }
    };

    console.log('[ConductorModuleState] State synchronization library loaded');

    // Auto-detect module ID from URL or data attribute
    const urlParams = new URLSearchParams(window.location.search);
    const moduleIdFromUrl = urlParams.get('moduleId');

    if (moduleIdFromUrl) {
        initModuleState(parseInt(moduleIdFromUrl));
    } else {
        console.log('[ConductorModuleState] Ready. Call ConductorModuleState.init(moduleId) to initialize.');
    }

})();
