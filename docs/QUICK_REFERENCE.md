# 🚀 Quick Reference Card - Project Conductor

## Start Server
```bash
npm run dev
```

## Test Demo (3 Commands)
```bash
# 1. Test APIs
curl http://localhost:3000/api/v1/narratives/1 | jq

# 2. Open Editor
open src/views/module-2-brd.html

# 3. Open Dashboard
open http://localhost:3000/demo
```

## Key URLs
- **Health**: http://localhost:3000/health
- **Demo Dashboard**: http://localhost:3000/demo
- **API Docs**: http://localhost:3000/api/v1

## Key Files to Review
1. **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Start here! 
2. **[DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md)** - Complete demo script
3. **[PHASE_1_INTEGRATION_COMPLETE.md](PHASE_1_INTEGRATION_COMPLETE.md)** - What's built

## What's Working
✅ 18 REST APIs
✅ Markdown editor (split-pane)
✅ Widget system (3 types)
✅ Approval workflow
✅ Fast dashboard (20ms)
✅ Mock data (8 projects)

## 10-Second Test
```bash
curl http://localhost:3000/api/v1/dashboard/stats | jq
```

Should show: 8 projects, 4 approved, 2 in review, 2 drafts, 5 blocked

## Demo Flow
1. Start server → 2. Open editor → 3. Edit Markdown → 4. See live preview → 5. Check dashboard

**Status**: ✅ READY FOR DEMO
