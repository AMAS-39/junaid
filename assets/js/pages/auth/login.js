import { bootstrap } from "../../core/bootstrap.js";
import { login, formatAuthError, resetPassword } from "../../services/auth.service.js";
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
    const forgotBtn = document.getElementById("forgotPasswordBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.textContent = "";
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      showLoading("Signing in...");

      try {
        const { profile } = await login(email, password);
        navigateTo(getHomeForRole(profile.role));
      } catch (error) {
        console.error(error);
        const message = formatAuthError(error);
        errorMsg.textContent = message;
        toast.error(message);
        loginBtn.textContent = "Login";
        loginBtn.disabled = false;
      } finally {
        hideLoading();
      }
    });

    if (forgotBtn) {
      forgotBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        if (!email) {
          toast.warning("Enter your email address first.");
          return;
        }

        showLoading("Sending reset email...");
        try {
          await resetPassword(email);
          toast.success("Password reset email sent. Check your inbox.");
        } catch (error) {
          toast.error(formatAuthError(error));
        } finally {
          hideLoading();
        }
      });
    }
  },
});
