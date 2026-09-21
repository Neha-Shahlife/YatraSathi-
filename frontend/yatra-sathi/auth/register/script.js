/* =========================================================================
   CREATE ACCOUNT
   -------------------------------------------------------------------------
   Fields per the user flow: Full name, Email, Age, Password, Travel Type
   (dropdown). Plus "Continue with Google", and a link to Login for people
   who already have an account.

   Registration always creates a TRAVELER. Admin is a superuser that only
   logs in — there is deliberately no way to register as admin.

   Backend: POST /auth/register { name, email, age, password, type }
            -> { token, user }
   ========================================================================= */

(async () => {
  try {
    const existing = await API.me();
    if (existing) {
      window.location.replace(YS.homeForFromAuth(existing));
      return;
    }
  } catch (e) {
    /* not signed in — show the form */
  }

  const form = document.getElementById("register-form");
  const googleBtn = document.getElementById("google-register");
  const submitBtn = form.querySelector("button");

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      age: Number(document.getElementById("age").value),
      password: document.getElementById("password").value,
      type: document.getElementById("type").value,
    };

    if (!payload.name || !payload.email || !payload.age) {
      showError("Please complete every field.");
      return;
    }
    if (payload.password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      const result = await API.register(payload);
      window.location.href = YS.homeForFromAuth(result.user);
    } catch (err) {
      showError(err.message || "Could not create your account.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });

  googleBtn.addEventListener("click", async () => {
    clearError();
    googleBtn.disabled = true;
    try {
      const result = await API.googleAuth();
      window.location.href = YS.homeForFromAuth(result.user);
    } catch (err) {
      showError(err.message || "Google sign-up failed.");
      googleBtn.disabled = false;
    }
  });
})();
