"""
Yatra Sathi — reference Python backend (Flask + SQLite)
=======================================================

A complete, working implementation of docs/API_CONTRACT.md. Use it as-is to
get the frontend running against a real server today, or as a reference while
you build your own (Django, FastAPI, whatever you prefer).

Run it:

    cd backend
    pip install flask flask-cors werkzeug
    python app.py

Then set this in ../assets/js/config.js:

    API_BASE: "http://127.0.0.1:5000/api",

Reload the site and everything now reads and writes through this server.

Seeded accounts:
    traveller : anish@example.com   / traveler123
    admin     : admin@yatrasathi.com / admin123

NOT PRODUCTION READY. Before deploying you must at minimum:
  - replace the in-memory token dict with signed JWTs (see TOKENS below)
  - move SECRET_KEY and the DB path into environment variables
  - restrict CORS to your real frontend origin
  - serve over HTTPS behind a proper WSGI server (gunicorn/uwsgi)
"""

import json
import os
import secrets
import sqlite3
import uuid
from datetime import date, datetime
from functools import wraps

from flask import Flask, g, jsonify, make_response, request
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "yatra_sathi.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# ---------------------------------------------------------------------------
# CORS
# The browser sends the frontend's Origin on every /api request, so CORS has
# to be allowed or every call fails before it reaches a route.
#
# Uses flask-cors when installed, otherwise falls back to setting the headers
# directly — no extra dependency needed either way.
#
# ALLOWED_ORIGIN is "*" for local development. In production set the
# CORS_ORIGIN environment variable to your real frontend origin.
# ---------------------------------------------------------------------------
ALLOWED_ORIGIN = os.environ.get("CORS_ORIGIN", "*")

try:
    from flask_cors import CORS

    CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGIN}})
except ImportError:

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PATCH, DELETE, OPTIONS"
        )
        return response

    @app.route("/api/<path:_any>", methods=["OPTIONS"])
    def cors_preflight(_any):
        """Answer the browser's preflight check for PATCH/DELETE requests."""
        return make_response("", 204)

# Token -> user_id. In-memory, so tokens die on restart.
# Swap for JWT (PyJWT) when you need statelessness across workers.
TOKENS: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def jload(raw, default):
    """Columns holding JSON arrays come back as text."""
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
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
    verified_id          INTEGER DEFAULT 0,
    verified_phone       INTEGER DEFAULT 0,
    interests            TEXT,
    languages            TEXT,
    visited_destinations TEXT
);

