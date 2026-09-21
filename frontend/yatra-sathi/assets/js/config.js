/* =========================================================================
   YATRA SATHI — FRONTEND CONFIGURATION
   =========================================================================

   THIS IS THE ONLY FILE YOU EDIT WHEN THE PYTHON BACKEND IS READY.

   Two modes:

   1. OFFLINE MODE  (API_BASE = "")
      The app runs fully on localStorage. No server needed.
      Use this while the backend is still being built.

   2. BACKEND MODE  (API_BASE = "http://127.0.0.1:5000/api")
      Every read/write goes to your Python REST API instead.
      No other frontend file has to change.

   See docs/API_CONTRACT.md for the exact endpoints Python must expose.
   ========================================================================= */

window.YS_CONFIG = {
  /* Set this to your Python API root to switch the whole app to the backend.
     Examples:
       Flask/FastAPI local dev : "http://127.0.0.1:5000/api"
       Django local dev        : "http://127.0.0.1:8000/api"
       Same-origin deployment  : "/api"
       Offline (localStorage)  : ""                                        */
  API_BASE: "http://127.0.0.1:8000/api",

  /* localStorage key that holds the auth token returned by POST /auth/login.
     Sent to Python as:  Authorization: Bearer <token>                     */
  TOKEN_KEY: "ys_token",

  /* Request timeout in milliseconds. */
  TIMEOUT: 15000,

  /* When true, a failed backend call falls back to localStorage instead of
     showing an error. Handy during integration; set false in production so
     real errors are visible.                                              */
  FALLBACK_TO_LOCAL: true,

  /* Roles used for dashboard routing. Must match the "role" field that
     Python returns in the user object.                                    */
  ROLES: {
    TRAVELER: "traveler",
    ADMIN: "admin",
  },

  /* Offline-mode only: which email is treated as the admin superuser.
     In backend mode the role comes from Python and this is ignored.       */
  DEMO_ADMIN_EMAIL: "admin@yatrasathi.com",
};
