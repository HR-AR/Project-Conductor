# UX Integration Guide - Quick Start

## 🚀 2-Minute Setup

### Step 1: Add to HTML `<head>`

```html
<!-- Toast Notifications -->
<link rel="stylesheet" href="/css/toast-notifications.css">

<!-- Activity Feed (optional - for dashboards only) -->
<link rel="stylesheet" href="/css/activity-feed-redesign.css">

<!-- JavaScript -->
<script src="/js/toast-manager.js"></script>
<script src="/js/avatar-fallback.js"></script>
```

### Step 2: Replace All `alert()` Calls

```javascript
// ❌ OLD - Blocking UI
alert('Document saved!');

// ✅ NEW - Non-blocking toast
toast.success('Document saved!');

// Error example
alert('Error: ' + message);  // ❌ OLD
toast.error('Error: ' + message);  // ✅ NEW

// Warning example
alert('Are you sure?');  // ❌ OLD
toast.warning('Are you sure?');  // ✅ NEW

// Info example
alert('New version available');  // ❌ OLD
toast.info('New version available');  // ✅ NEW
```

### Step 3: That's It!

Avatars automatically replace themselves. Toasts work globally. Activity feed is ready if needed.

---

## 📚 API Reference

### Toast Manager

```javascript
// Basic usage
toast.success(message);
toast.error(message);
toast.warning(message);
toast.info(message);

// With options
toast.success('Saved!', {
  title: 'Success',        // Custom title
  duration: 5000,          // Auto-dismiss (ms), 0 = no auto-dismiss
  closable: true,          // Show close button
  icon: '✓'                // Custom icon
});

// Advanced
const toastId = toast.show('Custom message', {
  type: 'success',         // 'success' | 'error' | 'warning' | 'info'
  title: 'Custom Title',
  duration: 3000,
  closable: true
});

// Dismiss specific toast
toast.dismiss(toastId);

// Dismiss all toasts
toast.dismissAll();
```

### Avatar Fallback

```javascript
// Create avatar element
const avatar = avatarFallback.create('John Doe', {
  size: 40,                // Size in pixels
  className: 'my-avatar',  // Additional CSS class
  style: {}                // Inline styles
});
document.body.appendChild(avatar);

// Create SVG data URL (for img src)
const dataUrl = avatarFallback.createDataUrl('Jane Smith', 50);
img.src = dataUrl;

// Get background-image CSS
const bgImage = avatarFallback.getBackgroundImage('Bob Wilson', 40);
div.style.backgroundImage = bgImage;

// Auto-replace all broken images (runs automatically on load)
avatarFallback.replaceAll('img.user-avatar');

// Initialize error handling (runs automatically)
avatarFallback.initErrorHandling();
```

---

## 🎨 Activity Feed (Optional)

Only add if you need real-time activity tracking.

### HTML Structure

```html
<!-- Toggle button (top-right) -->
<button class="activity-feed-toggle has-activity" onclick="toggleActivityFeed()">
  ⚡
  <span class="activity-badge">3</span>
</button>

<!-- Overlay -->
<div class="activity-feed-overlay" onclick="toggleActivityFeed()"></div>

<!-- Panel -->
<div class="agent-activity-feed">
  <div class="activity-feed-header">
    <div class="activity-feed-title">
      <span class="activity-feed-icon">⚡</span>
      <span>Live Activity</span>
      <span class="activity-count">3</span>
    </div>
    <div class="activity-feed-controls">
      <button class="activity-feed-btn" onclick="toggleActivityFeed()">×</button>
    </div>
  </div>

  <div class="activity-feed-content">
    <!-- Activity items go here -->
  </div>

  <div class="activity-feed-footer">
    <span>3 active</span>
    <button class="activity-feed-clear-btn">Clear All</button>
  </div>
</div>
```

### JavaScript

```javascript
function toggleActivityFeed() {
  document.querySelector('.agent-activity-feed').classList.toggle('active');
  document.querySelector('.activity-feed-overlay').classList.toggle('active');
}
```

---

## 🔍 Examples

### Save Document

```javascript
async function saveDocument() {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    if (response.ok) {
      toast.success('Document saved successfully!');
    } else {
      toast.error('Failed to save document');
    }
  } catch (error) {
    toast.error('Network error: ' + error.message);
  }
}
```

### Form Validation

```javascript
function validateForm() {
  if (!title) {
    toast.warning('Please enter a title');
    return false;
  }

  if (!description) {
    toast.warning('Please enter a description');
    return false;
  }

  toast.success('Form is valid!');
  return true;
}
```

### Copy to Clipboard

```javascript
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      toast.success('Copied to clipboard!');
    })
    .catch(() => {
      toast.error('Failed to copy');
    });
}
```

### User Avatars

```javascript
// In your user list rendering
users.forEach(user => {
  const avatar = avatarFallback.create(user.name, {
    size: 40,
    className: 'user-avatar'
  });
  userList.appendChild(avatar);
});
```

---

## 🎯 Common Patterns

### Loading State

