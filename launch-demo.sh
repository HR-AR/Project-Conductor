#!/bin/bash

# Project Conductor Demo Launcher
clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              🎯 PROJECT CONDUCTOR DEMO 🎯                   ║"
echo "║                                                              ║"
echo "║    Self-Orchestrating Requirements Management System        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check which OS we're on
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Opening Project Conductor demo in your browser..."
    open PROJECT_CONDUCTOR_DEMO.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "Opening Project Conductor demo in your browser..."
    xdg-open PROJECT_CONDUCTOR_DEMO.html 2>/dev/null || firefox PROJECT_CONDUCTOR_DEMO.html 2>/dev/null || google-chrome PROJECT_CONDUCTOR_DEMO.html 2>/dev/null
else
    # Windows or other
    echo "Please open PROJECT_CONDUCTOR_DEMO.html in your web browser"
    echo "Full path: $(pwd)/PROJECT_CONDUCTOR_DEMO.html"
fi

echo ""
echo "✅ Demo launched!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "The demo shows:"
echo "  • The $100B requirements problem"
echo "  • Living requirements with full traceability"
echo "  • Real-time collaboration features"
echo "  • Self-orchestrating implementation"
echo "  • AI-powered quality detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Also available:"
echo "  📄 PROJECT_CONDUCTOR_KEYNOTE.md - Executive summary"
echo "  🚀 docker-compose up -d - Run the actual system"
echo ""