/* =========================================================================
   EXPLORE TRIPS  (Browse & Search)
   -------------------------------------------------------------------------
   Search criteria from the user flow:
     - Destination      (dropdown / field entry)
     - Travelling from  (date to be browsed / selected)
     - Travel Style     (dropdown)
     - "Search trips"   (button)

   Results: "If found, it's shown listed down. Else -> + Create a travel
   plan" button, which navigates to the create-plan page.

   Backend: GET /trips?dest=&type=&from_date=
   Filtering is sent to Python as query params so the server does the work.
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("explore");

  const destEl = document.getElementById("dest");
  const typeEl = document.getElementById("type");
  const dateEl = document.getElementById("date");
  const searchBtn = document.getElementById("filter");

  /* Destination dropdown is populated from the destination catalogue so it
     never drifts out of sync with what actually exists. */
  try {
    const destinations = await API.listDestinations();
    destEl.innerHTML =
      `<option value="">Any destination</option>` +
      destinations
        .map(
          (d) =>
            `<option value="${YS.escape(d.name)}">${YS.escape(d.name)}${d.tripCount ? ` (${d.tripCount})` : ""}</option>`,
        )
        .join("");
  } catch (e) {
    /* keep the hardcoded options already in the HTML */
  }

  /* Arriving from a destination card: /explore?dest=Pokhara */
  const urlDest = new URLSearchParams(location.search).get("dest");
  if (urlDest) destEl.value = urlDest;

  async function search() {
    const filters = {
      dest: destEl.value,
      type: typeEl.value,
      fromDate: dateEl.value,
    };

    searchBtn.disabled = true;
    const originalLabel = searchBtn.textContent;
    searchBtn.textContent = "Searching...";

    try {
      const trips = await API.listTrips(filters);

      /* Describe what was searched for, so an empty result makes sense. */
      const bits = [];
      if (filters.dest) bits.push(filters.dest);
      if (filters.type) bits.push(filters.type);
      if (filters.fromDate) bits.push("from " + YS.date(filters.fromDate));

      renderTrips(trips, "results", {
        emptyText: bits.length
          ? `No trips found for ${bits.join(" · ")}. Why not plan one yourself?`
          : "No trips published yet. Be the first to plan one!",
        showCreateCta: true,
      });
    } catch (err) {
      document.getElementById("results").innerHTML =
        `<div class="empty" style="grid-column:1/-1"><p>${YS.escape(err.message || "Search failed.")}</p></div>`;
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = originalLabel;
    }
  }

  searchBtn.onclick = search;

  /* Enter in the date field triggers the search too. */
  dateEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search();
  });

  await search();
})();
