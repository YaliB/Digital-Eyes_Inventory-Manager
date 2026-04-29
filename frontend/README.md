# Digital Eyes Frontend - MVP

An AI-powered retail shelf monitoring system built with React, Vite, Tailwind CSS, and Framer Motion.

## Features

✅ **Authentication Flow** - Mock login with role-based access
✅ **Field Employee Scanner** - Capture shelf images with camera/upload
✅ **AI Analysis Preview** - Display results with bounding boxes
✅ **Task Dashboard** - View and manage scanning tasks
✅ **Manager Dashboard** - Real-time analytics and alerts
✅ **Professional UI** - Responsive, mobile-first design
✅ **Smooth Animations** - Framer Motion interactions
✅ **Professional Theme** - Deep blues, clean whites, status colors

## Quick Start

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── ScannerPage.tsx
│   ├── ScannerDashboard.tsx
│   └── ManagerDashboard.tsx
├── components/         # Reusable UI components
│   ├── Layout.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Alert.tsx
│   ├── LoadingState.tsx
│   └── DashboardComponents.tsx
├── hooks/             # Custom React hooks
│   ├── useAuth.ts
│   └── useImageUpload.ts
├── services/          # API services
│   └── apiClient.ts
├── types/             # TypeScript types
│   └── index.ts
├── App.tsx            # Main app with routing
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## User Flows

### Field Employee
1. **Login** → Select "Field Employee"
2. **Scanner** → Capture/upload shelf images
3. **Analysis** → View AI results with bounding boxes
4. **Task Dashboard** → See pending scan tasks

### Store Manager
1. **Login** → Select "Store Manager"
2. **Dashboard** → View shelf health score and alerts
3. **Out of Stock Alerts** → Prioritized by urgency
4. **Recommendations** → AI-generated restocking suggestions

## API Integration

The app expects a backend at `http://localhost:8000/api` (configurable via `VITE_API_URL`).

**Key Endpoints:**
- `POST /auth/login` - User authentication
- `POST /analysis/scan` - Upload and analyze shelf images
- `GET /dashboard/shelf-health` - Shelf metrics
- `GET /dashboard/alerts/out-of-stock` - Alert list
- `GET /dashboard/scan-tasks` - Scanning tasks

## Design System

### Colors
- **Primary**: Deep blue (#3d7eb4)
- **Success**: Green (#16a34a)
- **Alert**: Red (#dc2626)
- **Warning**: Amber (#d97706)
- **Neutral**: Grays (#f5f5f5 - #171717)

### Components
- Responsive buttons with loading states
- Animated cards and alerts
- Progress indicators
- Status badges
- Image preview with overlay

## Environment Variables

Create `.env` in the frontend folder:

```
VITE_API_URL=http://localhost:8000/api
```

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Mobile browsers (iOS Safari, Chrome Android)

## Performance Optimizations

- Code splitting with Vite
- Image optimization
- Lazy loading components
- CSS-in-JS with Tailwind (purged)
- Production builds with minification

## PWA Ready

Configured for mobile with:
- Viewport meta tags
- Safe area support (notch-aware)
- Touch-optimized UI
- Ready for service worker integration

## License

MIT
