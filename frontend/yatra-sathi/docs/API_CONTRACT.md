# Yatra Sathi — Backend API Contract

This is the exact contract the frontend expects. Implement these endpoints in
Python and the whole app works with **one line changed** in
`assets/js/config.js`:

```js
API_BASE: "http://127.0.0.1:5000/api",
```

- All request and response bodies are **JSON**.
- All field names are **camelCase** in JSON (the frontend reads them directly).
  Keep `snake_case` internal to Python and convert when serialising.
- Authenticated requests carry `Authorization: Bearer <token>`.
- A `401` anywhere makes the frontend clear the token and redirect to login.
- Errors return a non-2xx status with `{"message": "human readable reason"}`.
  The frontend shows that `message` to the user, so write it for a person.

CORS must allow your frontend origin, the `Authorization` header, and the
methods `GET, POST, PATCH, DELETE, OPTIONS`.

---

## 1. Object shapes

### User

`password` must **never** appear in any response.

```json
{
  "id": "u-7",
  "role": "traveler",
  "name": "Neha Shah",
  "email": "neha@example.com",
  "age": 21,
  "type": "Adventure traveler",
  "bio": "Short bio and travel philosophy.",
  "location": "Kathmandu, Nepal",
  "phone": "+977 9841-234567",
  "avatar": "https://your-host/uploads/u-7.jpg",
  "joined": "2026-09-07",
  "memberSince": "September 2026",
  "interests": ["Mountain Trekking", "Local Street Food"],
  "visitedDestinations": ["Pokhara", "Chitwan"],
  "languages": ["Nepali", "English"],
  "pace": "Relaxed & Observant",
  "budget": "Mid-range (Clean homestays & local cafes)",
  "emergencyContact": "+977 9801-998877 (Close Family)",
  "verifiedId": false,
  "verifiedPhone": false
}
```

| Field    | Notes                                                             |
| -------- | ----------------------------------------------------------------- |
| `role`   | `"traveler"` or `"admin"`. **This decides post-login routing.**    |
| `joined` | `YYYY-MM-DD`. Rendered as "Joined 7 Sept 2026" on My Profile.     |
| `age`    | Integer. Rendered as "21 years old".                              |
| `type`   | Travel style chosen at registration.                              |
| `avatar` | URL or empty string. Empty falls back to initials.                |

### Trip

```json
{
  "id": "t-12",
  "title": "Weekend escape to Pokhara",
  "dest": "Pokhara",
  "date": "2026-10-03",
  "days": 3,
  "type": "Relaxed",
  "spots": 2,
  "totalSpots": 4,
  "desc": "Route, pace, budget and the kind of sathi you hope to travel with.",
  "owner": "Anish M.",
  "ownerId": "u-demo",
  "published": true,
  "image": "",
  "ownerBio": "",
  "ownerRating": "4.9 ★ (8 reviews)",
  "ownerJoined": "Joined Oct 2024",
  "altitude": "822m - 1,600m",
  "difficulty": "Easy & Leisure",
  "bestSeason": "Sept - Dec",
  "estimatedBudget": "NPR 11,000 - 14,000 per person",
  "transport": "Tourist Bus / Shared Van",
  "meetingPoint": "Sorhakhutte Tourist Bus Park, Kathmandu (6:30 AM)",
  "itinerary": [
    {
      "day": 1,
      "title": "Kathmandu to Pokhara Scenic Drive",
      "desc": "What happens on this day, morning to evening.",
      "tags": ["Scenic Drive", "Lakeside Stroll"]
    }
  ],
  "inclusions": ["Transport", "2 nights hotel"],
  "exclusions": ["Lunches and dinners"],
  "packingList": ["Walking shoes", "Light jacket"]
}
```

**Required** on every trip: `id`, `title`, `dest`, `date`, `days`, `type`,
`spots`, `desc`, `owner`, `ownerId`.

Everything from `image` down is **optional**. When omitted, the trip-detail
page generates a sensible day-by-day outline and default fast facts from
`days` and `dest`, so a plan created through the form still renders fully.

