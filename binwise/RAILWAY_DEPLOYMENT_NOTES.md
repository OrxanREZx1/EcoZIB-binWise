# Railway Deployment Notes

Your BinWise project is fully configured and ready for Railway deployment.

## 1. Railway Environment Variables

When you deploy your project on Railway, make sure to add these environment variables in your project settings:

```env
SECRET_KEY=replace-with-a-very-secure-random-string
DEBUG=False
ALLOWED_HOSTS=.railway.app
CSRF_TRUSTED_ORIGINS=https://*.railway.app
```

## 2. ESP32 Code Changes

Update your ESP32 code to point to your new Railway API endpoint.

```cpp
// Change this line to your Railway domain
String serverName = "https://YOUR_RAILWAY_PROJECT.up.railway.app/api/readings";

// Important: 
// 1. Make sure there is NO trailing slash at the end of the URL.
// 2. The endpoint uses HTTPS, so your ESP32 must use an HTTPS client (e.g., WiFiClientSecure) if it's enforcing SSL.
```

## 3. Pre-deploy Checklist

Before pushing to the `main` branch, ensure you have committed all the changes:
```bash
git add .
git commit -m "chore: configure project for Railway deployment"
git push origin main
```

Once Railway builds and deploys your repository, it will automatically install packages from `requirements.txt`, run `gunicorn` via the `Procfile`, and serve static files using WhiteNoise.
