/**
 * Demo Journey Controller
 * Automatically guides users through modules 0->1->2->3->4 with pre-populated data
 */

const DemoJourney = {
    active: false,
    currentStep: 0,
    steps: [
        { module: 0, name: 'Overview & Learn', duration: 8000, description: 'Introduction to Project Conductor' },
        { module: 1, name: 'Business Problem (BRD)', duration: 10000, description: 'Define business requirements and problem' },
        { module: 2, name: 'PRD Alignment', duration: 12000, description: 'Stakeholder alignment on requirements' },
        { module: 3, name: 'Implementation Tracking', duration: 10000, description: 'Development progress and status' },
        { module: 4, name: 'Change Impact Analysis', duration: 10000, description: 'Analyze effects of proposed changes' }
    ],
    overlayShown: false,
    autoAdvanceTimer: null,

    init() {
        // Check if demo journey is active
        const isActive = localStorage.getItem('demoJourneyActive') === 'true';
        const step = parseInt(localStorage.getItem('demoJourneyStep') || '0', 10);

        if (isActive) {
            this.active = true;
            this.currentStep = step;
            console.log('[DemoJourney] Initialized - Step', this.currentStep);

            // Show overlay after a brief delay
            setTimeout(() => this.showStepOverlay(), 1000);
        }
    },

    start() {
        this.active = true;
        this.currentStep = 0;
        localStorage.setItem('demoJourneyActive', 'true');
        localStorage.setItem('demoJourneyStep', '0');
        this.navigateToStep(0);
    },

    stop() {
        this.active = false;
        localStorage.removeItem('demoJourneyActive');
        localStorage.removeItem('demoJourneyStep');
        localStorage.removeItem('demoJourneyData');
        this.hideStepOverlay();
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
        }
    },

    navigateToStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        localStorage.setItem('demoJourneyStep', stepIndex.toString());

        const step = this.steps[stepIndex];
        console.log(`[DemoJourney] Navigating to Step ${stepIndex}: ${step.name}`);

        // Navigate to the module
        if (window.navigateToModule) {
            window.navigateToModule(step.module);
        } else if (window.parent && window.parent.navigateToModule) {
            window.parent.navigateToModule(step.module);
        }

        // Show step overlay
        setTimeout(() => {
            this.showStepOverlay();
            this.startAutoAdvance(stepIndex);
        }, 500);
    },

    showStepOverlay() {
        if (this.overlayShown) return;

        const step = this.steps[this.currentStep];
        if (!step) return;

        // Remove existing overlay
        const existing = document.getElementById('demoJourneyOverlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'demoJourneyOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 9999;
            max-width: 350px;
            animation: slideInRight 0.4s ease-out;
        `;

        const progressPercent = ((this.currentStep) / this.steps.length) * 100;

        overlay.innerHTML = `
            <style>
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes progressBar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                #demoProgressBar {
                    animation: progressBar ${step.duration}ms linear;
                }
            </style>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div style="font-weight: 600; font-size: 0.9rem;">🎯 Demo Journey</div>
                <button onclick="DemoJourney.stop()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; cursor: pointer; font-size: 0.85rem;">
                    Exit
                </button>
            </div>
            <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">
                Step ${this.currentStep + 1}/${this.steps.length}: ${step.name}
            </div>
            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 1rem;">
                ${step.description}
            </div>
            <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; margin-bottom: 1rem; overflow: hidden;">
                <div id="demoProgressBar" style="background: white; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: space-between;">
                <button onclick="DemoJourney.previousStep()" ${this.currentStep === 0 ? 'disabled' : ''} style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    opacity: ${this.currentStep === 0 ? '0.5' : '1'};
                ">
                    ← Previous
                </button>
                <button onclick="DemoJourney.nextStep()" style="
                    background: white;
                    border: none;
                    color: #667eea;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.9rem;
                ">
                    Next →
                </button>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.8; text-align: center;">
                Auto-advancing in ${Math.floor(step.duration / 1000)}s or click Next
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlayShown = true;
    },

    hideStepOverlay() {
        const overlay = document.getElementById('demoJourneyOverlay');
        if (overlay) {
            overlay.style.animation = 'slideInRight 0.3s ease-in reverse';
            setTimeout(() => overlay.remove(), 300);
        }
        this.overlayShown = false;
    },

    startAutoAdvance(stepIndex) {
        // Clear any existing timer
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
        }

        const step = this.steps[stepIndex];
        if (!step) return;

        // Auto-advance to next step after duration
        this.autoAdvanceTimer = setTimeout(() => {
            this.nextStep();
        }, step.duration);
    },

    nextStep() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
        }
        this.hideStepOverlay();

        setTimeout(() => {
            this.navigateToStep(this.currentStep + 1);
        }, 300);
    },

    previousStep() {
        if (this.currentStep > 0) {
            if (this.autoAdvanceTimer) {
                clearTimeout(this.autoAdvanceTimer);
            }
            this.hideStepOverlay();

            setTimeout(() => {
                this.navigateToStep(this.currentStep - 1);
            }, 300);
        }
    },

    complete() {
        const completionOverlay = document.createElement('div');
        completionOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            animation: scaleIn 0.4s ease-out;
        `;

        completionOverlay.innerHTML = `
            <style>
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            </style>
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="color: #667eea; margin-bottom: 1rem;">Demo Journey Complete!</h2>
            <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.6;">
                You've explored all the key features of Project Conductor:
            </p>
            <div style="text-align: left; margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 10px; font-size: 0.95rem;">
                <div style="margin-bottom: 0.5rem;">✅ Dashboard overview and metrics</div>
                <div style="margin-bottom: 0.5rem;">✅ Business problem input with auto-save</div>
                <div style="margin-bottom: 0.5rem;">✅ Multi-stakeholder alignment system</div>
                <div style="margin-bottom: 0.5rem;">✅ Implementation tracking with real-time updates</div>
                <div style="margin-bottom: 0.5rem;">✅ Change impact analysis and traceability</div>
            </div>
            <p style="color: #666; margin-bottom: 2rem; font-size: 0.95rem;">
                Feel free to explore any module in detail or start creating your own PRD!
            </p>
            <button onclick="DemoJourney.restart()" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 1rem;
                margin-right: 1rem;
            ">
                Restart Demo
            </button>
            <button onclick="DemoJourney.closeCompletion()" style="
                background: white;
                color: #667eea;
                border: 2px solid #667eea;
                padding: 0.75rem 2rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 1rem;
            ">
                Explore on My Own
            </button>
        `;

        document.body.appendChild(completionOverlay);

        // Stop the journey
        this.active = false;
        localStorage.removeItem('demoJourneyActive');
        this.hideStepOverlay();
    },

    restart() {
        this.closeCompletion();
        // Navigate back to Module 0 (Learn)
        if (window.navigateToModule) {
            window.navigateToModule(0);
        } else if (window.parent && window.parent.navigateToModule) {
            window.parent.navigateToModule(0);
        }

        // Clear journey data
        localStorage.removeItem('demoJourneyActive');
        localStorage.removeItem('demoJourneyStep');
    },

    closeCompletion() {
        const overlay = document.querySelector('[style*="scaleIn"]');
        if (overlay) {
            overlay.remove();
        }
        // Navigate to home
        if (window.showHome) {
            window.showHome();
        } else if (window.parent && window.parent.showHome) {
            window.parent.showHome();
        }
    }
};

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => DemoJourney.init(), 500);
        });
    } else {
        setTimeout(() => DemoJourney.init(), 500);
    }
}

// Expose globally
if (typeof window !== 'undefined') {
    window.DemoJourney = DemoJourney;
}
