# 🔥 IMPORTANT: Update Your Backend .env File

To enable CORS for your deployed frontend, you need to update your `server/.env` file.

## Action Required

Add or update the following line in `server/.env`:

```env
FRONTEND_URLS=http://localhost:5173,https://social-media-dashboard-one-chi.vercel.app
```

## Complete .env File Should Look Like:

```env
PORT=5000
METRICOOL_API_KEY=your_actual_api_key_here
FRONTEND_URLS=http://localhost:5173,https://social-media-dashboard-one-chi.vercel.app
```

## After Updating

1. Save the file
2. Restart your backend server (the terminal will auto-restart if using `npm run dev`)
3. Your backend will now accept requests from both:
   - `http://localhost:5173` (local development)
   - `https://social-media-dashboard-one-chi.vercel.app` (deployed frontend)

## What Changed?

- ✅ Backend now has dynamic CORS configuration
- ✅ Frontend now uses environment-based API URL
- ✅ Both can work in development and production seamlessly

See [deployment_guide.md](file:///c:/Users/soumi_wo2im7/.gemini/antigravity/brain/3861575a-80a0-4395-8cce-38c0ec1262ef/deployment_guide.md) for complete deployment instructions.