CREATE TABLE IF NOT EXISTS trips (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    dest          TEXT NOT NULL,
    date          DATE NOT NULL,
    days          INTEGER NOT NULL,
    type          TEXT NOT NULL,
    spots         INTEGER NOT NULL,
    total_spots   INTEGER NOT NULL,
    description   TEXT,
    owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published     INTEGER NOT NULL DEFAULT 1,
    image         TEXT,
    altitude      TEXT,
    difficulty    TEXT,
    best_season   TEXT,
    est_budget    TEXT,
    transport     TEXT,
    meeting_point TEXT,
    itinerary     TEXT,
    inclusions    TEXT,
    exclusions    TEXT,
    packing_list  TEXT,
    created       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trips_search ON trips (dest, type, date);
CREATE INDEX IF NOT EXISTS idx_trips_owner  ON trips (owner_id);

CREATE TABLE IF NOT EXISTS requests (
    id       TEXT PRIMARY KEY,
    trip_id  TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone    TEXT,
    spots    INTEGER NOT NULL DEFAULT 1,
    message  TEXT,
    status   TEXT NOT NULL DEFAULT 'Pending',
    created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved TIMESTAMP,
    UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text    TEXT NOT NULL,
    href    TEXT DEFAULT '#',
    read    INTEGER NOT NULL DEFAULT 0,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_trips (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, trip_id)
);

CREATE TABLE IF NOT EXISTS destinations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    image_key   TEXT,
    region      TEXT,
    badge       TEXT,
    badge_style TEXT,
    heading     TEXT,
    description TEXT,
    best_season TEXT,
    difficulty  TEXT,
    tags        TEXT
);
"""


# ---------------------------------------------------------------------------
# Serialisers — snake_case in the DB, camelCase on the wire
# ---------------------------------------------------------------------------

def user_json(row: sqlite3.Row) -> dict:
    """Never include password_hash."""
    joined = str(row["joined"] or "")
    member_since = ""
    if joined:
        try:
            member_since = datetime.strptime(joined[:10], "%Y-%m-%d").strftime("%B %Y")
        except ValueError:
            member_since = joined

    return {
        "id": row["id"],
        "role": row["role"],
        "name": row["name"],
        "email": row["email"],
        "age": row["age"],
        "type": row["type"] or "",
        "bio": row["bio"] or "",
        "location": row["location"] or "",
        "phone": row["phone"] or "",
        "avatar": row["avatar"] or "",
        "joined": joined,
        "memberSince": member_since,
        "pace": row["pace"] or "",
        "budget": row["budget"] or "",
        "emergencyContact": row["emergency_contact"] or "",
        "verifiedId": bool(row["verified_id"]),
        "verifiedPhone": bool(row["verified_phone"]),
        "interests": jload(row["interests"], []),
        "languages": jload(row["languages"], []),
        "visitedDestinations": jload(row["visited_destinations"], []),
    }


def trip_json(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "dest": row["dest"],
        "date": str(row["date"])[:10],
        "days": row["days"],
        "type": row["type"],
        "spots": row["spots"],
        "totalSpots": row["total_spots"],
        "desc": row["description"] or "",
        "owner": row["owner_name"] if "owner_name" in row.keys() else "",
        "ownerId": row["owner_id"],
        "published": bool(row["published"]),
        "image": row["image"] or "",
        "ownerBio": row["owner_bio"] if "owner_bio" in row.keys() else "",
        "altitude": row["altitude"] or "",
        "difficulty": row["difficulty"] or "",
        "bestSeason": row["best_season"] or "",
        "estimatedBudget": row["est_budget"] or "",
        "transport": row["transport"] or "",
        "meetingPoint": row["meeting_point"] or "",
        "itinerary": jload(row["itinerary"], []),
        "inclusions": jload(row["inclusions"], []),
        "exclusions": jload(row["exclusions"], []),
        "packingList": jload(row["packing_list"], []),
    }


def request_json(row: sqlite3.Row, trip: dict | None = None) -> dict:
    return {
        "id": row["id"],
        "tripId": row["trip_id"],
        "userId": row["user_id"],
        "user": row["user_name"] if "user_name" in row.keys() else "",
        "phone": row["phone"] or "",
        "spots": row["spots"],
        "message": row["message"] or "",
        "status": row["status"],
        "created": str(row["created"]),
        "trip": trip,
    }


def notification_json(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "text": row["text"],
        "href": row["href"] or "#",
        "read": bool(row["read"]),
        "created": str(row["created"]),
    }


# Query that joins the owner's name onto every trip, so trip_json can fill
# the "owner" field the frontend displays.
TRIP_SELECT = """
SELECT t.*, u.name AS owner_name, u.bio AS owner_bio
FROM trips t JOIN users u ON u.id = t.owner_id
"""


# ---------------------------------------------------------------------------
# Auth plumbing
# ---------------------------------------------------------------------------

def current_user() -> sqlite3.Row | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    user_id = TOKENS.get(header[7:])
    if not user_id:
        return None
    return get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({"message": "Your session expired. Please log in again."}), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({"message": "Your session expired. Please log in again."}), 401
        if user["role"] != "admin":
            return jsonify({"message": "Administrator access only."}), 403
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def notify(user_id: str, text: str, href: str = "#") -> None:
    db = get_db()
    db.execute(
        "INSERT INTO notifications (id, user_id, text, href) VALUES (?, ?, ?, ?)",
        (new_id("n"), user_id, text, href),
    )
    db.commit()


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required."}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify({"message": "An account with this email already exists."}), 409

    user_id = new_id("u")
    db.execute(
        """INSERT INTO users (id, role, name, email, password_hash, age, type, bio,
                              joined, pace, budget, interests, languages, visited_destinations)
           VALUES (?, 'traveler', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]')""",
        (
            user_id,
            name,
            email,
            generate_password_hash(password),
            data.get("age"),
            data.get("type") or "Slow travel",
            "New to Yatra Sathi.",
            date.today().isoformat(),
            "Relaxed & Observant",
            "Mid-range (Clean homestays & local cafes)",
        ),
    )
    db.commit()
    notify(user_id, "Welcome to Yatra Sathi.")

    token = secrets.token_urlsafe(32)
    TOKENS[token] = user_id
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"token": token, "user": user_json(row)}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"message": "Incorrect email or password."}), 401

    token = secrets.token_urlsafe(32)
    TOKENS[token] = row["id"]
    # The frontend reads user.role here to pick the traveller or admin dashboard.
    return jsonify({"token": token, "user": user_json(row)})


@app.post("/api/auth/google")
def google_auth():
    """
    Placeholder. To finish this:
      1. pip install google-auth
      2. verify data["credential"] with
         google.oauth2.id_token.verify_oauth2_token(...)
      3. look up or create the user by the verified email
      4. return {"token": ..., "user": ...} exactly like /auth/login
    """
    return jsonify({"message": "Google sign-in is not configured yet."}), 501


@app.post("/api/auth/logout")
@login_required
def logout():
    header = request.headers.get("Authorization", "")
    TOKENS.pop(header[7:], None)
    return jsonify({"ok": True})


@app.get("/api/auth/me")
@login_required
def me():
    return jsonify(user_json(g.user))


# ---------------------------------------------------------------------------
# PROFILE
# ---------------------------------------------------------------------------

# JSON field -> (column, is_json_array)
PROFILE_FIELDS = {
    "name": ("name", False),
    "age": ("age", False),
    "type": ("type", False),
    "bio": ("bio", False),
    "location": ("location", False),
    "phone": ("phone", False),
    "avatar": ("avatar", False),
    "pace": ("pace", False),
    "budget": ("budget", False),
    "emergencyContact": ("emergency_contact", False),
    "interests": ("interests", True),
    "languages": ("languages", True),
    "visitedDestinations": ("visited_destinations", True),
}


