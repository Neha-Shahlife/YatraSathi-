/* =========================================================================
   TRIP DETAIL
   -------------------------------------------------------------------------
   Shows a single travel plan: day-by-day itinerary, fast facts, the
   organiser's profile card, and the "Request to Join" action that creates
   the partner request the owner accepts or rejects.

   Backend:
     GET  /trips/<id>
     POST /trips/<id>/requests   { spots, phone, message }
     POST /saved/<id>/toggle
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("explore");

  const container = document.getElementById("trip-content");
  const id = new URLSearchParams(location.search).get("id");

  /* ---- Load the trip ---- */
  let trip = null;
  try {
    trip = id ? await API.getTrip(id) : null;
  } catch (err) {
    trip = null;
  }

  if (!trip) {
    container.innerHTML = `
      <div class="empty">
        <h3>Trip not found</h3>
        <p style="margin-top:8px">This travel plan may have been removed by its organiser.</p>
        <a class="btn btn-primary" href="../explore/explore.html" style="margin-top:16px">Back to Explore</a>
      </div>`;
    return;
  }

  /* ---- Fallbacks so a freshly created plan still renders in full ----
     A trip created through the form has no itinerary or fast facts yet, so
     we generate a sensible day-by-day outline from its duration. Python can
     replace any of these by returning the real fields. */
  const itinerary =
    trip.itinerary && trip.itinerary.length
      ? trip.itinerary
      : Array.from({ length: trip.days || 3 }, (_, i) => {
          const last = (trip.days || 3) - 1;
          return {
            day: i + 1,
            title:
              i === 0
                ? `Arrival & Exploration in ${trip.dest}`
                : i === last
                  ? "Farewell Morning & Departure"
                  : `Adventure & Scenic Trail Highlights - Day ${i + 1}`,
            desc:
              i === 0
                ? `Depart from the meeting point, travel towards ${trip.dest}, settle in at local accommodation, and meet fellow travel companions for an evening orientation.`
                : i === last
                  ? "Sunrise photography, group breakfast, packing, and return journey back towards the starting hub."
                  : "Full day exploring local viewpoints, cultural spots, hiking scenic trails, and sharing wholesome local meals.",
            tags: ["Exploration", "Scenic Views", "Local Culture"],
          };
        });

  const inclusions = trip.inclusions || [
    "Shared ground transport to/from destination",
    "Standard comfortable homestay or tea-house stay (twin-share)",
    "Local route coordination and safety briefing",
    "Applicable community entry permits",
  ];
  const exclusions = trip.exclusions || [
    "Individual lunch and dinner meals",
    "Personal purchases, snacks, and bottled water",
    "Personal travel insurance and medical expenses",
  ];
  const packingList = trip.packingList || [
    "Broken-in walking or hiking shoes",
    "Windbreaker / warm thermal layer for chilly evenings",
    "Water bottle & high SPF sunscreen",
    "Official government ID / citizenship copy",
    "Sufficient local cash (NPR) for rural expenses",
  ];

  /* ---------------------------------------------------------------
     Render
     --------------------------------------------------------------- */
  async function renderTripDetail() {
    /* State that decides which join action to show. */
    let savedIds = [];
    let sent = [];
    try {
      [savedIds, sent] = await Promise.all([
        API.listSaved(),
        API.listSentRequests(),
      ]);
    } catch (e) {
      /* non-fatal */
    }

    const isSaved = (savedIds || []).includes(trip.id);
    const existingReq = (sent || []).find((r) => r.tripId === trip.id);
    const isOwner = trip.ownerId === user.id;

    container.innerHTML = `
    <!-- Top Action Bar -->
    <div class="between" style="margin-bottom:20px">
      <a class="btn btn-outline" href="../explore/explore.html">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        Back to Explore
      </a>
      <div class="row" style="gap:10px">
        <button class="btn btn-outline ${isSaved ? "btn-save active" : "btn-save"}" id="btn-toggle-save">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <span>${isSaved ? "Saved to Wishlist" : "Save Trip"}</span>
        </button>
      </div>
    </div>

    <!-- Scenic Destination Hero Banner -->
    <div class="trip-hero-banner">
      <div class="trip-hero-bg" style="background-image:url('${YS.tripImage(trip)}')"></div>
      <div class="trip-hero-overlay"></div>
      <div class="trip-hero-content">
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span class="badge" style="background:var(--forest);color:#fff">${YS.escape(trip.dest)}</span>
          <span class="badge gold">${trip.days} Days Iteration</span>
          <span class="badge" style="background:rgba(255,255,255,.25);color:#fff">${YS.escape(trip.type)}</span>
          <span class="badge" style="background:rgba(255,255,255,.25);color:#fff">${trip.spots} Spots Open</span>
        </div>
        <h1 style="font-size:clamp(28px,4.5vw,42px);color:#fff;line-height:1.1">${YS.escape(trip.title)}</h1>
        <p style="color:rgba(255,255,255,.9);margin-top:10px;font-size:15px">
          ${YS.date(trip.date)} · Starting from ${YS.escape(trip.meetingPoint ? String(trip.meetingPoint).split(",")[0] : "Kathmandu")} · Guided by ${YS.escape(trip.owner)}
        </p>
      </div>
    </div>

    <!-- 2 Column Layout -->
    <div class="grid" style="grid-template-columns:1.9fr 1.1fr;gap:28px">
      <div class="stack" style="gap:28px">

        <!-- About Trip -->
        <section class="card card-pad">
          <div class="eyebrow">Trip Overview</div>
          <h2 style="font-size:22px;margin-top:6px">About this Journey</h2>
          <p style="margin-top:12px;font-size:15px;line-height:1.65">${YS.escape(trip.desc)}</p>
        </section>

        <!-- Day-by-Day Itinerary -->
        <section class="card card-pad">
          <div class="between">
            <div>
              <div class="eyebrow">Schedule & Routes</div>
              <h2 style="font-size:22px;margin-top:6px">${trip.days}-Day Itinerary Breakdown</h2>
            </div>
            <span class="badge gold">${itinerary.length} Days Planned</span>
          </div>
          <p style="margin-top:6px;font-size:13.5px">Here is what each day of the journey looks like from morning to evening.</p>

          <div class="itinerary-timeline">
            ${itinerary
              .map(
                (item) => `
              <div class="itinerary-day">
                <div class="day-pill">D${item.day}</div>
                <div class="day-content">
                  <div class="between">
                    <h4>Day ${item.day}: ${YS.escape(item.title)}</h4>
                  </div>
                  <p>${YS.escape(item.desc)}</p>
                  ${
                    item.tags && item.tags.length
                      ? `<div class="day-tags">${item.tags.map((tg) => `<span class="badge" style="font-size:11px">${YS.escape(tg)}</span>`).join("")}</div>`
                      : ""
                  }
                </div>
              </div>`,
              )
              .join("")}
          </div>
        </section>

        <!-- Destination Details & Essentials -->
        <section class="card card-pad">
          <div class="eyebrow">Destination Details & Essentials</div>
          <h2 style="font-size:22px;margin-top:6px">Trip Fast Facts & Logistics</h2>

          <div class="dest-facts-grid" style="margin-top:16px">
            <div class="fact-item">
              <div class="fact-icon">⛰️</div>
              <div>
                <div class="small muted">Altitude Range</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.altitude || "820m - 1,800m")}</div>
              </div>
            </div>
            <div class="fact-item">
              <div class="fact-icon">🥾</div>
              <div>
                <div class="small muted">Trail Difficulty</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.difficulty || "Moderate")}</div>
              </div>
            </div>
            <div class="fact-item">
              <div class="fact-icon">🌤️</div>
              <div>
                <div class="small muted">Best Season</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.bestSeason || "Sept - May")}</div>
              </div>
            </div>
            <div class="fact-item">
              <div class="fact-icon">🚐</div>
              <div>
                <div class="small muted">Transport Mode</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.transport || "Shared vehicle")}</div>
              </div>
            </div>
            <div class="fact-item">
              <div class="fact-icon">💰</div>
              <div>
                <div class="small muted">Est. Budget / Person</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.estimatedBudget || "NPR 12,000 - 15,000")}</div>
              </div>
            </div>
            <div class="fact-item">
              <div class="fact-icon">📍</div>
              <div>
                <div class="small muted">Meeting Point</div>
                <div style="font-weight:600;font-size:13.5px">${YS.escape(trip.meetingPoint || "Kathmandu Tourist Bus Stand")}</div>
              </div>
            </div>
          </div>

          <div class="grid grid-2" style="margin-top:24px;gap:20px">
            <div>
              <h4 style="font-size:15px;color:var(--forest-dark);margin-bottom:8px">✓ What's Included</h4>
              <div class="stack" style="gap:8px">
                ${inclusions.map((inc) => `<div class="check-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <span>${YS.escape(inc)}</span></div>`).join("")}
              </div>
            </div>
            <div>
              <h4 style="font-size:15px;color:var(--forest-dark);margin-bottom:8px">✗ Exclusions</h4>
              <div class="stack" style="gap:8px">
                ${exclusions.map((exc) => `<div class="check-item" style="color:var(--ink-soft)"><span style="color:var(--ink-soft);margin-right:4px">•</span> <span>${YS.escape(exc)}</span></div>`).join("")}
              </div>
            </div>
          </div>

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line)">
            <h4 style="font-size:15px;color:var(--forest-dark);margin-bottom:10px">🎒 Recommended Packing List & Essentials</h4>
            <div class="checklist">
              ${packingList.map((p) => `<div class="check-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> <span>${YS.escape(p)}</span></div>`).join("")}
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column -->
      <div class="stack" style="gap:24px">

        <!-- Join Request Box -->
        <aside class="card card-pad">
          <div class="eyebrow">Join this Journey</div>
          <h3 style="font-size:22px;margin-top:6px">Reserve your Spot</h3>
          <p style="margin-top:6px;font-size:13.5px">Connect with ${YS.escape(trip.owner)} and coordinate travel together.</p>

          <div style="margin:20px 0;background:var(--cream);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div class="between">
              <span class="small muted">Open Capacity</span>
              <span style="font-weight:700;color:var(--forest)">${trip.spots} spots remaining</span>
            </div>
            <div class="between" style="margin-top:6px">
              <span class="small muted">Travel Date</span>
              <span style="font-weight:600">${YS.date(trip.date)}</span>
            </div>
            <div class="between" style="margin-top:6px">
              <span class="small muted">Trip Duration</span>
              <span style="font-weight:600">${trip.days} Days (${YS.escape(trip.type)})</span>
            </div>
          </div>

          ${
            isOwner
              ? `<div class="alert" style="margin-bottom:12px">You organized this trip! You can accept or reject partner requests.</div>
                 <a class="btn btn-outline btn-block" href="../requests/request.html">View Partner Requests</a>`
              : existingReq
                ? `<div class="alert" style="margin-bottom:12px;background:var(--gold-soft);color:#87662E">
                     ✓ You submitted a join request (${YS.escape(existingReq.status)}).
                   </div>
                   <button class="btn btn-outline btn-block" disabled>Request Sent</button>`
                : trip.spots <= 0
                  ? `<button class="btn btn-outline btn-block" disabled>All Spots Filled</button>`
                  : `<button class="btn btn-primary btn-block btn-lg" id="btn-open-join">Request to Join Journey</button>`
          }

          <div class="row" style="justify-content:center;margin-top:16px;gap:8px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--success)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span class="small muted">Zero platform booking fees · Direct companion connection</span>
          </div>
        </aside>

        <!-- Creator Profile Card -->
        <section class="creator-card">
          <div class="eyebrow">Trip Organizer</div>
          <div class="row" style="margin-top:14px;gap:16px">
            <div class="creator-avatar">${YS.initials(trip.owner)}</div>
            <div>
              <div class="row" style="gap:6px">
                <h3 style="font-size:18px">${YS.escape(trip.owner)}</h3>
                <span class="badge gold" style="font-size:10px;padding:2px 6px">Verified Host</span>
              </div>
              <div class="small muted" style="margin-top:2px">${YS.escape(trip.ownerRating || "New organizer")}</div>
              <div class="small muted">${YS.escape(trip.ownerJoined || "")}</div>
            </div>
          </div>

          <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px">
            <div class="eyebrow" style="font-size:10px">Organizer Bio</div>
            <p style="margin-top:6px;font-size:13px;line-height:1.55">
              ${YS.escape(trip.ownerBio || "Passionate traveller eager to discover remote valleys and share scenic routes with friendly companions.")}
            </p>
          </div>

          <div class="grid grid-2" style="margin-top:14px;gap:8px">
            <div style="background:var(--cream);padding:8px 10px;border-radius:6px;font-size:12px">
              <span class="muted">Total Spots:</span> <b>${trip.totalSpots || trip.spots}</b>
            </div>
            <div style="background:var(--cream);padding:8px 10px;border-radius:6px;font-size:12px">
              <span class="muted">Travel Style:</span> <b>${YS.escape(trip.type)}</b>
            </div>
          </div>
        </section>
      </div>
    </div>`;

    /* ---- Save / unsave ---- */
    const saveBtn = document.getElementById("btn-toggle-save");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        try {
          const result = await API.toggleSave(trip.id);
          YS.showToast(
            result.saved
              ? "Trip saved to your wishlist!"
              : "Removed trip from your saved list",
          );
          await renderTripDetail();
        } catch (err) {
          YS.showToast(err.message || "Could not update your wishlist.");
          saveBtn.disabled = false;
        }
      };
    }

    /* ---- Open the join modal ---- */
    const joinBtn = document.getElementById("btn-open-join");
    if (joinBtn) {
      joinBtn.onclick = () => {
        const modal = document.getElementById("join-modal");
        document.getElementById("join-spots").value = "1";
        document.getElementById("join-spots").max = String(trip.spots || 1);
        document.getElementById("join-phone").value = user.phone || "";
        modal.style.display = "grid";
      };
    }
  }

  /* ---------------------------------------------------------------
     Join request modal
     --------------------------------------------------------------- */
  const joinModal = document.getElementById("join-modal");
  const closeJoin = () => {
    joinModal.style.display = "none";
  };

  document.getElementById("btn-close-join-modal").onclick = closeJoin;
  document.getElementById("btn-cancel-join-modal").onclick = closeJoin;
  joinModal.addEventListener("click", (e) => {
    if (e.target === joinModal) closeJoin();
  });

  document.getElementById("join-form").onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const payload = {
      spots: Number(document.getElementById("join-spots").value),
      phone: document.getElementById("join-phone").value.trim(),
      message: document.getElementById("join-message").value.trim(),
    };

    if (payload.spots > trip.spots) {
      YS.showToast(`Only ${trip.spots} spot(s) remain on this trip.`);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await API.createRequest(trip.id, payload);
      closeJoin();
      YS.showToast("Join request sent successfully!");
      document.getElementById("join-message").value = "";
      await renderTripDetail();
    } catch (err) {
      YS.showToast(err.message || "Could not send your request.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Join Request";
    }
  };

  await renderTripDetail();
})();
