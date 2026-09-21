/* =========================================================================
   MY PROFILE  (After Registration)
   -------------------------------------------------------------------------
   From the user flow (image 4):
     - Image uploaded (profile photo)
     - Name
     - "21 years old · Adventure traveler"
     - "Joined 7 Sept 2026"
     - [Edit Profile] button  -> navigates to edit details
     - [+ New plan] button
     - About, Travel Preferences, Travel Style

   Backend:
     GET    /auth/me
     PATCH  /profile          (edit details, including the avatar)
     GET    /trips?owner_id=
   ========================================================================= */

(async () => {
  let user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("profile");

  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------
     Render
     --------------------------------------------------------------- */
  async function renderProfile() {
    /* ---- Avatar: uploaded image, else initials ---- */
    const avatarEl = $("avatar");
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${YS.escape(user.avatar)}" alt="Your profile photo">`;
    } else {
      avatarEl.textContent = YS.initials(user.name);
    }

    /* ---- Identity block ---- */
    $("name").textContent = user.name || "Traveller";
    $("travel-type").textContent = user.type || "Traveller";

    /* "21 years old · Adventure traveler" then "Joined 7 Sept 2026" */
    const ageBit = user.age ? `${user.age} years old` : "";
    const joinedBit = user.joined
      ? `Joined ${YS.joinedDate(user.joined)}`
      : user.memberSince
        ? `Joined ${user.memberSince}`
        : "";
    $("age-joined").textContent = [ageBit, joinedBit]
      .filter(Boolean)
      .join(" · ");

    $("location").textContent = user.location || "Location not set";
    $("member-since").textContent = joinedBit || "Member";
    $("phone").textContent = user.phone || "Phone not set";
    $("bio").textContent =
      user.bio ||
      "No bio yet. Use Edit Profile to tell other travellers who you are.";

    /* ---- Stats ---- */
    let trips = [];
    let sent = [];
    let saved = [];
    try {
      [trips, sent, saved] = await Promise.all([
        API.listTrips(),
        API.listSentRequests(),
        API.listSaved(),
      ]);
    } catch (e) {
      /* stats fall back to zero */
    }
    trips = trips || [];

    const hosted = trips.filter((t) => t.ownerId === user.id);
    const joined = (sent || []).filter((r) => r.status === "Accepted");
    const visited = user.visitedDestinations || [];

    $("profile-stats").innerHTML = [
      ["Journeys Hosted", hosted.length],
      ["Journeys Joined", joined.length],
      ["Places Visited", visited.length],
      ["Saved Wishlist", (saved || []).length],
    ]
      .map(
        (s) => `
      <div class="card stat">
        <div class="label">${s[0]}</div>
        <div class="num">${String(s[1]).padStart(2, "0")}</div>
      </div>`,
      )
      .join("");

    /* ---- Interests ---- */
    const interests = user.interests || [];
    $("interest-count").textContent = interests.length
      ? `${interests.length} interests`
      : "none yet";
    $("interests-tags").innerHTML = interests.length
      ? interests
          .map(
            (tag, idx) => `
      <span class="tag-chip">
        <span>${YS.escape(tag)}</span>
        <button class="remove-tag" data-index="${idx}" title="Remove interest">&times;</button>
      </span>`,
          )
          .join("")
      : `<p class="small muted">Add a few interests so travellers know what you enjoy.</p>`;

    document.querySelectorAll(".remove-tag").forEach((btn) => {
      btn.onclick = async (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        const next = [...(user.interests || [])];
        next.splice(idx, 1);
        await save({ interests: next }, "Interest removed");
      };
    });

    /* ---- Visited places ---- */
    $("visited-places").innerHTML = visited.length
      ? visited
          .map(
            (place) => `
      <span class="tag-chip" style="background:#fff;border-color:var(--forest)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--gold)"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <span>${YS.escape(place)}</span>
      </span>`,
          )
          .join("")
      : `<p class="small muted">No destinations recorded yet.</p>`;

    /* ---- Travel preferences (Travel Style) ---- */
    $("pref-pace").textContent = user.pace || "Not set";
    $("pref-budget").textContent = user.budget || "Not set";
    $("pref-languages").textContent = Array.isArray(user.languages)
      ? user.languages.join(", ") || "Not set"
      : user.languages || "Not set";
    $("pref-age-verif").textContent = `${user.age || "—"} yrs · ${
      user.verifiedId ? "Verified Traveller" : "Unverified"
    }`;
    $("pref-emergency").textContent = user.emergencyContact || "Not set";

    /* ---- Upcoming plans ---- */
    const today = new Date().toISOString().slice(0, 10);
    const acceptedIds = joined.map((r) => r.tripId);
    const mine = trips
      .filter(
        (t) =>
          t.date >= today &&
          (t.ownerId === user.id || acceptedIds.includes(t.id)),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);

    $("upcoming-plans-list").innerHTML = mine.length
      ? mine
          .map(
            (t) => `
      <div class="card" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div class="row" style="gap:14px">
          <img src="${YS.tripImage(t)}" alt="${YS.escape(t.dest)}" style="width:62px;height:62px;border-radius:8px;object-fit:cover">
          <div>
            <div class="row" style="gap:8px">
              <span class="badge">${YS.escape(t.dest)}</span>
              <span class="small muted">${YS.date(t.date)} (${t.days}d)</span>
            </div>
            <h4 style="margin-top:4px;font-size:15px">${YS.escape(t.title)}</h4>
            <div class="small muted" style="margin-top:2px">${
              t.ownerId === user.id
                ? "Organized by you"
                : "Organized by " + YS.escape(t.owner)
            } · ${t.spots} spots left</div>
          </div>
        </div>
        <a class="btn btn-outline" style="font-size:12px;padding:6px 14px" href="../trip-detail/tripDetail.html?id=${encodeURIComponent(t.id)}">View details</a>
      </div>`,
          )
          .join("")
      : `<div class="empty">
           <p>No upcoming travel plans scheduled yet.</p>
           <a class="btn btn-primary" href="../create-plan/createPlan.html" style="margin-top:12px">Create your next journey</a>
         </div>`;
  }

  /* ---------------------------------------------------------------
     Persist a patch, refresh the cache, re-render
     --------------------------------------------------------------- */
  async function save(patch, successMessage) {
    try {
      user = await API.updateProfile(patch);
      YS.setCachedUser(user);
      if (successMessage) YS.showToast(successMessage);
      await renderProfile();
      return true;
    } catch (err) {
      YS.showToast(err.message || "Could not save your changes.");
      return false;
    }
  }

  /* ---------------------------------------------------------------
     Profile photo upload

     Offline: the image is stored as a base64 data URL.
     With Python: send the file to your upload endpoint instead and
     PATCH /profile with the returned URL — see the note below.
     --------------------------------------------------------------- */
  $("btn-upload-avatar").onclick = () => $("avatar-file").click();

  $("avatar-file").onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      YS.showToast("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      YS.showToast("Please choose an image under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      /* ---- When the Python backend is ready, replace this block with:

             const form = new FormData();
             form.append("file", file);
             const res = await fetch(YS_CONFIG.API_BASE + "/profile/avatar", {
               method: "POST",
               headers: { Authorization: "Bearer " + API.token },
               body: form,
             });
             const { url } = await res.json();
             await save({ avatar: url }, "Profile photo updated!");
         ---- */
      await save({ avatar: reader.result }, "Profile photo updated!");
    };
    reader.onerror = () => YS.showToast("Could not read that image.");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ---------------------------------------------------------------
     Add interest
     --------------------------------------------------------------- */
  $("btn-add-tag").onclick = async () => {
    const input = $("new-tag-input");
    const val = input.value.trim();
    if (!val) return;

    const interests = user.interests || [];
    if (interests.includes(val)) {
      YS.showToast("Interest already in your list");
      return;
    }
    const ok = await save({ interests: [...interests, val] }, `Added "${val}"`);
    if (ok) input.value = "";
  };

  $("new-tag-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("btn-add-tag").click();
    }
  });

  /* ---------------------------------------------------------------
     Edit Profile modal
     --------------------------------------------------------------- */
  const editModal = $("edit-modal");

  $("btn-open-edit").onclick = () => {
    $("edit-name").value = user.name || "";
    $("edit-location").value = user.location || "";
    $("edit-phone").value = user.phone || "";
    $("edit-age").value = user.age || "";
    if (user.pace) $("edit-pace").value = user.pace;
    if (user.budget) $("edit-budget").value = user.budget;
    $("edit-languages").value = Array.isArray(user.languages)
      ? user.languages.join(", ")
      : user.languages || "";
    $("edit-bio").value = user.bio || "";
    $("edit-emergency").value = user.emergencyContact || "";
    editModal.style.display = "grid";
  };

  const closeModal = () => {
    editModal.style.display = "none";
  };
  $("btn-close-modal").onclick = closeModal;
  $("btn-cancel-modal").onclick = closeModal;
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeModal();
  });

  $("edit-profile-form").onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const patch = {
      name: $("edit-name").value.trim(),
      location: $("edit-location").value.trim(),
      phone: $("edit-phone").value.trim(),
      age: Number($("edit-age").value),
      pace: $("edit-pace").value,
      budget: $("edit-budget").value,
      languages: $("edit-languages")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bio: $("edit-bio").value.trim(),
      emergencyContact: $("edit-emergency").value.trim(),
    };

    const ok = await save(patch, "Profile successfully updated!");
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Changes";
    if (ok) {
      closeModal();
      /* Name or photo may have changed — refresh the sidebar identity. */
      await YS.mountSidebar("profile");
    }
  };

  await renderProfile();
})();
