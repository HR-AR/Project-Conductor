/**
 * Project Conductor - Automated Guided Demo Walkthrough System
 * Version: 1.0.0
 *
 * A comprehensive tour system that guides users through the entire lifecycle
 * of the Project Conductor platform with professional SaaS-style interactions.
 */

class DemoWalkthrough {
    constructor() {
        this.currentStep = 0;
        this.steps = [];
        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
        this.progressBar = null;
        this.isActive = false;
        this.isPaused = false;
        this.speed = 1; // 1x, 1.5x, 2x
        this.currentModule = null;

        // Initialize steps
        this.initializeSteps();

        // Load saved progress
        this.loadProgress();

        // Bind methods
        this.start = this.start.bind(this);
        this.nextStep = this.nextStep.bind(this);
        this.previousStep = this.previousStep.bind(this);
        this.skipTour = this.skipTour.bind(this);
        this.pauseTour = this.pauseTour.bind(this);
        this.resumeTour = this.resumeTour.bind(this);
    }

    initializeSteps() {
        this.steps = [
            // Module 0 - Learn (3 steps)
            {
                module: 0,
                title: "Welcome to Project Conductor! 🎯",
                content: "Let's walk through how Project Conductor works. This interactive tour will show you the complete lifecycle from problem definition to deployment.",
                target: null, // Full screen overlay
                position: "center",
                action: null,
                nextDelay: 0
            },
            {
                module: 0,
                title: "Choose Your Role",
                content: "First, select your role. This customizes your experience and shows you relevant features. Try selecting 'Product Manager' to see a full walkthrough.",
                target: '[data-tour-id="role-selector"]',
                position: "bottom",
                highlight: true,
                action: null,
                nextDelay: 0
            },
            {
                module: 0,
                title: "Quick Tutorial",
                content: "You can watch video tutorials or skip straight to getting started. For this demo, we'll guide you through each step interactively.",
                target: '[data-tour-id="tutorial-section"]',
                position: "left",
                highlight: true,
                action: null,
                nextDelay: 0
            },

            // Module 2 - Problem Input (5 steps)
            {
                module: 2,
                title: "Define Your Business Problem",
                content: "Every great product starts with a clear problem. Click the 'Problem' tab to begin defining your business challenge.",
                target: '[data-module="2"]',
                position: "bottom",
                highlight: true,
                action: () => this.navigateToModule(2),
                nextDelay: 500
            },
            {
                module: 2,
                title: "Describe the Problem",
                content: "Enter a clear problem description. Let's try: 'Cart abandonment rate is 68%, causing $2M annual revenue loss'",
                target: '[data-tour-id="problem-input"]',
                position: "right",
                highlight: true,
                action: (el) => this.simulateTyping(el, "Cart abandonment rate is 68%, causing $2M annual revenue loss", 50),
                nextDelay: 2000
            },
            {
                module: 2,
                title: "Select Stakeholders",
                content: "Identify who's affected by this problem. Select: Sales, Marketing, Engineering, and Product teams.",
                target: '[data-tour-id="stakeholder-selector"]',
                position: "left",
                highlight: true,
                action: (el) => this.simulateMultiSelect(el, ['Sales', 'Marketing', 'Engineering', 'Product']),
                nextDelay: 1500
            },
            {
                module: 2,
                title: "Define Success Metrics",
                content: "What does success look like? Add measurable goals like 'Reduce cart abandonment by 30%' and 'Increase conversion rate to 4.5%'",
                target: '[data-tour-id="success-metrics"]',
                position: "top",
                highlight: true,
                action: (el) => this.addSuccessMetrics(el, ['Reduce cart abandonment by 30%', 'Increase conversion rate to 4.5%']),
                nextDelay: 1500
            },
            {
                module: 2,
                title: "Generate PRD",
                content: "Now click 'Generate PRD' to automatically create a Product Requirements Document with AI-powered requirements.",
                target: '[data-tour-id="generate-prd-btn"]',
                position: "top",
                highlight: true,
                pulsate: true,
                action: (el) => this.simulateClick(el),
                nextDelay: 2000
            },

            // Module 3 - PRD Alignment (7 steps)
            {
                module: 3,
                title: "Your Auto-Generated PRD",
                content: "Here's your PRD with automatically generated requirements based on your problem statement and stakeholders. Each requirement is traceable and can be reviewed.",
                target: '[data-tour-id="prd-container"]',
                position: "top",
                highlight: true,
                action: () => this.navigateToModule(3),
                nextDelay: 1000
            },
            {
                module: 3,
                title: "Stakeholder Review",
                content: "Each stakeholder can now review the requirements. They see only what's relevant to their role. Let's see how alignment works.",
                target: '[data-tour-id="stakeholder-view"]',
                position: "left",
                highlight: true,
                action: null,
                nextDelay: 0
            },
            {
                module: 3,
                title: "✅ Aligned - Approve",
                content: "If you approve a requirement, click '✅ Aligned'. This signals you're ready to move forward with this requirement.",
                target: '[data-tour-id="align-btn"]',
                position: "bottom",
                highlight: true,
                pulsate: true,
                action: (el) => this.simulateClick(el),
                nextDelay: 1000
            },
            {
                module: 3,
                title: "⚠️ Align But - Add Concerns",
                content: "Click '⚠️ Align But' when you generally agree but have specific concerns or conditions. Your concerns are tracked and addressed.",
                target: '[data-tour-id="align-but-btn"]',
                position: "bottom",
                highlight: true,
                pulsate: true,
                action: (el) => this.showAlignButDialog(el),
                nextDelay: 2000
            },
            {
                module: 3,
                title: "❌ Not Aligned - Block",
                content: "If you fundamentally disagree, click '❌ Not Aligned' and provide a reason. This blocks progress until resolved through discussion.",
                target: '[data-tour-id="not-aligned-btn"]',
                position: "bottom",
                highlight: true,
                action: null,
                nextDelay: 0
            },
            {
                module: 3,
                title: "Track Concerns",
                content: "All concerns are visible here. Teams can discuss, resolve, or escalate issues. Notice how the system tracks who needs to respond.",
                target: '[data-tour-id="concerns-panel"]',
                position: "left",
                highlight: true,
                action: null,
                nextDelay: 0
            },
            {
                module: 3,
                title: "Proceed to Implementation",
                content: "Once all requirements are aligned (or align-but concerns are acceptable), you can proceed to implementation. Let's move forward!",
                target: '[data-tour-id="proceed-btn"]',
                position: "top",
                highlight: true,
                pulsate: true,
                action: (el) => this.simulateClick(el),
                nextDelay: 1500
            },

            // Module 4 - Implementation (6 steps)
            {
                module: 4,
                title: "Autonomous Implementation",
                content: "Watch as autonomous AI agents build your solution. The system breaks down requirements into actionable tasks and executes them.",
                target: '[data-tour-id="agent-dashboard"]',
                position: "top",
                highlight: true,
                action: () => this.navigateToModule(4),
                nextDelay: 1000
            },
            {
                module: 4,
                title: "Phase 1: Requirements Analysis",
                content: "Agent-Analysis is breaking down each requirement, identifying dependencies, and creating a technical specification.",
                target: '[data-tour-id="phase-1"]',
                position: "right",
                highlight: true,
                action: () => this.animatePhaseProgress(1, 100),
                nextDelay: 2000
            },
            {
                module: 4,
                title: "Phase 2: Technical Design",
                content: "Agent-Architecture is designing the system architecture, database schema, and API contracts.",
                target: '[data-tour-id="phase-2"]',
                position: "right",
                highlight: true,
                action: () => this.animatePhaseProgress(2, 100),
                nextDelay: 2000
            },
            {
                module: 4,
                title: "Phase 3: Code Generation",
                content: "Agent-Code is generating production-ready code, following best practices and your team's coding standards.",
                target: '[data-tour-id="phase-3"]',
                position: "right",
                highlight: true,
                action: () => this.animatePhaseProgress(3, 100),
                nextDelay: 2000
            },
            {
                module: 4,
                title: "Phase 4: Automated Testing",
                content: "Agent-Test is creating and running unit tests, integration tests, and end-to-end tests to ensure quality.",
                target: '[data-tour-id="phase-4"]',
                position: "right",
                highlight: true,
                action: () => this.animatePhaseProgress(4, 100),
                nextDelay: 2000
            },
            {
                module: 4,
                title: "Phase 5: Deployment Ready",
                content: "All phases complete! Your solution is built, tested, and ready to deploy. View the generated code, tests, and deployment plan.",
                target: '[data-tour-id="phase-5"]',
                position: "right",
                highlight: true,
                action: () => this.animatePhaseProgress(5, 100),
                nextDelay: 1500
            },

            // Module 5 - Change Impact (4 steps)
            {
                module: 5,
                title: "Simulate a Change",
                content: "Let's see what happens when requirements change. Click any requirement to simulate modifying it.",
                target: '[data-tour-id="requirement-list"]',
                position: "top",
                highlight: true,
                action: () => this.navigateToModule(5),
                nextDelay: 1000
            },
            {
                module: 5,
                title: "Affected Requirements",
                content: "See all requirements and dependencies affected by this change. The traceability matrix shows the ripple effect across your project.",
                target: '[data-tour-id="impact-graph"]',
                position: "left",
                highlight: true,
                action: () => this.showImpactAnalysis(),
                nextDelay: 1500
            },
            {
                module: 5,
                title: "Timeline & Budget Impact",
                content: "The system calculates the impact on timeline (3 days added) and budget ($15K additional cost). You can approve or adjust the change.",
                target: '[data-tour-id="impact-metrics"]',
                position: "top",
                highlight: true,
                action: null,
                nextDelay: 0
            },
            {
                module: 5,
                title: "Re-Alignment Required",
                content: "Notice which stakeholders need to re-approve the changes. The system automatically flags affected parties for review.",
                target: '[data-tour-id="realignment-panel"]',
                position: "left",
                highlight: true,
                action: null,
                nextDelay: 0
            },

            // Module 1 - Present (2 steps)
            {
                module: 1,
                title: "Executive Presentation",
                content: "Now you can present your completed project to executives. Everything is tracked, documented, and ready to showcase.",
                target: '[data-tour-id="presentation-view"]',
                position: "top",
                highlight: true,
                action: () => this.navigateToModule(1),
                nextDelay: 1000
            },
            {
                module: 1,
                title: "Metrics & Stakeholder Alignment",
                content: "Show metrics, timeline, budget, and full stakeholder alignment. Export to PDF or share a live link. Congratulations! 🎉",
                target: '[data-tour-id="metrics-dashboard"]',
                position: "top",
                highlight: true,
                action: () => this.showCompletionCelebration(),
                nextDelay: 2000
            }
        ];
    }

