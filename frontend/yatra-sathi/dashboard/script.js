/* =========================================================================
   TRAVELER DASHBOARD
   -------------------------------------------------------------------------
   Step 2 of the user flow. The traveller lands here after login and can
   browse, plan and manage trips. The profile-management dropdown and the
   notification bell live in the shared sidebar (assets/js/app.js).
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("dashboard");

  /* Greeting: first name only. */
  document.getElementById("user-name").textContent = String(
    user.name || "Traveller",
  ).split(" ")[0];

  /* ---- Load everything this page needs in parallel ---- */
  let trips = [];
  let incoming = [];
  let sent = [];
  let saved = [];
  let notifications = [];

  try {
    [trips, incoming, sent, saved, notifications] = await Promise.all([
      API.listTrips(),
      API.listIncomingRequests(),
      API.listSentRequests(),
      API.listSaved(),
      API.listNotifications(),
    ]);
  } catch (err) {
    YS.showToast("Some dashboard data could not be loaded.");
  }

  trips = trips || [];

  /* ---- Unread count on the notification bell ---- */
  const unread = (notifications || []).filter((n) => !n.read).length;
  const bell = document.querySelector('a[href="../notifications/notification.html"].btn');
  if (bell && unread) {
    const dot = document.createElement("span");
    dot.textContent = unread > 9 ? "9+" : String(unread);
    dot.style.cssText =
      "position:absolute;top:-2px;right:-4px;min-width:17px;height:17px;padding:0 4px;" +
      "border-radius:999px;background:var(--gold);color:#fff;font-size:10px;font-weight:700;" +
      "display:grid;place-items:center;line-height:1";
    bell.appendChild(dot);
  }

  /* ---- Stat cards ---- */
  const myTrips = trips.filter((t) => t.ownerId === user.id);
  const accepted = (sent || []).filter((r) => r.status === "Accepted").length;
  const pendingIncoming = (incoming || []).filter(
    (r) => r.status === "Pending",
  ).length;

  document.getElementById("stats").innerHTML = [
    ["Trips planned", myTrips.length],
    ["Pending requests", pendingIncoming],
    ["Saved trips", (saved || []).length],
    ["Connections", accepted],
  ]
    .map(
      (x) =>
        `<div class="card stat"><div class="label">${x[0]}</div><div class="num">${String(x[1]).padStart(2, "0")}</div></div>`,
    )
    .join("");

  /* ---- Upcoming journeys: my own trips, soonest first ---- */
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = myTrips
    .filter((t) => t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  renderTrips(upcoming, "upcoming", {
    emptyText: "You have no upcoming journeys yet.",
    showCreateCta: true,
  });

  /* ---- Recommended: other people's trips, matched on travel style ---- */
  const others = trips.filter((t) => t.ownerId !== user.id && t.date >= today);
  const sameStyle = others.filter(
    (t) =>
      user.type &&
      String(user.type).toLowerCase().includes(String(t.type).toLowerCase()),
  );
  const recommended = [
    ...sameStyle,
    ...others.filter((t) => !sameStyle.includes(t)),
  ].slice(0, 6);

  renderTrips(recommended, "recommended", {
    emptyText: "No trips to recommend yet — check back soon.",
  });
})();
