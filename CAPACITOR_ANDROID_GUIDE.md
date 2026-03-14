# Converting Arcki Traders React App to Android APK using Capacitor

> A complete step-by-step guide written specifically for this project.
> Your backend (FastAPI on Render) and database (MongoDB) are NOT touched at all.
> You only work inside the `frontend/` folder.

---

## Table of Contents

1. [How This Works (Big Picture)](#1-how-this-works-big-picture)
2. [Prerequisites — Install These First](#2-prerequisites--install-these-first)
3. [Step 1 — Fix the Backend URL for Mobile](#3-step-1--fix-the-backend-url-for-mobile)
4. [Step 2 — Fix Vite Config for Mobile Build](#4-step-2--fix-vite-config-for-mobile-build)
5. [Step 3 — Install Capacitor](#5-step-3--install-capacitor)
6. [Step 4 — Initialize Capacitor](#6-step-4--initialize-capacitor)
7. [Step 5 — Build the React App](#7-step-5--build-the-react-app)
8. [Step 6 — Add Android Platform](#8-step-6--add-android-platform)
9. [Step 7 — Fix Backend CORS for Mobile](#9-step-7--fix-backend-cors-for-mobile)
10. [Step 8 — Open in Android Studio](#10-step-8--open-in-android-studio)
11. [Step 9 — Generate the APK](#11-step-9--generate-the-apk)
12. [Step 10 — Install APK on a Phone](#12-step-10--install-apk-on-a-phone)
13. [How to Update the APK Later](#13-how-to-update-the-apk-later)
14. [Troubleshooting Common Issues](#14-troubleshooting-common-issues)

---

## 1. How This Works (Big Picture)

```
Your React app (frontend/)
        ↓
  npm run build
        ↓
  Creates a dist/ folder
  (plain HTML + JS + CSS files)
        ↓
  Capacitor wraps those files
  into an Android project
        ↓
  Android Studio compiles it
  into an APK file
        ↓
  APK installed on phone
  (still calls your Render backend)
```

**Important to understand:**
- The APK is NOT a browser link. It's a real Android app.
- Inside, it uses Android's WebView — a built-in browser engine — to display your React app.
- Your React app still makes API calls to your Render backend URL (`https://your-app.onrender.com`).
- Nothing changes in the backend. Only the frontend gets packaged.

---

## 2. Prerequisites — Install These First

Before starting, make sure you have these installed on your computer.

### 2.1 Node.js
You likely already have this since you run the frontend.
```bash
node --version
# Should show v18 or higher
```
If not installed: https://nodejs.org (download LTS version)

### 2.2 Java Development Kit (JDK) 17
Android Studio needs Java to compile Android apps.

1. Download JDK 17 from: https://adoptium.net/temurin/releases/?version=17
2. Install it (use all defaults)
3. Verify:
```bash
java -version
# Should show: openjdk version "17.x.x"
```

### 2.3 Android Studio
This is the official tool to build Android apps. It's free.

1. Download from: https://developer.android.com/studio
2. Install it (use all defaults, it will also install Android SDK automatically)
3. When it opens for the first time, go through the setup wizard — click Next on everything
4. Let it download the Android SDK (this takes 5–10 minutes)

### 2.4 Set ANDROID_HOME environment variable (Windows)

After Android Studio installs:

1. Open **Start Menu** → search "Environment Variables" → click "Edit the system environment variables"
2. Click **Environment Variables** button
3. Under "User variables", click **New**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
   - (Replace YOUR_USERNAME with your actual Windows username)
4. Click OK
5. Find the `Path` variable in the list → click **Edit** → click **New** → add:
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\platform-tools`
6. Click OK on all windows
7. **Close and reopen your terminal** for changes to take effect

Verify:
```bash
adb --version
# Should show Android Debug Bridge version x.x.x
```

---

## 3. Step 1 — Fix the Backend URL for Mobile

This is the **most important step**. When your app runs on a phone as an APK, it cannot use relative URLs like `/api`. It needs the full URL of your Render backend.

### Create a mobile environment file

Open your terminal, go to the frontend folder:
```bash
cd "F:/MIS project/frontend"
```

Create a new file called `.env.mobile` (this is separate from your existing `.env`):

**Create the file `frontend/.env.mobile` with this content:**
```
VITE_API_URL=https://YOUR-RENDER-APP.onrender.com
```

> Replace `YOUR-RENDER-APP` with your actual Render backend URL.
> Example: if your Render URL is `https://arcki-backend.onrender.com`, write exactly that.
> Do NOT add `/api` at the end — the code already adds it.

**How to find your Render backend URL:**
1. Go to https://render.com and log in
2. Click on your backend service
3. Copy the URL shown at the top (looks like `https://something.onrender.com`)

### Why this is needed

Your `frontend/src/services/api.js` already handles this:
```javascript
baseURL: import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`   // ← used when VITE_API_URL is set (mobile + Vercel)
  : '/api'                                    // ← used in local dev only (proxied to localhost:8000)
```

On a mobile app there is no proxy — so the full URL is mandatory.

---

## 4. Step 2 — Fix Vite Config for Mobile Build

Open `frontend/vite.config.js` and update it:

**Current content:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**Change it to:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',          // ← ADD THIS LINE — required for Capacitor
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**Why `base: './'` is needed:**
Without this, the built HTML file references assets like `/assets/index.js` (absolute path).
On a phone, this would look for a file at the root of the filesystem — which doesn't exist.
With `base: './'`, it uses `./assets/index.js` (relative path) — which works correctly.

---

## 5. Step 3 — Install Capacitor

Make sure you are in the `frontend/` folder:
```bash
cd "F:/MIS project/frontend"
```

Install Capacitor packages:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

**What these do:**
- `@capacitor/core` — The main Capacitor library that bridges your web app to native Android/iOS features
- `@capacitor/cli` — Command-line tools (`npx cap init`, `npx cap add android`, etc.)
- `@capacitor/android` — The Android-specific Capacitor plugin

This will take a minute. You should see them added to `package.json`.

---

## 6. Step 4 — Initialize Capacitor

Still in the `frontend/` folder, run:
```bash
npx cap init
```

It will ask you 3 questions. Answer exactly like this:

```
? What is the name of your app?
  → Arcki Traders

? What is the app Package ID (in reverse domain name notation eg. com.example.app)?
  → com.arckitraders.mis

? Which web framework are you using?
  → (just press Enter, or select "other")
```

**About the Package ID:**
- This is a unique identifier for your Android app — like a domain name in reverse.
- `com.arckitraders.mis` means: company = arckitraders, app = mis
- Once you publish the APK with this ID, don't change it.
- You can use any ID you want, as long as it follows the `com.something.something` pattern.

After running this command, a new file `capacitor.config.json` is created in the `frontend/` folder. Open it — it should look like this:

```json
{
  "appId": "com.arckitraders.mis",
  "appName": "Arcki Traders",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

> **`webDir: "dist"`** — This tells Capacitor where your built React files are. Vite builds to `dist/`, so this is correct.

---

## 7. Step 5 — Build the React App

Now build the React app using your mobile environment file:

```bash
cd "F:/MIS project/frontend"

# On Windows Command Prompt:
set VITE_API_URL=https://YOUR-RENDER-APP.onrender.com && npm run build

# On Windows PowerShell:
$env:VITE_API_URL="https://YOUR-RENDER-APP.onrender.com"; npm run build

# On Git Bash / Linux / Mac:
VITE_API_URL=https://YOUR-RENDER-APP.onrender.com npm run build
```

> Replace `YOUR-RENDER-APP.onrender.com` with your actual Render URL.

After this runs successfully, a `frontend/dist/` folder is created containing:
```
dist/
├── index.html
├── assets/
│   ├── index-abc123.js    ← your entire React app, bundled
│   └── index-xyz456.css   ← all your styles
└── vite.svg
```

These are the files that will be packaged into the APK.

**Verify the build worked:**
```bash
ls dist/
# Should show: assets  index.html  vite.svg
```

---

## 8. Step 6 — Add Android Platform

```bash
npx cap add android
```

This creates an `android/` folder inside `frontend/`. This is a complete Android Studio project.

```
frontend/
├── android/              ← NEW — full Android project
│   ├── app/
│   │   └── src/main/
│   │       ├── assets/www/    ← your dist/ files will go here
│   │       └── AndroidManifest.xml
│   └── build.gradle
├── dist/                 ← your React build
├── src/
└── capacitor.config.json
```

Now copy your built React files into the Android project:
```bash
npx cap sync android
```

**What `cap sync` does:**
1. Copies everything from `dist/` into `android/app/src/main/assets/www/`
2. Updates any Capacitor plugins
3. Keeps the Android project in sync with your web app

> Every time you rebuild your React app, you run `npm run build` followed by `npx cap sync android`.

---

## 9. Step 7 — Fix Backend CORS for Mobile

This step is done in your **backend** on Render — but it's a small config change, not a code change.

### Why this is needed

When your React app runs on a phone via Capacitor, requests come from a special origin:
- `capacitor://localhost` (on Android with `androidScheme: "https"`)
- `http://localhost` (on older Android setups)

Your FastAPI backend currently only allows:
```
http://localhost:5173
http://localhost:3000
https://mis-project-puce.vercel.app
```

Requests from the Android app will be **blocked** by CORS unless you add these origins.

### How to fix it

Go to your Render dashboard:
1. Click on your backend service
2. Go to **Environment** tab
3. Find the `CORS_ORIGINS` environment variable (or add it if it doesn't exist)
4. Set its value to:
```
http://localhost:5173,http://localhost:3000,https://mis-project-puce.vercel.app,capacitor://localhost,http://localhost
```

5. Click **Save Changes** — Render will redeploy automatically (takes 1-2 minutes)

Alternatively, update `backend/.env` locally:
```
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://mis-project-puce.vercel.app,capacitor://localhost,http://localhost
```

---

## 10. Step 8 — Open in Android Studio

```bash
npx cap open android
```

This opens Android Studio with your project automatically.

**First time setup in Android Studio:**

1. Android Studio will say "Gradle sync" at the bottom — wait for it to finish (1–3 minutes, downloads dependencies)
2. If it asks to "Install missing SDK components" — click **OK** and let it download
3. If it shows a yellow bar "JDK not found" — go to `File → Settings → Build → Build Tools → Gradle → Gradle JDK` → select your installed JDK 17

**Android Studio layout:**
```
Left panel: Project files
  app/
    src/
      main/
        assets/www/    ← your React app is here
        java/          ← auto-generated Android code
        res/           ← icons and resources
        AndroidManifest.xml

Bottom panel: Build output / logs
Top toolbar: Build menu, Run button
```

---

## 11. Step 9 — Generate the APK

### Option A — Debug APK (for testing, fastest)

A debug APK is for testing only — you can install it directly on your phone.

In Android Studio:
1. Click **Build** menu at the top
2. Click **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Wait for it to build (1–3 minutes)
5. When done, a notification appears at the bottom right: **"Build successful"**
6. Click **"locate"** in that notification to open the folder with the APK

The APK is at:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B — Release APK (for distribution, production)

A release APK is smaller and faster. Use this when you share with users.

#### Step A — Create a keystore (sign the app)
A keystore is like a digital signature that proves the APK is from you. **Create it only once and save it safely.**

In Android Studio:
1. Click **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → click **Next**
3. Click **Create new...** under Key store path
4. Fill in:
   - Key store path: `C:\Users\YourName\arcki-traders-key.jks`
   - Password: (choose a strong password — write it down, you'll need it forever)
   - Key alias: `arcki-key`
   - Key password: (same or different from above — write it down)
   - First and Last Name: Your name
   - Organization: Arcki Traders
   - Country Code: IN
5. Click **OK**
6. Click **Next**
7. Select **release** build variant
8. Click **Create**

#### Step B — Find the release APK
```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

> **VERY IMPORTANT:** Save your `.jks` keystore file and both passwords somewhere safe.
> If you lose them, you cannot update the app in the future — you'd have to publish with a new Package ID.

---

## 12. Step 10 — Install APK on a Phone

### Enable installation from unknown sources on the phone

Android blocks installation of APKs that don't come from the Play Store by default.

**On Android 8 and above:**
1. Go to **Settings** on the phone
2. Go to **Apps** → find **Files** app (or **My Files**)
3. Tap it → Enable **"Install unknown apps"**
4. (On some phones: Settings → Security → Install unknown apps)

### Method 1 — USB cable

1. Connect phone to computer via USB
2. On the phone, when prompted: select **"File Transfer"** mode (not "Charging only")
3. Open File Explorer on your computer
4. The phone appears as a drive
5. Copy `app-debug.apk` to the phone's Downloads folder
6. On the phone, open the **Files** app
7. Go to Downloads → tap the APK
8. Tap **Install**

### Method 2 — WhatsApp / Google Drive

1. Upload `app-debug.apk` to Google Drive or send via WhatsApp
2. On the phone, download the file
3. Open the file from Downloads
4. Tap **Install**

### Method 3 — ADB (for developers)

If you have USB debugging enabled on the phone:
```bash
adb install "F:/MIS project/frontend/android/app/build/outputs/apk/debug/app-debug.apk"
```

### After installing

The app icon "Arcki Traders" appears on the home screen.
- It opens your full React app
- Login works as normal
- All API calls go to your Render backend
- GPS / location works (Android will ask for permission the first time)

---

## 13. How to Update the APK Later

When you make changes to your React code and want to update the APK:

```bash
cd "F:/MIS project/frontend"

# Step 1 — Build the updated React app
# Windows Command Prompt:
set VITE_API_URL=https://YOUR-RENDER-APP.onrender.com && npm run build

# Step 2 — Sync the new build into the Android project
npx cap sync android

# Step 3 — Open Android Studio (if not already open)
npx cap open android

# Step 4 — In Android Studio: Build → Build APK(s)
# Find the new APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

That's it — just 3 commands and rebuild in Android Studio.

### Quick reference: the 3-command update cycle

```bash
# Every time you update the app:
npm run build          # rebuild React
npx cap sync android   # push to Android project
# Then build APK in Android Studio
```

---

## 14. Troubleshooting Common Issues

### "Network request failed" — API calls not working

**Cause:** The `VITE_API_URL` was not set during build, so the app tries to call `/api` on the device.

**Fix:** Make sure you set the environment variable during build:
```bash
set VITE_API_URL=https://YOUR-RENDER-APP.onrender.com && npm run build
npx cap sync android
```

---

### "CORS error" in the app

**Cause:** Backend CORS does not allow `capacitor://localhost`.

**Fix:** Add `capacitor://localhost` and `http://localhost` to CORS_ORIGINS in your Render environment variables (see Step 7).

---

### "App not installed" error on phone

**Cause 1:** A previous version with the same package ID is installed.
**Fix:** Uninstall the old version first, then install the new APK.

**Cause 2:** The APK file is corrupted during transfer.
**Fix:** Try WhatsApp or Google Drive instead of USB.

---

### Gradle sync fails in Android Studio

**Cause:** JDK not found or wrong version.

**Fix:**
1. `File → Settings → Build, Execution, Deployment → Build Tools → Gradle`
2. Change **Gradle JDK** to your installed JDK 17
3. Click Apply → sync again

---

### "SDK location not found"

**Cause:** `ANDROID_HOME` environment variable not set.

**Fix:** Re-do the ANDROID_HOME setup in Step 2.4. Then close and reopen your terminal.

---

### Location/GPS not working in the app

**Cause:** Android needs explicit permission declared in the manifest.

**Fix:** Open `frontend/android/app/src/main/AndroidManifest.xml` in Android Studio.
Add these two lines inside the `<manifest>` tag (before `<application>`):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Then rebuild the APK.

---

### White screen when app opens

**Cause:** `base: './'` not added to `vite.config.js`, so assets fail to load.

**Fix:** Make sure you added `base: './'` to `vite.config.js` (Step 2), then rebuild:
```bash
npm run build
npx cap sync android
```

---

## Summary — Commands at a Glance

```bash
# One-time setup
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init                    # answer the 3 questions
npx cap add android

# Every build
set VITE_API_URL=https://YOUR-APP.onrender.com && npm run build
npx cap sync android
npx cap open android            # then Build APK in Android Studio
```

---

*Guide written for: Arcki Traders MIS — React (Vite) + FastAPI*
*Capacitor version: 6.x | Android target: API 33 (Android 13)*
