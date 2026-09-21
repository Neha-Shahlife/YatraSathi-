/* =========================================================================
   PARTNER REQUESTS  (Accept / Reject)
   -------------------------------------------------------------------------
   From the user flow: Requests -> Accept / Reject.

   Only requests for trips I OWN appear here. Accepting reduces the trip's
   open spots and notifies the requester; rejecting just notifies.

   Backend:
     GET   /requests/incoming
     PATCH /requests/<id>   { "status": "Accepted" | "Rejected" }
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("requests");

  const pendingBox = document.getElementById("pending-requests");
  const decidedBox = document.getElementById("decided-requests");

  /* One request row. Pending rows get action buttons; decided rows get a
     status badge instead. */
  function rowMarkup(r, isPending) {
    const trip = r.trip || {};
    const statusClass =
      r.status === "Accepted"
        ? "accepted"
        : r.status === "Rejected"
          ? "danger"
          : "gold";

    return `
    <div class="request-row" data-request-id="${YS.escape(r.id)}">
      <div class="request-who">
        <div class="request-avatar">${YS.initials(r.user)}</div>
        <div style="min-width:0">
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <h4 style="font-size:15px">${YS.escape(r.user)}</h4>
            <span class="badge">${r.spots} spot${r.spots > 1 ? "s" : ""}</span>
          </div>
          <div class="small muted" style="margin-top:3px">
            wants to join <b>${YS.escape(trip.title || "your trip")}</b>
          </div>
          <div class="small muted" style="margin-top:2px">
            ${YS.escape(trip.dest || "—")} · ${YS.date(trip.date)} ·
            requested ${YS.date(r.created)}
          </div>
          ${
            r.phone
              ? `<div class="small muted" style="margin-top:2px">Contact: ${YS.escape(r.phone)}</div>`
              : ""
          }
          ${r.message ? `<div class="request-message">${YS.escape(r.message)}</div>` : ""}
        </div>
      </div>
      <div class="request-actions">
        ${
          isPending
            ? `<button class="btn btn-accept" data-action="Accepted" style="font-size:12px;padding:8px 14px">Accept</button>
               <button class="btn btn-reject" data-action="Rejected" style="font-size:12px;padding:8px 14px">Reject</button>`
            : `<span class="badge ${statusClass}">${YS.escape(r.status)}</span>`
        }
      </div>
    </div>`;
  }

  async function paint() {
    let incoming = [];
    try {
      incoming = (await API.listIncomingRequests()) || [];
    } catch (err) {
      pendingBox.innerHTML = `<div class="empty"><p>${YS.escape(err.message || "Could not load requests.")}</p></div>`;
      decidedBox.innerHTML = "";
      return;
    }

    const pending = incoming.filter((r) => r.status === "Pending");
    const decided = incoming.filter((r) => r.status !== "Pending");

    document.getElementById("pending-count").textContent = pending.length
      ? `${pending.length} pending`
      : "";
    document.getElementById("decided-count").textContent = decided.length
      ? `${decided.length} resolved`
      : "";

    pendingBox.innerHTML = pending.length
      ? pending.map((r) => rowMarkup(r, true)).join("")
      : `<div class="empty">
           <p>No requests waiting on you right now.</p>
           <a class="btn btn-outline" href="../my-trips/myTrip.html" style="margin-top:14px">View your trips</a>
         </div>`;

    decidedBox.innerHTML = decided.length
      ? decided.map((r) => rowMarkup(r, false)).join("")
      : `<div class="empty"><p>Nothing decided yet.</p></div>`;

    wireActions();
  }

  /* Accept / Reject handlers. Buttons are disabled while the call is in
     flight so a double-click cannot send two decisions. */
  function wireActions() {
    pendingBox.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.onclick = async () => {
        const row = btn.closest(".request-row");
        const id = row.getAttribute("data-request-id");
        const status = btn.getAttribute("data-action");

        const buttons = row.querySelectorAll("button");
        buttons.forEach((b) => (b.disabled = true));
        btn.textContent = status === "Accepted" ? "Accepting..." : "Rejecting...";

        try {
          await API.updateRequestStatus(id, status);
          YS.showToast(
            status === "Accepted"
              ? "Request accepted — the traveller has been notified."
              : "Request rejected.",
          );
          await paint();
          /* Refresh the sidebar so the pending badge is correct again. */
          await YS.mountSidebar("requests");
        } catch (err) {
          YS.showToast(err.message || "Could not update the request.");
          buttons.forEach((b) => (b.disabled = false));
          btn.textContent = status === "Accepted" ? "Accept" : "Reject";
        }
      };
    });
  }

  await paint();
})();
