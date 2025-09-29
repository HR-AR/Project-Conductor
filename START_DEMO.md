# 🚀 How to Start the Project Conductor Demo

## ✅ Quick Start (Server is Already Running!)

Your server is **already running** at http://localhost:3000! Just open the demo:

```bash
# Open the live interactive demo
open live-demo.html
```

That's it! The demo will open in your browser and connect to the running API.

---

## 📋 If You Need to Start From Scratch

### Step 1: Start the Backend Server

```bash
# Option A: Use mock data (no database needed)
USE_MOCK_DB=true npm run dev

# Option B: Use Docker for full stack
docker-compose up -d
```

### Step 2: Wait for Server to Start
The server is ready when you see:
```
Server running on port 3000
WebSocket server initialized
```

### Step 3: Open the Demo

```bash
# Open the interactive demo
open live-demo.html
```

### Step 4: (Optional) Add Demo Data

```bash
# Populate with sample requirements
./populate-demo-data.sh
```

---

## 🎯 What You'll See in the Demo

### Main Features:
1. **Live Requirements Dashboard** - See all requirements in real-time
2. **Create Requirements** - Add new requirements through the form
3. **Status Tracking** - Draft → In Review → Approved → Implemented
4. **Statistics** - Real-time counts and metrics
5. **Traceability Visualization** - See how requirements connect

### Interactive Elements:
- **Create Form** (left panel) - Add new requirements
- **Requirements List** (right panel) - View all requirements
- **Status Indicators** - Color-coded by status
- **Click any requirement** to see details

---

## 🎨 Three Different Demos Available

### 1. **Live API Demo** (Recommended)
```bash
open live-demo.html
```
- Connects to real API
- Create actual requirements
- See real-time updates
- Full CRUD operations

### 2. **Visual Presentation**
```bash
open PROJECT_CONDUCTOR_DEMO.html
```
- Apple-style keynote presentation
- Animated visualizations
- No API needed
- Great for stakeholders

### 3. **Executive Summary**
```bash
open PROJECT_CONDUCTOR_KEYNOTE.md
```
- Business case
- ROI calculations
- Feature overview
- Implementation phases

---

## 🔧 Troubleshooting

### If the demo won't connect:

1. **Check if server is running:**
```bash
curl http://localhost:3000/health
```

2. **If not running, start it:**
```bash
USE_MOCK_DB=true npm run dev
```

3. **If port 3000 is busy:**
```bash
# Find what's using port 3000
lsof -i :3000

# Start on different port
PORT=3001 USE_MOCK_DB=true npm run dev
```

### If you see "No requirements":

```bash
# Add demo data
./populate-demo-data.sh
```

---

## 📱 Demo Walkthrough

### Step 1: View Current Requirements
- Look at the right panel
- See 6 demo requirements with different statuses
- Notice the color coding (yellow=draft, purple=review, green=approved)

### Step 2: Create a New Requirement
1. Fill in the form on the left:
   - Title: "Mobile App Support"
   - Description: "Support iOS and Android platforms"
   - Priority: High
   - Category: Functional
2. Click "Create Requirement"
3. Watch it appear instantly in the list

### Step 3: Observe Real-time Updates
- Statistics update automatically
- New requirements appear without refresh
- Status changes reflect immediately

### Step 4: Explore Traceability
- Click any requirement card
- See the traceability diagram at the bottom
- Understand how requirements flow to implementation

---

## 🎉 Success Checklist

✅ Server is running (http://localhost:3000)
✅ Demo is open (live-demo.html)
✅ Requirements are visible
✅ Can create new requirements
✅ Statistics are updating

---

## 💡 Pro Tips

1. **Best Browser**: Chrome or Safari for best experience
2. **Screen Size**: Works best on screens 1280px or wider
3. **Refresh Data**: Demo auto-refreshes every 5 seconds
4. **Reset Demo**: Run `./populate-demo-data.sh` again

---

## Need Help?

If you're stuck, just run:
```bash
# This opens the demo automatically
open live-demo.html
```

The server is already running, so the demo should work immediately!