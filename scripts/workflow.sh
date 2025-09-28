#!/bin/bash

# Project Conductor Development Workflow Helper
# Integrates PRP, Notes, and Scout tools

echo "🚀 Project Conductor Workflow Helper"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_menu() {
    echo "What would you like to do?"
    echo ""
    echo "  ${BLUE}Planning${NC}"
    echo "  1) Start new feature (edit INITIAL.md)"
    echo "  2) Generate PRP from INITIAL.md"
    echo "  3) Generate Scout research prompt"
    echo ""
    echo "  ${BLUE}Research${NC}"
    echo "  4) Add research note"
    echo "  5) Search notes"
    echo "  6) List notes by area"
    echo "  7) Promote note to example stub"
    echo ""
    echo "  ${BLUE}Development${NC}"
    echo "  8) Run validation checks"
    echo "  9) Run tests with coverage"
    echo "  10) Check for issues (lint + typecheck)"
    echo ""
    echo "  ${BLUE}Utilities${NC}"
    echo "  11) View recent PRPs"
    echo "  12) View recent Scout prompts"
    echo "  13) Clean build and reinstall"
    echo ""
    echo "  0) Exit"
    echo ""
    read -p "Select option: " choice
}

# Feature planning workflow
start_feature() {
    echo -e "\n${BLUE}Starting new feature...${NC}"
    ${EDITOR:-vim} INITIAL.md
    echo -e "${GREEN}✓ INITIAL.md updated${NC}"

    read -p "Generate PRP now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run gen-prp

        read -p "Generate Scout prompt? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run scout:initial
        fi
    fi
}

# Add research note
add_note() {
    echo -e "\n${BLUE}Add Research Note${NC}"
    echo "Areas: components, api, tests, database, utils, services, middleware, general"
    read -p "Area: " area
    read -p "Title: " title
    read -p "Content: " content

    npm run note add -- --area "$area" --title "$title" --content "$content"
}

# Search notes
search_notes() {
    echo -e "\n${BLUE}Search Notes${NC}"
    read -p "Search query: " query
    npm run note search -- --query "$query"
}

# List notes
list_notes() {
    echo -e "\n${BLUE}List Notes${NC}"
    echo "Areas: components, api, tests, database, utils, services, middleware, general"
    read -p "Area: " area
    npm run note list -- --area "$area"
}

# Promote note
promote_note() {
    echo -e "\n${BLUE}Promote Note to Example${NC}"
    read -p "Area: " area
    read -p "Title: " title
    read -p "Custom output path (leave empty for default): " output

    if [ -z "$output" ]; then
        npm run note promote -- --area "$area" --title "$title"
    else
        npm run note promote -- --area "$area" --title "$title" --to "$output"
    fi
}

# View recent PRPs
view_prps() {
    echo -e "\n${BLUE}Recent PRPs:${NC}"
    ls -lt docs/prps/PRP-*.md 2>/dev/null | head -5

    if [ $? -eq 0 ]; then
        echo ""
        read -p "Open a PRP? Enter filename or press Enter to skip: " filename
        if [ ! -z "$filename" ]; then
            ${EDITOR:-vim} "docs/prps/$filename"
        fi
    else
        echo "No PRPs found. Run option 2 to create one."
    fi
}

# View recent Scout prompts
view_scouts() {
    echo -e "\n${BLUE}Recent Scout Prompts:${NC}"
    ls -lt docs/prompts/SCOUT-*.md 2>/dev/null | head -5

    if [ $? -eq 0 ]; then
        echo ""
        read -p "Open a prompt? Enter filename or press Enter to skip: " filename
        if [ ! -z "$filename" ]; then
            ${EDITOR:-vim} "docs/prompts/$filename"
        fi
    else
        echo "No Scout prompts found. Run option 3 to create one."
    fi
}

# Clean build
clean_build() {
    echo -e "\n${BLUE}Cleaning and rebuilding...${NC}"
    rm -rf dist/
    rm -rf node_modules/
    npm install
    npm run build
    echo -e "${GREEN}✓ Clean build complete${NC}"
}

# Main loop
while true; do
    clear
    show_menu

    case $choice in
        1) start_feature ;;
        2) npm run gen-prp ;;
        3) npm run scout ;;
        4) add_note ;;
        5) search_notes ;;
        6) list_notes ;;
        7) promote_note ;;
        8) npm run validate ;;
        9) npm run test:coverage ;;
        10) npm run lint && npm run typecheck ;;
        11) view_prps ;;
        12) view_scouts ;;
        13) clean_build ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${YELLOW}Invalid option${NC}" ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done