@app.patch("/api/profile")
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}

    sets, values = [], []
    for key, (column, is_json) in PROFILE_FIELDS.items():
        if key in data:
            sets.append(f"{column} = ?")
            values.append(json.dumps(data[key]) if is_json else data[key])

    if sets:
        values.append(g.user["id"])
        db = get_db()
        db.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", values)
        db.commit()

    row = get_db().execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    return jsonify(user_json(row))


@app.delete("/api/profile")
@login_required
def delete_profile():
    db = get_db()
    # ON DELETE CASCADE removes the user's trips, requests and notifications.
    db.execute("DELETE FROM users WHERE id = ?", (g.user["id"],))
    db.commit()

    for token, uid in list(TOKENS.items()):
        if uid == g.user["id"]:
            TOKENS.pop(token, None)
    return jsonify({"ok": True})


@app.post("/api/profile/avatar")
@login_required
def upload_avatar():
    """
    Saves the uploaded image to backend/uploads/ and returns its URL.
    For production, push to S3/Cloudinary and validate the file properly.
    """
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"message": "No file was uploaded."}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return jsonify({"message": "Please upload a JPG, PNG, WEBP or GIF image."}), 400

    uploads = os.path.join(BASE_DIR, "uploads")
    os.makedirs(uploads, exist_ok=True)
    filename = f"{g.user['id']}{ext}"
    file.save(os.path.join(uploads, filename))

    url = request.host_url.rstrip("/") + f"/api/uploads/{filename}"
    db = get_db()
    db.execute("UPDATE users SET avatar = ? WHERE id = ?", (url, g.user["id"]))
    db.commit()
    return jsonify({"url": url})


@app.get("/api/uploads/<path:filename>")
def serve_upload(filename):
    from flask import send_from_directory

    return send_from_directory(os.path.join(BASE_DIR, "uploads"), filename)


# ---------------------------------------------------------------------------
# USERS (admin)
# ---------------------------------------------------------------------------

@app.get("/api/users")
@admin_required
def list_users():
    rows = get_db().execute("SELECT * FROM users ORDER BY joined DESC").fetchall()
    return jsonify([user_json(r) for r in rows])


@app.delete("/api/users/<user_id>")
@admin_required
def delete_user(user_id):
    db = get_db()
    target = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if target is None:
        return jsonify({"message": "User not found."}), 404

    if target["role"] == "admin":
        admins = db.execute("SELECT COUNT(*) c FROM users WHERE role = 'admin'").fetchone()["c"]
        if admins <= 1:
            return jsonify({"message": "Cannot remove the only administrator."}), 400

    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# TRIPS
# ---------------------------------------------------------------------------

@app.get("/api/trips")
def list_trips():
    """Public. Filters match the query params in the contract."""
    clauses, params = [], []

    if dest := request.args.get("dest"):
        clauses.append("t.dest = ?")
        params.append(dest)
    if trip_type := request.args.get("type"):
        clauses.append("t.type = ?")
        params.append(trip_type)
    if from_date := request.args.get("from_date"):
        clauses.append("t.date >= ?")
        params.append(from_date)
    if owner_id := request.args.get("owner_id"):
        clauses.append("t.owner_id = ?")
        params.append(owner_id)
    if published := request.args.get("published"):
        clauses.append("t.published = ?")
        params.append(1 if published.lower() == "true" else 0)

    sql = TRIP_SELECT
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY t.date ASC"

    rows = get_db().execute(sql, params).fetchall()
    return jsonify([trip_json(r) for r in rows])


@app.get("/api/trips/<trip_id>")
def get_trip(trip_id):
    row = get_db().execute(TRIP_SELECT + " WHERE t.id = ?", (trip_id,)).fetchone()
    if row is None:
        return jsonify({"message": "Trip not found."}), 404
    return jsonify(trip_json(row))


