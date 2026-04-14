# How to run BookLink

This guide assumes a recent **Node.js** LTS (v20 or v22 works well) and **npm**. Use two terminals: one for the API, one for the Expo app.

---

## 1. Backend (API)

```bash
cd Backend
npm install
```

Create **`Backend/.env`** (never commit real secrets). Typical variables:

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | **Required.** MongoDB connection string. |
| `CLERK_PUBLISHABLE_KEY` | Clerk **publishable** key (same application as the app). |
| `CLERK_SECRET_KEY` | Clerk **secret** key for server-side verification. |
| `PORT` | Optional. Defaults to `5000`. |
| `CLIENT_ORIGIN` | Optional. Comma-separated allowed origins for CORS (e.g. Expo web). Example: `http://localhost:8081,http://127.0.0.1:8081`. If unset, CORS may allow all origins depending on configuration. |
| `CLOUDINARY_CLOUD_NAME` | Optional but needed for image uploads to work end-to-end. |
| `CLOUDINARY_API_KEY` | With Cloudinary. |
| `CLOUDINARY_API_SECRET` | With Cloudinary. |

Start the server:

```bash
npm run dev
```

You should see MongoDB connected and a line like `BookLink API http://localhost:5000`. A quick check:

```bash
curl http://localhost:5000/api/health
```

---

## 2. Frontend (Expo)

```bash
cd Frontend
npm install
```

Create **`Frontend/.env`** for Expo public variables (must be prefixed with `EXPO_PUBLIC_`):

| Variable | Purpose |
| -------- | ------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Required.** Clerk publishable key for the Expo app. |
| `EXPO_PUBLIC_API_URL` | **Recommended** for physical devices or web when the API is not on the same host. Example: `http://192.168.1.x:5000` (your PC’s LAN IP + backend port). If omitted on a simulator/emulator, the app may infer the host from Expo; for **Expo web** or **real phones**, set this explicitly to your API base URL (no trailing slash). |

Start Metro / Expo:

```bash
npm start
```

Then press **`w`** for web, **`a`** for Android, or **`i`** for iOS (with the appropriate tooling installed). You can also run:

```bash
npm run web
npm run android
npm run ios
```

---

## 3. Align Clerk with your URLs

In the [Clerk Dashboard](https://dashboard.clerk.com/), configure **allowed redirect / native bundle IDs** to match how you run the app (Expo Go, dev build, or web). The publishable keys in `Frontend/.env` and `Backend/.env` must belong to the **same** Clerk application.

---

## 4. Common issues

- **App cannot reach API (network error):** Set `EXPO_PUBLIC_API_URL` to a URL your phone or browser can reach (`localhost` is often wrong for a physical device; use your machine’s LAN IP).
- **CORS on web:** Set `CLIENT_ORIGIN` on the backend to include your Expo web origin (often `http://localhost:8081` or similar).
- **Port already in use:** Change `PORT` in `Backend/.env` or stop the other process using that port.
- **Uploads fail:** Ensure Cloudinary env vars are set on the backend if you rely on Cloudinary routes.

---

## 5. Scripts reference

**Backend** (`Backend/package.json`)

- `npm run dev` / `npm start` — run `node server.js`

**Frontend** (`Frontend/package.json`)

- `npm start` — `expo start`
- `npm run web` / `android` / `ios` — platform-specific Expo commands

After changing **`Frontend/.env`**, restart Expo so variables reload.