- `date` is `YYYY-MM-DD`.
- `ownerId` is what the frontend compares against the logged-in user to decide
  "this is my trip" — it must match the owner's user `id` exactly.
- `spots` is **remaining** spots. Accepting a request reduces it.

### Destination

```json
{
  "id": "d1",
  "name": "Pokhara",
  "imageKey": "pokhara",
  "badge": "Lakes & Leisure",
  "badgeStyle": "",
  "heading": "Lakes & mountain views",
  "desc": "Phewa Lake, Sarangkot sunrise and relaxing cafe trails.",
  "tags": ["Fewa Lake", "Paragliding"],
  "tripCount": 3
}
```

- `tripCount` — **count it server-side** with
  `SELECT COUNT(*) FROM trips WHERE dest = :name`. The Destinations page shows
  it as "(no. of trips)".
- `imageKey` — one of `pokhara`, `kathmandu`, `mustang`, `annapurna`,
  `chitwan`, `everest`. Maps to the photo lookup in `assets/js/app.js`.
- `badgeStyle` — `"gold"` renders a gold badge, `""` renders the default.

### Request (join request)

```json
{
  "id": "r-3",
  "tripId": "t1",
  "userId": "u-7",
  "user": "Neha Shah",
  "phone": "+977 9800000000",
  "spots": 2,
  "message": "Why this journey is a good fit for me.",
  "status": "Pending",
  "created": "2026-09-15T10:04:00Z",
  "trip": { "...": "the Trip object this request is for" }
}
```

- `status` is exactly one of `"Pending"`, `"Accepted"`, `"Rejected"`.
- `trip` — embed the trip object on the two list endpoints. The requests page
  and My Trips both display the trip title, destination and date from it.
  Saves the frontend an N+1 round trip.

### Notification

```json
{
  "id": "n-9",
  "text": "Your request to join \"Pokhara weekend\" was accepted.",
  "href": "../my-trips/myTrip.html",
  "read": false,
  "created": "2026-09-15T10:05:00Z"
}
```

`href` is a link the user can click, or `"#"` for none. Newest first.

---

## 2. Endpoints

### Auth

#### `POST /auth/register`

Public. Always creates a **traveler** — there must be no way to register as
admin. Hash the password (e.g. `werkzeug.security.generate_password_hash`).

Request:

```json
{
  "name": "Neha Shah",
  "email": "neha@example.com",
  "age": 21,
  "password": "secret123",
  "type": "Adventure"
}
```

Response `201`: `{ "token": "...", "user": { User } }`

Errors: `409` if the email is taken → `{"message": "An account with this email already exists."}`

#### `POST /auth/login`

Public.

Request: `{ "email": "...", "password": "..." }`

Response `200`: `{ "token": "...", "user": { User } }`

The `role` in `user` is what sends the browser to
`dashboard/dashboard.html` or `admin/admin.html`.

Errors: `401` → `{"message": "Incorrect email or password."}`

#### `POST /auth/google`

Public. Google sign-in is currently a front-end prototype. When you wire real
OAuth, accept the Google ID token, verify it, create-or-find the user, and
return the same `{ token, user }` shape.

Request: `{ "credential": "<google id token>" }`

#### `POST /auth/logout`

Authenticated. Invalidate the token server-side. Return `{ "ok": true }`.
The frontend clears its token regardless of the outcome, so this must never
block the user.

#### `GET /auth/me`

Authenticated. Returns the current `User`, or `401` if the token is invalid.

Called once per page load — it drives the auth guard on every protected page.
Keep it cheap.

### Profile

#### `PATCH /profile`

Authenticated. Partial update — apply only the keys present in the body.

Request (any subset):

```json
{
  "name": "Neha Shah",
  "location": "Kathmandu, Nepal",
  "phone": "+977 9841-234567",
  "age": 21,
  "pace": "Relaxed & Observant",
  "budget": "Mid-range (Clean homestays & local cafes)",
  "languages": ["Nepali", "English"],
  "bio": "...",
  "emergencyContact": "...",
  "interests": ["Trekking"],
  "avatar": "https://..."
}
```

Response `200`: the **full updated** `User`.

#### `DELETE /profile`

