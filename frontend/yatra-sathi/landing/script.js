/* =========================================================================
   LANDING (Home Page) — public, no auth required
   -------------------------------------------------------------------------
   Step 1 of the user flow: "A user lands on the Home Page, hits
   Login/Register, and the system routes them based on role."

   Destinations and featured journeys are read through the API layer, so
   they come from Python once the backend is live.
   ========================================================================= */

(async () => {
  const esc = YS.escape;

  /* ---- Popular Destinations (with live trip counts) ---- */
  const destGrid = document.getElementById("destination-grid");
  if (destGrid) {
    try {
      const all = await API.listDestinations();
      /* Busiest six on the public home page; the full list lives on the
         Destinations page. */
      const destinations = all
        .slice()
        .sort((a, b) => (b.tripCount || 0) - (a.tripCount || 0))
        .slice(0, 6);
      destGrid.innerHTML = destinations
        .map(
          (d) => `
<article class="destination-card" onclick="location.href='../explore/explore.html?dest=${encodeURIComponent(d.name)}'">
  <div class="card-image-wrap">
    <img class="card-photo" src="${YS.images[d.imageKey] || YS.images[YS.imageKey(d.name)]}" alt="${esc(d.name)} landscape in Nepal" loading="lazy" ${YS.imgFallback()}>
    <span class="card-badge">${d.tripCount} Active Plans</span>
  </div>
  <div class="card-content">
    <h3 class="card-title">${esc(d.name)}</h3>
    <p class="card-description">${esc(d.desc)}</p>
    <div class="card-meta">${(d.tags || []).map((x) => `<span class="meta-tag">${esc(x)}</span>`).join("")}</div>
  </div>
</article>`,
        )
        .join("");
    } catch (err) {
      destGrid.innerHTML = `<div class="empty">Could not load destinations right now.</div>`;
    }
  }

  /* ---- Featured Journeys ---- */
  const featuredGrid = document.getElementById("featured-trips");
  if (featuredGrid) {
    try {
      const trips = await API.listTrips();
      /* Soonest six upcoming journeys. */
      const today = new Date().toISOString().slice(0, 10);
      const featured = (trips || [])
        .filter((t) => t.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);

      featuredGrid.innerHTML = featured.length
        ? featured
            .map(
              (t) => `
<article class="journey-card">
  <div class="journey-photo-wrap">
    <img class="journey-photo" src="${YS.tripImage(t)}" alt="${esc(t.dest)} travel landscape" loading="lazy" ${YS.imgFallback()}>
    <span class="journey-location">${esc(t.dest)}</span>
  </div>
  <div class="journey-body">
    <span class="journey-type">${esc(t.type)}</span>
    <h3>${esc(t.title)}</h3>
    <div class="journey-facts">
      <span>${YS.date(t.date)}</span><span>${t.days} days</span><span>${t.spots} spots left</span>
    </div>
    <p class="journey-desc">${esc(t.desc)}</p>
    <div class="journey-footer">
      <span class="journey-owner">${esc(t.owner)}</span>
      <a class="btn btn-outline btn-sm" href="../trip-detail/tripDetail.html?id=${encodeURIComponent(t.id)}">View trip</a>
    </div>
  </div>
</article>`,
            )
            .join("")
        : `<div class="empty">No published journeys yet.</div>`;
    } catch (err) {
      featuredGrid.innerHTML = `<div class="empty">Could not load journeys right now.</div>`;
    }
  }

  YS.initHeader();
})();
