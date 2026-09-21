/* =========================================================================
   MY TRIPS
   -------------------------------------------------------------------------
   From the user flow: "Your trips" + a "+ Create a travel plan" button
   that navigates to the create-plan page, and a list of published trips,
   upcoming trips, and requests I sent.

   Backend:
     GET /trips?owner_id=<me>   (published)
     GET /requests/sent         (requests I sent + their status)
     GET /saved                 (wishlist trip ids)
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("my-trips");

  let allTrips = [];
  let sent = [];
  let savedIds = [];

  try {
    [allTrips, sent, savedIds] = await Promise.all([
      API.listTrips(),
      API.listSentRequests(),
      API.listSaved(),
    ]);
  } catch (err) {
    YS.showToast("Some of your trips could not be loaded.");
  }

  allTrips = allTrips || [];
  sent = sent || [];
  savedIds = savedIds || [];

  const today = new Date().toISOString().slice(0, 10);

  /* ---- 1. Published: trips I created ---- */
  const published = allTrips.filter((t) => t.ownerId === user.id);
  document.getElementById("published-count").textContent =
    published.length === 1 ? "1 trip" : `${published.length} trips`;
  renderTrips(published, "published", {
    emptyText: "You have not published any travel plans yet.",
    showCreateCta: true,
  });

  /* ---- 2. Upcoming: my future trips + trips I was accepted onto ---- */
  const acceptedTripIds = sent
    .filter((r) => r.status === "Accepted")
    .map((r) => r.tripId);

  const upcoming = allTrips
    .filter(
      (t) =>
        t.date >= today &&
        (t.ownerId === user.id || acceptedTripIds.includes(t.id)),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  document.getElementById("upcoming-count").textContent =
    upcoming.length === 1 ? "1 journey" : `${upcoming.length} journeys`;
  renderTrips(upcoming, "upcoming", {
    emptyText: "Nothing on the calendar yet. Plan a trip or join one.",
    showCreateCta: true,
  });

  /* ---- 3. Requests I sent, with their current status ---- */
  document.getElementById("sent-count").textContent =
    sent.length === 1 ? "1 request" : `${sent.length} requests`;

  const statusClass = (status) =>
    status === "Accepted" ? "accepted" : status === "Rejected" ? "danger" : "gold";

  document.getElementById("sent-requests").innerHTML = sent.length
    ? sent
        .map((r) => {
          const trip = r.trip || allTrips.find((t) => t.id === r.tripId) || {};
          return `
        <div class="request-row">
          <div class="request-who">
            <div class="request-avatar">${YS.initials(trip.owner || "?")}</div>
            <div style="min-width:0">
              <h4 style="font-size:15px">${YS.escape(trip.title || "Trip no longer available")}</h4>
              <div class="small muted" style="margin-top:3px">
                ${YS.escape(trip.dest || "—")} · ${YS.date(trip.date)} ·
                organised by ${YS.escape(trip.owner || "—")}
              </div>
              <div class="small muted" style="margin-top:2px">
                You requested ${r.spots} spot${r.spots > 1 ? "s" : ""} on ${YS.date(r.created)}
              </div>
              ${r.message ? `<div class="request-message">${YS.escape(r.message)}</div>` : ""}
            </div>
          </div>
          <div class="request-actions">
            <span class="badge ${statusClass(r.status)}">${YS.escape(r.status)}</span>
            ${
              trip.id
                ? `<a class="btn btn-outline" style="font-size:12px;padding:7px 12px"
                     href="../trip-detail/tripDetail.html?id=${encodeURIComponent(trip.id)}">View trip</a>`
                : ""
            }
          </div>
        </div>`;
        })
        .join("")
    : `<div class="empty">
         <p>You have not requested to join any journeys yet.</p>
         <a class="btn btn-primary" href="../explore/explore.html" style="margin-top:14px">Explore trips</a>
       </div>`;

  /* ---- 4. Saved wishlist ---- */
  const savedTrips = allTrips.filter((t) => savedIds.includes(t.id));
  document.getElementById("saved-count").textContent = `${savedTrips.length} saved`;
  renderTrips(savedTrips, "saved-trips", {
    emptyText: "No saved trips yet. Tap “Save Trip” on any journey you like.",
  });
})();
