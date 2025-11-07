/**
 * Demo Walkthrough System
 * Provides interactive guided tours for Project Conductor
 */

(function() {
    'use strict';

    // Walkthrough state management
    const walkthroughState = {
        currentStep: 0,
        isActive: false,
        totalSteps: 7,
        completedSteps: new Set(),
    };

    // Module descriptions for the walkthrough
    const moduleSteps = [
        {
            id: 0,
            title: "Module 0: Learn",
            description: "Welcome to Project Conductor! This onboarding module will introduce you to the platform's core concepts and workflow.",
            target: "nav-module-0",
            highlight: true
        },
        {
            id: 1,
            title: "Module 1: Present",
            description: "View your unified dashboard with real-time project status, team activities, and key metrics at a glance.",
            target: "nav-module-1",
            highlight: true
        },
        {
            id: 2,
            title: "Module 2: Problem Input",
            description: "Submit new project ideas and business requirements. This is where stakeholders describe problems that need solving.",
            target: "nav-module-2",
            highlight: true
        },
        {
            id: 3,
            title: "Module 3: PRD Alignment",
            description: "Collaborate on Product Requirements Documents. Align stakeholders on scope, features, and success criteria.",
            target: "nav-module-3",
            highlight: true
        },
        {
            id: 4,
            title: "Module 4: Implementation",
            description: "Track engineering implementation progress. Monitor development tasks, blockers, and delivery timelines.",
            target: "nav-module-4",
            highlight: true
        },
        {
            id: 5,
            title: "Module 5: Change Impact",
            description: "Analyze how changes ripple through your project. Understand dependencies and assess risks before approving changes.",
            target: "nav-module-5",
            highlight: true
        },
        {
            id: 6,
            title: "Module 6: Implementation History",
            description: "Review completed work and audit trail. See what was delivered, when, and by whom.",
            target: "nav-module-6",
            highlight: true
        }
    ];

    // Create overlay element
    function createOverlay() {
        const existing = document.getElementById('walkthrough-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'walkthrough-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        // Trigger animation
        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
        }, 10);

        return overlay;
    }

    // Create popup element
    function createPopup(step) {
        const existing = document.getElementById('walkthrough-popup');
        if (existing) {
            existing.remove();
        }

        const popup = document.createElement('div');
        popup.id = 'walkthrough-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        popup.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <div style="font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${step.title}
                    </div>
                    <button onclick="window.demoWalkthrough.stop()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;">
                        ×
                    </button>
                </div>
                <div style="color: #666; font-size: 1rem; line-height: 1.6;">
                    ${step.description}
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                <div style="color: #999; font-size: 0.875rem;">
                    Step ${step.id + 1} of ${moduleSteps.length}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    ${step.id > 0 ? `
                        <button onclick="window.demoWalkthrough.previousStep()" style="
                            padding: 0.75rem 1.5rem;
                            background: #f0f0f0;
                            border: none;
                            border-radius: 8px;
                            color: #333;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-size: 0.95rem;
                        ">
                            ← Previous
                        </button>
                    ` : ''}
                    ${step.id < moduleSteps.length - 1 ? `
                        <button onclick="window.demoWalkthrough.nextStep()" style="
                            padding: 0.75rem 1.5rem;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-size: 0.95rem;
                        ">
                            Next →
                        </button>
                    ` : `
                        <button onclick="window.demoWalkthrough.stop()" style="
                            padding: 0.75rem 1.5rem;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-size: 0.95rem;
                        ">
                            Finish Tour
                        </button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Trigger animation
        setTimeout(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);

        return popup;
    }

    // Highlight target element
    function highlightElement(targetId) {
        // Remove previous highlights
        document.querySelectorAll('.walkthrough-highlight').forEach(el => {
            el.classList.remove('walkthrough-highlight');
        });

        if (!targetId) return;

        const target = document.getElementById(targetId) || document.querySelector(`[data-module="${targetId}"]`);
        if (!target) {
            console.warn(`[DemoWalkthrough] Target element not found: ${targetId}`);
            return;
        }

        // Add highlight class
        target.classList.add('walkthrough-highlight');

        // Add CSS if not already present
        if (!document.getElementById('walkthrough-styles')) {
            const style = document.createElement('style');
            style.id = 'walkthrough-styles';
            style.textContent = `
                .walkthrough-highlight {
                    position: relative;
                    z-index: 9997 !important;
                    animation: walkthrough-pulse 2s ease-in-out infinite;
                    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.5) !important;
                    border-radius: 8px;
                }

                @keyframes walkthrough-pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Show specific step
    function showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= moduleSteps.length) {
            console.error(`[DemoWalkthrough] Invalid step index: ${stepIndex}`);
            return;
        }

        walkthroughState.currentStep = stepIndex;
        const step = moduleSteps[stepIndex];

        // Create/update overlay and popup
        createOverlay();
        createPopup(step);

        // Highlight target element
        if (step.highlight && step.target) {
            highlightElement(step.target);
        }

        // Save progress
        saveProgress();

        console.log(`[DemoWalkthrough] Showing step ${stepIndex + 1}/${moduleSteps.length}: ${step.title}`);
    }

    // Save progress to localStorage
    function saveProgress() {
        try {
            localStorage.setItem('walkthrough_progress', JSON.stringify({
                currentStep: walkthroughState.currentStep,
                completedSteps: Array.from(walkthroughState.completedSteps),
                lastUpdated: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('[DemoWalkthrough] Failed to save progress:', e);
        }
    }

    // Load progress from localStorage
    function loadProgress() {
        try {
            const saved = localStorage.getItem('walkthrough_progress');
            if (saved) {
                const data = JSON.parse(saved);
                walkthroughState.currentStep = data.currentStep || 0;
                walkthroughState.completedSteps = new Set(data.completedSteps || []);
                return data;
            }
        } catch (e) {
            console.warn('[DemoWalkthrough] Failed to load progress:', e);
        }
        return null;
    }

    // Public API
    window.demoWalkthrough = {
        start: function() {
            console.log('[DemoWalkthrough] Starting tour');
            walkthroughState.isActive = true;
            walkthroughState.currentStep = 0;
            showStep(0);
        },

        stop: function() {
            console.log('[DemoWalkthrough] Stopping tour');
            walkthroughState.isActive = false;

            // Remove overlay and popup
            const overlay = document.getElementById('walkthrough-overlay');
            const popup = document.getElementById('walkthrough-popup');

            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }

            if (popup) {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-50%, -50%) scale(0.9)';
                setTimeout(() => popup.remove(), 300);
            }

            // Remove highlights
            document.querySelectorAll('.walkthrough-highlight').forEach(el => {
                el.classList.remove('walkthrough-highlight');
            });
        },

        nextStep: function() {
            if (walkthroughState.currentStep < moduleSteps.length - 1) {
                walkthroughState.completedSteps.add(walkthroughState.currentStep);
                showStep(walkthroughState.currentStep + 1);
            } else {
                this.stop();
            }
        },

        previousStep: function() {
            if (walkthroughState.currentStep > 0) {
                showStep(walkthroughState.currentStep - 1);
            }
        },

        jumpToModule: function(moduleId) {
            console.log(`[DemoWalkthrough] Jumping to module ${moduleId}`);
            if (moduleId >= 0 && moduleId < moduleSteps.length) {
                walkthroughState.isActive = true;
                showStep(moduleId);
            } else {
                console.error(`[DemoWalkthrough] Invalid module ID: ${moduleId}`);
            }
        },

        resetProgress: function() {
            console.log('[DemoWalkthrough] Resetting progress');
            walkthroughState.currentStep = 0;
            walkthroughState.completedSteps.clear();
            try {
                localStorage.removeItem('walkthrough_progress');
            } catch (e) {
                console.warn('[DemoWalkthrough] Failed to clear progress:', e);
            }
        },

        getProgress: function() {
            return {
                currentStep: walkthroughState.currentStep,
                completedSteps: Array.from(walkthroughState.completedSteps),
                totalSteps: moduleSteps.length,
                isActive: walkthroughState.isActive
            };
        }
    };

    // Load saved progress on initialization
    loadProgress();

    console.log('[DemoWalkthrough] Initialized successfully');
})();
