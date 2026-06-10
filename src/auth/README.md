# Google Sign-In — Website and APK are SEPARATE

The two login flows live in separate files and are loaded with dynamic
imports, so **the website never executes APK login code and the APK never
executes website login code**. Fixing one cannot break the other — as long
as you only touch that platform's files and settings, listed below.

```
src/auth/googleSignIn.ts          ← dispatcher (the ONLY file pages import)
├── src/auth/googleSignIn.web.ts     ← WEBSITE only (Firebase popup)
└── src/auth/googleSignIn.native.ts  ← APK only (native account chooser)
```

---

## 🌐 Website login broken? Touch ONLY these

| What | Where |
|---|---|
| Code | `src/auth/googleSignIn.web.ts` |
| Authorized domains | Firebase Console → Authentication → Settings → Authorized domains |
| Web OAuth client (authorized JS origins / redirect URIs) | Google Cloud Console → Credentials → Web client (`...8ahn`) |
| Firebase web config | `src/firebase.ts` (`authDomain` etc. — shared with APK, see below) |

Deploy: rebuild/redeploy the website. **No `cap sync`, no APK rebuild needed.**

Typical symptoms:
- `auth/unauthorized-domain` → add the domain in Authorized domains.
- Popup opens then closes without signing in → check the web client's
  authorized JavaScript origins in Google Cloud Console.

## 📱 APK login broken? Touch ONLY these

| What | Where |
|---|---|
| Code | `src/auth/googleSignIn.native.ts` |
| Plugin config | `capacitor.config.ts` → `plugins.GoogleAuth.serverClientId` |
| Native string | `android/app/src/main/res/values/strings.xml` → `server_client_id` |
| Google services | `android/app/google-services.json` |
| SHA-1 fingerprints | Firebase Console → Project settings → Android app (`com.playhub.app`) |

Deploy: `npm run build && npx cap sync android`, then rebuild the APK.
**The website is unaffected.**

Typical symptoms:
- **APK crashes instantly on tapping Google login** → `GoogleAuth.initialize()`
  didn't run. The plugin (3.4.0-rc) never self-initializes on Android;
  `signIn()`/`signOut()` hit a null `GoogleSignInClient` (NullPointerException).
  `googleSignIn.native.ts` calls it via `ensureInitialized()` — never remove
  that call. (This is what historically broke the APK when "fixing the
  website": the initialize call lived in shared startup code and got removed.)
- Error code **10 (DEVELOPER_ERROR)** → the SHA-1 of the keystore that signed
  the APK isn't registered. Add it in Firebase Console, download the new
  `google-services.json` into `android/app/`, rebuild. (Debug and release
  builds use different keystores — register BOTH SHA-1s.)
- Error code **12500** → the client ID is wrong, see the golden rule.

How the APK actually resolves its client ID (plugin 3.4.0-rc, Android):
`initialize()` reads capacitor.config `androidClientId` → `clientId` → falls
back to **strings.xml `server_client_id`**. It does NOT read the
`serverClientId` key. Since our capacitor.config sets neither `androidClientId`
nor `clientId`, **strings.xml is the authoritative source** — keep it correct
first; the `serverClientId` entry in capacitor.config.ts is kept in sync as
documentation.

### ⚠️ THE GOLDEN RULE (cause of most past breakage)

`serverClientId` (capacitor.config.ts) and `server_client_id` (strings.xml)
must **ALWAYS** be the **WEB** OAuth client ID:

```
21785967034-v32c2s1gdnvnm9j8clnc2utg8gbd8ahn.apps.googleusercontent.com   ✅ web client — USE THIS
21785967034-9c5ohngup70sbp0at8o43cmlksjgr65h.apps.googleusercontent.com   ❌ Android client — NEVER here
```

Yes, the APK uses the *web* client ID there — that's how Google issues an
`idToken` Firebase can verify. Despite the name, this value is an
**APK-only setting**: the website reads its client ID from Firebase
(`authDomain`), never from these files.

## 🤝 Shared by both (change with care)

- `src/firebase.ts` — Firebase project keys (one project serves both).
- Firebase Console → Authentication → Sign-in method → **Google enabled**.
- `src/auth/googleSignIn.ts` + `types.ts` — dispatcher and the Firestore
  user-doc creation. Platform-neutral; keep popup/plugin code out of it.

## Rules for future changes

1. Pages import **only** `src/auth/googleSignIn.ts` — never the `.web` /
   `.native` files, never `@codetrix-studio/capacitor-google-auth` directly.
2. No `Capacitor.isNativePlatform()` branching inside login UI components —
   that's the dispatcher's job.
3. Sign-out goes through `signOutUser()` (it also clears the APK's native
   Google session so the account chooser shows again).
