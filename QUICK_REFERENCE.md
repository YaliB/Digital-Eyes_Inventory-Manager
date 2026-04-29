# Quick Reference - Digital Eyes Frontend

## 🚀 Quick Start (Copy-Paste)

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`

## 👥 Test Users (Mock Auth)

| Role | Actions |
|------|---------|
| **Field Employee** | Scan → Analyze → View Results |
| **Store Manager** | View Dashboard → Review Alerts → See Recommendations |

**Login Instructions:**
1. Select your role
2. Click "Continue"
3. You're in! (Mock auth - no password needed)

## 🎯 Key Routes

| URL | Page | Access |
|-----|------|--------|
| `/` | Login | Everyone |
| `/scanner` | Image Uploader | Employee, Manager |
| `/scanner-dashboard` | Task List | Employee |
| `/dashboard` | Analytics | Manager |

## 📦 Component Quick Reference

### Layout Components
```tsx
import { Layout } from '@/components/Layout';

<Layout headerTitle="Page Title" showBackButton>
  {children}
</Layout>
```

### Button Variants
```tsx
import { Button } from '@/components/Button';

<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="danger">Danger</Button>
<Button isLoading>Loading...</Button>
```

### Cards
```tsx
import { Card } from '@/components/Card';

<Card interactive onClick={() => {}}>
  Content
</Card>
```

### Alerts
```tsx
import { Alert } from '@/components/Alert';

<Alert type="success" title="Success!" message="Done" />
<Alert type="error" title="Error" />
<Alert type="warning" title="Warning" />
<Alert type="info" title="Info" />
```

### Loading States
```tsx
import { LoadingState } from '@/components/LoadingState';

<LoadingState state="loading" message="Loading..." />
<LoadingState state="error" message="Failed to load" onRetry={} />
<LoadingState state="empty" message="No data" />
```

### Dashboard Components
```tsx
import { HealthScore, AlertItem } from '@/components/DashboardComponents';

<HealthScore score={72} />
<AlertItem 
  priority="critical" 
  productName="Coca-Cola" 
  sku="COL-001" 
  aisle="A1" 
  shelf="Top" 
/>
```

## 🪝 Hooks

### useAuth
```tsx
import { useAuth } from '@/hooks/useAuth';

const { user, isAuthenticated, login, logout } = useAuth();
```

### useImageUpload
```tsx
import { useImageUpload } from '@/hooks/useImageUpload';

const { preview, file, isLoading, error, handleImageCapture, reset } = useImageUpload();
```

## 🎨 Tailwind Color Classes

```tsx
/* Primary (Blue) */
bg-primary-600, text-primary-600, border-primary-300

/* Success (Green) */
bg-success-600, text-success-600, border-success-300

/* Alert (Red) */
bg-alert-600, text-alert-600, border-alert-300

/* Warning (Amber) */
bg-warning-600, text-warning-600, border-warning-300

/* Neutral (Gray) */
bg-neutral-100, text-neutral-600, border-neutral-200
```

## 📝 Types Reference

```tsx
import { 
  UserRole, 
  User, 
  AnalysisResult, 
  OutOfStockAlert, 
  AlertPriority,
  ScanTask 
} from '@/types';

enum UserRole {
  FIELD_EMPLOYEE = 'field_employee',
  STORE_MANAGER = 'store_manager',
}

enum AlertPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}
```

## 📡 API Service

```tsx
import { 
  authService, 
  scannerService, 
  dashboardService 
} from '@/services/apiClient';

// Auth
await authService.login(email, password);
await authService.logout();

// Scanner
await scannerService.uploadImage(file, aisle, shelf);
await scannerService.getAnalysisHistory();

// Dashboard
await dashboardService.getShelfHealth();
await dashboardService.getOutOfStockAlerts();
```

## 🛠️ Utility Functions

```tsx
import { 
  cn, 
  formatFileSize, 
  formatDate, 
  debounce, 
  throttle 
} from '@/utils/helpers';

cn('bg-red-500', false, 'text-white') 
// → 'bg-red-500 text-white'

formatFileSize(1024 * 1024) // → '1 MB'
formatDate(new Date()) // → 'Jan 15, 2026'
```

## 📱 Responsive Breakpoints

```
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px+

Example: md:px-6 (6px padding on tablet+)
```

## 🔧 Environment Variables

```env
# .env file in frontend/ directory
VITE_API_URL=http://localhost:8000/api
```

Access in code:
```tsx
import.meta.env.VITE_API_URL
```

## 📦 Key Dependencies

```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.292.0",
  "tailwindcss": "^3.3.0",
  "axios": "^1.6.0"
}
```

## ⌨️ Common Commands

```bash
npm run dev          # Development
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # Check code
npm install          # Install deps
npm update           # Update packages
npm cache clean --force  # Clear cache
```

## 🎬 Animation Presets

All components use Framer Motion. Common animations:

```tsx
import { motion } from 'framer-motion';

// Fade in
initial={{ opacity: 0 }} animate={{ opacity: 1 }}

// Slide in
initial={{ x: -20 }} animate={{ x: 0 }}

// Scale
initial={{ scale: 0.9 }} animate={{ scale: 1 }}

// Rotate
animate={{ rotate: 360 }} transition={{ duration: 2 }}
```

## 🔍 Debugging

```tsx
// Console logs
console.log(import.meta.env); // All env vars
console.log(localStorage); // Stored data

// Browser DevTools
F12 → Console, Network, Application tabs

// React DevTools
React Chrome Extension shows component tree
```

## ✅ Testing Flows

### Employee Scanner Flow
1. Go to Scanner page
2. Click "Take Photo" or "Upload Image"
3. Enter Aisle (e.g., "A1") and Shelf (e.g., "Top")
4. Click "Analyze"
5. Wait for processing (~3 sec)
6. View results with mock bounding boxes

### Manager Dashboard Flow
1. Go to Dashboard
2. View Shelf Health Score
3. See Out of Stock Alerts
4. Check AI Recommendations
5. Click "Start Scan" to scan new shelf

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Port 5173 in use | Change port in `vite.config.ts` |
| Env vars not loading | Restart dev server after `.env` change |
| Image upload fails | Check file size (< 10MB) and format (JPG/PNG) |
| Components not rendering | Verify imports use `@/` alias |

## 📚 File Navigation

| Need | File |
|------|------|
| API calls | `src/services/apiClient.ts` |
| Routes | `src/App.tsx` |
| Styles | `tailwind.config.js` |
| Types | `src/types/index.ts` |
| Config | `src/config/index.ts` |

## 💡 Pro Tips

1. Use `<motion.div>` for smooth animations
2. Import types from `@/types` for type safety
3. Use `cn()` utility for conditional classes
4. Check `.env.example` for all available vars
5. Test on mobile with DevTools device emulation
6. Use localStorage for persistent data
7. Services handle all API communication

## 🚢 Deployment

```bash
# Build
npm run build

# Output is in dist/ folder
# Deploy dist/ folder to any static host:
# - Vercel
# - Netlify  
# - GitHub Pages
# - AWS S3
# - Firebase Hosting
```

---

**Need Help?** Check `SETUP_GUIDE.md` or `MVP_OVERVIEW.md`
