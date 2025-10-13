# Simple Diagnostic Demo - User Guide

## 🎯 Purpose

This diagnostic tool helps identify what's working and what's broken in your Project Conductor deployment. It's designed to work when the main unified dashboard fails.

## 📍 How to Access

### Local Development
```
http://localhost:3000/simple-demo.html
```

### Production (Render)
```
https://your-app.onrender.com/simple-demo.html
```

## 🔍 What This Page Tests

### 1. **Server Health Check** (/health)
- Tests if the backend server is running
- Checks database connectivity
- Verifies environment information
- Shows presence statistics

**Success Indicators:**
- ✓ Green status indicator
- Shows server version (v1.0.0)
- Database status: "connected"

**Failure Indicators:**
- ✗ Red status indicator
- Connection timeout
- 503 Service Unavailable

### 2. **Requirements API** (/api/v1/requirements)
- Tests core API functionality
- Fetches sample requirements
- Validates JSON response format

**Success Indicators:**
- ✓ Green status indicator
- Shows number of requirements found
- Displays sample data in response section

**Failure Indicators:**
- ✗ Red status indicator
- 404 Not Found
- 500 Internal Server Error

### 3. **Dashboard API** (/api/v1/dashboard/stats)
- Tests dashboard statistics endpoint
- Checks data aggregation
- Validates dashboard functionality

**Success Indicators:**
- ✓ Green status indicator
- Returns project statistics
- Shows approval counts

**Failure Indicators:**
- ✗ Red status indicator
- Empty or malformed response
- Authentication errors

### 4. **WebSocket Connection**
- Tests real-time communication
- Verifies Socket.io connectivity
- Checks bi-directional messaging

**Success Indicators:**
- ✓ Green status indicator
- "WebSocket connected successfully!"
- Receives echo response

**Failure Indicators:**
- ✗ Red status indicator
- Connection refused
- Protocol mismatch (ws vs wss)

## 🎛️ Interactive Controls

### Button Functions

1. **Test Health Check**
   - Runs health endpoint test
   - Shows detailed server status
   - Displays database connection state

2. **Test Requirements API**
   - Fetches first 5 requirements
   - Validates API response format
   - Shows sample requirement data

3. **Test Dashboard API**
   - Checks dashboard statistics
   - Validates aggregated data
   - Tests caching layer

4. **Test All Endpoints**
   - Comprehensive test suite
   - Tests 12+ endpoints
   - Provides success/fail summary
   - Recommended for full diagnostics

5. **Test WebSocket**
   - Establishes WebSocket connection
   - Sends test message
   - Verifies two-way communication

6. **Clear Logs**
   - Clears console log display
   - Resets to clean state
   - Keeps status indicators

## 📊 System Diagnostics Section

Shows real-time browser and environment information:

```
Browser: Mozilla/5.0... (identifies your browser)
Origin: https://your-app.onrender.com
API Base URL: https://your-app.onrender.com/api/v1
Local Storage Available: Yes/No
Cookies Enabled: Yes/No
Online Status: Online/Offline
```

**Key Information:**
- **Origin**: Should match your deployment URL
- **API Base URL**: Automatically constructed, verifies correct routing
- **Online Status**: Confirms network connectivity

## 🎯 Direct Module Links

Bypass the unified dashboard and access modules directly:

- **Module 0 - Onboarding**: New user introduction
- **Module 1 - Dashboard**: Project overview and statistics
- **Module 2 - BRD**: Business Requirements Documents
- **Module 3 - PRD**: Product Requirements Documents
- **Module 4 - Engineering Design**: Technical specifications
- **Module 5 - Alignment**: Conflict resolution
- **Module 6 - Implementation**: Execution tracking

**Usage:**
- Click any module link to open in new tab
- Tests if individual modules load correctly
- Bypasses iframe and CSP issues

## 📋 Console Log

Real-time diagnostic log with color-coded messages:

- **🟢 Green (Success)**: Operations completed successfully
- **🔴 Red (Error)**: Failures and error messages
- **🔵 Blue (Info)**: General information and status updates

**Log Format:**
```
[HH:MM:SS] Message content
```

## 📡 API Response Viewer

Displays the last API response in JSON format:

```json
{
  "status": "ok",
  "data": { ... },
  "message": "Success"
}
```

**Features:**
- Pretty-printed JSON
- Syntax highlighting
- Scrollable for large responses
- Auto-updates with each test

## 🐛 Troubleshooting Guide

### Issue: All Tests Fail

**Symptoms:**
- Red status on all indicators
- "Connection failed" errors
- Timeout messages

**Diagnosis:**
- Server is not running
- Wrong URL/port
- Network connectivity issue

**Solutions:**
1. Verify server is running: `npm run dev` or check Render logs
2. Check URL matches deployment
3. Test with curl: `curl https://your-app.onrender.com/health`

### Issue: Health Check Passes, API Fails

**Symptoms:**
- ✓ Health check green
- ✗ Requirements API red
- ✗ Dashboard API red

**Diagnosis:**
- Database connection issue
- Route configuration error
- Middleware blocking requests

**Solutions:**
1. Check database environment variables
2. Review `src/index.ts` route mappings
3. Check for authentication middleware
4. Verify PostgreSQL connection

### Issue: WebSocket Fails

**Symptoms:**
- ✗ WebSocket connection error
- "Connection refused"
- Protocol mismatch

**Diagnosis:**
- Wrong WebSocket URL (ws vs wss)
- Server not configured for WebSocket
- Proxy/firewall blocking