@app.post("/api/trips")
@login_required
def create_trip():
    data = request.get_json(silent=True) or {}

    # Check for absent/blank, NOT falsy — otherwise days=0 or spots=0 would
    # be reported as "missing" instead of failing the range check below.
    required = ("title", "dest", "date", "days", "type", "spots")
    missing = [f for f in required if data.get(f) in (None, "")]
    if missing:
        return jsonify({"message": f"Missing required field: {missing[0]}."}), 400

    try:
        days = int(data["days"])
        spots = int(data["spots"])
    except (TypeError, ValueError):
        return jsonify({"message": "Duration and spots must be numbers."}), 400

    if days < 1:
        return jsonify({"message": "Duration must be at least 1 day."}), 400
    if spots < 1:
        return jsonify({"message": "You need at least 1 open spot."}), 400

    trip_id = new_id("t")
    db = get_db()
    db.execute(
        """INSERT INTO trips (id, title, dest, date, days, type, spots, total_spots,
                              description, owner_id, published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
        (
            trip_id,
            data["title"].strip(),
            data["dest"],
            data["date"],
            days,
            data["type"],
            spots,
            spots,
            (data.get("desc") or "").strip(),
            g.user["id"],
        ),
    )
    db.commit()

    notify(
        g.user["id"],
        "Your travel plan was published.",
        f"../trip-detail/tripDetail.html?id={trip_id}",
    )

    row = db.execute(TRIP_SELECT + " WHERE t.id = ?", (trip_id,)).fetchone()
    return jsonify(trip_json(row)), 201


TRIP_FIELDS = {
    "title": ("title", False),
    "dest": ("dest", False),
    "date": ("date", False),
    "days": ("days", False),
    "type": ("type", False),
    "spots": ("spots", False),
    "desc": ("description", False),
    "image": ("image", False),
    "altitude": ("altitude", False),
    "difficulty": ("difficulty", False),
    "bestSeason": ("best_season", False),
    "estimatedBudget": ("est_budget", False),
    "transport": ("transport", False),
    "meetingPoint": ("meeting_point", False),
    "published": ("published", False),
    "itinerary": ("itinerary", True),
    "inclusions": ("inclusions", True),
    "exclusions": ("exclusions", True),
    "packingList": ("packing_list", True),
}


@app.patch("/api/trips/<trip_id>")
@login_required
def update_trip(trip_id):
    db = get_db()
    trip = db.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if trip is None:
        return jsonify({"message": "Trip not found."}), 404
    if trip["owner_id"] != g.user["id"] and g.user["role"] != "admin":
        return jsonify({"message": "You can only edit your own travel plans."}), 403

    data = request.get_json(silent=True) or {}
    sets, values = [], []
    for key, (column, is_json) in TRIP_FIELDS.items():
        if key in data:
            sets.append(f"{column} = ?")
            values.append(json.dumps(data[key]) if is_json else data[key])

    if sets:
        values.append(trip_id)
        db.execute(f"UPDATE trips SET {', '.join(sets)} WHERE id = ?", values)
        db.commit()

    row = db.execute(TRIP_SELECT + " WHERE t.id = ?", (trip_id,)).fetchone()
    return jsonify(trip_json(row))


@app.delete("/api/trips/<trip_id>")
@login_required
def delete_trip(trip_id):
    db = get_db()
    trip = db.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if trip is None:
        return jsonify({"message": "Trip not found."}), 404
    if trip["owner_id"] != g.user["id"] and g.user["role"] != "admin":
        return jsonify({"message": "You can only delete your own travel plans."}), 403

    db.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# DESTINATIONS
# ---------------------------------------------------------------------------

@app.get("/api/destinations")
def list_destinations():
    """Public. tripCount is counted here so the UI never has to."""
    rows = get_db().execute(
        """SELECT d.*, (SELECT COUNT(*) FROM trips t WHERE t.dest = d.name) AS trip_count
           FROM destinations d ORDER BY d.name"""
    ).fetchall()

    return jsonify([
        {
            "id": r["id"],
            "name": r["name"],
            "imageKey": r["image_key"] or "",
            "region": r["region"] or "",
            "badge": r["badge"] or "",
            "badgeStyle": r["badge_style"] or "",
            "heading": r["heading"] or "",
            "desc": r["description"] or "",
            "bestSeason": r["best_season"] or "",
            "difficulty": r["difficulty"] or "",
            "tags": jload(r["tags"], []),
            "tripCount": r["trip_count"],
        }
        for r in rows
    ])


# ---------------------------------------------------------------------------
# SAVED / WISHLIST
# ---------------------------------------------------------------------------

@app.get("/api/saved")
@login_required
def list_saved():
    rows = get_db().execute(
        "SELECT trip_id FROM saved_trips WHERE user_id = ?", (g.user["id"],)
    ).fetchall()
    return jsonify([r["trip_id"] for r in rows])


@app.post("/api/saved/<trip_id>/toggle")
@login_required
def toggle_saved(trip_id):
    db = get_db()
    exists = db.execute(
        "SELECT 1 FROM saved_trips WHERE user_id = ? AND trip_id = ?",
        (g.user["id"], trip_id),
    ).fetchone()

    if exists:
        db.execute(
            "DELETE FROM saved_trips WHERE user_id = ? AND trip_id = ?",
            (g.user["id"], trip_id),
        )
        saved = False
    else:
        db.execute(
            "INSERT INTO saved_trips (user_id, trip_id) VALUES (?, ?)",
            (g.user["id"], trip_id),
        )
        saved = True

    db.commit()
    return jsonify({"tripId": trip_id, "saved": saved})


# ---------------------------------------------------------------------------
# JOIN REQUESTS
# ---------------------------------------------------------------------------

REQUEST_SELECT = """
SELECT r.*, u.name AS user_name
FROM requests r JOIN users u ON u.id = r.user_id
"""


def attach_trip(row: sqlite3.Row) -> dict:
    trip_row = get_db().execute(TRIP_SELECT + " WHERE t.id = ?", (row["trip_id"],)).fetchone()
    return request_json(row, trip_json(trip_row) if trip_row else None)


@app.get("/api/requests/incoming")
@login_required
def incoming_requests():
    """Requests for trips I own — these get Accept / Reject."""
    rows = get_db().execute(
        REQUEST_SELECT
        + """ JOIN trips t ON t.id = r.trip_id
              WHERE t.owner_id = ?
              ORDER BY r.created DESC""",
        (g.user["id"],),
    ).fetchall()
    return jsonify([attach_trip(r) for r in rows])


@app.get("/api/requests/sent")
@login_required
def sent_requests():
    """Requests I sent to other people's trips."""
    rows = get_db().execute(
        REQUEST_SELECT + " WHERE r.user_id = ? ORDER BY r.created DESC",
        (g.user["id"],),
    ).fetchall()
    return jsonify([attach_trip(r) for r in rows])


@app.post("/api/trips/<trip_id>/requests")
@login_required
def create_request(trip_id):
    db = get_db()
    trip = db.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
    if trip is None:
        return jsonify({"message": "Trip not found."}), 404

    if trip["owner_id"] == g.user["id"]:
        return jsonify({"message": "This is your own trip."}), 400

    existing = db.execute(
        "SELECT 1 FROM requests WHERE trip_id = ? AND user_id = ?",
        (trip_id, g.user["id"]),
    ).fetchone()
    if existing:
        return jsonify({"message": "You already sent a request for this trip."}), 409

    data = request.get_json(silent=True) or {}
    try:
        spots = int(data.get("spots") or 1)
    except (TypeError, ValueError):
        return jsonify({"message": "Spots must be a number."}), 400

    if spots < 1:
        return jsonify({"message": "Request at least 1 spot."}), 400
    if spots > trip["spots"]:
        return jsonify({"message": f"Only {trip['spots']} spot(s) remain on this trip."}), 400

    request_id = new_id("r")
    db.execute(
        """INSERT INTO requests (id, trip_id, user_id, phone, spots, message, status)
           VALUES (?, ?, ?, ?, ?, ?, 'Pending')""",
        (
            request_id,
            trip_id,
            g.user["id"],
            (data.get("phone") or "").strip(),
            spots,
            (data.get("message") or "").strip(),
        ),
    )
    db.commit()

    notify(
        trip["owner_id"],
        f'{g.user["name"]} asked to join "{trip["title"]}".',
        "../requests/request.html",
    )

    row = db.execute(REQUEST_SELECT + " WHERE r.id = ?", (request_id,)).fetchone()
    return jsonify(attach_trip(row)), 201


@app.patch("/api/requests/<request_id>")
@login_required
def update_request(request_id):
    """Accept or reject. Trip owner only."""
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in ("Accepted", "Rejected"):
        return jsonify({"message": "Status must be Accepted or Rejected."}), 400

    db = get_db()
    row = db.execute("SELECT * FROM requests WHERE id = ?", (request_id,)).fetchone()
    if row is None:
        return jsonify({"message": "Request not found."}), 404

    trip = db.execute("SELECT * FROM trips WHERE id = ?", (row["trip_id"],)).fetchone()
    if trip is None:
        return jsonify({"message": "Trip no longer exists."}), 404
    if trip["owner_id"] != g.user["id"]:
        return jsonify({"message": "Only the trip organiser can decide this."}), 403
    if row["status"] != "Pending":
        return jsonify({"message": f"This request was already {row['status'].lower()}."}), 409

    # Status change and spot adjustment together, so they cannot diverge.
    try:
        db.execute("BEGIN")
        db.execute(
            "UPDATE requests SET status = ?, resolved = CURRENT_TIMESTAMP WHERE id = ?",
            (status, request_id),
        )
        if status == "Accepted":
            remaining = max(0, trip["spots"] - row["spots"])
            db.execute("UPDATE trips SET spots = ? WHERE id = ?", (remaining, trip["id"]))
        db.commit()
    except sqlite3.Error:
        db.rollback()
        return jsonify({"message": "Could not update the request. Please retry."}), 500

    notify(
        row["user_id"],
        f'Your request to join "{trip["title"]}" was {status.lower()}.',
        "../my-trips/myTrip.html",
    )

    updated = db.execute(REQUEST_SELECT + " WHERE r.id = ?", (request_id,)).fetchone()
    return jsonify(attach_trip(updated))


# ---------------------------------------------------------------------------
# NOTIFICATIONS
# ---------------------------------------------------------------------------

@app.get("/api/notifications")
@login_required
def list_notifications():
    rows = get_db().execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created DESC",
        (g.user["id"],),
    ).fetchall()
    return jsonify([notification_json(r) for r in rows])


