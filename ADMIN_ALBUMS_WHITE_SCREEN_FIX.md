# Admin Albums White Screen — Root Cause & Fix (Reference Note)

## Problem Description (Tamil)
Admin dashboard-la "Albums" button click panna, page navigate aaguthu (`/admin/albums`) aana
screen full white/blank-a therinjuchu. Total 3 layers of bugs serndhu இந்த issue-a create
pannichu. Indha file future-la puthu screen/feature create pannum pothu idhe mathiri mistakes
thirumba varaama irukka oru checklist-ஆவும் use aagum.

## Root Causes (3 Layers — Fixed One-by-One)

### Layer 1 — Frontend: Stale Closure in Loading Guard
**File:** `frontend/src/screens/admin/AdminAlbumsScreen.jsx`

```js
// BEFORE - 'loading' captured at useCallback creation time (always true on first call)
const [loading, setLoading] = useState(true);
const fetchAlbums = useCallback(async () => {
  if (loading) { return; }   // always bails out on first mount fetch
  setLoading(true);
  ...
}, [pagination.page, pagination.limit]); // 'loading' missing from deps
```

**Fix:** Use a `useRef` flag instead of state for "is a request already in-flight" checks,
since `ref.current` is always read fresh (no stale closure problem):

```js
// AFTER
const isFetchingRef = useRef(false);
const fetchAlbums = useCallback(async () => {
  if (isFetchingRef.current) { return; }
  try {
    isFetchingRef.current = true;
    setLoading(true);
    ...
  } finally {
    isFetchingRef.current = false;
    setLoading(false);
  }
}, [pagination.page, pagination.limit]);
```

**Rule of thumb:** Never use React state (`loading`, `isSaving`, etc.) as a re-entrancy guard
inside a `useCallback`/`useEffect` unless that state is also listed in the dependency array.
Prefer a `useRef` boolean for guarding duplicate/concurrent async calls.

---

### Layer 2 — Backend: Mongoose 9.x Incompatible `pre()` Hooks
**Files:** `backend/src/models/Album.js`, `Homework.js`, `MediaGallery.js`, `Product.js`,
`Tenant.js`, `Video.js`

This project uses **Mongoose 9.x**. Starting Mongoose 7+, callback-style middleware
(`function(next) { ...; next(); }`) is **no longer supported** for `pre()`/`post()` hooks.
Calling `next()` throws `TypeError: next is not a function` because Mongoose no longer passes
that argument, crashing every query that touches the model (500 Internal Server Error).

```js
// BEFORE - old callback style, breaks on Mongoose 7+
AlbumSchema.pre(/^find/, function(next) {
  this.where({ isPublished: true, isActive: true });
  next();
});
```

```js
// AFTER - synchronous or async function, no next param/call
AlbumSchema.pre(/^find/, function() {
  this.where({ isPublished: true, isActive: true });
});
```

**Rule of thumb:** When adding a **new Mongoose model** in this codebase, NEVER write
`pre('save', function(next) {...})` or `pre(/^find/, function(next) {...})`. Follow the
existing modern convention already used in `Admin.js`, `User.js`, `Teacher.js`, `Class.js`:
plain function or `async function()` with **no `next` parameter and no `next()` call**.
Mongoose infers completion from the function returning / the returned promise resolving.

Quick check before committing a new model file (should return zero results):
```powershell
Select-String -Path 'backend\src\models\*.js' -Pattern 'function\(next\)'
```

---

### Layer 3 — Frontend: DUPLICATE `App.jsx` FILES (the real/final root cause)
This was the actual reason the white screen persisted even after Layer 1 & 2 fixes.

**There are two `App.jsx` files in the frontend:**
1. `frontend/src/App.jsx` — a secondary/legacy copy (NOT actually used at runtime)
2. `frontend/App.jsx` (root level) — **THE FILE ACTUALLY LOADED AT RUNTIME**

`frontend/src/main.jsx` does:
```js
import App from '../App';   // resolves to frontend/App.jsx (root), NOT frontend/src/App.jsx
```

Any route added only to `frontend/src/App.jsx` has **zero effect** on the running app.
The real `frontend/App.jsx` uses `React.lazy()` + a custom `<ProtectedRoute>` + `<Switch>`
pattern (react-router-dom v5 style), completely separate from `frontend/src/App.jsx`'s
`IonReactRouter` + `IonSplitPane` + `<AdminMenu/StudentMenu>` pattern.

Because `/admin/albums` had no matching `<Route>` in the real `frontend/App.jsx`, clicking
the "Albums" card navigated the URL but `<Switch>` rendered nothing → blank `<ion-router-outlet>`.

