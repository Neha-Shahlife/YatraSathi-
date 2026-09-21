/* =========================================================================
   LOGIN
   -------------------------------------------------------------------------
   Flow: Home Page -> Login (email + password, or Google)
         -> routes to Traveler Dashboard OR Admin Dashboard by role.

   Backend: POST /auth/login  { email, password }
            -> { token, user: { ..., role: "traveler" | "admin" } }
   The role in that response is what decides the destination.
   ========================================================================= */

(async () => {
  /* Already signed in? Skip the form. */
  try {
    const existing = await API.me();
    if (existing) {
      window.location.replace(YS.homeForFromAuth(existing));
      return;
    }
  } catch (e) {
    /* not signed in — show the form */
  }

  const form = document.getElementById("login-form");
  const googleBtn = document.getElementById("google-login");
  const submitBtn = form.querySelector("button");

  /* ---------------------------------------------------------------
     Admin mode: login.html?role=admin

     This is presentation only. The same POST /auth/login is used and the
     real role still comes from the server, so nobody can promote
     themselves by editing the URL — if a traveller logs in here they are
     simply routed to the traveller dashboard as usual.
     --------------------------------------------------------------- */
  const isAdminMode =
    new URLSearchParams(location.search).get("role") === "admin";

  if (isAdminMode) {
    document.getElementById("auth-title").textContent = "Administrator log in.";
    document.getElementById("auth-sub").textContent =
      "Superuser access — manage travellers and travel plans.";
    document.getElementById("email").placeholder = "admin@yatrasathi.com";

    /* Google sign-in and self-registration do not apply to the admin
       account: it is created by the site owner, never registered. */
    googleBtn.style.display = "none";
    document.getElementById("auth-divider").style.display = "none";
    const adminEntry = document.getElementById("admin-entry");
    if (adminEntry) {
      adminEntry.innerHTML =
        '<a style="color:var(--ink-soft);font-weight:600" href="login.html">← Back to traveller log in</a>';
    }
  }

  /* Inline error slot, styled with the existing .alert token. */
  const errorBox = document.createElement("div");
  errorBox.className = "alert";
  errorBox.style.display = "none";
  errorBox.style.background = "#f8e7e6";
  errorBox.style.color = "var(--danger)";
  errorBox.style.marginBottom = "12px";
  form.parentNode.insertBefore(errorBox, form);

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
  };
  const clearError = () => {
    errorBox.style.display = "none";
  };

  const finish = (result) => {
    /* Role-based routing — the branch from step 1 of the user flow. */
    window.location.href = YS.homeForFromAuth(result.user);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showError("Please enter your email and password.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
      const result = await API.login({ email, password });
      finish(result);
    } catch (err) {
      showError(err.message || "Could not log in. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });

  /* Google sign-in is a prototype action until Python wires real OAuth
     (POST /auth/google with the Google ID token). */
  googleBtn.addEventListener("click", async () => {
    clearError();
    googleBtn.disabled = true;
    try {
      const result = await API.googleAuth();
      finish(result);
    } catch (err) {
      showError(err.message || "Google sign-in failed.");
      googleBtn.disabled = false;
    }
  });
})();