@app.post("/api/notifications/read-all")
@login_required
def read_all_notifications():
    db = get_db()
    db.execute("UPDATE notifications SET read = 1 WHERE user_id = ?", (g.user["id"],))
    db.commit()

    rows = db.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created DESC",
        (g.user["id"],),
    ).fetchall()
    return jsonify([notification_json(r) for r in rows])


# ---------------------------------------------------------------------------
# ADMIN
# ---------------------------------------------------------------------------

@app.get("/api/admin/stats")
@admin_required
def admin_stats():
    db = get_db()
    one = lambda sql: db.execute(sql).fetchone()["c"]
    return jsonify({
        "users": one("SELECT COUNT(*) c FROM users"),
        "trips": one("SELECT COUNT(*) c FROM trips"),
        "requests": one("SELECT COUNT(*) c FROM requests"),
        "matches": one("SELECT COUNT(*) c FROM requests WHERE status = 'Accepted'"),
    })


# ---------------------------------------------------------------------------
# Error handling — always JSON, so the frontend can show err.message
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def handle_404(_e):
    return jsonify({"message": "Endpoint not found."}), 404


@app.errorhandler(500)
def handle_500(_e):
    return jsonify({"message": "Something went wrong on the server."}), 500


# ---------------------------------------------------------------------------
# Database setup + seed
# ---------------------------------------------------------------------------