**Fix — added to `frontend/App.jsx` (the real file):**
```js
// Lazy imports (near other admin screen lazy imports)
const AdminAlbumsScreen = React.lazy(() => import('./src/screens/admin/AdminAlbumsScreen.jsx'));
const AdminVideosScreen = React.lazy(() => import('./src/screens/admin/AdminVideosScreen.jsx'));
const AlbumsScreen = React.lazy(() => import('./src/screens/AlbumsScreen.jsx'));

// Inside {isAdmin && (...)} routes block:
<ProtectedRoute exact path="/admin/albums" component={AdminAlbumsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
<ProtectedRoute exact path="/admin/videos" component={AdminVideosScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />

// Shared route, right after the root "/" redirect:
<ProtectedRoute exact path="/albums" component={AlbumsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
```

Also fixed `frontend/src/screens/student/DashboardScreen.jsx` — the student dashboard's
"Albums" quick-action item was missing its `route: '/albums'` property entirely (so clicking
it silently did nothing).

---

## ⚠️ CHECKLIST — Follow This Every Time a New Screen/Route Is Added

To avoid this exact class of bug recurring, whenever creating a **new screen** or **new page**
that needs to be reachable via navigation (menu item, dashboard card, button, etc.), verify
ALL of the following before declaring the feature "done":

1. **Confirm which `App.jsx` is actually live.**
   Check `frontend/src/main.jsx` → `import App from '../App'` → this points to
   **`frontend/App.jsx` (root level)**, NOT `frontend/src/App.jsx`. Always add new routes to
   `frontend/App.jsx`. (`frontend/src/App.jsx` is legacy/unused — do not rely on edits there
   taking effect. If in doubt, re-check `main.jsx`'s import path before editing any App file.)

2. **Add the lazy import** for the new screen near the other same-role screens in
   `frontend/App.jsx` (e.g., near other `Admin*Screen` lazy imports for an admin screen).

3. **Add a `<ProtectedRoute>` entry** inside the correct role-gated block
   (`{isAdmin && (...)}`, `{isStudent && (...)}`, `{isTeacher && (...)}`,
   `{isSuperAdmin && (...)}`, or ungated for shared routes), following this pattern:
   ```js
   <ProtectedRoute exact path="/your/new/path" component={YourNewScreen}
     isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
   ```

4. **Verify the menu/dashboard card that links to the new screen has the correct `route`
   property set** — a menu item with a missing/undefined `route` silently does nothing when
   clicked (check `handleMenuItemPress` / `onClick={() => history.push(item.route)}` patterns).

5. **If the new screen/feature needs a new Mongoose model**, do NOT use
   `function(next) {...; next();}` in any `pre()`/`post()` hook. Use a plain or `async`
   function with no `next` parameter (Mongoose 9.x requirement — see Layer 2 above).

6. **After wiring the route, do an actual click-through test** (not just direct URL
   navigation) — go to the parent screen, click the real button/card that leads to the new
   screen, and confirm content actually renders (not a blank `<ion-router-outlet>`). Direct
   URL navigation can sometimes mask routing bugs that only show up via the real click flow
   (or vice versa) — test both ways.

7. **Rebuild** (`npx vite build` in `frontend/`) to catch import path typos before considering
   the task complete.

## Files touched in this fix
- `frontend/App.jsx` — added Albums/Videos admin routes + shared `/albums` route (REAL fix)
- `frontend/src/screens/student/DashboardScreen.jsx` — added missing `route: '/albums'`
- `frontend/src/screens/admin/AdminAlbumsScreen.jsx` — fixed stale-closure loading guard;
  also fixed back button (see Layer 4 below)
- `backend/src/models/Album.js`, `Homework.js`, `MediaGallery.js`, `Product.js`, `Tenant.js`,
  `Video.js` — fixed Mongoose 9.x incompatible `pre()` hooks

---

### Layer 4 — Back Button Pointed To A Non-Existent Route
**File:** `frontend/src/screens/admin/AdminAlbumsScreen.jsx`

The header back button used `history.push('/admin')`, but the real `frontend/App.jsx`
has **no exact `/admin` route** — only `/admin/dashboard`. Clicking back silently failed to
render anything (same white-screen symptom, different trigger — a `<Route>`/`<Switch>`
mismatch again).

```js
// BEFORE
<IonButton onClick={() => history.push('/admin')}>

// AFTER
<IonButton onClick={() => history.push('/admin/dashboard')}>
```

**Rule of thumb:** Whenever adding a back button / `defaultHref` / `history.push(...)` /
`routerLink` anywhere, double-check the target path exists as an exact `<ProtectedRoute>`/
`<Route>` in the real `frontend/App.jsx` (see Layer 3). `AdminVideosScreen.jsx` has the same
bug (`<IonBackButton defaultHref="/admin" />`) — fix it the same way if/when that screen's
back button is reported broken too.

Verified via a real Puppeteer click-through: clicking the Albums page back button now
correctly navigates to `/admin/dashboard` and renders the full Admin Dashboard UI.
