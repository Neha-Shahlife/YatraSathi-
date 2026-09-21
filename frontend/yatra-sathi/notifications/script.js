/* =========================================================================
   NOTIFICATIONS
   -------------------------------------------------------------------------
   From the user flow: the bell "navigates to notifications generated".
   Unread items are bold; each one can link to whatever generated it.

   Backend:
     GET  /notifications
     POST /notifications/read-all
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("notifications");

  const box = document.getElementById("notifications");
  const readBtn = document.getElementById("read");

  async function paint() {
    let items = [];
    try {
      items = (await API.listNotifications()) || [];
    } catch (err) {
      box.innerHTML = `<div class="empty"><p>${YS.escape(err.message || "Could not load notifications.")}</p></div>`;
      return;
    }

    const unread = items.filter((n) => !n.read).length;
    readBtn.disabled = unread === 0;
    readBtn.textContent = unread ? `Mark all read (${unread})` : "All read";

    box.innerHTML = items.length
      ? items
          .map((n) => {
            const hasLink = n.href && n.href !== "#";
            const text = YS.escape(n.text);
            const body = hasLink
              ? `<a href="${YS.escape(n.href)}" style="color:var(--forest)">${text}</a>`
              : text;

            return `
        <div style="padding:16px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:flex-start">
          <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:7px;background:${
            n.read ? "var(--line)" : "var(--gold)"
          }"></span>
          <div style="min-width:0">
            <div style="font-weight:${n.read ? 400 : 700}">${body}</div>
            <div class="small muted" style="margin-top:4px">${new Date(n.created).toLocaleString()}</div>
          </div>
        </div>`;
          })
          .join("")
      : `<div class="empty"><p>You're all caught up.</p></div>`;
  }

  readBtn.onclick = async () => {
    readBtn.disabled = true;
    try {
      await API.markAllNotificationsRead();
      await paint();
      await YS.mountSidebar("notifications");
    } catch (err) {
      YS.showToast(err.message || "Could not mark notifications read.");
      readBtn.disabled = false;
    }
  };

  await paint();
})();