DEFAULT_DESTINATIONS = [
    # id, name, image_key, region, badge, badge_style, heading, description,
    # best_season, difficulty, tags
    ("d1", "Pokhara", "pokhara", "Gandaki Province", "Lakes & Leisure", "",
     "Lakes & mountain views",
     "Phewa Lake boating, Sarangkot sunrises and slow lakeside cafe afternoons.",
     "Sept - Dec", "Easy", ["Fewa Lake", "Paragliding"]),
    ("d2", "Mustang", "mustang", "Gandaki Province", "Road Journey", "gold",
     "Roads & high desert",
     "Wind-carved canyons, apple orchards and the walled city of Lo Manthang.",
     "Mar - Nov", "Moderate", ["Muktinath", "Road Trip"]),
    ("d3", "Annapurna", "annapurna", "Gandaki Province", "Trekking", "",
     "Trails & snow peaks",
     "The world's best-loved amphitheatre trek, with routes for every pace.",
     "Oct - Dec, Mar - May", "Challenging", ["ABC Trek", "Poon Hill"]),
    ("d4", "Chitwan", "chitwan", "Bagmati Province", "Wildlife", "",
     "Wildlife & jungle",
     "Open-top safaris, river canoeing and one-horned rhinos in the elephant grass.",
     "Oct - Mar", "Easy", ["Rhino Safari", "Canoeing"]),
    ("d5", "Everest", "everest", "Koshi Province", "High Himalaya", "gold",
     "Khumbu & base camp",
     "Sherpa villages, Tengboche monastery and the classic walk to Base Camp.",
     "Mar - May, Oct - Nov", "Strenuous", ["EBC Trek", "Namche Bazaar"]),
    ("d6", "Langtang", "langtang", "Bagmati Province", "Trekking", "",
     "Valleys close to home",
     "The nearest true Himalayan valley to Kathmandu - yak pastures and Kyanjin Ri.",
     "Oct - Dec, Mar - May", "Moderate", ["Kyanjin Gompa", "Tamang Heritage"]),
    ("d7", "Kathmandu Valley", "kathmandu", "Bagmati Province", "Heritage", "",
     "Temples & old towns",
     "Durbar squares, Newari courtyards, hilltop stupas and rim-of-the-valley rides.",
     "All year", "Easy", ["Bhaktapur", "Nagarkot"]),
    ("d8", "Bandipur", "bandipur", "Gandaki Province", "Weekend Escape", "",
     "Hilltop Newari town",
     "A car-free bazaar on a ridge, with Himalayan views from the Tundikhel.",
     "Sept - May", "Easy", ["Siddha Cave", "Ridge Walks"]),
    ("d9", "Rara Lake", "rara", "Karnali Province", "Off the Grid", "gold",
     "Nepal's biggest lake",
     "Remote blue water ringed by pine forest in the far west - few crowds, long days.",
     "Apr - Jun, Sept - Oct", "Moderate", ["Rara National Park", "Murma Top"]),
    ("d10", "Ilam", "ilam", "Koshi Province", "Tea Country", "",
     "Green tea terraces",
     "Rolling tea gardens, misty mornings and Kanyam's endless green ridgelines.",
     "Oct - Apr", "Easy", ["Kanyam", "Antu Danda"]),
]


