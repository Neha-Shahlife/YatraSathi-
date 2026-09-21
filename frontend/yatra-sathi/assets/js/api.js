
const API = {
  /* ---------------------------------------------------------------------
     Mode + token
     --------------------------------------------------------------------- */

  get base() {
    return (window.YS_CONFIG && YS_CONFIG.API_BASE) || "";
  },

  get online() {
    return this.base !== "";
  },

  get token() {
    return localStorage.getItem(YS_CONFIG.TOKEN_KEY) || "";
  },

  set token(value) {
    if (value) localStorage.setItem(YS_CONFIG.TOKEN_KEY, value);
    else localStorage.removeItem(YS_CONFIG.TOKEN_KEY);
  },

  /* ---------------------------------------------------------------------
     Low-level HTTP
     --------------------------------------------------------------------- */

  async _http(method, path, body, query) {
    let url = this.base + path;

    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, v);
      });
      const qs = params.toString();
      if (qs) url += "?" + qs;
    }

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers["Authorization"] = "Bearer " + this.token;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), YS_CONFIG.TIMEOUT);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const isAuthAttempt = /^\/auth\/(login|register|google)$/.test(path);

      if (res.status === 401 && !isAuthAttempt) {
        this.token = "";
        throw new Error("Your session expired. Please log in again.");
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error || data.detail)) ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  },

  async _call(storeFn, httpFn) {
    if (!this.online) return storeFn();

    try {
      return await httpFn();
    } catch (err) {
      const isNetwork =
        err.name === "AbortError" ||
        err.name === "TypeError" ||
        /failed to fetch|networkerror|load failed/i.test(err.message || "");

      if (isNetwork && YS_CONFIG.FALLBACK_TO_LOCAL) {
        console.warn(
          "[Yatra Sathi] Backend unreachable — using offline data.",
          err.message,
        );
        return storeFn();
      }
      throw err;
    }
  },

  /* =====================================================================
     AUTH
     ===================================================================== */

  async register(payload) {
    const result = await this._call(
      () => Store.register(payload),
      () => this._http("POST", "/auth/register", payload),
    );
    if (result && result.token) this.token = result.token;
    return result;
  },

  async login(credentials) {
    const result = await this._call(
      () => Store.login(credentials),
      () => this._http("POST", "/auth/login", credentials),
    );
    if (result && result.token) this.token = result.token;
    return result;
  },

  async googleAuth(payload = {}) {
    const result = await this._call(
      () => Store.googleAuth(payload),
      () => this._http("POST", "/auth/google", payload),
    );
    if (result && result.token) this.token = result.token;
    return result;
  },

  async logout() {
    try {
      await this._call(
        () => Store.logout(),
        () => this._http("POST", "/auth/logout"),
      );
    } catch (e) {
      /* Logging out must never fail the user. */
    }
    this.token = "";
    await Store.logout();
    return { ok: true };
  },

  async me() {
    return this._call(
      () => Store.me(),
      () => this._http("GET", "/auth/me"),
    );
  },

  /* =====================================================================
     PROFILE
     ===================================================================== */

  async updateProfile(patch) {
    return this._call(
      () => Store.updateProfile(patch),
      () => this._http("PATCH", "/profile", patch),
    );
  },

  async deleteAccount() {
    const result = await this._call(
      () => Store.deleteAccount(),
      () => this._http("DELETE", "/profile"),
    );
    this.token = "";
    return result;
  },

  /* =====================================================================
     USERS (admin only)
     ===================================================================== */

  async listUsers() {
    return this._call(
      () => Store.listUsers(),
      () => this._http("GET", "/users"),
    );
  },

  async deleteUser(id) {
    return this._call(
      () => Store.deleteUser(id),
      () => this._http("DELETE", `/users/${encodeURIComponent(id)}`),
    );
  },

  /* =====================================================================
     TRIPS
     ===================================================================== */

  async listTrips(filters = {}) {
    return this._call(
      () => Store.listTrips(filters),
      () =>
        this._http("GET", "/trips", undefined, {
          dest: filters.dest,
          type: filters.type,
          from_date: filters.fromDate,
          owner_id: filters.ownerId,
          published: filters.published,
        }),
    );
  },

  async getTrip(id) {
    return this._call(
      () => Store.getTrip(id),
      () => this._http("GET", `/trips/${encodeURIComponent(id)}`),
    );
  },

  async createTrip(payload) {
    return this._call(
      () => Store.createTrip(payload),
      () => this._http("POST", "/trips", payload),
    );
  },

  async updateTrip(id, patch) {
    return this._call(
      () => Store.updateTrip(id, patch),
      () => this._http("PATCH", `/trips/${encodeURIComponent(id)}`, patch),
    );
  },

  async deleteTrip(id) {
    return this._call(
      () => Store.deleteTrip(id),
      () => this._http("DELETE", `/trips/${encodeURIComponent(id)}`),
    );
  },

  /* =====================================================================
     DESTINATIONS
     ===================================================================== */

  async listDestinations() {
    return this._call(
      () => Store.listDestinations(),
      () => this._http("GET", "/destinations"),
    );
  },

  async createDestination(payload) {
    return this._http("POST", "/destinations", payload);
  },

    async updateDestination(id, patch) {
    return this._http("PATCH", `/destinations/${encodeURIComponent(id)}`, patch);
  },

  async deleteDestination(id) {
    return this._http("DELETE", `/destinations/${encodeURIComponent(id)}`);
  },

  /* =====================================================================
     SAVED / WISHLIST
     ===================================================================== */

  async listSaved() {
    return this._call(
      () => Store.listSaved(),
      () => this._http("GET", "/saved"),
    );
  },

  async toggleSave(tripId) {
    return this._call(
      () => Store.toggleSave(tripId),
      () =>
        this._http("POST", `/saved/${encodeURIComponent(tripId)}/toggle`, {}),
    );
  },

  /* =====================================================================
     JOIN REQUESTS
     ===================================================================== */

  async listIncomingRequests() {
    return this._call(
      () => Store.listIncomingRequests(),
      () => this._http("GET", "/requests/incoming"),
    );
  },

  async listSentRequests() {
    return this._call(
      () => Store.listSentRequests(),
      () => this._http("GET", "/requests/sent"),
    );
  },

  async createRequest(tripId, payload) {
    return this._call(
      () => Store.createRequest(tripId, payload),
      () =>
        this._http(
          "POST",
          `/trips/${encodeURIComponent(tripId)}/requests`,
          payload,
        ),
    );
  },

  async updateRequestStatus(id, status) {
    return this._call(
      () => Store.updateRequestStatus(id, status),
      () =>
        this._http("PATCH", `/requests/${encodeURIComponent(id)}`, { status }),
    );
  },

  /* =====================================================================
     NOTIFICATIONS
     ===================================================================== */

  async listNotifications() {
    return this._call(
      () => Store.listNotifications(),
      () => this._http("GET", "/notifications"),
    );
  },

  async markAllNotificationsRead() {
    return this._call(
      () => Store.markAllNotificationsRead(),
      () => this._http("POST", "/notifications/read-all", {}),
    );
  },

  /* =====================================================================
     ADMIN
     ===================================================================== */

  async adminStats() {
    return this._call(
      () => Store.adminStats(),
      () => this._http("GET", "/admin/stats"),
    );
  },
};