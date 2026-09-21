/* =========================================================================
   SETTINGS
   -------------------------------------------------------------------------
   Account management. "Delete account" also appears in the profile
   dropdown per the user flow; both routes call the same API method.

   Backend: DELETE /profile
   ========================================================================= */

(async () => {
  const user = await YS.requireAuth();
  if (!user) return;

  await YS.mountSidebar("settings");

  /* Deactivate is a placeholder until Python exposes a deactivate route.
     Wired here so the button never silently does nothing. */
  const deactivateBtn = document.getElementById("btn-deactivate");
  if (deactivateBtn) {
    deactivateBtn.onclick = () => {
      if (
        confirm(
          "Are you sure? Your account will be deactivated for 30 days.",
        )
      ) {
        YS.showToast("Deactivation will be handled by the backend.");
      }
    };
  }

  /* Delete goes through the shared, double-confirmed helper. */
  const deleteBtn = document.getElementById("btn-delete-account");
  if (deleteBtn) {
    deleteBtn.onclick = () => YS.deleteAccount();
  }
})();
