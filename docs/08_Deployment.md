# 08 Deployment

## MACVEL School Management System

### 1. Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | Vite dev server (`npm run dev`, port 5173) | `npm run dev` (nodemon, port 3000) | Local MongoDB `macvel_school` |
| Production | **Vercel** (static build) | Node.js host (any Node 18+ server) | MongoDB Atlas |

### 2. Frontend Deployment (Vercel)

| Setting | Value |
|---------|-------|
| Project root | `frontend/` |
| Build command | `npm run build` |
| Output directory | `dist` (Vite) |
| SPA routing | `frontend/vercel.json` rewrites all non-asset paths → `/index.html` |
| API URL | `EXPO_PUBLIC_API_URL` / `.env` → production API base URL |

**Steps:**

1. Import the Git repository into Vercel (or `vercel` CLI)
2. Set root directory to `frontend`
3. Add environment variables (`.env.example` as reference)
4. Deploy — every push to `main` triggers an automatic redeploy
5. Verify deep links (`/admin/students`, `/login`) do not 404 on refresh

### 3. Backend Deployment

**Requirements:** Node.js ≥ 18, MongoDB (local or Atlas), optional Cloudinary account

```bash
cd backend
npm ci                # install dependencies
cp .env.example .env  # then edit values (see §5)
npm run seed:superadmin   # optional: create first Super Admin
npm start             # node src/server.js → port 3000
```

**Post-deploy verification:**

| Check | Command / URL | Expected |
|-------|---------------|----------|
| Health | `GET /health` | `{ status: "OK", version: "3.0.0" }` |
| DB | Server log | `[DB] MongoDB connected successfully` |
| CORS | Browser call from frontend origin | `Access-Control-Allow-Origin` present |
| Uploads | `POST /api/files/upload` | Secure file URL returned |

**Operational notes:**

- Server binds `0.0.0.0` — put a reverse proxy/HTTPS terminator in front for production
- Failed DB connection at boot exits the process (`process.exit(1)`) — process managers (PM2/systemd) will restart it
- Uploaded files persist either in Cloudinary (recommended) or `backend/uploads/` (must be volume-mounted if local)

### 4. Mobile Deployment (Capacitor)

**Project:** `mobile/` (appId `com.school.app`, webDir `build`)

```bash
cd mobile
npm install
npm run build          # Vite production build → build/
npx cap sync android   # copy web assets + plugins into android/
npx cap sync ios       # copy web assets + plugins into ios/
```

| Platform | Tool | Output |
|----------|------|--------|
| Android | Android Studio → *Build > Build APK(s)* / `gradlew assembleRelease` | `app-release.apk` / AAB for Play Store |
| iOS | Xcode → *Product > Archive* (Apple Developer account required) | IPA via Organizer |

Set the backend API URL in `mobile/.env` before building (point to production API, not `localhost`).

### 5. Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` / `production` | Environment mode |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster/...` | MongoDB connection string |
| `JWT_SECRET` | `<strong random>` | JWT signing key (**change in production**) |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `BCRYPT_SALT_ROUNDS` | `10` | Password hashing cost |
| `MAX_FILE_SIZE` | `10485760` | Upload limit (10 MB) |
| `UPLOAD_PATH` | `./uploads` | Local upload folder |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud` | Cloudinary storage (empty → local fallback) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Frontend origins |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | — | Optional mail notifications |

### 6. Production Checklist

- [ ] `JWT_SECRET` replaced with a strong random value
- [ ] `NODE_ENV=production`
- [ ] MongoDB Atlas IP allow-list configured; strong DB credentials
- [ ] `CLOUDINARY_URL` set (avoids ephemeral-disk file loss on hosts like Vercel/Render)
- [ ] CORS `ALLOWED_ORIGINS` restricted to the deployed frontend domain
- [ ] HTTPS enabled at the proxy/platform level
- [ ] Super Admin seeded and default passwords changed
- [ ] `GET /health` monitored for uptime
- [ ] Database backups enabled (Atlas snapshot schedule)

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
