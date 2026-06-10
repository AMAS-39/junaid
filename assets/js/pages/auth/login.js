import { bootstrap } from "../../core/bootstrap.js";
import { login } from "../../services/auth.service.js";
import { getHomeForRole, navigateTo } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";

bootstrap({
  publicPage: true,
  redirectIfAuth: true,
  onReady: () => {
    const form = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const loginBtn = document.getElementById("loginBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.textContent = "";
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      showLoading("Signing in...");

      try {
        const { profile } = await login(email, password);

        if (!profile?.role) {
          throw new Error("User profile not found");
        }

        navigateTo(getHomeForRole(profile.role));
      } catch {
        errorMsg.textContent = "Invalid email or password";
        toast.error("Login failed. Please check your credentials.");
        loginBtn.textContent = "Login";
        loginBtn.disabled = false;
      } finally {
        hideLoading();
      }
    });
  },
});