Authenticated. Deletes the signed-in user's own account, plus the trips they
created. Response `{ "ok": true }`.

#### `POST /profile/avatar` — optional but recommended

Authenticated. `multipart/form-data` with a `file` field.

Response: `{ "url": "https://your-host/uploads/u-7.jpg" }`

Until this exists, the frontend stores the photo as a base64 data URL. See the
commented block in `profile/script.js` for the exact swap — it is four lines.

### Users (admin only)

Return `403` if the caller is not an admin.

- `GET /users` → `[ User, ... ]`
- `DELETE /users/<id>` → `{ "ok": true }`. Refuse to delete the last admin.

### Trips

#### `GET /trips`

Query params, all optional, all combinable with AND:

| Param       | Example      | Meaning                          |
| ----------- | ------------ | -------------------------------- |
| `dest`      | `Pokhara`    | exact destination match          |
| `type`      | `Trekking`   | exact travel-style match         |
| `from_date` | `2026-10-01` | trips with `date >= from_date`   |
| `owner_id`  | `u-7`        | only this owner's trips          |
| `published` | `true`       | only published trips             |

Response: `[ Trip, ... ]`. Used by Explore search, the landing page, the
dashboard and My Trips.

This is the endpoint to index: `CREATE INDEX ON trips (dest, type, date)`.

#### `GET /trips/<id>`

Returns one `Trip`, or `404` → `{"message": "Trip not found."}`

#### `POST /trips`

Authenticated. Server sets `id`, `owner`, `ownerId`, `published`,
`totalSpots` — never trust the client for those.

Request:

```json
{
  "title": "Trek to Langtang",
  "dest": "Annapurna",
  "date": "2026-12-01",
  "days": 5,
  "type": "Trekking",
  "spots": 3,
  "desc": "A test plan"
}
```

Response `201`: the created `Trip`, including its new `id` — the frontend
redirects straight to `trip-detail?id=<that id>`.

Should also create a "Your travel plan was published." notification.

- `PATCH /trips/<id>` — owner or admin only. Partial update, returns the trip.
- `DELETE /trips/<id>` — owner or admin only. `{ "ok": true }`.

### Destinations

#### `GET /destinations`

Public. Returns `[ Destination, ... ]` **with `tripCount` filled in**.

### Saved / wishlist

- `GET /saved` → `["t1", "t4"]` — an array of trip **id strings**, nothing else.
- `POST /saved/<tripId>/toggle` → `{ "tripId": "t1", "saved": true }`
  where `saved` is the state **after** toggling.

### Join requests

#### `GET /requests/incoming`

Authenticated. Requests other people sent **for trips I own**. This is what
the Partner Requests page shows Accept / Reject buttons for.

```sql
SELECT r.* FROM requests r
JOIN trips t ON t.id = r.trip_id
WHERE t.owner_id = :me
```

Response: `[ Request, ... ]` with `trip` embedded.

#### `GET /requests/sent`

Authenticated. Requests **I** sent — `WHERE r.user_id = :me`. Shown under
"Requests I Sent" on My Trips. Response: `[ Request, ... ]` with `trip`
embedded.

#### `POST /trips/<tripId>/requests`

Authenticated. Creates a `Pending` request.

Request: `{ "spots": 2, "phone": "+977 98...", "message": "Can I join?" }`

Response `201`: the created `Request`.

Server-side rules:

- `409` if this user already has a request for this trip →
  `{"message": "You already sent a request for this trip."}`
- `400` if `spots` exceeds the trip's remaining `spots`
- `400` if the caller owns the trip (you cannot join your own trip)

#### `PATCH /requests/<id>`

Authenticated, **trip owner only** (`403` otherwise).

Request: `{ "status": "Accepted" }` or `{ "status": "Rejected" }`

On `Accepted` the server must, ideally in one transaction:

1. set the request status,
2. decrement the trip's `spots` by the request's `spots` (never below 0),
3. create a notification for the requester.

On `Rejected`: set the status and notify. **Do not** change `spots`.

Response `200`: the updated `Request`.

### Notifications

- `GET /notifications` → `[ Notification, ... ]`, newest first, for the
  signed-in user.