def init_db() -> None:
    fresh = not os.path.exists(DB_PATH)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)

    # Destinations
    for d in DEFAULT_DESTINATIONS:
        db.execute(
            """INSERT OR IGNORE INTO destinations
               (id, name, image_key, region, badge, badge_style, heading,
                description, best_season, difficulty, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (*d[:10], json.dumps(d[10])),
        )

    # Admin superuser — created by the site owner, never self-registered.
    if not db.execute("SELECT 1 FROM users WHERE role = 'admin'").fetchone():
        db.execute(
            """INSERT INTO users (id, role, name, email, password_hash, age, type, bio, joined)
               VALUES ('u-admin', 'admin', 'System Admin', 'admin@yatrasathi.com',
                       ?, 30, 'Platform superuser', 'Manages users and travel plans.', ?)""",
            (generate_password_hash("admin123"), "2024-01-01"),
        )

    # Demo traveller + one sample trip, so the UI is not empty on first run.
    if not db.execute("SELECT 1 FROM users WHERE email = 'anish@example.com'").fetchone():
        db.execute(
            """INSERT INTO users (id, role, name, email, password_hash, age, type, bio,
                                  location, phone, joined, pace, budget, interests,
                                  languages, visited_destinations, verified_id, verified_phone)
               VALUES ('u-demo', 'traveler', 'Anish M.', 'anish@example.com', ?, 24,
                       'Slow travel & Mountain explorer',
                       'Passionate photographer and backpacker from Kathmandu.',
                       'Kathmandu, Nepal', '+977 9841-234567', '2024-10-07',
                       'Relaxed & Observant',
                       'Mid-range (Clean homestays & local cafes)', ?, ?, ?, 1, 1)""",
            (
                generate_password_hash("traveler123"),
                json.dumps(["Mountain Trekking", "Landscape Photography", "Stargazing"]),
                json.dumps(["Nepali (Native)", "English (Fluent)", "Hindi"]),
                json.dumps(["Pokhara", "Upper Mustang", "Annapurna Base Camp"]),
            ),
        )
        db.execute(
            """INSERT INTO trips (id, title, dest, date, days, type, spots, total_spots,
                                  description, owner_id, published, altitude, difficulty,
                                  best_season, est_budget, transport, meeting_point, itinerary)
               VALUES ('t1', 'Weekend escape to Pokhara & Sarangkot', 'Pokhara',
                       '2026-10-03', 3, 'Relaxed', 2, 4,
                       'A relaxed weekend getaway from Kathmandu to Pokhara with boating on Phewa Lake and a Sarangkot sunrise.',
                       'u-demo', 1, '822m - 1,600m', 'Easy & Leisure',
                       'Sept - Dec, Feb - May', 'NPR 11,000 - 14,000 per person',
                       'Tourist Bus / Shared Van',
                       'Sorhakhutte Tourist Bus Park, Kathmandu (6:30 AM)', ?)""",
            (json.dumps([
                {"day": 1, "title": "Kathmandu to Pokhara Scenic Drive",
                 "desc": "Depart early along the Prithvi Highway, check in at Lakeside, sunset boat ride on Phewa Lake.",
                 "tags": ["Scenic Drive", "Phewa Lake Boating"]},
                {"day": 2, "title": "Sarangkot Sunrise & Peace Pagoda",
                 "desc": "Early trip to Sarangkot for the Himalayan sunrise, then hike to the World Peace Pagoda.",
                 "tags": ["Annapurna Sunrise", "Peace Pagoda"]},
                {"day": 3, "title": "Lakeside Breakfast & Return",
                 "desc": "Relaxed breakfast by the lake and the drive back to Kathmandu.",
                 "tags": ["Lakeside Breakfast"]},
            ]),),
        )

    # ---- extra travellers, plans, requests and notifications -------------
    # Gives the UI real content on first run: trips across every region,
    # two pending requests for the demo user to accept or reject, and a
    # handful of notifications.
    extra_users = [
        ("u-rohan", "Rohan P.", "rohan@example.com", 29, "Trekking"),
        ("u-sadhana", "Sadhana K.", "sadhana@example.com", 32, "Road trip"),
        ("u-tenzing", "Tenzing S.", "tenzing@example.com", 34, "Trekking"),
        ("u-mina", "Mina T.", "mina@example.com", 27, "Nature"),
        ("u-sita", "Sita R.", "sita@example.com", 31, "Cultural"),
        ("u-priya", "Priya Adhikari", "priya@example.com", 26, "Trekking"),
        ("u-suman", "Suman Rai", "suman@example.com", 30, "Relaxed"),
        ("u-maya", "Maya Gurung", "maya@example.com", 24, "Relaxed"),
    ]
    for uid, name, email, age, style in extra_users:
        db.execute(
            """INSERT OR IGNORE INTO users
               (id, role, name, email, password_hash, age, type, bio, joined,
                interests, languages, visited_destinations)
               VALUES (?, 'traveler', ?, ?, ?, ?, ?, ?, '2025-01-15', '[]', '[]', '[]')""",
            (uid, name, email, generate_password_hash("traveler123"), age, style,
             f"{name.split()[0]} travels mostly for {style.lower()} trips."),
        )

    # (id, title, dest, date, days, type, spots, total, owner_id, description)
    extra_trips = [
        # t2-t4 mirror the offline demo content so both modes show the same
        # trips - switching API_BASE must not change what the user sees.
        ("t2", "Upper Mustang ancient desert road journey", "Mustang",
         "2026-10-18", 6, "Road trip", 3, 5, "u-sadhana",
         "A 4x4 overland expedition through sandstone canyons to the walled kingdom of Lo Manthang."),
        ("t3", "Annapurna Sanctuary short trek", "Annapurna", "2026-11-02", 7,
         "Trekking", 2, 4, "u-rohan",
         "An invigorating trek into the Annapurna Sanctuary amphitheatre, surrounded by 8,000m giants."),
        ("t4", "Chitwan wildlife & jungle safari weekend", "Chitwan",
         "2026-10-24", 2, "Nature", 4, 6, "u-mina",
         "Open-top jeep safaris, Rapti river canoeing and sunset over the elephant grass."),
        ("t5", "Everest Base Camp classic trek", "Everest", "2026-10-12", 14,
         "Trekking", 4, 6, "u-tenzing",
         "The full Khumbu walk-in from Lukla via Namche and Tengboche, with acclimatisation days built in."),
        ("t6", "Langtang Valley & Kyanjin Ri", "Langtang", "2026-10-09", 7,
         "Trekking", 3, 5, "u-demo",
         "The closest real Himalayan valley to Kathmandu, finishing with a dawn climb of Kyanjin Ri."),
        ("t7", "Bhaktapur & Nagarkot heritage weekend", "Kathmandu Valley",
         "2026-09-26", 2, "Cultural", 5, 6, "u-sita",
         "Newari courtyards and pottery square, then up to Nagarkot for a Himalayan sunrise."),
        ("t8", "Bandipur ridge weekend from Kathmandu", "Bandipur",
         "2026-10-02", 2, "Relaxed", 4, 5, "u-demo",
         "A car-free hilltop bazaar with big mountain views, Siddha Cave and evening momo."),
        ("t9", "Rara Lake far-west expedition", "Rara Lake", "2026-10-20", 9,
         "Road trip", 2, 4, "u-tenzing",
         "Flight to Nepalgunj then overland into Mugu for Nepal's largest lake and Murma Top sunsets."),
        ("t10", "Ilam tea gardens & Antu Danda sunrise", "Ilam", "2026-11-14",
         5, "Nature", 4, 6, "u-mina",
         "Walking the Kanyam terraces, a working tea-factory visit and the Kanchenjunga sunrise."),
        ("t11", "Poon Hill short trek for first-timers", "Annapurna",
         "2026-09-29", 4, "Trekking", 3, 6, "u-rohan",
         "The friendliest introduction to Himalayan trekking, with the dawn panorama from Poon Hill."),
        ("t12", "Muktinath pilgrimage by jeep", "Mustang", "2026-11-08", 5,
         "Cultural", 3, 6, "u-sita",
         "A steady pilgrimage route up the Kali Gandaki to the 108 water spouts at Muktinath."),
        ("t13", "Phewa Lake paragliding long weekend", "Pokhara",
         "2026-10-16", 3, "Adventure", 2, 4, "u-rohan",
         "Tandem paragliding off Sarangkot, an afternoon on the lake and the Peace Pagoda hike."),
        ("t14", "Slow jungle days in Chitwan", "Chitwan", "2026-12-06", 3,
         "Nature", 5, 6, "u-mina",
         "Two jeep safaris, a long canoe stretch, dawn birdwatching and Tharu cooking."),
    ]
    for t in extra_trips:
        db.execute(
            """INSERT OR IGNORE INTO trips
               (id, title, dest, date, days, type, spots, total_spots,
                owner_id, description, published)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9]),
        )

    # (id, trip_id, user_id, phone, spots, message, status)
    extra_requests = [
        ("r-seed-1", "t6", "u-priya", "+977 9845-112233", 2,
         "Hi! I've done Ghorepani before but never Langtang. Travelling with my "
         "sister - we're both fine with 6-7 hour days. Would love to join.",
         "Pending"),
        ("r-seed-2", "t1", "u-suman", "+977 9812-556677", 1,
         "Based in Lalitpur and free that weekend. Happy to share driving costs "
         "and I have my own camera gear for the Sarangkot sunrise.", "Pending"),
        ("r-seed-3", "t8", "u-maya", "+977 9861-889900", 1,
         "Bandipur has been on my list for years. Solo traveller, easy-going.",
         "Accepted"),
        ("r-seed-4", "t11", "u-demo", "+977 9841-234567", 1,
         "Would like to join the Poon Hill trek - hoping to shoot the dawn panorama.",
         "Pending"),
        ("r-seed-5", "t5", "u-demo", "+977 9841-234567", 1,
         "Very keen on EBC this season. I have prior 4,000m+ experience.",
         "Accepted"),
    ]
    for r in extra_requests:
        db.execute(
            """INSERT OR IGNORE INTO requests
               (id, trip_id, user_id, phone, spots, message, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            r,
        )

    # Accepted seed requests have already consumed their spots.
    db.execute("UPDATE trips SET spots = 3 WHERE id = 't8' AND total_spots = 5")
    db.execute("UPDATE trips SET spots = 3 WHERE id = 't5' AND total_spots = 6")

    # (id, user_id, text, href, read)
    extra_notifications = [
        ("n-seed-1", "u-demo",
         'Priya Adhikari asked to join "Langtang Valley & Kyanjin Ri".',
         "../requests/request.html", 0),
        ("n-seed-2", "u-demo",
         'Suman Rai asked to join "Weekend escape to Pokhara & Sarangkot".',
         "../requests/request.html", 0),
        ("n-seed-3", "u-demo",
         'Your request to join "Everest Base Camp classic trek" was accepted.',
         "../my-trips/myTrip.html", 0),
        ("n-seed-4", "u-demo",
         'You accepted Maya Gurung for "Bandipur ridge weekend from Kathmandu".',
         "../requests/request.html", 1),
        ("n-seed-5", "u-demo",
         'Your travel plan "Bandipur ridge weekend from Kathmandu" was published.',
         "../trip-detail/tripDetail.html?id=t8", 1),
    ]
    for n in extra_notifications:
        db.execute(
            """INSERT OR IGNORE INTO notifications (id, user_id, text, href, read)
               VALUES (?, ?, ?, ?, ?)""",
            n,
        )

    db.execute(
        "INSERT OR IGNORE INTO saved_trips (user_id, trip_id) VALUES ('u-demo', 't10')"
    )

    db.commit()
    db.close()
    if fresh:
        print(f"Created database at {DB_PATH}")


if __name__ == "__main__":
    init_db()
    print("\nYatra Sathi API running on http://127.0.0.1:5000")
    print("Set API_BASE to 'http://127.0.0.1:5000/api' in assets/js/config.js\n")
    print("  traveller : anish@example.com    / traveler123")
    print("  admin     : admin@yatrasathi.com / admin123\n")
    app.run(debug=True, port=5000)