    // UI Creation Methods
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'walkthrough-overlay';
        this.overlay.innerHTML = `
            <style>
                .walkthrough-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.75);
                    z-index: 9998;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }

                .walkthrough-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .walkthrough-spotlight {
                    position: absolute;
                    border-radius: 8px;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
                    transition: all 0.3s ease;
                    pointer-events: none;
                    z-index: 9999;
                }

                .walkthrough-spotlight.pulsate {
                    animation: spotlight-pulse 2s infinite;
                }

                @keyframes spotlight-pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 0 4px rgba(52, 152, 219, 0.5);
                    }
                    50% {
                        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 0 8px rgba(52, 152, 219, 0.8);
                    }
                }

                .walkthrough-tooltip {
                    position: absolute;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    z-index: 10000;
                    opacity: 0;
                    transform: scale(0.9);
                    transition: all 0.3s ease;
                }

                .walkthrough-tooltip.active {
                    opacity: 1;
                    transform: scale(1);
                }

                .walkthrough-tooltip-header {
                    padding: 20px 20px 0 20px;
                }

                .walkthrough-tooltip-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #2c3e50;
                    margin-bottom: 12px;
                }

                .walkthrough-tooltip-content {
                    padding: 0 20px 20px 20px;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #34495e;
                }

                .walkthrough-tooltip-footer {
                    padding: 15px 20px;
                    background: #f8f9fa;
                    border-top: 1px solid #e9ecef;
                    border-radius: 0 0 12px 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .walkthrough-progress {
                    font-size: 13px;
                    color: #7f8c8d;
                    font-weight: 500;
                }

                .walkthrough-buttons {
                    display: flex;
                    gap: 8px;
                }

                .walkthrough-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .walkthrough-btn-secondary {
                    background: #e9ecef;
                    color: #495057;
                }

                .walkthrough-btn-secondary:hover {
                    background: #dee2e6;
                }

                .walkthrough-btn-primary {
                    background: linear-gradient(135deg, #3498db, #2ecc71);
                    color: white;
                }

                .walkthrough-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
                }

                .walkthrough-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .walkthrough-arrow {
                    position: absolute;
                    width: 0;
                    height: 0;
                    border-style: solid;
                }

                .walkthrough-arrow.top {
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 10px 10px 0 10px;
                    border-color: white transparent transparent transparent;
                }

                .walkthrough-arrow.bottom {
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 0 10px 10px 10px;
                    border-color: transparent transparent white transparent;
                }

                .walkthrough-arrow.left {
                    right: -10px;
                    top: 50%;
                    transform: translateY(-50%);
                    border-width: 10px 0 10px 10px;
                    border-color: transparent transparent transparent white;
                }

                .walkthrough-arrow.right {
                    left: -10px;
                    top: 50%;
                    transform: translateY(-50%);
                    border-width: 10px 10px 10px 0;
                    border-color: transparent white transparent transparent;
                }

                .walkthrough-controls {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    padding: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10001;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .walkthrough-control-btn {
                    background: #f8f9fa;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 16px;
                }

                .walkthrough-control-btn:hover {
                    background: #e9ecef;
                }

                .walkthrough-speed-select {
                    background: #f8f9fa;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .walkthrough-typing {
                    display: inline-block;
                    border-right: 2px solid #3498db;
                    animation: blink 1s infinite;
                }

                @keyframes blink {
                    0%, 50% { border-color: #3498db; }
                    51%, 100% { border-color: transparent; }
                }

                .walkthrough-confetti {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 10002;
                }

                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            </style>
        `;
        document.body.appendChild(this.overlay);

