/* =========================================================================
   CREATE TRAVEL PLAN
   -------------------------------------------------------------------------
   Fields per the user flow: Trip Title, Destination, Travel Date,
   Duration (no. of days), Travel Type (dropdown menu), Number of travellers
   (open spots), Description of the trip.
   "Lastly publish the trip / saves the data."

   Backend: POST /trips  -> created trip object with its new id
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("create-plan");

  const form = document.getElementById("plan-form");
  const submitBtn = form.querySelector('button:not([type="button"])');

  /* Destination dropdown from the catalogue, so a created trip always
     matches a real destination and shows up under it. */
  const destEl = document.getElementById("dest");
  try {
    const destinations = await API.listDestinations();
    if (destinations && destinations.length) {
      destEl.innerHTML = destinations
        .map(
          (d) => `<option value="${YS.escape(d.name)}">${YS.escape(d.name)}</option>`,
        )
        .join("");
    }
  } catch (e) {
    /* keep the options already in the HTML */
  }

  /* A trip cannot start in the past. */
  const dateEl = document.getElementById("date");
  dateEl.min = new Date().toISOString().slice(0, 10);

  const errorBox = document.createElement("div");
  errorBox.className = "alert";
  errorBox.style.display = "none";
  errorBox.style.background = "#f8e7e6";
  errorBox.style.color = "var(--danger)";
  form.insertBefore(errorBox, form.firstChild);

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";

    const payload = {
      title: document.getElementById("title").value.trim(),
      dest: destEl.value,
      date: dateEl.value,
      days: Number(document.getElementById("days").value),
      type: document.getElementById("type").value,
      spots: Number(document.getElementById("spots").value),
      desc: document.getElementById("desc").value.trim(),
    };

    if (!payload.title || !payload.date || !payload.desc) {
      showError("Please complete the title, travel date and description.");
      return;
    }
    if (!payload.days || payload.days < 1) {
      showError("Duration must be at least 1 day.");
      return;
    }
    if (!payload.spots || payload.spots < 1) {
      showError("You need at least 1 open spot for a travel partner.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing...";

    try {
      /* Publish the trip, then notify, then open the new trip page. */
      const trip = await API.createTrip(payload);
      window.location.href =
        "../trip-detail/tripDetail.html?id=" + encodeURIComponent(trip.id);
    } catch (err) {
      showError(err.message || "Could not publish your travel plan.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Publish trip";
    }
  });
})();
