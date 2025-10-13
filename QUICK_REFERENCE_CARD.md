# 🚨 Quick Reference Card - Dashboard Broken? Use This!

## 📍 Emergency Access Point

```
http://localhost:3000/simple-demo.html
```

**Or Production:**
```
https://your-app.onrender.com/simple-demo.html
```

---

## ⚡ 30-Second Diagnosis

### Step 1: Open Simple Demo
→ Load `/simple-demo.html` in browser

### Step 2: Wait 5 Seconds
→ Auto-tests run automatically

### Step 3: Check Status Cards
- ✅ All Green = Backend works, use direct module links
- ⚠️ Some Red = Check console log for specific issue
- ❌ All Red = Server not running, start with `npm run dev`

---

## 🎯 Direct Module Access

If tests pass but dashboard broken, use these:

```
/demo/module-0-onboarding.html        (Onboarding)
/demo/module-1-present.html           (Dashboard)
/demo/module-2-brd.html               (BRD)
/demo/module-3-prd.html               (PRD)
/demo/module-4-engineering-design.html (Engineering)
/demo/module-5-alignment.html         (Alignment)
/demo/module-6-implementation.html    (Implementation)
```

---

## 🔧 Quick Fixes

### Problem: All Tests Fail
```bash
npm run dev  # Start server
curl http://localhost:3000/health  # Verify
```

### Problem: Database Error
```bash
psql $DATABASE_URL -c "SELECT NOW();"  # Test connection
npm run db:migrate  # Initialize database
```

### Problem: CSP Blocking Iframes
**File:** `src/index.ts` (lines 117-143)
```typescript
frameguard: false,  // Must be false
scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow inline
```

### Problem: WebSocket Failed
**File:** `src/index.ts` (lines 95-100)
```typescript
cors: {
  origin: ['*'],  // Allow all origins
}
```

---

## 📚 Full Documentation

| File | Purpose | Size |
|------|---------|------|
| `simple-demo.html` | Diagnostic tool | 22 KB |
| `SIMPLE_DEMO_GUIDE.md` | Complete guide | 11 KB |
| `EMERGENCY_TROUBLESHOOTING.md` | Quick fixes | 9 KB |
| `PLAN_B_QUICK_START.md` | Step-by-step | 10 KB |
| `AGENT_4_DELIVERY_SUMMARY.md` | Technical docs | 16 KB |

---

## ✅ Success Checklist

Your system is healthy when:
- [x] `/simple-demo.html` loads
- [x] All 4 status cards green
- [x] "Test All Endpoints" = 12 passed
- [x] WebSocket connects
- [x] Module links open
- [x] No red errors in log

---

## 📞 Need More Help?

1. **Read:** `SIMPLE_DEMO_GUIDE.md` (detailed explanations)
2. **Fix:** `EMERGENCY_TROUBLESHOOTING.md` (common issues)
3. **Learn:** `PLAN_B_QUICK_START.md` (step-by-step)
4. **Check:** Server logs (`tail -f logs/app.log`)

---

## 🎯 Most Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| All red status | Server down | `npm run dev` |
| Health ✓, API ✗ | Database issue | Check `DATABASE_URL` |
| Dashboard blank | CSP blocking | Fix helmet config |
| WebSocket fail | CORS issue | Allow origin in `src/index.ts` |
| 404 on modules | Static files | Check Express static config |

---

**Remember:** This diagnostic tool WILL work if the server is running!

**Bookmark:** `/simple-demo.html` for future use

**Created:** 2025-10-12 by Agent 4
