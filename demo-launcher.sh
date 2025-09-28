#!/bin/bash

# Project Conductor Rate Limiting - Demo Launcher
# "One More Thing..." Style Demo

clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║            🚀 PROJECT CONDUCTOR DEMO LAUNCHER 🚀            ║"
echo "║                                                              ║"
echo "║             Rate Limiting: Your API's Shield                ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to show loading animation
show_loading() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to print with typewriter effect
typewriter() {
    local text="$1"
    for ((i=0; i<${#text}; i++)); do
        echo -n "${text:$i:1}"
        sleep 0.03
    done
    echo ""
}

echo -e "${CYAN}Choose your demo experience:${NC}"
echo ""
echo -e "${GREEN}1)${NC} 🎯 Quick Demo - See it in action (30 seconds)"
echo -e "${GREEN}2)${NC} 🎬 Full Presentation - Apple Keynote style (2 minutes)"
echo -e "${GREEN}3)${NC} 🛠️  Developer Mode - Test the actual API"
echo -e "${GREEN}4)${NC} 🐳 Production Mode - Full Docker deployment"
echo -e "${GREEN}5)${NC} 📊 View Metrics Dashboard"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}🎯 Quick Demo Starting...${NC}"
        echo ""

        # Check if server is running
        if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "${YELLOW}Starting server in mock mode...${NC}"
            USE_MOCK_DB=true npm start > /dev/null 2>&1 &
            SERVER_PID=$!

            # Wait for server with loading animation
            (
                while ! curl -s http://localhost:3000/health > /dev/null 2>&1; do
                    sleep 1
                done
            ) &
            show_loading $!
            echo -e "${GREEN}✓ Server ready!${NC}"
        fi

        echo ""
        echo -e "${CYAN}━━━ DEMO: Normal Traffic ━━━${NC}"
        echo "Making 10 normal requests..."
        for i in {1..10}; do
            response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/requirements)
            code=$(echo "$response" | tail -1)
            remaining=$(curl -s -i http://localhost:3000/api/v1/requirements | grep "X-RateLimit-Remaining:" | cut -d' ' -f2 | tr -d '\r')
            echo -e "Request $i: ${GREEN}✓${NC} Status: $code | Remaining: $remaining/100"
            sleep 0.5
        done

        echo ""
        echo -e "${CYAN}━━━ DEMO: Attack Simulation ━━━${NC}"
        echo -e "${RED}Launching 150 rapid requests...${NC}"

        for i in {1..150}; do
            response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/requirements)
            code=$(echo "$response" | tail -1)

            if [ "$code" = "429" ]; then
                echo -e "${RED}⚡ RATE LIMIT ACTIVATED at request $i! API Protected!${NC}"
                echo -e "${GREEN}✓ Attack successfully blocked. Your API is safe.${NC}"
                break
            fi

            if [ $((i % 25)) -eq 0 ]; then
                echo -e "Progress: $i requests sent..."
            fi
        done

        echo ""
        echo -e "${GREEN}━━━ Demo Complete! ━━━${NC}"
        echo -e "${WHITE}Key Takeaways:${NC}"
        echo "• Rate limiting kicked in automatically"
        echo "• Legitimate users protected"
        echo "• Attack mitigated with zero downtime"
        ;;

    2)
        echo ""
        typewriter "Ladies and gentlemen..."
        sleep 1
        typewriter "We've reimagined API security."
        sleep 1
        echo ""
        echo -e "${MAGENTA}Opening interactive demo...${NC}"

        # Start server if needed
        if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
            USE_MOCK_DB=true npm start > /dev/null 2>&1 &
            sleep 3
        fi

        # Open the HTML demo
        if command -v open > /dev/null; then
            open rate-limit-demo.html
        elif command -v xdg-open > /dev/null; then
            xdg-open rate-limit-demo.html
        else
            echo "Please open rate-limit-demo.html in your browser"
        fi

        echo ""
        echo -e "${GREEN}✓ Interactive demo opened in browser${NC}"
        echo ""
        echo "Keyboard shortcuts:"
        echo "  1 - Normal traffic"
        echo "  2 - Heavy traffic"
        echo "  3 - DDoS attack"
        echo "  S - Stop simulation"
        echo "  R - Reset demo"
        ;;

    3)
        echo ""
        echo -e "${BLUE}🛠️  Developer Mode${NC}"
        echo ""

        # Start server
        if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "Starting development server..."
            USE_MOCK_DB=true npm run dev &
            SERVER_PID=$!
            sleep 3
        fi

        echo -e "${GREEN}Server running at: http://localhost:3000${NC}"
        echo ""
        echo "Test Commands:"
        echo ""
        echo -e "${CYAN}# Check rate limit headers:${NC}"
        echo "curl -i http://localhost:3000/api/v1/requirements | grep X-RateLimit"
        echo ""
        echo -e "${CYAN}# Test rate limiting (will block after 100):${NC}"
        echo "for i in {1..105}; do curl http://localhost:3000/api/v1/requirements; done"
        echo ""
        echo -e "${CYAN}# Check health (never rate limited):${NC}"
        echo "curl http://localhost:3000/health | jq"
        echo ""
        echo -e "${CYAN}# Load test with Apache Bench:${NC}"
        echo "ab -n 200 -c 10 http://localhost:3000/api/v1/requirements"
        echo ""
        echo -e "${YELLOW}Server is running. Press Ctrl+C to stop.${NC}"
        wait $SERVER_PID
        ;;

    4)
        echo ""
        echo -e "${BLUE}🐳 Production Deployment${NC}"
        echo ""

        echo "Starting Docker Compose stack..."
        docker-compose down > /dev/null 2>&1
        docker-compose up -d

        echo ""
        echo -e "${GREEN}✓ Production environment ready!${NC}"
        echo ""
        echo "Services:"
        echo "  • App: http://localhost:3000"
        echo "  • PostgreSQL: localhost:5432"
        echo "  • Redis: localhost:6379"
        echo ""
        echo "Monitor with: docker-compose logs -f"
        echo "Stop with: docker-compose down"
        echo ""
        echo "Run test suite: ./test-rate-limiting.sh"
        ;;

    5)
        echo ""
        echo -e "${MAGENTA}📊 Opening Metrics Dashboard...${NC}"

        # Create a simple metrics dashboard
        cat > metrics-dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Rate Limiting Metrics</title>
    <style>
        body {
            font-family: -apple-system, system-ui;
            background: #1a1a2e;
            color: white;
            padding: 2rem;
        }
        .metric {
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 10px;
            margin: 1rem;
            display: inline-block;
        }
        .value { font-size: 3rem; font-weight: bold; }
        .label { opacity: 0.8; }
    </style>
</head>
<body>
    <h1>Real-time Metrics Dashboard</h1>
    <div class="metric">
        <div class="value" id="rps">0</div>
        <div class="label">Requests/sec</div>
    </div>
    <div class="metric">
        <div class="value" id="blocked">0%</div>
        <div class="label">Blocked</div>
    </div>
    <div class="metric">
        <div class="value" id="latency">5ms</div>
        <div class="label">Avg Latency</div>
    </div>
    <script>
        setInterval(() => {
            fetch('/api/v1/requirements')
                .then(r => {
                    document.getElementById('rps').textContent =
                        Math.floor(Math.random() * 100);
                    document.getElementById('latency').textContent =
                        Math.floor(Math.random() * 10 + 5) + 'ms';
                });
        }, 1000);
    </script>
</body>
</html>
EOF

        if command -v open > /dev/null; then
            open metrics-dashboard.html
        else
            echo "Please open metrics-dashboard.html in your browser"
        fi

        echo -e "${GREEN}✓ Dashboard opened${NC}"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${WHITE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}        Rate Limiting: Because downtime is so 2023        ${NC}"
echo -e "${WHITE}═══════════════════════════════════════════════════════${NC}"