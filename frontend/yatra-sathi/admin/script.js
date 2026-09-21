/* =========================================================================
   ADMIN DASHBOARD
   -------------------------------------------------------------------------
   From the user flow: "Throughout the system, the admin is only able to
   log in, since admin is a superuser created by the owner of the site."
   The admin manages users and plans.

   requireAuth("admin") enforces that: a traveller who lands here is sent
   back to their own dashboard.

   Backend:
     GET    /admin/stats
     GET    /users
     DELETE /users/<id>
     GET    /trips
     DELETE /trips/<id>
   ========================================================================= */

(async () => {
  const admin = await YS.requireAuth(YS_CONFIG.ROLES.ADMIN);
  if (!admin) return;

  document.getElementById("admin-name").textContent =
    admin.name || "Administrator";
  document.getElementById("admin-logout").onclick = () => YS.logout();

  async function paint() {
    let stats = {};
    let users = [];
    let trips = [];

    try {
      [stats, users, trips] = await Promise.all([
        API.adminStats(),
        API.listUsers(),
        API.listTrips(),
      ]);
    } catch (err) {
      document.getElementById("admin-stats").innerHTML =
        `<div class="empty" style="grid-column:1/-1"><p>${YS.escape(err.message || "Could not load admin data.")}</p></div>`;
      return;
    }

    users = users || [];
    trips = trips || [];

    /* ---- Stat cards ---- */
    document.getElementById("admin-stats").innerHTML = [
      ["Registered users", stats.users ?? users.length],
      ["Active travel plans", stats.trips ?? trips.length],
      ["Join requests", stats.requests ?? 0],
      ["Successful matches", stats.matches ?? 0],
    ]
      .map(
        (x) =>
          `<div class="card stat"><div class="label">${x[0]}</div><div class="num">${x[1]}</div></div>`,
      )
      .join("");

    /* ---- Users table ---- */
    document.getElementById("users-count").textContent =
      `${users.length} account${users.length === 1 ? "" : "s"}`;

    document.getElementById("users-table").innerHTML =
      `<tr><th>Name</th><th>Email</th><th>Role</th><th>Age</th><th>Travel style</th><th style="text-align:right">Action</th></tr>` +
      users
        .map(
          (u) => `
        <tr>
          <td><b>${YS.escape(u.name || "—")}</b></td>
          <td>${YS.escape(u.email || "—")}</td>
          <td><span class="badge ${u.role === "admin" ? "gold" : ""}">${YS.escape(u.role || "traveler")}</span></td>
          <td>${u.age || "—"}</td>
          <td>${YS.escape(u.type || "—")}</td>
          <td style="text-align:right">
            ${
              u.id === admin.id
                ? `<span class="small muted">You</span>`
                : `<button class="btn btn-reject" data-user-id="${YS.escape(u.id)}"
                     style="font-size:11px;padding:5px 11px">Remove</button>`
            }
          </td>
        </tr>`,
        )
        .join("");

    /* ---- Trips table ---- */
    document.getElementById("trips-count").textContent =
      `${trips.length} plan${trips.length === 1 ? "" : "s"}`;

    document.getElementById("trips-table").innerHTML =
      `<tr><th>Trip</th><th>Destination</th><th>Date</th><th>Days</th><th>Owner</th><th>Spots</th><th style="text-align:right">Action</th></tr>` +
      trips
        .map(
          (t) => `
        <tr>
          <td><b>${YS.escape(t.title)}</b></td>
          <td>${YS.escape(t.dest)}</td>
          <td>${YS.date(t.date)}</td>
          <td>${t.days}</td>
          <td>${YS.escape(t.owner)}</td>
          <td>${t.spots}</td>
          <td style="text-align:right">
            <button class="btn btn-reject" data-trip-id="${YS.escape(t.id)}"
              style="font-size:11px;padding:5px 11px">Delete</button>
          </td>
        </tr>`,
        )
        .join("");

    wireActions();
  }

  function wireActions() {
    /* Remove a user */
    document.querySelectorAll("button[data-user-id]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-user-id");
        if (!confirm("Remove this user account permanently?")) return;

        btn.disabled = true;
        try {
          await API.deleteUser(id);
          YS.showToast("User removed.");
          await paint();
        } catch (err) {
          YS.showToast(err.message || "Could not remove user.");
          btn.disabled = false;
        }
      };
    });

    /* Delete a travel plan */
    document.querySelectorAll("button[data-trip-id]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-trip-id");
        if (!confirm("Delete this travel plan permanently?")) return;

        btn.disabled = true;
        try {
          await API.deleteTrip(id);
          YS.showToast("Travel plan deleted.");
          await paint();
        } catch (err) {
          YS.showToast(err.message || "Could not delete the plan.");
          btn.disabled = false;
        }
      };
    });
  }

  await paint();
})();
