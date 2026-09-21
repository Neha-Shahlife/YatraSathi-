# Yatra Sathi

Find trusted travel partners across Nepal. Plan a trip, publish it, and let
other travellers request to join.

Static frontend (HTML / CSS / vanilla JS) with a data layer built so a Python
backend can be connected by changing **one line**.

---

## Running it

No build step, no dependencies. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

The app runs fully offline on `localStorage` until you point it at a backend.

It ships with demo content so nothing looks empty: 10 destinations, 14 travel
plans across every region, two pending partner requests waiting for the demo
traveller to accept or reject, two requests they have sent, and five
notifications (three unread). Bump `SEED_VERSION` in `assets/js/store.js` if
you change that seed data — anyone holding the old copy in `localStorage`
then picks up the new content automatically, while accounts they registered
themselves are preserved.

### Demo accounts

| Role      | Email                  | Password      |
| --------- | ---------------------- | ------------- |
| Traveller | `anish@example.com`    | `traveler123` |
| Admin     | `admin@yatrasathi.com` | `admin123`    |

Registration always creates a **traveller**. The admin is a superuser created
by the site owner and can only log in — there is deliberately no way to
register as an admin.

### Logging in as admin

Two routes, both ending at `admin/admin.html`:

1. **Separate admin entry** — on the login page, click
   *"Site administrator? Log in here"*, or go straight to
   `auth/login/login.html?role=admin`. The form switches to admin wording and
   hides Google sign-in and the register link, since neither applies to a
   superuser.
2. **The normal login form** — entering admin credentials there works too;
   routing is decided by `user.role`, not by which form you used.

`?role=admin` is presentation only. It hits the same `POST /auth/login`, and
the role still comes from the server, so editing the URL cannot promote
anyone — a traveller who logs in through it lands on the traveller dashboard
as usual. Likewise, a traveller who opens `admin/admin.html` directly is
bounced back by `requireAuth("admin")`.

---

## Connecting the Python backend

Everything is already wired. Edit **one line** in `assets/js/config.js`:

```js
// Offline (localStorage)
API_BASE: "",

// Live Python backend
API_BASE: "http://127.0.0.1:5000/api",
```

That's the whole switch. No page, component, or script changes.

- **`docs/API_CONTRACT.md`** — the exact endpoints, JSON shapes, status codes,
  error messages, and a suggested SQL schema. Give this to whoever writes the
  backend.
- **`backend/app.py`** — a complete, working Flask + SQLite reference
  implementation of that contract. Run it to see the whole app working against
  a real server today:

  ```bash
  cd backend
  pip install flask werkzeug     # flask-cors optional
  python app.py
  ```

While integrating, leave `FALLBACK_TO_LOCAL: true` in the config so a
half-finished endpoint quietly falls back to offline data instead of breaking
the page. Set it to `false` before shipping so real errors surface.

---

## Architecture

Four layers, loaded in this order on every page:

```
config.js  ->  store.js  ->  api.js  ->  app.js  ->  <page>/script.js
```

| File                   | Responsibility                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| `assets/js/config.js`  | **The only file you edit to connect the backend.** API base URL, token key, timeout, roles. |
| `assets/js/store.js`   | Offline adapter. All data in `localStorage`, plus demo seed content.    |
| `assets/js/api.js`     | Single gateway for all data. Talks HTTP to Python, or to `store.js` when offline. |
| `assets/js/app.js`     | UI only — auth guard, sidebar, formatting, trip cards. Never touches storage or `fetch`. |

Two rules keep the swap to one line, and both are enforced across the codebase:

1. **No page reads `localStorage` directly.** Only `store.js` does.
2. **No page calls `fetch` directly.** Only `api.js` does.

Because `store.js` and `api.js` expose identical method names and return
identical shapes, pages cannot tell which one is live.

---

## User flow

```
Home (landing)
  └─ Login / Register  ──┬─ role: traveler ─→ Traveller Dashboard
                         └─ role: admin    ─→ Admin Dashboard
```

**Traveller dashboard** — a sidebar for navigation and a profile dropdown for
account actions. The two never repeat an item:

| Where | Contains | Why |
| ----- | -------- | --- |
| Sidebar nav | Dashboard, Explore Trips, Destinations, My Trips, Partner Requests, Notifications (+ Admin Panel for admins) | places you go |
| Sidebar footer | **+ Create a travel plan** | the one primary action |
| Profile dropdown | My Profile, Account settings, Log out, Delete account | things you do to your account |

Navigation pages appear **only** in the sidebar; account actions appear
**only** in the dropdown. Both are generated by `YS.mountSidebar()` in
`assets/js/app.js`, so there is a single place to change either.

Pages reachable from the above:

| Page             | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| Explore Trips    | Search by destination, travel date and travel style. No results shows **+ Create a travel plan**. |
| Destinations     | 10 destinations as full-photo tiles with a live trip count, region, best season and difficulty. Filter by province or "with trips only"; clicking one returns to Explore filtered to it. |
| My Trips         | Published trips, upcoming journeys, requests you sent, saved wishlist. |
| Create Plan      | Title, destination, date, duration, travel type, travellers, description → **Publish**. |
| Partner Requests | Incoming requests with **Accept / Reject**. Accepting consumes trip spots. |
| Notifications    | Everything generated by the above.                                  |
| My Profile       | Photo upload, age, joined date, About, travel preferences, travel style. |

**Admin dashboard** — platform stats, plus management tables to remove users
and delete any travel plan.

Logging out returns to the **login form**, not the landing page.

---

## Project structure

```
yatra-sathi/
├── index.html              redirects to the landing page
├── landing/                public home page
├── auth/
│   ├── login/              role-based routing happens here
│   └── register/           always creates a traveller
├── dashboard/              traveller dashboard
├── admin/                  admin dashboard (user + plan management)
├── explore/                search trips
├── destinations/           destinations with trip counts
├── create-plan/            publish a travel plan
├── my-trips/               published / upcoming / requests sent / saved
├── trip-detail/            itinerary, logistics, join request
├── requests/               accept & reject partner requests
├── notifications/
├── profile/                photo upload, preferences
├── settings/
├── assets/
│   ├── css/common.css      design system + shared components
│   └── js/                 config, store, api, app  (see Architecture)
├── docs/
│   └── API_CONTRACT.md     what Python must implement
└── backend/
    └── app.py              working Flask reference implementation
```

---

## Notes for the backend developer

A few details that are easy to miss and will cause visible bugs:

- **`role` drives routing.** `"traveler"` or `"admin"`, returned in the user
  object from `/auth/login`. Nothing else decides the destination page.
- **`ownerId` must match the user `id` exactly.** The frontend compares them
  to decide "this is my trip" — which controls whether it shows *Request to
  Join* or *View Partner Requests*.
- **`spots` is remaining spots**, not capacity. Accepting a request decrements
  it; rejecting must not.
- **JSON is camelCase on the wire** (`totalSpots`, `bestSeason`, `tripCount`).
  Keep snake_case inside Python and convert when serialising.
- **Never return `password` or `password_hash`** in any response.
- **A 401 on `/auth/login` means "wrong credentials"**; a 401 anywhere else
  means "token dead" and sends the user to login. The frontend already
  distinguishes these.
- **Embed the `trip` object** in `/requests/incoming` and `/requests/sent`.
  Both pages display the trip title, destination and date from it.
- `GET /trips` and `GET /destinations` must stay **public** — the landing page
  calls them before anyone logs in.