```javascript
async function loadData() {
  const toastId = toast.info('Loading...', { duration: 0 });

  try {
    const data = await fetch('/api/data');
    toast.dismiss(toastId);
    toast.success('Data loaded successfully!');
  } catch (error) {
    toast.dismiss(toastId);
    toast.error('Failed to load data');
  }
}
```

### Confirmation

```javascript
function deleteItem() {
  // Show warning toast
  toast.warning('This action cannot be undone', {
    title: 'Delete Item?',
    duration: 5000
  });

  // Or use browser confirm (still useful for critical actions)
  if (confirm('Really delete?')) {
    // Perform delete
    toast.success('Item deleted');
  }
}
```

### Progress Notification

```javascript
function uploadFile() {
  const toastId = toast.info('Uploading... 0%', { duration: 0 });

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    toast.dismiss(toastId);

    if (progress < 100) {
      toastId = toast.info(`Uploading... ${progress}%`, { duration: 0 });
    } else {
      clearInterval(interval);
      toast.success('Upload complete!');
    }
  }, 500);
}
```

---

## ⚙️ Configuration

### Global Toast Settings

Edit `/js/toast-manager.js`:

```javascript
class ToastManager {
  constructor() {
    // Change defaults here
    this.defaultDuration = 3000;  // 3 seconds
    this.maxToasts = 5;           // Max visible toasts
    this.position = 'top-right';  // Position
  }
}
```

### Avatar Colors

Edit `/js/avatar-fallback.js`:

```javascript
class AvatarFallback {
  constructor() {
    this.colors = [
      '#667eea',  // Add/remove colors
      '#764ba2',
      // ... more colors
    ];
  }
}
```

---

## 🐛 Troubleshooting

### Toasts Not Showing

1. Check console for errors
2. Verify CSS is loaded: `document.querySelector('.toast-container')`
3. Check `window.toast` is defined
4. Ensure scripts load before usage

```javascript
// Safe usage
if (typeof toast !== 'undefined') {
  toast.success('Message');
} else {
  console.error('Toast manager not loaded');
}
```

### Avatars Not Replacing

1. Check `window.avatarFallback` is defined
2. Verify images have `alt` attribute (used for name)
3. Check console for initialization errors

```javascript
// Manual initialization
window.addEventListener('DOMContentLoaded', () => {
  if (window.avatarFallback) {
    avatarFallback.replaceAll('img.user-avatar');
  }
});
```

### Activity Feed Not Sliding

1. Verify CSS is loaded
2. Check for JavaScript errors
3. Ensure `toggleActivityFeed()` function exists

---

## 📱 Mobile Considerations

### Toast Positioning

On mobile (<640px), toasts automatically:
- Span full width (minus 1rem padding)
- Adjust positioning for better visibility
- Larger touch targets

### Activity Feed

On mobile, the feed:
- Becomes full-screen overlay
- Touch-friendly interactions
- Smooth slide animations

### Avatars

Avatars are:
- SVG-based (retina-ready)
- Scalable to any size
- Consistent across devices

---

## 🎨 Customization

### Toast Themes

Edit `/css/toast-notifications.css`:

```css
.toast-success {
  border-left-color: #your-color;
}

.toast-success .toast-icon {
  background: linear-gradient(135deg, #your-color 0%, #darker-shade 100%);
}
```

### Avatar Styling

```css
.avatar-fallback {
  /* Custom styles */
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
```

---

## 🧪 Testing

### Manual Testing

1. Visit `/ui-redesign-demo.html` for interactive demo
2. Test all toast types
3. Verify avatars replace correctly
4. Check activity feed toggle

### Automated Testing

```javascript
// Jest example
test('toast shows success message', () => {
  toast.success('Test message');
  expect(document.querySelector('.toast-success')).toBeInTheDocument();
});

test('avatar generates correct initials', () => {
  const avatar = avatarFallback.create('John Doe');
  expect(avatar.textContent).toBe('JD');
});
```

---

## 📊 Performance Tips

1. **Limit toast duration**: Don't set duration too high
2. **Dismiss old toasts**: Use `toast.dismissAll()` when navigating
3. **Avatar caching**: Avatars are created on-demand (fast)
4. **Activity feed**: Hide when not in use (saves CPU)

---

## ✅ Checklist

Before deploying:

- [ ] Added CSS links to `<head>`
- [ ] Added JS scripts before `</head>`
- [ ] Replaced all `alert()` calls
- [ ] Tested toast notifications (all types)
- [ ] Verified avatars work (no external URLs)
- [ ] Checked mobile responsiveness
- [ ] Tested keyboard navigation
- [ ] Verified browser console (no errors)

---

## 🆘 Quick Help

**Problem:** Toast not showing
**Solution:** Check `window.toast` exists, verify CSS loaded

**Problem:** Avatar broken images
**Solution:** Add `alt` attribute with user name

**Problem:** Activity feed won't slide
**Solution:** Verify CSS loaded, check `toggleActivityFeed()` exists

**Problem:** Styling conflicts
**Solution:** Check CSS load order, our styles should load last

---

## 📞 Support

- **Demo:** `/ui-redesign-demo.html`
- **Documentation:** `/UI_REDESIGN_SUMMARY.md`
- **Examples:** This guide

**Happy coding!** 🎉