- `POST /notifications/read-all` → marks all of that user's notifications
  read, returns the updated list.

### Admin

#### `GET /admin/stats`

Admin only. Powers the four stat cards.

```json
{ "users": 24, "trips": 12, "requests": 8, "matches": 3 }
```

`matches` = count of requests with status `Accepted`.

---

## 3. Suggested database schema

```sql
CREATE TABLE users (
    id                   TEXT PRIMARY KEY,
    role                 TEXT NOT NULL DEFAULT 'traveler',
    name                 TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    password_hash        TEXT NOT NULL,
    age                  INTEGER,
    type                 TEXT,
    bio                  TEXT,
    location             TEXT,
    phone                TEXT,
    avatar               TEXT,
    joined               DATE NOT NULL DEFAULT CURRENT_DATE,
    pace                 TEXT,
    budget               TEXT,
    emergency_contact    TEXT,
    verified_id          BOOLEAN DEFAULT FALSE,
    verified_phone       BOOLEAN DEFAULT FALSE,
    interests            TEXT,   -- JSON array
    languages            TEXT,   -- JSON array
    visited_destinations TEXT    -- JSON array
);

CREATE TABLE trips (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    dest         TEXT NOT NULL,
    date         DATE NOT NULL,
    days         INTEGER NOT NULL,
    type         TEXT NOT NULL,
    spots        INTEGER NOT NULL,
    total_spots  INTEGER NOT NULL,
    description  TEXT,
    owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published    BOOLEAN NOT NULL DEFAULT TRUE,
    image        TEXT,
    altitude     TEXT,
    difficulty   TEXT,
    best_season  TEXT,
    est_budget   TEXT,
    transport    TEXT,
    meeting_point TEXT,
    itinerary    TEXT,   -- JSON array
    inclusions   TEXT,   -- JSON array
    exclusions   TEXT,   -- JSON array
    packing_list TEXT,   -- JSON array
    created      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_trips_search ON trips (dest, type, date);
CREATE INDEX idx_trips_owner  ON trips (owner_id);

CREATE TABLE requests (
    id       TEXT PRIMARY KEY,
    trip_id  TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone    TEXT,
    spots    INTEGER NOT NULL DEFAULT 1,
    message  TEXT,
    status   TEXT NOT NULL DEFAULT 'Pending',
    created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved TIMESTAMP,
    UNIQUE (trip_id, user_id)          -- enforces "one request per trip"
);

CREATE TABLE notifications (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text    TEXT NOT NULL,
    href    TEXT DEFAULT '#',
    read    BOOLEAN NOT NULL DEFAULT FALSE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_trips (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, trip_id)
);

CREATE TABLE destinations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    image_key   TEXT,
    badge       TEXT,
    badge_style TEXT,
    heading     TEXT,
    description TEXT,
    tags        TEXT    -- JSON array
);
```

The `UNIQUE (trip_id, user_id)` constraint is what makes the duplicate-request
rule reliable even under concurrent submissions.

---

## 4. Which endpoints are public

These are hit before login and must not require a token:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `GET /destinations` — the landing page lists Popular Destinations
- `GET /trips` — the landing page lists Featured Journeys

Everything else requires a valid token.

---

## 5. Integration order

Work through it in this sequence; each step is independently testable in the
browser.

1. `GET /auth/me`, `POST /auth/login`, `POST /auth/register` — login and the
   role-based redirect start working.
2. `GET /trips`, `GET /trips/<id>` — landing, explore, dashboard, trip detail
   all populate.
3. `GET /destinations` — destination cards and their trip counts.
4. `POST /trips` — the create-plan form.
5. Requests endpoints — join, then accept/reject.
6. `GET /notifications`, `POST /notifications/read-all`.
7. `GET /saved`, `POST /saved/<id>/toggle`.
8. `PATCH /profile`, `DELETE /profile`.
9. Admin endpoints.

While integrating, leave `FALLBACK_TO_LOCAL: true` in `config.js` so an
unfinished endpoint quietly uses offline data instead of breaking the page.
Set it to `false` before you ship, so real errors surface.