**Solutions:**
1. Verify Socket.io initialized in `src/index.ts`
2. Check WebSocket proxy settings (Render/Nginx)
3. Test with: `wscat -c wss://your-app.onrender.com`
4. Review CORS configuration

### Issue: CSP Errors in Browser Console

**Symptoms:**
- "Content Security Policy" errors
- Scripts blocked
- Styles not loading

**Diagnosis:**
- Helmet CSP too restrictive
- Inline scripts blocked
- External resources blocked

**Solutions:**
1. Check `src/index.ts` helmet configuration (lines 117-143)
2. Verify CSP allows `'unsafe-inline'` for scripts/styles
3. Check frameguard is disabled for iframes

### Issue: Module Links 404

**Symptoms:**
- Direct module links return 404
- Files not found

**Diagnosis:**
- Static file serving misconfigured
- Files in wrong directory
- Path mapping incorrect

**Solutions:**
1. Verify files exist in project root
2. Check `/demo` route in `src/index.ts` (lines 200-226)
3. Confirm Express static middleware configured
4. Check file permissions

## 🎓 Understanding Test Results

### Perfect Health
```
✓ Server Status: Server running (v1.0.0)
✓ API Endpoint: API working (5 requirements)
✓ WebSocket: WebSocket connected
✓ Dashboard API: Dashboard API working
```

**Meaning:** Everything is working correctly!
- Backend server operational
- Database connected
- APIs responding
- Real-time features available

### Partial Failure
```
✓ Server Status: Server running (v1.0.0)
✗ API Endpoint: Connection failed
✗ WebSocket: Connection refused
✓ Dashboard API: Dashboard API working
```

**Meaning:** Server running but some features broken
- Check route configuration
- Verify middleware not blocking
- Review error logs

### Complete Failure
```
✗ Server Status: Connection failed
✗ API Endpoint: Connection failed
✗ WebSocket: Connection failed
✗ Dashboard API: Connection failed
```

**Meaning:** Server not reachable
- Verify server is running
- Check URL/port correct
- Test network connectivity

## 📚 Advanced Usage

### Running Comprehensive Tests

1. Open page
2. Wait for initial auto-tests (3-5 seconds)
3. Click "Test All Endpoints"
4. Review console log for detailed results

**Expected Output:**
```
==========================================
Starting comprehensive endpoint test...
==========================================
Testing: Health Check...
✓ Health Check - SUCCESS (200)
Testing: API Info...
✓ API Info - SUCCESS (200)
...
==========================================
Test Complete: 12 passed, 0 failed
==========================================
```

### Debugging Specific Features

#### To Debug Requirements API:
1. Click "Test Requirements API"
2. Review API Response section
3. Check for error messages in response
4. Verify data structure matches expected format

#### To Debug Real-Time Features:
1. Click "Test WebSocket"
2. Watch console log for connection events
3. Check for "WebSocket connected successfully!"
4. Verify message received

#### To Debug Authentication:
1. Run "Test All Endpoints"
2. Look for 401 Unauthorized errors
3. Check if auth middleware enabled
4. Verify JWT tokens

### Using Browser DevTools

**Network Tab:**
- Shows all HTTP requests
- Displays response codes
- Shows request/response headers
- Identifies timing issues

**Console Tab:**
- Shows JavaScript errors
- Displays WebSocket events
- Shows API call details
- Reveals CSP violations

**Application Tab:**
- Check Local Storage
- Verify cookies
- Inspect Service Workers

## 🚀 Next Steps After Diagnosis

### If Everything Works:
1. Main unified dashboard likely has CSP/iframe issue
2. Check browser console for CSP errors
3. Review helmet configuration in `src/index.ts`
4. Consider using direct module links instead

### If API Works but Dashboard Fails:
1. Dashboard API may have data issue
2. Check dashboard controller logic
3. Verify database has sample data
4. Review dashboard HTML for errors

### If Nothing Works:
1. Verify server is running: `npm run dev`
2. Check environment variables set correctly
3. Review server startup logs
4. Test database connection independently
5. Check firewall/network settings

## 💡 Tips for Production Deployment

1. **Bookmark this page** - Easy access when main dashboard fails
2. **Run tests after deployment** - Verify everything deployed correctly
3. **Check regularly** - Monitor for degradation
4. **Share with team** - Everyone can diagnose issues
5. **Use in CI/CD** - Automate endpoint testing

## 🔗 Related Files

- **Server Configuration**: `/Users/h0r03cw/Desktop/Coding/Project Conductor/src/index.ts`
- **Helmet/CSP Setup**: Lines 117-143 in `src/index.ts`
- **Static File Serving**: Lines 176-226 in `src/index.ts`
- **Route Configuration**: Lines 288-326 in `src/index.ts`
- **WebSocket Setup**: Lines 478-663 in `src/index.ts`

## 📞 Getting Help

If diagnostic page shows errors you can't resolve:

1. **Check Logs**:
   - Local: Terminal where `npm run dev` is running
   - Render: View logs in Render dashboard

2. **Review Documentation**:
   - API_DOCUMENTATION.md
   - DEPLOYMENT.md
   - DEVELOPER_GUIDE.md

3. **Common Issues**:
   - Database not initialized: Run migrations
   - Environment variables missing: Check `.env`
   - Port already in use: Change PORT in `.env`

---

## 🎉 Success Criteria

Your deployment is healthy when:
- ✓ All 4 status cards are green
- ✓ "Test All Endpoints" shows 12 passed, 0 failed
- ✓ WebSocket connects successfully
- ✓ Module links open correctly
- ✓ API Response shows valid JSON data

**You're ready to use Project Conductor!** 🚀
