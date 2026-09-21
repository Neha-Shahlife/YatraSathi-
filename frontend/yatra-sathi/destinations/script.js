/* =========================================================================
   DESTINATIONS  (Destination Management)
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("destinations");

  const addForm = document.getElementById("add-destination-form");
  const addError = document.getElementById("add-dest-error");
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    addError.style.display = "none";
    const name = document.getElementById("new-dest-name").value;
    const desc = document.getElementById("new-dest-desc").value.trim();
    try {
      await API.createDestination({ name, desc });
      window.location.reload();
    } catch (err) {
      addError.textContent = err.message || "Could not add destination.";
      addError.style.display = "block";
    }
  });

  const grid = document.getElementById("destination-grid");
  const toolbar = document.getElementById("dest-toolbar");

  let destinations = [];
  try {
    destinations = (await API.listDestinations()) || [];
  } catch (err) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>${YS.escape(err.message || "Could not load destinations.")}</p></div>`;
    return;
  }

  if (!destinations.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>No destinations available yet.</p></div>`;
    return;
  }

  destinations.sort(
    (a, b) =>
      (b.tripCount || 0) - (a.tripCount || 0) || a.name.localeCompare(b.name),
  );

  const regions = [...new Set(destinations.map((d) => d.region).filter(Boolean))];
  let activeRegion = "all";
  let withTripsOnly = false;

  function renderToolbar() {
    toolbar.innerHTML =
      `<button class="dest-chip ${activeRegion === "all" ? "active" : ""}" data-region="all">
         All regions
       </button>` +
      regions
        .map(
          (r) =>
            `<button class="dest-chip ${activeRegion === r ? "active" : ""}" data-region="${YS.escape(r)}">
               ${YS.escape(r.replace(" Province", ""))}
             </button>`,
        )
        .join("") +
      `<button class="dest-chip ${withTripsOnly ? "active" : ""}" id="chip-with-trips"
         style="margin-left:auto">
         ${withTripsOnly ? "✓ " : ""}With trips only
       </button>`;

    toolbar.querySelectorAll("button[data-region]").forEach((btn) => {
      btn.onclick = () => {
        activeRegion = btn.getAttribute("data-region");
        renderToolbar();
        renderGrid();
      };
    });
    toolbar.querySelector("#chip-with-trips").onclick = () => {
      withTripsOnly = !withTripsOnly;
      renderToolbar();
      renderGrid();
    };
  }

  function tile(d) {
    const img = YS.images[d.imageKey] || YS.images[YS.imageKey(d.name)];
    const count = Number(d.tripCount) || 0;
    const countLabel =
      count === 0
        ? "No trips yet"
        : count === 1
          ? "1 trip planned"
          : `${count} trips planned`;

    const canManage = user && (String(user.id) === String(d.createdBy) || user.role === "admin");

    return `
    <div class="dest-tile" style="position:relative;">
      <a href="../explore/explore.html?dest=${encodeURIComponent(d.name)}"
         aria-label="See trips to ${YS.escape(d.name)}">
        <img class="dest-tile-img" src="${img}" alt="${YS.escape(d.name)}, Nepal"
             loading="lazy" ${YS.imgFallback()}>
        <div class="dest-tile-shade"></div>

        <div class="dest-tile-top">
          <span class="badge ${d.badgeStyle === "gold" ? "gold" : ""}">${YS.escape(d.badge)}</span>
          <span class="dest-trips-pill ${count === 0 ? "empty-state" : ""}">${countLabel}</span>
        </div>

        <div class="dest-tile-body">
          <div class="dest-tile-region">${YS.escape(d.region || "Nepal")}</div>
          <div class="dest-tile-name">${YS.escape(d.name)}</div>
          <p class="dest-tile-desc">${YS.escape(d.desc)}</p>

          <div class="dest-tile-facts">
            <div class="dest-fact">Best season <b>${YS.escape(d.bestSeason || "All year")}</b></div>
            <div class="dest-fact">Difficulty <b>${YS.escape(d.difficulty || "Easy")}</b></div>
          </div>
        </div>
      </a>
      ${canManage ? `
        <div style="position:absolute; top:10px; right:10px; display:flex; gap:6px; z-index:5;">
          <button class="btn btn-outline btn-sm dest-edit-btn" data-id="${d.id}" data-desc="${YS.escape(d.desc)}">Edit</button>
          <button class="btn btn-outline btn-sm dest-delete-btn" data-id="${d.id}">Delete</button>
        </div>
      ` : ""}
    </div>
    `;
  }

  function renderGrid() {
    let list = destinations;
    if (activeRegion !== "all") {
      list = list.filter((d) => d.region === activeRegion);
    }
    if (withTripsOnly) {
      list = list.filter((d) => (d.tripCount || 0) > 0);
    }

    grid.innerHTML = list.length
      ? list.map(tile).join("")
      : `<div class="empty" style="grid-column:1/-1">
           <p>No destinations match that filter.</p>
           <a class="btn btn-primary" href="../create-plan/createPlan.html" style="margin-top:14px">+ Create a travel plan</a>
         </div>`;
  }

  grid.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".dest-edit-btn");
    const deleteBtn = e.target.closest(".dest-delete-btn");

    if (editBtn) {
      e.preventDefault();
      const id = editBtn.dataset.id;
      const currentDesc = editBtn.dataset.desc;
      const newDesc = prompt("Update description:", currentDesc);
      if (newDesc !== null && newDesc.trim() !== "") {
        try {
          await API.updateDestination(id, { desc: newDesc.trim() });
          window.location.reload();
        } catch (err) {
          alert(err.message || "Could not update destination.");
        }
      }
    }

    if (deleteBtn) {
      e.preventDefault();
      const id = deleteBtn.dataset.id;
      if (confirm("Delete this destination? This cannot be undone.")) {
        try {
          await API.deleteDestination(id);
          window.location.reload();
        } catch (err) {
          alert(err.message || "Could not delete destination.");
        }
      }
    }
  });

  renderToolbar();
  renderGrid();
})();