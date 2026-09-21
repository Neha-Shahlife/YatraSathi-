/* =========================================================================
   YATRA SATHI — SHARED UI LAYER
   =========================================================================
   Presentation helpers, the auth guard, and the shared navigation chrome.

   This file NEVER touches localStorage or fetch directly — all data comes
   from API (assets/js/api.js). That keeps the Python swap to one file.

   Load order on every page:
     config.js -> store.js -> api.js -> app.js -> <page>/script.js
   ========================================================================= */

const YS = {
  /* -------------------------------------------------------------------
     Session cache
     The signed-in user is fetched once per page load and reused, so the
     backend gets one /auth/me call instead of one per component.
     ------------------------------------------------------------------- */
  _user: null,

  async currentUser() {
    if (this._user) return this._user;
    this._user = await API.me();
    return this._user;
  },

  /* Call after any profile change so the cache does not go stale. */
  setCachedUser(user) {
    this._user = user;
  },

  /* -------------------------------------------------------------------
     Auth guard

     Usage at the top of every protected page script:
         const u = await YS.requireAuth();          // any signed-in user
         const u = await YS.requireAuth("admin");   // admin only

     Returns the user, or redirects and returns null.
     ------------------------------------------------------------------- */
  async requireAuth(requiredRole) {
    let user = null;
    try {
      user = await this.currentUser();
    } catch (e) {
      user = null;
    }

    if (!user) {
      window.location.replace("../auth/login/login.html");
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      /* Signed in, but on the wrong dashboard — send them to their own. */
      window.location.replace(this.homeFor(user));
      return null;
    }
    return user;
  },

  /* Where a user belongs after logging in. Drives the role-based routing
     from the Home Page in the user flow. */
  homeFor(user) {
    return user && user.role === YS_CONFIG.ROLES.ADMIN
      ? "../admin/admin.html"
      : "../dashboard/dashboard.html";
  },

  /* Same, but for pages nested two levels deep (auth/login, auth/register). */
  homeForFromAuth(user) {
    return user && user.role === YS_CONFIG.ROLES.ADMIN
      ? "../../admin/admin.html"
      : "../../dashboard/dashboard.html";
  },

  /* Log out -> back to the Login form (per the user flow). */
  async logout() {
    await API.logout();
    this._user = null;
    window.location.href = "../auth/login/login.html";
  },

  /* Delete account -> double confirmation, then back to Register. */
  async deleteAccount() {
    if (
      !confirm(
        "Delete your account?\n\nThis removes your profile and all travel plans you created. This cannot be undone.",
      )
    )
      return;
    if (!confirm("Last chance — permanently delete your Yatra Sathi account?"))
      return;

    try {
      await API.deleteAccount();
      this._user = null;
      alert("Your account has been deleted.");
      window.location.href = "../auth/register/register.html";
    } catch (err) {
      this.showToast(err.message || "Could not delete account.");
    }
  },

  /* -------------------------------------------------------------------
     Formatting helpers
     ------------------------------------------------------------------- */

  initials(name = "Traveller") {
    return String(name || "Traveller")
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  },

  escape(value = "") {
    return String(value).replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[ch],
    );
  },

  /* "2026-10-03" -> "Oct 3, 2026" */
  date(value) {
    if (!value) return "—";
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },

  /* "2026-09-07" -> "7 Sept 2026" (the "Joined" line on My Profile) */
  joinedDate(value) {
    if (!value) return "";
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (isNaN(d)) return String(value);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  showToast(message) {
    const existing = document.querySelector(".ys-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "ys-toast";
    toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> <span>${this.escape(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity .3s ease, transform .3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /* -------------------------------------------------------------------
     Destination imagery

     Replace these URLs (or point them at assets/images/) once the backend
     serves real uploads. A trip from Python may also carry its own
     "image" field, which wins over this lookup — see tripImage().
     ------------------------------------------------------------------- */
  images: {
    pokhara:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Phewa%20lake,%20Pokhara.jpg?width=1200",
    kathmandu:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Durbar%20Square,%20Kathmandu.jpg?width=1200",
    mustang:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chhoser%20Upper%20Mustang%20(139).jpg?width=1200",
    annapurna:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Annapurna%20Base%20camp.jpg?width=1200",
    chitwan:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chitwan%20National%20Park-%20Rhinoceros.jpg?width=1200",
    everest:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Annapurna%20Mountain%20Range%20Seen%20from%20the%20way%20to%20Annapurna%20Base%20Camp.jpg?width=1200",

    /* The four newer destinations currently reuse verified photos above so
       nothing renders broken. Drop a real photo into assets/images/ and
       point these at it — e.g. "../assets/images/langtang.jpg" — or serve
       the URL from Python on the destination object's "image" field. */
    langtang:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Annapurna%20Mountain%20Range%20Seen%20from%20the%20way%20to%20Annapurna%20Base%20Camp.jpg?width=1200",
    bandipur:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Durbar%20Square,%20Kathmandu.jpg?width=1200",
    rara:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Phewa%20lake,%20Pokhara.jpg?width=1200",
    ilam:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chitwan%20National%20Park-%20Rhinoceros.jpg?width=1200",
  },

  /* Used by the onerror handler on every <img>, so a dead URL degrades to a
     real photo instead of a broken-image icon. */
  get fallbackImage() {
    return this.images.annapurna;
  },

  /* Inline onerror attribute for image tags. */
  imgFallback() {
    return `onerror="this.onerror=null;this.src='${this.fallbackImage}'"`;
  },

  imageKey(dest = "") {
    const k = String(dest).toLowerCase();
    if (k.includes("pokhara")) return "pokhara";
    if (k.includes("kathmandu") || k.includes("bhaktapur") || k.includes("patan"))
      return "kathmandu";
    if (k.includes("mustang")) return "mustang";
    if (k.includes("annapurna")) return "annapurna";
    if (k.includes("chitwan") || k.includes("bardiya")) return "chitwan";
    if (k.includes("everest") || k.includes("khumbu")) return "everest";
    if (k.includes("langtang")) return "langtang";
    if (k.includes("bandipur")) return "bandipur";
    if (k.includes("rara")) return "rara";
    if (k.includes("ilam")) return "ilam";
    return "annapurna";
  },

  tripImage(trip = {}) {
    return trip.image || this.images[this.imageKey(trip.dest)];
  },

  /* Sticky/transparent landing header. */
  initHeader() {
    const header = document.querySelector(".site-header.hero-transparent");
    if (!header) return;
    const checkScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
  },

  /* -------------------------------------------------------------------
     Sidebar (authenticated shell)

     mountSidebar() fetches the badge counts and the signed-in user, then
     injects the markup into #sidebar-slot. Call it once per page:

         await YS.mountSidebar("dashboard");
     ------------------------------------------------------------------- */
  async mountSidebar(active = "") {
    const slot = document.getElementById("sidebar-slot");
    if (!slot) return;

    const user = await this.currentUser();

    /* Badge counts are best-effort: a failure must not blank the nav. */
    let pending = 0;
    let unread = 0;
    try {
      const [incoming, notifications] = await Promise.all([
        API.listIncomingRequests(),
        API.listNotifications(),
      ]);
      pending = (incoming || []).filter((r) => r.status === "Pending").length;
      unread = (notifications || []).filter((n) => !n.read).length;
    } catch (e) {
      /* leave counts at zero */
    }

    slot.innerHTML = this.sidebarMarkup(active, { user, pending, unread });
    this.wireProfileMenu();
  },

  sidebarMarkup(active, { user, pending, unread }) {
    const avatar = user && user.avatar;
    const avatarInner = avatar
      ? `<img src="${this.escape(avatar)}" alt="Your profile photo">`
      : this.initials(user && user.name);

    return `
  <aside class="sidebar">

    <!-- Profile management dropdown -->
    <div class="sidebar-user" id="profile-menu-root">
      <button class="sidebar-user-btn" id="profile-menu-btn" aria-haspopup="true" aria-expanded="false">
        <span class="sidebar-user-avatar">${avatarInner}</span>
        <span class="sidebar-user-meta">
          <span class="sidebar-user-name">${this.escape((user && user.name) || "Traveller")}</span>
          <span class="sidebar-user-role">${this.escape((user && user.type) || "Traveller")}</span>
        </span>
        <svg class="sidebar-user-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      <!-- Account menu only. Anything that is a NAVIGATION destination lives
           in the nav below and is deliberately NOT repeated here. -->
      <div class="profile-menu" id="profile-menu" hidden>
        <a href="../profile/profile.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>My Profile</span>
        </a>
        <a href="../settings/settings.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Account settings</span>
        </a>
        <div class="profile-menu-sep"></div>
        <button type="button" id="profile-menu-logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Log out</span>
        </button>
        <button type="button" class="danger" id="profile-menu-delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          <span>Delete account</span>
        </button>
      </div>
    </div>

    <div class="sidebar-title">Your travel space</div>
    <nav class="sidebar-nav">
      <a class="${active === "dashboard" ? "active" : ""}" href="../dashboard/dashboard.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Dashboard</span>
      </a>
      <a class="${active === "explore" ? "active" : ""}" href="../explore/explore.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
        <span>Explore Trips</span>
      </a>
      <a class="${active === "destinations" ? "active" : ""}" href="../destinations/destination.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>Destinations</span>
      </a>
      <a class="${active === "my-trips" ? "active" : ""}" href="../my-trips/myTrip.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <span>My Trips</span>
      </a>
      <a class="${active === "requests" ? "active" : ""}" href="../requests/request.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Partner Requests</span>
        ${pending ? `<span class="sidebar-badge">${pending}</span>` : ""}
      </a>
      <a class="${active === "notifications" ? "active" : ""}" href="../notifications/notification.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span>Notifications</span>
        ${unread ? `<span class="sidebar-badge">${unread}</span>` : ""}
      </a>
      ${
        user && user.role === YS_CONFIG.ROLES.ADMIN
          ? `<a class="${active === "admin" ? "active" : ""}" href="../admin/admin.html">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Admin Panel</span>
      </a>`
          : ""
      }
    </nav>

    <div class="sidebar-cta">
      <a class="btn btn-primary btn-block" href="../create-plan/createPlan.html">
        + Create a travel plan
      </a>
    </div>
  </aside>`;
  },

  /* Open/close behaviour for the profile dropdown. */
  wireProfileMenu() {
    const btn = document.getElementById("profile-menu-btn");
    const menu = document.getElementById("profile-menu");
    const root = document.getElementById("profile-menu-root");

    if (btn && menu && root) {
      const close = () => {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      };

      btn.onclick = (e) => {
        e.stopPropagation();
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        btn.setAttribute("aria-expanded", String(willOpen));
      };

      document.addEventListener("click", (e) => {
        if (!root.contains(e.target)) close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    }

    const logoutMenu = document.getElementById("profile-menu-logout");
    if (logoutMenu) logoutMenu.onclick = () => this.logout();

    const logoutSide = document.getElementById("sidebar-logout");
    if (logoutSide)
      logoutSide.onclick = (e) => {
        e.preventDefault();
        this.logout();
      };

    const del = document.getElementById("profile-menu-delete");
    if (del) del.onclick = () => this.deleteAccount();
  },
};

/* ===========================================================================
   Public header (for non-sidebar pages)
   =========================================================================== */
function nav(active = "", user = null) {
  const links = user
    ? `
    <a href="../dashboard/dashboard.html" class="${active === "dashboard" ? "active" : ""}">Dashboard</a>
    <a href="../explore/explore.html" class="${active === "explore" ? "active" : ""}">Explore</a>
    <a href="../destinations/destination.html" class="${active === "destinations" ? "active" : ""}">Destinations</a>
    <a href="../my-trips/myTrip.html" class="${active === "my-trips" ? "active" : ""}">My Trips</a>`
    : `
    <a href="../landing/landing.html">Home</a>
    <a href="../landing/landing.html#destinations">Destinations</a>
    <a href="../landing/landing.html#journeys">Find Trips</a>`;

  return `<header class="site-header"><div class="container header-inner">
    <a class="brand" href="${user ? "../dashboard/dashboard.html" : "../landing/landing.html"}">YATRA SATHI</a>
    <nav class="nav">${links}</nav>
    <div class="header-actions">
      ${
        user
          ? `<a class="avatar" title="Profile" href="../profile/profile.html">${YS.initials(user.name)}</a>
             <button class="btn btn-outline" onclick="YS.logout()">Log out</button>`
          : `<a class="btn btn-outline" href="../auth/login/login.html">Log in</a>
             <a class="btn btn-primary" href="../auth/register/register.html">Join Yatra</a>`
      }
    </div>
  </div></header>`;
}

/* ===========================================================================
   Trip card grid

   renderTrips(list, "results", {
     emptyText: "No trips match your search.",
     showCreateCta: true            // "+ Create a travel plan" in empty state
   })
   =========================================================================== */
function renderTrips(list, targetId, options = {}) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const {
    emptyText = "No trips found.",
    showCreateCta = false,
    createHref = "../create-plan/createPlan.html",
  } = options;

  if (!list || !list.length) {
    target.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p>${YS.escape(emptyText)}</p>
        ${
          showCreateCta
            ? `<a class="btn btn-primary" href="${createHref}" style="margin-top:14px">+ Create a travel plan</a>`
            : ""
        }
      </div>`;
    return;
  }

  target.innerHTML = list
    .map(
      (t) => `
    <article class="card trip-card">
      <div class="trip-card-image">
        <img src="${YS.tripImage(t)}" alt="${YS.escape(t.dest)} landscape" loading="lazy" ${YS.imgFallback()}>
        <span class="trip-image-tag">${YS.escape(t.dest)}</span>
      </div>
      <div class="trip-card-body">
        <span class="badge">${YS.escape(t.type)}</span>
        <h3 style="margin-top:10px">${YS.escape(t.title)}</h3>
        <p>${YS.escape(t.dest)} · ${YS.date(t.date)} · ${t.days} days</p>
        <p style="margin-top:8px;line-height:1.4">${YS.escape(t.desc)}</p>
        <div class="between" style="margin-top:16px">
          <span class="small">${t.spots} spots open</span>
          <a class="btn btn-outline" href="../trip-detail/tripDetail.html?id=${encodeURIComponent(t.id)}">View trip</a>
        </div>
      </div>
    </article>`,
    )
    .join("");
}
