# Getting Started with Digital Eyes Frontend

This guide will help you set up and run the Digital Eyes MVP frontend application.

## Prerequisites

- **Node.js** 16+ (v18+ recommended)
- **npm** 8+ or **yarn** 3+
- **Git**

## Installation & Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Configure your backend API URL:

```env
VITE_API_URL=http://localhost:8000/api
```

### 4. Start Development Server

```bash
npm run dev
```

The application will open automatically at `http://localhost:5173`

## Features to Explore

### 🔐 Authentication
- Click "Field Employee" or "Store Manager"
- Click "Continue" to login (mock authentication)

### 📱 Field Employee Features
1. **Scanner Page** (`/scanner`)
   - Take a photo using device camera
   - Upload an image from device
   - Enter Aisle and Shelf information
   - Click "Analyze" to process

2. **Processing State**
   - Watch the AI analysis animation
   - Processing takes ~3 seconds (simulated)

3. **Results Page**
   - View the uploaded image
   - See bounding boxes overlay (simulated AI output)
   - View out of stock items
   - See detected anomalies

4. **Task Dashboard** (`/scanner-dashboard`)
   - View all pending scan tasks
   - Filter by priority
   - Track completion status

### 📊 Store Manager Features
1. **Dashboard** (`/dashboard`)
   - View Shelf Health Score (0-100)
   - See quick stats (scans today, out of stock items)
   - Review out of stock alerts
   - Get AI recommendations

## Development Workflow

### 1. Add a New Page

Create a new file in `src/pages/YourPage.tsx`:

```tsx
import { Layout } from '@/components/Layout';

export const YourPage = () => {
  return (
    <Layout headerTitle="Your Page">
      <div className="px-4 py-6">
        {/* Your content */}
      </div>
    </Layout>
  );
};
```

Add route in `src/App.tsx`:

```tsx
<Route path="/your-page" element={<YourPage />} />
```

### 2. Create a Reusable Component

Create in `src/components/YourComponent.tsx`:

```tsx
interface YourComponentProps {
  title: string;
}

export const YourComponent = ({ title }: YourComponentProps) => {
  return <div>{title}</div>;
};
```

### 3. Use Custom Hooks

Available hooks in `src/hooks/`:
- `useAuth()` - Authentication state
- `useImageUpload()` - Image upload handling

### 4. Style with Tailwind

Use Tailwind CSS classes directly:

```tsx
<div className="bg-primary-600 text-white px-4 py-2 rounded-lg">
  Styled content
</div>
```

## Building for Production

### 1. Build

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### 2. Preview Build

```bash
npm run preview
```

Opens the production build locally.

### 3. Deploy

The `dist/` folder is ready to deploy to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Any static hosting service

## API Integration

The app connects to a backend API. Currently, it uses mock data.

### To Connect Real Backend:

Update `src/services/apiClient.ts` with your API endpoints:

```typescript
export const scannerService = {
  uploadImage: async (file: File, aisle: string, shelf: string) => {
    // Your implementation
  },
};
```

### Required API Endpoints:

```
POST   /auth/login              - User authentication
POST   /analysis/scan           - Upload and analyze images
GET    /analysis/history        - Get scan history
GET    /dashboard/shelf-health  - Get shelf health metrics
GET    /dashboard/alerts        - Get out of stock alerts
GET    /dashboard/scan-tasks    - Get scan tasks
```

## Troubleshooting

### Port Already in Use

Change port in `vite.config.ts`:

```typescript
server: {
  port: 5174, // Change port number
  open: true,
}
```

### Dependencies Issues

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Loading

- Make sure `.env` file is in the `frontend/` directory
- Restart the dev server after changing `.env`
- Only `VITE_` prefixed variables are accessible in browser

### Image Upload Not Working

- Check file size (max 10MB)
- Supported formats: JPEG, PNG, WebP
- On mobile: Use "Take Photo" for camera, "Upload Image" for gallery

## Performance Tips

1. **Use production build for testing**: `npm run build && npm run preview`
2. **Optimize images** before upload
3. **Enable browser DevTools** to monitor performance
4. **Check Network tab** to see API calls and sizes

## Browser DevTools

Open DevTools (F12) to:
- **Console** - Check for errors
- **Network** - Monitor API calls
- **Performance** - Profile rendering
- **Storage** - View localStorage data

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Cleanup
npm run clean            # Remove dist folder
npm install              # Reinstall dependencies
```

## Project Structure Explained

```
frontend/
├── src/
│   ├── pages/           # Page components (routes)
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client and services
│   ├── types/           # TypeScript type definitions
│   ├── config/          # App configuration
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app & routing
│   ├── main.tsx         # React DOM entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies & scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── index.html           # HTML entry point
└── README.md            # Documentation
```

## Next Steps

1. **Connect Backend** - Update API endpoints in `src/services/apiClient.ts`
2. **Customize Branding** - Modify colors in `tailwind.config.js`
3. **Add Real Authentication** - Replace mock login in `LoginPage.tsx`
4. **Enable Notifications** - Add notification service
5. **Add PWA Features** - Create service worker for offline support

## Support

For issues or questions:
1. Check this documentation
2. Review TypeScript types in `src/types/index.ts`
3. Examine component prop interfaces
4. Check browser console for error messages

## License

MIT