        // Create spotlight
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'walkthrough-spotlight';
        document.body.appendChild(this.spotlight);

        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'walkthrough-tooltip';
        document.body.appendChild(this.tooltip);

        // Create controls
        this.createControls();
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'walkthrough-controls';
        controls.innerHTML = `
            <button class="walkthrough-control-btn" onclick="demoWalkthrough.pauseTour()" title="Pause">
                <span id="walkthrough-pause-icon">⏸</span>
            </button>
            <select class="walkthrough-speed-select" onchange="demoWalkthrough.setSpeed(this.value)">
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
            <button class="walkthrough-control-btn" onclick="demoWalkthrough.skipTour()" title="Exit Tour">
                <span>✕</span>
            </button>
        `;
        document.body.appendChild(controls);
    }

    // Core Tour Methods
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.currentStep = 0;

        // Create UI if not exists
        if (!this.overlay) {
            this.createOverlay();
        }

        // Show overlay
        this.overlay.classList.add('active');

        // Check if first visit
        const hasVisited = localStorage.getItem('walkthrough-completed');
        if (!hasVisited) {
            localStorage.setItem('walkthrough-started', 'true');
        }

        // Execute first step
        this.executeStep(0);
    }

    async executeStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];

        // Navigate to module if needed
        if (step.module !== null && this.currentModule !== step.module) {
            this.currentModule = step.module;
            if (step.action && typeof step.action === 'function' && step.action.toString().includes('navigateToModule')) {
                await step.action();
            } else if (window.navigateToModule) {
                await this.navigateToModule(step.module);
            }
            // Wait for module to load
            await this.wait(step.nextDelay || 500);
        }

        // Find target element
        let targetElement = null;
        if (step.target) {
            targetElement = await this.waitForElement(step.target);
        }

        // Update spotlight
        if (targetElement && step.highlight) {
            this.highlightElement(targetElement, step.pulsate);
        } else {
            this.hideSpotlight();
        }

        // Show tooltip
        this.showTooltip(step, targetElement);

        // Execute action
        if (step.action && typeof step.action === 'function') {
            setTimeout(() => {
                step.action(targetElement);
            }, 200);
        }

        // Save progress
        this.saveProgress();
    }

    highlightElement(element, pulsate = false) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const padding = 8;

        this.spotlight.style.top = `${rect.top - padding}px`;
        this.spotlight.style.left = `${rect.left - padding}px`;
        this.spotlight.style.width = `${rect.width + padding * 2}px`;
        this.spotlight.style.height = `${rect.height + padding * 2}px`;
        this.spotlight.style.display = 'block';

        if (pulsate) {
            this.spotlight.classList.add('pulsate');
        } else {
            this.spotlight.classList.remove('pulsate');
        }
    }

    hideSpotlight() {
        if (this.spotlight) {
            this.spotlight.style.display = 'none';
        }
    }

    showTooltip(step, targetElement) {
        const { title, content, position = 'bottom' } = step;

        this.tooltip.innerHTML = `
            <div class="walkthrough-arrow ${this.getOppositePosition(position)}"></div>
            <div class="walkthrough-tooltip-header">
                <div class="walkthrough-tooltip-title">${title}</div>
            </div>
            <div class="walkthrough-tooltip-content">${content}</div>
            <div class="walkthrough-tooltip-footer">
                <div class="walkthrough-progress">
                    Step ${this.currentStep + 1} of ${this.steps.length}
                </div>
                <div class="walkthrough-buttons">
                    ${this.currentStep > 0 ? '<button class="walkthrough-btn walkthrough-btn-secondary" onclick="demoWalkthrough.previousStep()">← Previous</button>' : ''}
                    ${this.currentStep < this.steps.length - 1 ? '<button class="walkthrough-btn walkthrough-btn-primary" onclick="demoWalkthrough.nextStep()">Next →</button>' : '<button class="walkthrough-btn walkthrough-btn-primary" onclick="demoWalkthrough.complete()">Finish 🎉</button>'}
                </div>
            </div>
        `;

        // Position tooltip
        this.positionTooltip(targetElement, position);

        // Show tooltip
        setTimeout(() => {
            this.tooltip.classList.add('active');
        }, 100);
    }

    positionTooltip(targetElement, position) {
        if (!targetElement) {
            // Center on screen
            this.tooltip.style.top = '50%';
            this.tooltip.style.left = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const spacing = 20;

        switch (position) {
            case 'top':
                this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
                this.tooltip.style.top = `${rect.top - tooltipRect.height - spacing}px`;
                this.tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'bottom':
                this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
                this.tooltip.style.top = `${rect.bottom + spacing}px`;
                this.tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'left':
                this.tooltip.style.left = `${rect.left - tooltipRect.width - spacing}px`;
                this.tooltip.style.top = `${rect.top + rect.height / 2}px`;
                this.tooltip.style.transform = 'translateY(-50%)';
                break;
            case 'right':
                this.tooltip.style.left = `${rect.right + spacing}px`;
                this.tooltip.style.top = `${rect.top + rect.height / 2}px`;
                this.tooltip.style.transform = 'translateY(-50%)';
                break;
            case 'center':
                this.tooltip.style.top = '50%';
                this.tooltip.style.left = '50%';
                this.tooltip.style.transform = 'translate(-50%, -50%)';
                break;
        }
    }

    getOppositePosition(position) {
        const opposites = {
            top: 'bottom',
            bottom: 'top',
            left: 'right',
            right: 'left',
            center: 'bottom'
        };
        return opposites[position] || 'bottom';
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.executeStep(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.executeStep(this.currentStep - 1);
        }
    }

    skipTour() {
        if (confirm('Are you sure you want to exit the tour? You can restart it anytime from the "Take Tour" button.')) {
            this.cleanup();
        }
    }

    pauseTour() {
        this.isPaused = !this.isPaused;
        const icon = document.getElementById('walkthrough-pause-icon');
        if (this.isPaused) {
            icon.textContent = '▶';
            this.overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        } else {
            icon.textContent = '⏸';
            this.overlay.style.background = 'rgba(0, 0, 0, 0.75)';
        }
    }

    resumeTour() {
        this.isPaused = false;
        const icon = document.getElementById('walkthrough-pause-icon');
        if (icon) {
            icon.textContent = '⏸';
        }
        this.overlay.style.background = 'rgba(0, 0, 0, 0.75)';
    }

    setSpeed(speed) {
        this.speed = parseFloat(speed);
    }

    complete() {
        this.showCompletionCelebration();
        localStorage.setItem('walkthrough-completed', 'true');
        localStorage.setItem('walkthrough-completion-date', new Date().toISOString());

        setTimeout(() => {
            this.cleanup();
        }, 3000);
    }

    cleanup() {
        this.isActive = false;
        this.isPaused = false;

        if (this.overlay) {
            this.overlay.classList.remove('active');
        }

        if (this.tooltip) {
            this.tooltip.classList.remove('active');
        }

        this.hideSpotlight();

        // Remove controls
        const controls = document.querySelector('.walkthrough-controls');
        if (controls) {
            controls.remove();
        }

        setTimeout(() => {
            if (this.overlay) this.overlay.remove();
            if (this.spotlight) this.spotlight.remove();
            if (this.tooltip) this.tooltip.remove();
            this.overlay = null;
            this.spotlight = null;
            this.tooltip = null;
        }, 300);
    }

    // Utility Methods
    async navigateToModule(moduleId) {
        return new Promise((resolve) => {
            if (window.navigateToModule) {
                window.navigateToModule(moduleId);
            }
            setTimeout(resolve, 500);
        });
    }

    async waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            // Try in main window
            let element = document.querySelector(selector);
            if (element) return element;

            // Try in active iframe
            const activeFrame = document.querySelector('.module-frame.active');
            if (activeFrame && activeFrame.contentDocument) {
                element = activeFrame.contentDocument.querySelector(selector);
                if (element) return element;
            }

            await this.wait(100);
        }

        console.warn(`Element not found: ${selector}`);
        return null;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms / this.speed));
    }

    // Simulation Methods
    async simulateClick(element) {
        if (!element) return;

        element.style.transform = 'scale(0.95)';
        await this.wait(100);
        element.style.transform = 'scale(1)';

        element.click();
    }

    async simulateTyping(element, text, speed = 50) {
        if (!element) return;

        element.value = '';
        element.focus();

        for (let i = 0; i < text.length; i++) {
            element.value += text[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await this.wait(speed);
        }

        element.blur();
    }

    async simulateMultiSelect(element, options) {
        if (!element) return;

        for (const option of options) {
            const checkbox = element.querySelector(`input[value="${option}"]`);
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                await this.wait(300);
            }
        }
    }

    async addSuccessMetrics(element, metrics) {
        if (!element) return;

        for (const metric of metrics) {
            const input = element.querySelector('input[type="text"]');
            if (input) {
                await this.simulateTyping(input, metric, 40);

                const addButton = element.querySelector('button');
                if (addButton) {
                    await this.simulateClick(addButton);
                    await this.wait(500);
                }
            }
        }
    }

    showAlignButDialog(element) {
        if (!element) return;

        this.simulateClick(element);

        setTimeout(() => {
            const concernInput = document.querySelector('[data-tour-id="concern-input"]');
            if (concernInput) {
                this.simulateTyping(concernInput, 'Need to verify mobile responsiveness before approval', 50);
            }
        }, 500);
    }

    animatePhaseProgress(phase, targetProgress) {
        const progressBar = document.querySelector(`[data-tour-id="phase-${phase}"] .progress-bar`);
        if (!progressBar) return;

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 5;
            progressBar.style.width = `${currentProgress}%`;

            if (currentProgress >= targetProgress) {
                clearInterval(interval);
            }
        }, 50 / this.speed);
    }

    showImpactAnalysis() {
        // Simulate showing impact graph
        const graph = document.querySelector('[data-tour-id="impact-graph"]');
        if (graph) {
            graph.classList.add('animated-fade-in');
        }
    }

    showCompletionCelebration() {
        // Create confetti
        const confetti = document.createElement('div');
        confetti.className = 'walkthrough-confetti';

        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.style.position = 'absolute';
            piece.style.width = '10px';
            piece.style.height = '10px';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.left = Math.random() * 100 + '%';
            piece.style.top = '-20px';
            piece.style.opacity = '1';
            piece.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear`;
            confetti.appendChild(piece);
        }

        document.body.appendChild(confetti);

        setTimeout(() => {
            confetti.remove();
        }, 4000);

        // Show completion message
        this.tooltip.innerHTML = `
            <div class="walkthrough-tooltip-header">
                <div class="walkthrough-tooltip-title">🎉 Congratulations!</div>
            </div>
            <div class="walkthrough-tooltip-content">
                You've completed the full Project Conductor walkthrough! You now know how to:
                <ul style="margin-top: 10px; padding-left: 20px;">
                    <li>Define business problems</li>
                    <li>Generate and align PRDs</li>
                    <li>Manage autonomous implementation</li>
                    <li>Analyze change impacts</li>
                    <li>Present to stakeholders</li>
                </ul>
            </div>
            <div class="walkthrough-tooltip-footer">
                <button class="walkthrough-btn walkthrough-btn-primary" onclick="demoWalkthrough.cleanup()" style="width: 100%;">
                    Get Started! 🚀
                </button>
            </div>
        `;
        this.tooltip.style.top = '50%';
        this.tooltip.style.left = '50%';
        this.tooltip.style.transform = 'translate(-50%, -50%)';
        this.tooltip.classList.add('active');
    }

    // Progress Management
    saveProgress() {
        localStorage.setItem('walkthrough-progress', JSON.stringify({
            currentStep: this.currentStep,
            currentModule: this.currentModule,
            lastUpdated: new Date().toISOString()
        }));
    }

    loadProgress() {
        const saved = localStorage.getItem('walkthrough-progress');
        if (saved) {
            const progress = JSON.parse(saved);
            this.currentStep = progress.currentStep || 0;
            this.currentModule = progress.currentModule || null;
        }
    }

    resetProgress() {
        localStorage.removeItem('walkthrough-progress');
        localStorage.removeItem('walkthrough-completed');
        localStorage.removeItem('walkthrough-started');
        this.currentStep = 0;
        this.currentModule = null;
    }

    // Jump to specific module section
    jumpToModule(moduleId) {
        const moduleSteps = this.steps.filter(step => step.module === moduleId);
        if (moduleSteps.length > 0) {
            const stepIndex = this.steps.indexOf(moduleSteps[0]);
            this.executeStep(stepIndex);
        }
    }

    // Replay a specific section
    replaySection(moduleId) {
        this.jumpToModule(moduleId);
    }
}

// Initialize global instance
window.demoWalkthrough = new DemoWalkthrough();

// Auto-start on first visit
document.addEventListener('DOMContentLoaded', () => {
    const hasVisited = localStorage.getItem('walkthrough-completed');
    const hasStarted = localStorage.getItem('walkthrough-started');

    if (!hasVisited && !hasStarted) {
        // Show welcome prompt
        setTimeout(() => {
            if (confirm('Welcome to Project Conductor! Would you like to take a guided tour to learn how everything works?')) {
                window.demoWalkthrough.start();
            } else {
                localStorage.setItem('walkthrough-started', 'declined');
            }
        }, 1000);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!window.demoWalkthrough.isActive) return;

    // Space or Right Arrow - Next
    if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        window.demoWalkthrough.nextStep();
    }

    // Left Arrow - Previous
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        window.demoWalkthrough.previousStep();
    }

    // Escape - Exit
    if (e.key === 'Escape') {
        e.preventDefault();
        window.demoWalkthrough.skipTour();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoWalkthrough;
}
